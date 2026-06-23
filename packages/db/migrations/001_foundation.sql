-- ============================================================
-- 001_foundation.sql — TrueSuite shared schema
-- Identity + Entitlements + QR module + TruePage v0
-- ============================================================

-- ---------- helpers ----------

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
