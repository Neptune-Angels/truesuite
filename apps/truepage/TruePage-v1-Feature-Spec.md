# TruePage.co — v1 Feature Spec (Build-Ready)

> Companion to TruePage-Product-Spec.md. This document is what you build v1 against.
> Scope discipline: if it isn't in this file, it isn't in v1.

**Status:** v1 build spec
**Owner:** Conor
**Last updated:** June 2026

---

## 1. Scope boundary (read first)

**In v1:**
- Describe-to-generate single page (hero, services, hours, contact, CTA).
- Build around uploaded assets (logo, photos, brand colors).
- Section-level "regenerate" via AI prompt.
- Publish to `truepage.co/{slug}` subdomain.
- Auto-generated matching QR code.
- Contact form → email forwarding.
- Free / Pro tiers + auth + billing.

**Explicitly NOT in v1:**
- Drag-and-drop editor.
- A/B testing, funnels, analytics dashboards.
- Multi-page sites, blog/CMS, e-commerce.
- Custom domains *may* be deferred to v1.1 if DNS work threatens the timeline (flag — see §9).

---

## 2. Core user flow

```
1. Land on truepage.co → "Describe your business" prompt box.
2. User types a description (+ optional: upload logo, photos, pick brand color).
3. AI generates a structured page (JSON → rendered preview).
4. User reviews. Can regenerate any section, edit text inline, swap images.
5. User claims a slug (truepage.co/joes-plumbing) → sign up.
6. Page publishes. QR code auto-generated pointing at the live URL.
7. Free: lives on subdomain w/ badge. Pro: upgrade for custom domain, no badge, etc.
```

The generation step is the magic moment — it must feel fast (<10s perceived) and produce something obviously usable on the first try.

---

## 3. Data model

Relational (Postgres assumed). Tables below; adjust to your stack.

### users
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| email | text (unique) | |
| auth_provider | text | email / google |
| plan | text | `free` / `pro` |
| trueqr_user_id | uuid (nullable) | link to TrueQR account for bundle/cross-sell |
| created_at | timestamptz | |

### pages
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| user_id | uuid (fk) | |
| slug | text (unique) | the truepage.co/{slug} path |
| custom_domain | text (nullable) | Pro only; null if deferred |
| status | text | `draft` / `published` |
| title | text | business name |
| content_json | jsonb | the structured page (see §4) |
| brand_color | text | hex |
| logo_url | text (nullable) | |
| qr_code_id | uuid (fk, nullable) | link to generated QR |
| published_at | timestamptz (nullable) | |
| created_at / updated_at | timestamptz | |

### assets
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| page_id | uuid (fk) | |
| type | text | `logo` / `photo` |
| url | text | storage URL |
| created_at | timestamptz | |

### qr_codes
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| page_id | uuid (fk) | |
| target_url | text | the live page URL (editable = "dynamic QR" on Pro) |
| image_url | text | rendered QR asset |
| is_dynamic | boolean | Pro feature: editable target without reprinting |
| created_at | timestamptz | |

### form_submissions
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| page_id | uuid (fk) | |
| payload | jsonb | name/email/message/etc. |
| forwarded_to | text | owner email |
| created_at | timestamptz | |

---

## 4. Page content schema (`content_json`)

This is the contract between the AI generation engine and the renderer. The AI must output exactly this shape. Keep it rigid in v1 — a fixed section set, not arbitrary blocks.

```json
{
  "hero": {
    "headline": "string",
    "subheadline": "string",
    "cta_label": "string",
    "cta_action": "call | form | link",
    "cta_value": "string (phone, anchor, or url)"
  },
  "services": {
    "heading": "string",
    "items": [
      { "name": "string", "description": "string" }
    ]
  },
  "hours": {
    "heading": "string",
    "rows": [
      { "day": "string", "open": "string", "close": "string", "closed": false }
    ]
  },
  "contact": {
    "heading": "string",
    "phone": "string | null",
    "email": "string | null",
    "address": "string | null",
    "show_form": true
  },
  "meta": {
    "business_name": "string",
    "tagline": "string"
  }
}
```

Rules:
- Renderer must tolerate empty/missing optional sections (e.g. no hours provided → hide the block).
- The AI never returns HTML or CSS — only this JSON. Layout and styling live in the renderer/templates, so output stays safe and consistent.

---

## 5. Generation flow (the AI engine)

### Inputs
- Business description (free text).
- Optional: uploaded logo, photos, brand color hex.

### Process
1. **Prompt assembly.** System prompt instructs the model to return *only* valid `content_json` (no preamble, no markdown fences), given the description and any structured hints.
2. **Model call.** Single completion. Request JSON. Parse defensively — strip stray fences, validate against the schema, retry once on malformed output.
3. **Render.** Map `content_json` into the chosen template. Templates are pre-designed and brand-color-driven; the AI never generates raw layout code. This keeps every page on-brand, mobile-first, and safe.
4. **Section regenerate.** "Regenerate this section" re-prompts the model for just that one object in the schema and swaps it in — cheaper than regenerating the whole page and avoids a drag-and-drop editor in v1.

### Design notes for the templates (from design principles)
- Mobile-first, since ~all traffic arrives via QR scan on a phone.
- Templates carry the visual personality so generated copy doesn't have to; copy stays plain, active-voice, specific ("Call now," not "Submit").
- A small set of distinct templates (not one generic default) keyed loosely off trade/vertical, so a plumber's page doesn't look like a salon's.
- Quality floor: responsive, keyboard-focusable, reduced-motion respected.

### Cost control
- One generation = one model call (plus at most one retry). Log token usage per page to validate per-page cost against pricing (open question in product spec §9).
- Cache nothing user-specific, but cache template assets aggressively.

---

## 6. Publish pipeline

```
draft (content_json saved)
  → user claims slug
  → validate slug (unique, allowed chars, not reserved/abusive)
  → render static page, store/serve at truepage.co/{slug}
  → generate QR code pointing at live URL, store image
  → status = published, published_at set
```

- Free pages: served on subdomain path, TruePage badge injected at render.
- Pro pages: badge removed; custom domain mapping if shipped (see §9).
- Re-publish on edit: regenerate served page + invalidate cache. QR target stays stable for static QR; dynamic QR (Pro) can re-point without reprinting.

---

## 7. QR integration (the strategic core)

This is the differentiator — treat it as first-class, not an afterthought.

- QR auto-generates at publish, pointing at the live page URL.
- Static QR (Free): target fixed at generation.
- Dynamic QR (Pro): target is editable; the printed code never changes but its destination can — strong retention + upsell hook.
- Reuse TrueQR's existing QR generation infrastructure where possible rather than rebuilding. Confirm whether TrueQR exposes an internal API/service this can call. *(Open question — verify.)*
- Cross-sell hooks: surface "you already use TrueQR" state if `trueqr_user_id` is linked; offer bundle pricing at this moment.

---

## 8. Auth, billing, tiers

- Auth: email + Google OAuth. Keep light.
- Billing: monthly subscription (Stripe assumed). No annual upfront in v1.
- Tier gates:
  - Free → one published page, subdomain only, badge shown, static QR, form-to-email.
  - Pro → multiple pages, custom domain (if shipped), badge removed, dynamic QR.
  - Bundle (TrueQR + TruePage) → discounted; requires linking `trueqr_user_id`.
- Enforce tier limits at publish time and on the dashboard, not just in UI.

---

## 9. Risks & flags for the build

- **Custom domains / DNS** is the most likely scope-buster. If it threatens the ship date, cut it to v1.1 and launch Pro on "badge removed + multiple pages + dynamic QR" alone. Flagged so it's a deliberate decision, not a surprise.
- **Hosting/abuse burden:** published pages = uptime, spam forms, and abusive content (phishing, etc.) that a stateless QR generator never had. Need at minimum: form rate-limiting, a slug denylist, and an abuse-report path. Reputational spillover onto TrueQR is a real threat (product spec SWOT).
- **AI output reliability:** schema validation + single retry + a safe fallback template if generation fails twice. Never show the user a broken page.
- **Per-page AI cost** must be validated against the ~$9–12/mo Pro price before scaling spend (product spec open question).
- **TrueQR infra reuse** for QR generation is assumed but unverified — confirm before estimating QR work.

---

## 10. Build sequence (suggested)

1. Data model + auth.
2. Generation engine: description → `content_json` → rendered preview (no publish yet). Prove the magic moment first.
3. Templates (small distinct set, mobile-first).
4. Section regenerate.
5. Publish pipeline + subdomain serving + badge injection.
6. QR generation/integration.
7. Contact form → email.
8. Billing + tier gates.
9. TrueQR cross-sell hook + bundle.
10. Abuse controls (don't ship publish without at least the minimum from §9).
11. (v1.1 candidate) Custom domains.

---

## 11. Open questions carried from product spec

- [ ] Confirm TrueQR exposes reusable QR generation (internal API/service).
- [ ] AI provider selection + per-page cost model.
- [ ] Final Pro price validated against the TrueQR list.
- [ ] Decide v1 vs v1.1 for custom domains.
- [ ] Subdomain + (optional) custom-domain infrastructure plan.
