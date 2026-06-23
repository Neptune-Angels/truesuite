# True* Suite — Cross-Sell & Activation Spec (Build-Ready)

> How a TrueQR user becomes a TruePage user becomes a bundle subscriber.
> This is the mechanic the unit-economics model assumes but never specifies. The whole CAC thesis (70% of customers acquired cheaply via cross-sell) lives or dies here.
> Scope discipline: this defines the growth/activation surfaces and their instrumentation. Product internals stay in their own specs.

**Status:** v1 build spec
**Owner:** Conor
**Last updated:** June 2026
**Companion docs:** TrueSuite-Architecture-Spec.md, TrueSuite-Unit-Economics.xlsx, TruePage / TrueBook v1 specs

---

## 1. Why this is a spec, not a marketing afterthought

The unit-economics model assumes blended CAC stays low because ~70% of customers come from cross-selling the existing TrueQR base at ~$8 each rather than $45 paid acquisition. That single assumption produces the entire favorable economics. **If cross-sell underperforms, the suite's whole financial case weakens.**

So cross-sell is not "send some emails later." It's a set of product surfaces and flows that must be built, instrumented, and measured against the assumption. This spec defines them and — equally important — defines the metrics that tell you whether the thesis is holding.

The job to be done: move a user along this path, measuring conversion at every step.

```
TrueQR user → aware of TruePage → creates a page → publishes → upgrades to Pro/bundle → retained
TrueQR user → aware of TrueBook → connects calendar → takes a booking → upgrades → retained
```

---

## 2. The activation principle

Activation, not signup, is the goal. A TrueQR user who "signs up" for TruePage but never publishes a page has cost you nothing and earned you nothing. The metric that matters is the **activation event** for each product — the moment the user gets the core value — because activated users convert and retain, and un-activated ones churn regardless of how they arrived.

Define the activation event per product explicitly:

| Product | Signup (weak) | **Activation event (the real goal)** |
|---------|---------------|--------------------------------------|
| TruePage | Created an account / started a page | **Published a live page** (it has a real URL + QR) |
| TrueBook | Connected a calendar | **Received first real booking** (or: published a bookable page) |
| Bundle | Subscribed | **Used 2+ products in the same week** |

Every surface below is designed to drive toward the activation event, not just the click.

---

## 3. In-app cross-sell surfaces (the cheap-CAC engine)

These live inside the existing TrueQR product, where the captive audience already is. This is the ~$8 CAC channel — the cost is near-zero because the user is already yours.

### 3.1 The contextual upsell (highest-intent, build first)
- **Trigger:** the moment a TrueQR user generates or edits a QR code.
- **Surface:** inline, right after the code is created — "Your QR code needs somewhere to go. Build a landing page for it in 60 seconds." with a one-tap path into TruePage's describe-to-generate flow, pre-seeded with anything known about them.
- **Why here:** this is the single highest-intent moment in the entire suite. A QR code is *definitionally* pointing somewhere; the user is actively thinking about the destination. Catching them here is the conversion event with the best odds — build this surface before any other cross-sell.

### 3.2 Persistent product nav
- A simple product switcher (TrueQR / TruePage / TrueBook) visible across all surfaces, so awareness is ambient, not a one-time popup. Shared auth (Architecture §2) makes switching seamless — no re-login.

### 3.3 Dashboard nudge
- A dismissible card on the TrueQR dashboard surfacing the other products, keyed to behavior (e.g. a user with many QR codes but no pages is a prime TruePage target). Respect dismissal — re-nudging an uninterested user trains them to ignore you.

### 3.4 Empty-state and milestone moments
- TruePage's empty state suggests connecting a TrueQR code; a user hitting a usage milestone (10th QR code) gets a contextual bundle suggestion. Milestones are permission to ask; idle moments are not.

**Build priority within in-app:** 3.1 first (highest intent), then 3.2 (ambient awareness), then 3.3/3.4.

---

## 4. Activation flows by entry point

Different entry points need different flows. The cold visitor and the existing TrueQR user are not the same person and shouldn't get the same onboarding.

### 4.1 Existing TrueQR user → TruePage (the core cross-sell path)
```
1. Hits contextual upsell (§3.1) with intent.
2. Lands in describe-to-generate, PRE-FILLED: account known, maybe business name/logo
   already on file from TrueQR. Minimize typing — they've already given you data.
3. Sees a generated page in <10s (the magic moment, TruePage spec §2).
4. Claims slug → publishes → ACTIVATION EVENT.
5. QR auto-generated/linked to the page (scan-to-page loop closed).
6. Only AFTER activation: prompt the bundle upgrade. Value first, ask second.
```
Key rule: **do not gate the magic moment behind payment.** Let them generate and see the page free; charge for publish-with-custom-domain / badge removal / dynamic QR. The free generation IS the sales pitch.

### 4.2 Cold visitor → TruePage (the paid/SEO path, ~$45 CAC)
```
1. Arrives via SEO ("landing page for plumbers") or paid.
2. Describe-to-generate immediately — no signup wall before the magic moment.
3. Generate → preview → THEN signup to publish (signup at the value moment, not before).
4. Publish → activation. Introduce TrueQR/TrueBook only after first value.
```
Signup-before-value is the #1 activation killer for cold traffic. Let them taste first.

### 4.3 TruePage user → TrueBook (the second cross-sell)
```
1. Trigger: page is published AND the business looks appointment-based
   (TrueBook spec auto-detects this from the page description).
2. Inline on the published page editor: "Let customers book you. Add a booking
   block — it's already wired to your page."
3. One-tap: connect Google Calendar → set basic availability → booking block live.
4. ACTIVATION = first real booking received.
```
The zero-setup embed (TrueBook spec §3) is the entire pitch — "it's already wired to your page" is true, and that truth is the conversion lever.

---

## 5. Email / lifecycle sequences

Email backs up the in-app surfaces for users who didn't convert in-session. Keep them behavior-triggered, not blast.

### 5.1 TrueQR base activation (the big one-time unlock)
- A sequence to existing TrueQR users introducing TruePage, led by the QR→page connection ("your codes deserve a real destination"). This is the one-time harvest of the existing base — the cheapest customers you'll ever get. Segment by engagement; lead with the highest-intent users (most QR codes, most scans).

### 5.2 Behavior-triggered (ongoing)
| Trigger | Email |
|---------|-------|
| Created TruePage account, didn't publish in 48h | "Your page is one click from live" + the draft preview |
| Published a page, appointment-type business | Introduce TrueBook |
| Using 2 products standalone | Bundle-savings nudge (show the actual $ saved) |
| Pro trial / free user hitting a Pro-gated feature | Upgrade prompt at the moment of need |
| Payment past-due | Dunning (ties to Architecture §5 grace behavior) |

### 5.3 Rules
- Behavior-triggered > scheduled blasts. Relevance is the whole game with this buyer.
- Honor unsubscribes ruthlessly; respect SMS consent separately (Architecture §8 / TCPA).
- Every email drives to a single activation action, not a feature tour.

---

## 6. The bundle upgrade moment

When and how you ask for the bundle determines attach rate (the `% on bundle` lever in the unit econ model).

- **Never lead with the bundle.** Lead with one product's value. Ask for the bundle once the user has activated in one product and shows signal for a second.
- **Best moment:** user is active in product A and just hit the activation event (or a Pro gate) in product B. Now the bundle is obviously cheaper than two standalones — show the actual math ("$24 bundle vs $27 for these two separately").
- **Surface:** at the Pro-upgrade decision point, present bundle as the default/recommended option, standalone as the alternative. Default framing materially moves attach rate.
- **One-product users** who never show second-product signal: leave them on standalone. Forcing the bundle on a single-product user just raises churn.

---

## 7. Instrumentation (this is how you validate the CAC thesis)

Without this, the unit-economics model is unfalsifiable. Every surface above must emit events so you can measure the funnel and check it against the model's assumptions.

### Funnel events to capture (per user, per product)
```
cross_sell_surface_shown   { surface, source_product, target_product }
cross_sell_clicked         { surface, source_product, target_product }
product_signup             { product, acquisition_source, acquisition_product }  // ties to Architecture §2
activation_event           { product, time_since_signup }
upgrade_to_pro             { product, plan_type: standalone|bundle }
churned                    { product, plan_type, tenure_months }
```

### Metrics that validate (or break) the model
| Metric | Model assumption it tests | If it underperforms... |
|--------|---------------------------|------------------------|
| % of new customers from cross-sell | 70% (the core thesis) | Blended CAC rises toward $45; economics weaken |
| Cross-sell surface → activation rate | implied cheap conversion | The $8 CAC is fictional; recompute |
| Activation rate (signup → activation event) | retention/LTV basis | Un-activated users churn; LTV overstated |
| Bundle attach rate | `% on bundle` = 60% | ARPU and margin drop |
| Time-to-activation | — (leading indicator) | Friction in the flow; fix onboarding |

### The one dashboard to build
A single funnel view: TrueQR users → TruePage activated → bundle subscribed, with conversion % at each step and CAC-by-source. This dashboard is how you know, monthly, whether the suite's financial premise is real. Build it alongside the surfaces, not after.

---

## 8. Risks & anti-patterns

- **Over-nudging the base.** The existing TrueQR users are a finite, one-time-harvestable asset and your cheapest customers. Bombarding them with upsells trains them to ignore you and can drive churn on the product they already pay for. Frequency-cap cross-sell; respect dismissals.
- **Signup-before-value.** Gating the magic moment behind a signup or paywall is the top activation killer, especially for cold traffic. Value first.
- **Optimizing clicks over activation.** A high cross-sell click rate with low activation is worse than useless — it burns goodwill for no revenue. Measure to activation, not to click.
- **Forcing the bundle.** Pushing the bundle on single-product users with no second-product signal raises churn. Let signal lead.
- **Un-instrumented launch.** Shipping the surfaces without the §7 events means flying blind on the one thesis the whole model depends on. Instrumentation is part of the feature, not a follow-up.

---

## 9. Build sequence

1. Funnel instrumentation (§7) — the events, first, so everything else is measured from day one.
2. Contextual upsell at QR creation (§3.1) — highest-intent surface.
3. Pre-filled TruePage activation flow for existing TrueQR users (§4.1).
4. Cold-traffic activation flow, no signup wall before the magic moment (§4.2).
5. Product switcher + dashboard nudge (§3.2–3.3).
6. TrueQR base activation email sequence (§5.1) — the one-time harvest.
7. Behavior-triggered emails (§5.2).
8. TruePage → TrueBook cross-sell (§4.3).
9. Bundle upgrade moment + default framing (§6).
10. The funnel dashboard (§7).

---

## 10. Open questions / decisions for Conor

- [ ] What's the actual size and engagement profile of the existing TrueQR base? The whole cross-sell thesis scales with this — it's the input the unit-econ model most needs validated.
- [ ] Define each product's activation event precisely (proposed in §2 — confirm).
- [ ] Email platform: build on the shared notifications module (Architecture §6) or use an external ESP for lifecycle? (Lean: lifecycle email may justify an ESP; transactional stays in-module.)
- [ ] Frequency cap policy for cross-sell nudges (how often is too often for this base?).
- [ ] Is there existing TrueQR usage data to pre-fill TruePage flows (business name, logo)? Pre-fill quality directly affects §4.1 conversion.
- [ ] Bundle pricing display — confirm the standalone-vs-bundle math shown to users matches the unit-econ pricing.
