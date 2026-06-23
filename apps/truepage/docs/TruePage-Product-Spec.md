# TruePage.co — Product & Strategy Spec

> AI-driven landing page builder for local small businesses.
> Sister product to TrueQR.co. The page *and* the QR code, as one workflow.

**Status:** v1 planning
**Owner:** Conor
**Last updated:** June 2026

---

## 1. One-line thesis

The page and the code as a single product, for local businesses who already use TrueQR. Not "another AI landing page builder" — the destination layer for QR codes, owned by the company that already makes the codes.

---

## 2. Positioning

Competing as a general AI landing page builder is a losing game: the market is saturated (Wix, Squarespace, Jotform, Sitekick, Landingi, Landingsite.ai, Landing-page.io), and "describe it → AI builds it" plus "build around your uploaded assets" are now table stakes, not differentiators. Incumbents have more capital, better SEO, and a multi-year head start.

TruePage wins on **distribution and niche**, not features:

- **Wedge:** the QR-to-page loop. A local business puts a QR code on a flyer, vehicle, or table tent. Today that points to a clunky Linktree or a Facebook page. TruePage *is* the destination — describe your business, upload a logo, get a clean mobile page, and the matching QR code is generated in the same flow.
- **Defensible position:** no incumbent owns "the page and the code as one unit for local businesses." That's the brand to claim early.
- **Strategic guardrail:** TruePage must stay fused to TrueQR. If it drifts into a standalone general-purpose builder, the distribution moat evaporates and we're competing head-on with far better-funded tools.

---

## 3. Target customer

Same buyer as TrueQR:

- Local, service-based small businesses (under ~10 employees).
- Non-technical, price-sensitive, mobile-first.
- Need *one good page fast* — not a CMS, not a funnel, not A/B testing.
- Examples: plumber, salon, food truck, dog groomer, mobile detailer, tutor.

Underserved by high-end tools (Instapage ~$79/mo, Unbounce) and over-served in complexity by Wix/Squarespace. The unfair advantage: we already have a list of these people through TrueQR.

---

## 4. v1 product scope (ship fast & cheap)

Keep v1 deliberately thin. The AI does exactly two things:

1. **Describe → generate.** Turn a plain-language business description into a structured single page: hero, services, hours, contact, CTA.
2. **Build around assets.** Arrange uploaded assets (logo, photos, brand colors) into that page.

Core requirements:

- Mobile-first by default (QR scans are ~all mobile).
- Publish to a `truepage.co/yourbusiness` subdomain; custom domain on paid tier.
- Auto-generate the matching QR code in the same flow.
- Editing via "regenerate this section" AI prompts — **not** a drag-and-drop editor in v1 (cheaper to build, on-brand).

Explicitly out of scope for v1: drag-and-drop editor, A/B testing, funnels, multi-page sites, e-commerce, blog/CMS.

---

## 5. Monetization (recurring revenue from day one)

Hosting is the recurring hook. One-time generators don't retain; a *hosted* page does.

| Tier | Price | Includes |
|------|-------|----------|
| Free | $0 | One page on a `truepage.co` subdomain, TruePage badge, basic QR. Drives viral loop + SEO. |
| Pro | ~$9–12/mo | Custom domain, badge removed, multiple pages, form submissions to email, dynamic QR (editable destination). |
| Bundle | Discounted | TrueQR + TruePage together — the real strategic play; raises switching costs on both products. |

Pricing principles: price low, bill monthly. This buyer churns if asked for an annual commitment upfront — win stickiness through the bundle, not lock-in.

---

## 6. Go-to-market

The one unfair advantage is the existing TrueQR user base and traffic. Lead with it.

- Cross-sell inside TrueQR: "turn your QR code into a real page."
- Add a TruePage upsell at the moment someone generates a code.
- Email the existing TrueQR list.
- Programmatic SEO on "landing page for [trade]" templates (plumber, salon, food truck, etc.).
- Free-tier hosted pages each carry a subtle TruePage link for compounding organic reach.

---

## 7. SWOT

### Strengths
- Existing distribution and buyer relationship via TrueQR — the single biggest asset; no competitor has it against this audience.
- Unique QR + page integration as one workflow.
- Build/host/bill plumbing already understood from shipping TrueQR.
- Lean cost structure; AI generation is cheap per page.

### Weaknesses
- Low feature parity vs incumbents; entering a saturated category late.
- Single-founder bandwidth split across TrueQR, TruePage, and other commitments.
- Hosting adds real support burden (uptime, custom domains, abuse) a stateless QR generator doesn't have.
- No moat at the technology layer; the AI is a commodity API call.

### Opportunities
- Bundle pricing deepens TrueQR retention — TruePage can make the whole ecosystem stickier even if modest standalone.
- Per-trade vertical templates are an SEO and conversion edge incumbents treat generically.
- Local-business adjacencies (digital menus, review pages, booking) become natural hosted-page add-ons.
- "Page + code as one unit" can become a defensible brand position if claimed early.

### Threats
- Incumbents (Wix, Jotform, Squarespace) can add QR generation trivially and outspend us.
- Commodity AI means near-identical tools launch monthly; price compression is real.
- Hosting reliability/abuse problems can damage the TrueQR brand by association.
- Platform risk on the underlying AI provider (pricing, rate limits, terms).

---

## 8. Key risk to monitor

The priority ranking puts differentiation last. That's defensible *only because* the moat is distribution, not product — which holds only as long as TruePage stays tightly fused to TrueQR. Keep the QR loop central in every product and marketing decision.

---

## 9. Open questions / next steps

- [ ] Unit economics: CAC from the TrueQR base, hosting cost per page, LTV at bundle price.
- [ ] v1 feature spec in build-ready detail (data model, generation flow, publish pipeline).
- [ ] Cross-sell flow design inside TrueQR.
- [ ] AI provider selection and per-page cost modeling.
- [ ] Subdomain + custom domain infrastructure plan.
- [ ] Pricing validation against the existing TrueQR user list.
