# TrueSuite — Foundation Decisions (Source of Truth)

> Resolved architecture decisions for the suite. Where this document conflicts
> with older docs (CLAUDE.md, AGENTS.md, docs/architecture.md, README.md), **this
> document wins** until those are updated. See §6 for the specific overrides.

**Status:** Locked v1 foundation
**Owner:** Conor
**Last updated:** 2026-06-22
**Companion docs:** TrueSuite-Architecture-Spec.md, TrueSuite-Activation-Spec.md, schema-foundation.md

---

## 1. The decisions (resolved)

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Backend shape | **One shared database.** Monolith-with-modules, not isolated apps. |
| 2 | Supabase strategy | **One shared Supabase project** ("TrueSuite") for all three apps. |
| 3 | Account model | **Adopt `accounts` / `users` / `product_access` from day one** (even at 1:1 users:accounts). |
| 4 | Entitlements/pricing | Gate on **resolved `product_access`**, never on "the plan they bought." TrueQR migrates to this model. *(Dollar prices still open — see §7.)* |
| 5 | TruePage v0 monetization | **Free.** Generate + publish free; monetize only after activation is proven. |
| 6 | TrueBook calendar | **Buy** (Nylas/Cronofy) for v0; revisit build later. |
| 7 | Domain | **Single domain: `truesuite.co`.** Products on subdomains; session cookie scoped to the parent. |
| 8 | TrueQR base | **Zero paid users, no organic traffic.** Fully rebuildable; no migration or live-billing constraint. |

## 2. What "monolith-with-modules" means here (deploy model B)

We honor the Architecture Spec's "one backend, three product modules" **without** running a separate backend service:

- **Per-app Vercel deploys stay.** Each app (`page`, `qr`, `book`) is its own Vercel project, root dir `apps/<name>`.
- **All apps hit the one shared Supabase DB** via shared packages (`@truesuite/db`, `@truesuite/auth`, …).
- "Shared backend" = **shared database + shared packages**, not a deployed monolith and not a network hop between products.
- The cross-product magic (one account across products, bundle entitlements, scan-to-book, booking embed) is **foreign keys in one database**, exactly as the Architecture Spec intended.

This was the only point where the repo's per-app deploy model and the spec's shared-DB requirement actually conflicted — and they don't. Only *Supabase-per-app* had to change.

## 3. Domain & SSO model

- **Root:** `truesuite.co` — suite landing + account hub.
- **App surfaces (subdomains):** `page.truesuite.co`, `qr.truesuite.co`, `book.truesuite.co`.
- **QR redirects:** `truesuite.co/r/{slug}` — root host keeps the encoded URL short for printed codes.
- **Published TruePage pages:** `page.truesuite.co/{slug}` (custom domain overrides on Pro, v1.1).
- **SSO:** session cookie scoped to `domain=.truesuite.co`, so every subdomain shares one login. The "no re-auth between products" requirement (Architecture §2) is **a cookie config, not a token-handoff build** — this is the entire reason single-domain was chosen.
- **Defensive (optional):** registering `truepage.co` / `truebook.co` as 301s preserves spin-out optionality; not required.

## 4. Auth (v0)

- **Email magic-link first** (no external OAuth dependency on the critical path). Add Google OAuth when convenient — the `users.auth_provider` column already accommodates it.
- Signup creates an `accounts` row **and** a `users` row (first user = `owner`), in the app layer, so `acquisition_source` / `acquisition_product` are captured at the moment of signup (required for the CAC attribution thesis — Architecture §2).

## 5. Build order (recap)

1. **Shared foundation** (this doc + schema-foundation.md): shared Supabase project, `accounts`/`users`/`product_access`, the `qr` module, TruePage v0 tables.
2. **TruePage v0** (free): describe→generate→publish + auto-QR. The first activation surface.
3. **TrueBook v0** (after TruePage exists, since the embed needs a host page).
4. **TrueQR rebuild** as the `qr` module on the shared backend — parallel/later track; its current code is the pattern reference, not a constraint.

## 6. What this supersedes in older docs

These rules are **now stale** — do not follow them:

- `CLAUDE.md`: *"Each app gets its own Supabase project for now"* → **one shared project.**
- `CLAUDE.md` / `AGENTS.md`: *"Do NOT modify apps/trueqr — it's live and earning" / "Production changes to TrueQR require explicit approval"* → **TrueQR has zero users; it is rebuildable** and becomes the `qr` module. (Still: don't break it casually, but it is not a production constraint.)
- `docs/architecture.md`: *"Initially one Supabase project per app … consolidate later"* → **consolidated from day one.**
- `README.md`: separate domains `truepage.co` / `truebook.co` → **single domain `truesuite.co`.**

These rules **still hold**:

- No `apps/foo` importing from `apps/bar`; shared code goes through `packages/*`.
- Copy TrueQR's proven patterns (auth wiring, route handlers, Stripe, RLS) into the new apps.
- TypeScript strict, no `any`. Server components by default. Tailwind 4. Next.js 16 / React 19.
- **Read `node_modules/next/dist/docs/` before writing code** (TrueQR's AGENTS.md — this is a modified Next.js 16).

## 7. Still open (not blockers for foundation or TruePage v0)

- **Dollar pricing:** actual standalone prices (QR/Page/Book) + the bundle number + the discount math shown to users. The unit-econ model and the old TrueQR code disagree ($5 vs $12). Needed before any pricing/bundle UI and before billing is wired.
- **Calendar vendor:** Nylas vs Cronofy (TrueBook, not v0-critical).
- **Email provider:** for contact-form forwarding (TruePage stores submissions in DB for v0; forwarding is a fast-follow).
- **Google OAuth:** when to add it (email-only ships first).
