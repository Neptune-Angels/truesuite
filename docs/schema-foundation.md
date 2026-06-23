# TrueSuite — Shared DB Schema (Foundation + QR + TruePage v0)

> The load-bearing shared contract. This is the one thing worth getting right
> before code, because migrations are the annoying thing to change later.
> The SQL below is ready to drop into `packages/db/migrations/001_foundation.sql`
> once the shared Supabase project exists.

**Status:** v1 foundation schema
**Owner:** Conor
**Last updated:** 2026-06-22
**Companion docs:** foundation-decisions.md, TrueSuite-Architecture-Spec.md (§2–4), TruePage-v1-Feature-Spec.md (§3–4)

---

## 1. Scope of this migration

**In `001_foundation.sql`:**
- Identity: `accounts`, `users`
- Entitlements: `product_access`
- QR module: `qr_codes`, `qr_scans`
- TruePage v0: `pages`, `assets`, `form_submissions`
- Helpers: `current_account_id()`, `update_updated_at_column()` + triggers, RLS

**Deferred to later migrations (see §6):** `subscriptions` (billing milestone), and the full TrueBook set (`businesses`, `services`, `availability_rules`, `availability_exceptions`, `bookings`, `calendar_connections`, `notifications`).

## 2. Design principles

1. **Everything is account-scoped.** Every product table carries `account_id`. A cross-account leak in a shared DB is the monolith's main risk (Architecture §8) — scoping is enforced both in RLS and in the service-role data layer.
2. **Entitlements are separate from billing.** `product_access` is the single source of truth for *capability*; Stripe (later) is the source of truth for *payment*. A webhook keeps them in sync. Products gate on `product_access`, never on a plan column.
3. **The two QR tables from Architecture §3 are collapsed into one.** Every *persisted* code is dynamic (has an editable redirect target), so `qr_codes.slug` plays the role of the spec's `dynamic_qr_redirects.code`. Free "static" codes are generated client-side and never persisted — no table needed. This matches the proven TrueQR model.
4. **Public read paths use service-role server rendering, not public RLS.** Published pages and QR redirects are served by server routes using the service-role key (the TrueQR `/r/[slug]` pattern), so RLS stays locked to account members.

## 3. Key modeling decisions (and why)

| Decision | Choice | Why |
|----------|--------|-----|
| Owner of product rows | `account_id` (not `user_id`) | Billing + entitlements attach to the account; a salon owner may later add staff `users` to one account. |
| `users.id` | = `auth.users.id` (FK) | Mirrors TrueQR; one login = one auth user = one profile row. `account_id` links to the billing entity. |
| QR short code | `qr_codes.slug` | Matches TrueQR's working `/r/[slug]` route; avoids reworking proven redirect code. |
| Redirect host | `truesuite.co/r/{slug}` | Root host = shortest encoded URL for printed codes (foundation-decisions §3). |
| Entitlement gating | read `product_access(account_id, product)` | Decouples "what they pay for" from "what they can do" (comps/trials/grandfathering need no billing hacks). |

## 4. The migration

```sql
-- ============================================================
-- 001_foundation.sql — TrueSuite shared schema
-- Identity + Entitlements + QR module + TruePage v0
-- ============================================================

-- ---------- helpers ----------

-- Resolve the account for the current authenticated user (used by RLS).
create or replace function public.current_account_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select account_id from public.users where id = auth.uid()
$$;

-- Generic updated_at touch trigger.
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ============================================================
-- IDENTITY
-- ============================================================

-- The billing entity / customer. What a subscription attaches to.
create table if not exists public.accounts (
  id                  uuid primary key default gen_random_uuid(),
  primary_email       text unique not null,
  acquisition_source  text,          -- trueqr_xsell | paid | direct | truepage_organic
  acquisition_product text,          -- qr | page | book  (first product signed up through)
  created_at          timestamptz not null default now()
);

-- People who log in. v1 is effectively 1:1 with accounts, modeled 1:many.
create table if not exists public.users (
  id            uuid primary key references auth.users(id) on delete cascade,
  account_id    uuid not null references public.accounts(id) on delete cascade,
  email         text unique not null,
  auth_provider text not null default 'email',   -- email | google
  role          text not null default 'owner'     -- owner | member (v1: owner)
                  check (role in ('owner','member')),
  created_at    timestamptz not null default now()
);
create index if not exists idx_users_account_id on public.users(account_id);

-- ============================================================
-- ENTITLEMENTS  (capability source of truth — Architecture §4)
-- ============================================================

create table if not exists public.product_access (
  id         uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  product    text not null check (product in ('qr','page','book')),
  tier       text not null default 'free' check (tier in ('free','pro')),
  source     text not null default 'standalone' check (source in ('standalone','bundle','comp')),
  active     boolean not null default true,
  updated_at timestamptz not null default now(),
  unique (account_id, product)        -- one resolved entitlement per product per account
);
create index if not exists idx_product_access_account_id on public.product_access(account_id);
create trigger trg_product_access_updated_at
  before update on public.product_access
  for each row execute function public.update_updated_at_column();

-- ============================================================
-- QR MODULE  (Architecture §3 — collapsed to one table)
-- ============================================================

create table if not exists public.qr_codes (
  id             uuid primary key default gen_random_uuid(),
  account_id     uuid not null references public.accounts(id) on delete cascade,
  source_product text not null default 'qr' check (source_product in ('qr','page','book')),
  slug           text unique not null,           -- short code in truesuite.co/r/{slug}
  target_url     text not null,                  -- current destination; editable (= dynamic)
  label          text,                           -- human name, e.g. "Joe's Plumbing - book"
  is_dynamic     boolean not null default true,
  is_active      boolean not null default true,
  scan_count     integer not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_qr_codes_account_id on public.qr_codes(account_id);
create index if not exists idx_qr_codes_slug on public.qr_codes(slug);
create trigger trg_qr_codes_updated_at
  before update on public.qr_codes
  for each row execute function public.update_updated_at_column();

create table if not exists public.qr_scans (
  id          uuid primary key default gen_random_uuid(),
  qr_code_id  uuid not null references public.qr_codes(id) on delete cascade,
  scanned_at  timestamptz not null default now(),
  user_agent  text,
  referer     text,
  country     text
);
create index if not exists idx_qr_scans_qr_code_id on public.qr_scans(qr_code_id);
create index if not exists idx_qr_scans_scanned_at on public.qr_scans(scanned_at);

-- ============================================================
-- TRUEPAGE v1
-- ============================================================

create table if not exists public.pages (
  id            uuid primary key default gen_random_uuid(),
  account_id    uuid not null references public.accounts(id) on delete cascade,
  slug          text unique not null,             -- page.truesuite.co/{slug}
  custom_domain text,                             -- Pro / v1.1; null otherwise
  status        text not null default 'draft' check (status in ('draft','published')),
  title         text not null,                    -- business name
  content_json  jsonb not null,                   -- structured page (TruePage §4)
  brand_color   text,                             -- hex
  logo_url      text,
  qr_code_id    uuid references public.qr_codes(id) on delete set null,
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_pages_account_id on public.pages(account_id);
create index if not exists idx_pages_status on public.pages(status);
create trigger trg_pages_updated_at
  before update on public.pages
  for each row execute function public.update_updated_at_column();

create table if not exists public.assets (
  id         uuid primary key default gen_random_uuid(),
  page_id    uuid not null references public.pages(id) on delete cascade,
  type       text not null check (type in ('logo','photo')),
  url        text not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_assets_page_id on public.assets(page_id);

create table if not exists public.form_submissions (
  id           uuid primary key default gen_random_uuid(),
  page_id      uuid not null references public.pages(id) on delete cascade,
  payload      jsonb not null,                    -- name/email/message/etc.
  forwarded_to text,                              -- owner email; null in v0 (store-only)
  created_at   timestamptz not null default now()
);
create index if not exists idx_form_submissions_page_id on public.form_submissions(page_id);
create index if not exists idx_form_submissions_created_at on public.form_submissions(created_at);

-- ============================================================
-- ROW LEVEL SECURITY
-- Reads scoped to account membership. Writes + public render
-- paths go through service-role server routes (RLS bypassed,
-- account scoping enforced in code) — the TrueQR pattern.
-- ============================================================

alter table public.accounts         enable row level security;
alter table public.users            enable row level security;
alter table public.product_access   enable row level security;
alter table public.qr_codes         enable row level security;
alter table public.qr_scans         enable row level security;
alter table public.pages            enable row level security;
alter table public.assets           enable row level security;
alter table public.form_submissions enable row level security;

-- accounts: a user can see their own account
create policy "members read their account"
  on public.accounts for select
  using (id = public.current_account_id());

-- users: a user can see users in their account
create policy "members read account users"
  on public.users for select
  using (account_id = public.current_account_id());

-- product_access: read-only to members (writes are service-role from the billing webhook)
create policy "members read their entitlements"
  on public.product_access for select
  using (account_id = public.current_account_id());

-- qr_codes: members read their codes
create policy "members read their qr codes"
  on public.qr_codes for select
  using (account_id = public.current_account_id());

-- qr_scans: members read scans for their codes
create policy "members read their scans"
  on public.qr_scans for select
  using (exists (
    select 1 from public.qr_codes c
    where c.id = qr_scans.qr_code_id
      and c.account_id = public.current_account_id()
  ));

-- pages / assets / form_submissions: members read their own
create policy "members read their pages"
  on public.pages for select
  using (account_id = public.current_account_id());

create policy "members read their assets"
  on public.assets for select
  using (exists (
    select 1 from public.pages p
    where p.id = assets.page_id
      and p.account_id = public.current_account_id()
  ));

create policy "members read their submissions"
  on public.form_submissions for select
  using (exists (
    select 1 from public.pages p
    where p.id = form_submissions.page_id
      and p.account_id = public.current_account_id()
  ));
```

## 5. Access patterns (how the app layer uses this)

- **Signup** (app layer, in a transaction): create `accounts` (with `acquisition_source`/`acquisition_product`) → create `users` (`id = auth uid`, `role = owner`). Never via a DB trigger — the source attribution is only known at the route.
- **Entitlement check:** `packages/entitlements` exposes `can(account_id, product)` reading `product_access`. v0 TruePage is free, so this is wired but every check returns the free tier until billing lands.
- **QR redirect:** `truesuite.co/r/[slug]` server route, service-role: look up `qr_codes` by slug → bump `scan_count` + insert `qr_scans` → 302 to `target_url`. (Lift directly from TrueQR's `app/r/[slug]/route.ts`.)
- **Publish a page:** service-role route validates slug (unique, denylist) → renders/persists → creates a `qr_codes` row (`source_product='page'`, `target_url = page URL`) → sets `pages.qr_code_id`, `status='published'`, `published_at`.
- **Public page render:** server component using service-role, keyed by slug + `status='published'`. RLS stays locked; nothing public-facing reads via anon.
- **Form submit:** rate-limited service-role route inserts into `form_submissions` (store-only in v0).

## 6. Deferred tables (named so the whole picture is visible — not in 001)

- **`subscriptions`** (billing milestone): local Stripe mirror — `account_id`, `stripe_subscription_id`, `status`, `plan_type` (`bundle`/`standalone`), `current_period_end`. The Stripe webhook writes `product_access` rows from subscription state.
- **TrueBook** (its own migration, after TruePage): `businesses`, `services`, `availability_rules`, `availability_exceptions`, `bookings`, `calendar_connections`, `notifications` — per TrueBook-v1-Feature-Spec §4. `businesses.account_id` ties to the same account; TruePage's `content_json.booking.truebook_business_id` references it (a JSON field, so no change to `pages`).
- **`acquisition` / funnel events** (Activation §7): the cross-sell funnel events (`cross_sell_surface_shown`, `activation_event`, etc.) — likely PostHog rather than a table, decide at instrumentation time.

## 7. Open schema questions

- Generated DB types: run `supabase gen types` into `packages/db/database.types.ts` once the project exists, consumed by all apps.
- `qr_codes.slug` vs `pages.slug` share a global namespace only within their own tables — confirm the reserved/denylist set is shared so a page slug and a reserved route can't collide.
- Soft-delete vs hard-delete: v0 uses hard deletes (cascade). Revisit if abuse/audit needs a tombstone.
