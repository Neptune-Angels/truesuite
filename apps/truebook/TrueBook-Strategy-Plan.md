# TrueBook.co — Strategy Plan

> Booking as the connective tissue of the True* suite.
> Not a Calendly competitor. The layer that turns TrueQR + TruePage into one workflow with switching costs.

**Status:** Strategy / planning
**Owner:** Conor
**Last updated:** June 2026
**Companion docs:** TruePage-Product-Spec.md, TruePage-v1-Feature-Spec.md

---

## 1. The reframe (read first)

Standalone appointment booking is the most commoditized idea in the suite. Square Appointments, Calendly, Setmore, and Cal.com all have free tiers; Acuity owns service businesses; ServiceAgent/Goodcall own AI call-answering. The "AI" features (natural-language booking, smart reminders, waitlist auto-fill, no-show reduction) are already standard table stakes, not differentiators. Reminders cutting no-shows 30–77% is a feature every paid tool already ships.

**So we do not compete as a standalone booking tool. We would lose on features, price, and incumbency.**

Instead, TrueBook is the connective tissue. The moat is the loop no competitor can assemble:

```
Scan QR (TrueQR) → Land on page (TruePage) → Book appointment (TrueBook)
   → Reminder → Show up → Rebook
```

Calendly cannot build the front half of that loop. TrueQR and TruePage already own it. Booking is what converts three cheap tools into one sticky workflow — and raises switching costs on all three at once.

---

## 2. Positioning

- **Not:** "a better/cheaper Calendly."
- **Is:** "the booking step in the suite your QR code and landing page already live in."
- The buyer doesn't adopt TrueBook because it beats Acuity on features. They adopt it because it's already wired into the page their QR code points at, with zero additional setup. Integration *is* the value proposition.
- Where "AI" is honest: conversational/after-hours capture (34% of bookings happen after-hours). Where "AI" is a stretch: everything else. Don't oversell AI; sell the loop. Lead with "your QR code now takes bookings," not "AI-powered scheduling."

---

## 3. Target customer

Same as the rest of the suite, narrowed to the slice that books appointments:

- Local, appointment-based service businesses: salons, barbers, mobile detailers, trades (plumbers, electricians), tutors, pet groomers, lash/nail techs.
- Already the TrueQR/TruePage buyer — non-technical, price-sensitive, mobile-first, walk-up/flyer-driven demand.
- Specifically the subset whose customers discover them physically (a sign, a vehicle wrap, a flyer, a storefront) — exactly where a QR code converts a passerby into a booking.

---

## 4. Strategic role in the suite

TrueBook's job is not standalone revenue maximization. Its job is:

1. **Justify the bundle.** Three tools at a combined price beats three separate subscriptions to anyone — and beats Calendly because Calendly can't do the QR→page→book loop.
2. **Raise switching costs.** Once a business's bookings flow through TrueBook, leaving means rebuilding their QR destination, their page, *and* their calendar. That's the retention play the whole suite has lacked.
3. **Deepen the data loop.** Bookings = the highest-intent signal a local business generates. That data makes every other product (reminders, rebooking nudges, future add-ons) smarter.

Booking is the keystone, not a fourth disconnected app.

---

## 5. Product scope (v1 — deliberately boring)

The hard-won lesson from the market: the value in booking is reliability, not novelty. Build the boring core *well* before any AI.

**v1 core (must be rock-solid):**
- Embeddable booking block that drops natively into any TruePage page (this is the whole point — zero-setup integration).
- Two-way Google Calendar sync (Outlook/iCloud fast-follow). Conflict checking = the #1 trust feature.
- Service types with durations + buffer times.
- Availability rules (hours, days off, lead time, booking window).
- Email + SMS confirmations and reminders (the proven no-show reducer).
- Booking-attached QR via TrueQR ("scan to book").

**v1 explicitly NOT included:**
- AI voice/call answering (expensive to build + run; ServiceAgent/Goodcall own it; revisit only if the suite demands it).
- Multi-location, complex staff/round-robin, commission structures.
- Native payments at booking — **but see §7; this may be the most important v1.1 item, not a "later."**

---

## 6. Where AI earns its place (and where it doesn't)

Be honest about this internally so we don't burn build time on theater.

| Capability | Real value? | v1? |
|-----------|-------------|-----|
| SMS/email reminders | High (proven no-show cut) | Yes — but this is automation, not "AI." |
| Natural-language booking ("Tuesday afternoon") | Moderate; already standard | Maybe — nice-to-have, low cost if layered on existing AI stack |
| Auto-fill booking details from description | Low/moderate | Defer |
| Conversational after-hours capture (chat) | High (34% after-hours) | v1.1 — the one genuinely differentiating AI play |
| AI voice call answering | High value, high cost | No — incumbents own it; revisit much later |
| Waitlist auto-fill on cancellation | Moderate | v1.1 |

The guiding rule: ship the boring reliable core first, layer AI only where it captures revenue the core can't (after-hours/conversational), and never market AI we don't meaningfully have.

---

## 7. Monetization

- TrueBook is primarily a **bundle lever**, not a standalone revenue center. Price it to make the suite irresistible, not to maximize standalone ARPU.
- Suggested structure:
  - **Free:** basic booking block on a TruePage page, calendar sync, email reminders, TrueBook badge.
  - **Pro (suite bundle):** TrueQR + TruePage + TrueBook together at a discount vs. buying separately — SMS reminders, no-show protection, dynamic QR, custom domain, removed badges.
  - **Payments at booking (v1.1):** deposits / no-show fees via Stripe. The data is consistent — deposits cut no-shows 60–80%, far more than reminders alone. This is likely the single highest-value paid feature and a strong standalone upsell. Prioritize it right after the core.
- Avoid per-booking fees that scale unpredictably; this buyer hates surprise pricing.

---

## 8. SWOT

### Strengths
- The QR→page→book loop is unique; no booking competitor can assemble the front half.
- Existing distribution + buyer relationship across TrueQR/TruePage.
- Zero-setup integration into TruePage = near-frictionless adoption for existing users.
- Booking data deepens the whole suite's stickiness and intelligence.

### Weaknesses
- Most commoditized category of the three; relentless free competition.
- Booking is operationally heavy: calendar sync bugs, timezone edge cases, double-booking, and reliability expectations are unforgiving — far more support burden than a QR generator or static page.
- Single-founder bandwidth now split across three products.
- "AI" angle is genuinely thin for most of the feature set; risk of overselling.

### Opportunities
- Bundle economics: TrueBook can lift retention/ARPU across the whole suite even if modest standalone.
- Payments at booking (deposits/no-show fees) is high-value, proven, and a clean upsell.
- After-hours conversational capture is the one honest, differentiating AI play.
- Vertical-specific booking flows (salon vs. trades vs. tutor) mirror the TruePage template strategy and compound the suite's local-SEO footprint.

### Threats
- Incumbents (Square, Calendly, Acuity) are entrenched, free, and can add a QR/page veneer.
- Calendar-sync reliability problems can damage trust across the *entire* suite by association — the booking failure mode is more visible and more damaging than a bad landing page.
- Payment handling introduces compliance/PCI surface and chargeback/abuse exposure.
- Platform risk: dependence on Google/Outlook calendar APIs and their terms.

---

## 9. Key risks to watch

- **Reliability is existential.** A landing page that looks plain is forgivable; a booking that double-books or a reminder that doesn't fire destroys trust in the whole suite. The core must be boringly reliable before anything clever ships.
- **Don't let it become a standalone Calendly clone.** The moment TrueBook is sold/used detached from the QR→page loop, the moat is gone and we're in the knife fight we chose to avoid.
- **AI honesty.** Market the loop and the reliability, not AI we don't have. Overselling AI in a category where buyers can instantly test it is a credibility risk.
- **Support load.** Plan for booking support being heavier than TrueQR + TruePage combined. Budget for it or it eats the founder.

---

## 10. Open questions / next steps

- [ ] Confirm TrueQR exposes reusable QR generation for "scan to book" codes (same open question as TruePage).
- [ ] Define the TruePage embed contract — how the booking block drops into a generated page with zero setup.
- [ ] Decide v1 vs v1.1 line for payments-at-booking (recommend prioritizing it — highest-value paid feature).
- [ ] Calendar-sync build vs. buy (e.g., a unified calendar API like Nylas/Cronofy vs. direct Google/Outlook integration) — this is the biggest build/cost decision.
- [ ] Bundle pricing model across all three products, validated against the existing TrueQR list.
- [ ] Decide whether conversational after-hours capture is a v1.1 commitment or a later experiment.
