# True* Suite — Architecture Spec (Build-Ready)

> The shared foundation under TrueQR, TruePage, and TrueBook.
> This resolves the open item every product spec defers to: "confirm TrueQR exposes reusable QR generation," plus the shared account and bundle/billing layer that makes one customer span three products.
> Scope discipline: this defines the *shared* contracts. Product-specific internals stay in each product's spec.

**Status:** v1 architecture spec
**Owner:** Conor
**Last updated:** June 2026
**Companion docs:** TruePage-v1-Feature-Spec.md, TrueBook-v1-Feature-Spec.md, TrueSuite-Unit-Economics.xlsx

---

## 1. The core decision: monolith-with-modules vs. true microservices

For a solo founder, **a single shared backend with product modules** beats microservices. One codebase, one database, one deploy, shared auth and billing as internal modules — not separate services with network calls between them. Reasons:

- The cross-product magic (auto-enabled booking on a page, scan-to-book QR, one bundle subscription) is *trivial* when the three products share a database and *painful* when they're separate services.
- A solo founder cannot operate a distributed system's failure modes (partial outages, distributed transactions, version skew across services).
- Unit economics depend on low per-customer cost; microservices add infra overhead that a bundle price can't absorb.

**Recommendation:** one backend, three product modules (`qr`, `page`, `book`), shared modules (`identity`, `billing`, `entitlements`, `notifications`). Each product still has its own frontend/surface, but they call one API. Revisit splitting only if a single product's load genuinely demands isolation — unlikely at this stage.

This spec assumes that shape.

---

## 2. Shared identity & accounts

One account spans all three products. This is the precondition for bundling.

### Model

```
account (the billing entity / customer)
  └── users (people who log in; v1 likely 1:1 with account, but model for 1:many)
  └── product_access (which products this account can use — see Entitlements §4)
```

### accounts
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | the customer; what billing attaches to |
| primary_email | text (unique) | |
| created_at | timestamptz | |
| acquisition_source | text | `trueqr_xsell` / `paid` / `direct` / `truepage_organic` — feeds CAC attribution (unit econ model) |
| acquisition_product | text | which product they signed up through first |

### users
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| account_id | uuid (fk) | |
| email | text (unique) | |
| auth_provider | text | `email` / `google` |
| role | text | `owner` / `member` (v1: owner only) |
| created_at | timestamptz | |

### Why this matters
- `acquisition_source` / `acquisition_product` are not decoration — they are the data behind the CAC thesis in the unit economics model. Capture them at signup or you can never validate whether cross-sell is actually as cheap as assumed.
- Modeling `users` separate from `accounts` now (even at 1:1) avoids a painful migration when a salon owner later wants to add staff logins.

### Auth
- Email + Google OAuth, one session valid across all three product surfaces (shared session/JWT issued by the `identity` module).
- A user logged into TrueQR is logged into TruePage and TrueBook. No re-auth between products — that seam is exactly where the "one suite" feeling lives or dies.

---

## 3. The TrueQR service contract (resolves the recurring open item)

Every product spec says "confirm TrueQR exposes reusable QR generation." Here is the contract to build to. TrueQR becomes an internal `qr` module other modules call directly (in-process), not over HTTP.

### Two kinds of QR codes

This is the key distinction that's been implicit across the specs:

- **Static QR** — encodes a fixed URL. Cheap, no ongoing infrastructure, can't be changed after printing. Free tier.
- **Dynamic QR** — encodes a stable TrueQR redirect URL (`trueqr.co/r/{code}`) that resolves to a target the owner can change without reprinting. Requires a redirect service + a lookup table. Paid tier. This is the retention hook named in both TruePage and TrueBook specs.

### Internal interface (conceptual)

```
qr.create({
  account_id,
  target_url,            // where it points
  type: "static" | "dynamic",
  label,                 // human name, e.g. "Joe's Plumbing - book"
  source_product         // "page" | "book" | "qr" — for attribution
}) -> { qr_id, image_url, redirect_url? }

qr.update_target(qr_id, new_target_url)   // dynamic only; static throws
qr.get(qr_id) -> { ... }
qr.scan_event(code)                        // logged on each dynamic scan (analytics later)
```

### dynamic_qr_redirects (the lookup table)
| field | type | notes |
|-------|------|-------|
| code | text (pk) | the short code in trueqr.co/r/{code} |
| qr_id | uuid (fk) | |
| target_url | text | current destination; editable |
| updated_at | timestamptz | |

### How the other products use it
- **TruePage:** on publish, calls `qr.create` with the page URL. Free = static; Pro = dynamic (editable destination).
- **TrueBook:** scan-to-book calls `qr.create` pointing at the page's booking block (or a direct booking URL). Dynamic on Pro so the owner can re-point it.
- **Decision to confirm:** whether the existing TrueQR product already has this redirect infrastructure or it needs building. If it's only ever done static codes, the dynamic redirect service is net-new work — flag it now, because both other products' Pro tiers depend on it.

---

## 4. Entitlements (what makes the bundle real)

Bundling is not a pricing label — it's an entitlements system. One subscription must unlock features across three products. Keep entitlements *separate* from billing so the two can evolve independently.

### product_access
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| account_id | uuid (fk) | |
| product | text | `qr` / `page` / `book` |
| tier | text | `free` / `pro` |
| source | text | `standalone` / `bundle` / `comp` — how they got it |
| active | boolean | |
| updated_at | timestamptz | |

### Rules
- Each product checks `product_access` for the account before gating a Pro feature. Never gate on "what plan did they buy" directly — gate on the resolved entitlement. This decouples "what they pay for" from "what they can do," so comps, trials, and grandfathering don't require billing hacks.
- A bundle subscription writes three `product_access` rows (all `pro`, `source=bundle`). A standalone TruePage subscription writes one. The products never need to know *why* — they just read access.
- Entitlement resolution is the single source of truth every product module calls. Put it behind one function: `entitlements.can(account_id, product, feature) -> bool`.

---

## 5. Billing & the bundle

### Model (Stripe assumed)
- One Stripe customer per `account`. One subscription, possibly multiple line items.
- **Products as Stripe products/prices:** `qr_pro`, `page_pro`, `book_pro`, and `bundle_pro`.
- A bundle subscriber has the single `bundle_pro` price; standalone subscribers have one or more individual prices.
- A webhook handler translates Stripe subscription state → `product_access` rows (the entitlements in §4). This is the critical integration seam: **Stripe is the source of truth for *payment*; `product_access` is the source of truth for *capability*.** The webhook keeps them in sync.

### subscriptions (local mirror)
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| account_id | uuid (fk) | |
| stripe_subscription_id | text | |
| status | text | `active` / `past_due` / `canceled` |
| plan_type | text | `bundle` / `standalone` |
| current_period_end | timestamptz | |

### Upgrade/bundle flows to handle
- Standalone → bundle (the core upsell): swap line items, write the additional `product_access` rows, prorate.
- Free → Pro on any single product.
- Bundle → cancel one product: v1 may not allow partial unbundling (keep it simple — bundle is all-or-nothing). Decide explicitly.
- Failed payment / dunning: on `past_due`, decide grace behavior (recommend: keep access through grace window, then downgrade `product_access` to free rather than hard-locking — protects the relationship with a price-sensitive buyer).

---

## 6. Shared notifications module

Both TruePage (form submissions) and TrueBook (confirmations/reminders) need email + SMS. Build one `notifications` module, not two.

- Single interface: `notifications.send({ account_id, channel, template, payload, send_at })`.
- Channels: email (v1), SMS (v1, paid). Queue + worker pattern (already specified in TrueBook §8) — generalize it to serve all products.
- **SMS consent is tracked here** because it's a legal requirement, not a feature (see §8). Store consent at the recipient level.
- Centralizing this also centralizes cost tracking — the per-message SMS cost in the unit econ model comes from one place.

---

## 7. Shared data & the cross-product loop

The architecture exists to make this loop seamless:

```
TrueQR code  ──scan──►  TruePage page  ──embed──►  TrueBook booking  ──►  TrueBook notification
   (qr module)            (page module)              (book module)         (notifications module)
        └──────────────── one account, one DB, one entitlement check ──────────────┘
```

Concretely, the seams to build:
- TruePage `content_json.booking` block references a `truebook_business_id` on the same account (TrueBook spec §3). Same DB = a foreign key, not an API call.
- "Scan to book" = TrueBook calls `qr.create` (§3). Same module.
- Bundle pricing = three `product_access` rows from one subscription (§4–5).
- All forms/reminders = one `notifications` module (§6).

Every one of these is easy in the monolith-with-modules shape and hard otherwise. That's the architecture's whole justification.

---

## 8. Cross-cutting concerns (don't skip these)

- **SMS / TCPA consent:** reminder and confirmation texts are regulated. Capture explicit consent, honor opt-out (STOP), store consent records in the notifications module. This is a legal landmine, not a nicety — wire it in from day one.
- **OAuth secret storage:** Google Calendar tokens (TrueBook) and any OAuth refresh tokens encrypted at rest, one shared secrets-handling approach.
- **Abuse / content moderation:** hosted TruePage pages and dynamic QR redirects can be used for phishing/abuse. One shared abuse-report + takedown path protects all three brands (a bad actor's page damages TrueQR's domain reputation too).
- **Data isolation:** every query scoped by `account_id`. A cross-account data leak in a shared DB is the monolith's main risk — enforce account scoping at the data-access layer, not ad hoc per query.
- **Analytics/attribution:** `acquisition_source` (§2) + QR scan events (§3) + entitlement changes (§4) are the raw material for validating the unit econ model. Instrument them now; they're nearly impossible to backfill.

---

## 9. Suggested build sequence

1. `identity` module: accounts, users, shared auth/session across surfaces.
2. `entitlements` module: `product_access` + the single `can()` resolver.
3. `billing` module: Stripe integration + webhook → entitlements sync.
4. `qr` module: confirm/build static + dynamic QR, the redirect service, the `qr.create` contract.
5. `notifications` module: queue/worker, email first, SMS + consent tracking.
6. Wire the product modules (`page`, `book`) to call the above instead of their own stubs.
7. Cross-product seams: booking embed FK, scan-to-book, bundle entitlement rows.
8. Cross-cutting: account scoping, secret encryption, abuse path.

---

## 10. Open questions / decisions for Conor

- [ ] **Does existing TrueQR already have dynamic-QR redirect infrastructure**, or is that net-new? Both other products' Pro tiers depend on it. (Top priority — resolve first.)
- [ ] Confirm the monolith-with-modules shape vs. any existing TrueQR codebase — is TrueQR already built in something this can extend, or is the suite a fresh backend the QR logic moves into?
- [ ] Partial unbundling: can a bundle subscriber drop one product? (Recommend no in v1.)
- [ ] Dunning/grace behavior on failed payment (recommend grace-then-downgrade).
- [ ] Single shared database vs. schema-per-product in one DB instance (recommend single DB, account-scoped).
- [ ] Hosting/deploy target for the shared backend (informs cost model).
