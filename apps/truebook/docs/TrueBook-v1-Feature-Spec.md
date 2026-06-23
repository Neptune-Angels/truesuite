# TrueBook.co — v1 Feature Spec (Build-Ready)

> Companion to TrueBook-Strategy-Plan.md. This is what you build v1 against.
> Scope discipline: if it isn't in this file, it isn't in v1.
> Guiding principle from the strategy: **reliability over novelty.** The boring core must be rock-solid before anything clever ships.

**Status:** v1 build spec
**Owner:** Conor
**Last updated:** June 2026
**Related:** TruePage-v1-Feature-Spec.md (embed target), TrueQR (scan-to-book)

---

## 1. Scope boundary (read first)

**In v1:**
- Embeddable booking block that drops natively into any TruePage page (zero-setup — the whole point).
- Two-way Google Calendar sync (Outlook/iCloud fast-follow, not v1).
- Service types with duration + buffer.
- Availability rules (hours, days off, lead time, booking window).
- Booking flow: pick service → pick slot → enter details → confirm.
- Email + SMS confirmations and reminders.
- Scan-to-book QR via TrueQR.
- Owner dashboard: upcoming bookings, cancel/reschedule, availability config.

**Explicitly NOT in v1:**
- Payments / deposits at booking — **highest-priority v1.1**, not v1 (see §10). PCI surface is the reason it's not v1, not low value.
- AI voice/call answering.
- Conversational/natural-language booking (v1.1 candidate).
- Multi-location, round-robin, commission structures, staff > a small fixed set.
- Waitlist auto-fill (v1.1).
- Outlook/iCloud sync (fast-follow).

---

## 2. Core flows

### Customer booking flow (the public path)
```
1. Scan QR or open TruePage page → booking block visible inline.
2. Choose a service (shows duration, e.g. "Haircut — 45 min").
3. See real-time available slots (computed from availability rules − calendar conflicts − existing bookings − buffers).
4. Pick a slot.
5. Enter name + phone/email (minimal fields; this buyer's customers are on phones).
6. Confirm → booking created, calendar event written, confirmation sent.
```
Perceived speed and mobile ergonomics are the conversion levers — most bookings arrive via QR scan on a phone.

### Owner setup flow
```
1. From TruePage dashboard (or TrueBook directly): "Add booking to my page."
2. Connect Google Calendar (OAuth).
3. Define services (name, duration, buffer).
4. Set availability rules.
5. Booking block auto-appears on the linked TruePage page. Scan-to-book QR generated.
```

### Owner management flow
- Dashboard lists upcoming bookings; cancel/reschedule (triggers customer notification); edit availability and services.

---

## 3. The TruePage embed contract (the load-bearing integration)

This is what makes TrueBook the suite's connective tissue rather than a standalone clone. Zero-setup embedding is the entire value proposition — treat it as first-class.

### How it attaches
- TruePage's `content_json` (see TruePage spec §4) gains an **optional** section:

```json
"booking": {
  "enabled": true,
  "truebook_business_id": "uuid",
  "heading": "Book an appointment",
  "default_service_id": "uuid | null"
}
```

- The TruePage renderer, when it sees `booking.enabled`, mounts the TrueBook booking widget (an iframe or a script-injected web component — see decision below) keyed to `truebook_business_id`.
- The TrueBook AI generator in TruePage can set `booking.enabled` automatically when a user's description implies appointments ("by appointment," "book a slot," service-based trade). This is the cross-product magic moment: the page *and* the booking come from one description.

### Embed mechanism decision (resolve before build)
- **Option A — iframe widget.** Pros: hard isolation, no CSS/JS collisions with the generated page, simplest to ship and version. Cons: harder to style to match the page's brand color, slightly heavier.
- **Option B — web component / script embed.** Pros: inherits page styling, lighter, smoother UX. Cons: CSS/JS collision risk with generated templates (TruePage spec §10 already warns about selector specificity), harder to sandbox.
- **Recommendation:** ship **iframe (Option A)** for v1 for reliability and isolation; pass `brand_color` as a URL param so the widget can theme itself to match. Revisit web component in v1.1 once template CSS is stable.

### Data passed to the widget
- `truebook_business_id` (required), `brand_color` (theming), optional `default_service_id`.
- The widget fetches services + availability from TrueBook's API at load; the page never holds booking state. This keeps the page static/cacheable (TruePage publish pipeline §6) while bookings stay live.

---

## 4. Data model

Relational (Postgres assumed). Aligns with TruePage/TrueQR `user`/account model — a TrueBook `business` links to the same owner account.

### businesses
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | the `truebook_business_id` used in embeds |
| user_id | uuid (fk) | same account system as TruePage/TrueQR |
| truepage_page_id | uuid (nullable) | linked page if embedded |
| timezone | text | IANA tz (e.g. America/Los_Angeles) — critical, see §7 |
| brand_color | text | for widget theming |
| created_at / updated_at | timestamptz | |

### services
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| business_id | uuid (fk) | |
| name | text | "Haircut" |
| duration_min | int | |
| buffer_before_min | int | default 0 |
| buffer_after_min | int | default 0 |
| active | boolean | |

### availability_rules
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| business_id | uuid (fk) | |
| day_of_week | int | 0–6 |
| start_time | time | local to business timezone |
| end_time | time | |
| lead_time_min | int | min notice before a booking (e.g. 120) |
| booking_window_days | int | how far out bookings allowed (e.g. 30) |

### availability_exceptions
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| business_id | uuid (fk) | |
| date | date | |
| closed | boolean | day off / holiday |
| start_time / end_time | time (nullable) | override hours for that date |

### bookings
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| business_id | uuid (fk) | |
| service_id | uuid (fk) | |
| customer_name | text | |
| customer_phone | text (nullable) | |
| customer_email | text (nullable) | |
| start_at | timestamptz | stored UTC, rendered in business tz |
| end_at | timestamptz | |
| status | text | `confirmed` / `cancelled` / `completed` / `no_show` |
| calendar_event_id | text (nullable) | external event ref for sync |
| created_at / updated_at | timestamptz | |

### calendar_connections
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| business_id | uuid (fk) | |
| provider | text | `google` (v1) |
| access_token / refresh_token | text (encrypted) | OAuth — secrets, encrypt at rest |
| calendar_id | text | which calendar to read/write |
| sync_token | text (nullable) | for incremental sync |
| status | text | `active` / `needs_reauth` |

### notifications
| field | type | notes |
|-------|------|-------|
| id | uuid (pk) | |
| booking_id | uuid (fk) | |
| channel | text | `email` / `sms` |
| type | text | `confirmation` / `reminder` / `cancellation` / `reschedule` |
| send_at | timestamptz | |
| sent_at | timestamptz (nullable) | |
| status | text | `pending` / `sent` / `failed` |

---

## 5. Availability computation (the core algorithm)

This is the heart of the product and the most bug-prone. Get it right and reliable above all else.

```
available_slots(business, service, date_range):
  1. Generate candidate slots from availability_rules for each day in range,
     stepped by a slot granularity (e.g. service.duration_min or a fixed 15-min grid).
  2. Apply availability_exceptions (closed days, overridden hours).
  3. Subtract existing bookings (status = confirmed) + their buffers.
  4. Subtract busy blocks from the synced external calendar (the conflict check).
  5. Enforce lead_time_min (no slots sooner than now + lead time, in business tz).
  6. Enforce booking_window_days (no slots beyond the window).
  7. Return slots in the business timezone; convert to UTC for storage.
```

Hard rules:
- **All slot math happens in the business's timezone, then converts to UTC for storage.** Timezone/DST bugs are the #1 source of double-bookings — this is non-negotiable.
- The conflict check (step 4) is the single most important trust feature. If the external calendar read fails, **fail safe**: do not show slots that can't be verified as free, rather than risk a double-booking. Surface a soft error, not a wrong availability.
- Slot generation must be deterministic and idempotent.

---

## 6. Calendar sync architecture (biggest build/cost decision)

Two-way sync is the make-or-break reliability feature.

### Build vs. buy
- **Buy (unified API — Nylas / Cronofy):** fast path to Google + Outlook + iCloud, handles token refresh and edge cases. Cost: per-connected-account fee that compresses margin on a bundle-priced product. **Recommended for v1** to de-risk the hardest part and ship reliably.
- **Build (direct Google Calendar API):** cheaper at scale, full control, but you own all the token/refresh/incremental-sync/edge-case complexity. Defer to later only if unit economics demand it.
- **Decision owner:** Conor — this fork drives both timeline and unit economics (flagged in strategy §10).

### Sync mechanics (v1, Google)
- **Read (conflict check):** on booking-block load and before confirming a slot, read busy blocks. Use incremental sync (`sync_token`) where possible; cache briefly but **re-verify at the moment of confirmation** to prevent races.
- **Write:** on confirmed booking, create a calendar event; store `calendar_event_id`. On cancel/reschedule, update/delete it.
- **Reauth:** detect expired/revoked tokens, set connection `needs_reauth`, and prompt the owner — never silently show stale availability.

### Race condition (must handle)
- Two customers grabbing the same slot simultaneously: enforce at the database with a uniqueness/locking strategy on `(business_id, start_at)` for confirmed bookings, plus a final conflict re-check inside the booking transaction. Last-write-loses with a clean "slot just taken, pick another" message.

---

## 7. Timezones (its own section because it's the top failure mode)

- Store every `start_at`/`end_at` in UTC.
- Store and always render in the business's IANA timezone.
- Compute all availability in business tz, accounting for DST transitions.
- Show the customer the time in the business's timezone explicitly labeled (a salon's walk-in customer is local; don't auto-convert to the device tz and cause confusion). Revisit multi-tz display only if a real use case appears.

---

## 8. Notifications

- Confirmation: immediately on booking (email + SMS where phone present).
- Reminder: the proven no-show reducer. Default 24h-before email + ~2h-before SMS (configurable later; ship sensible defaults in v1).
- Cancellation / reschedule: triggered by owner or customer action; include a reschedule link.
- Delivery: queue rows in `notifications` with `send_at`; a worker processes due rows. Idempotent — never double-send. Log failures; retry with backoff.
- SMS is a paid-tier feature (strategy §7); email available on free.

---

## 9. Owner dashboard (v1, minimal)

- Upcoming bookings list (today / this week), with cancel + reschedule.
- Service management (CRUD: name, duration, buffers).
- Availability rules + exceptions editor.
- Calendar connection status + reconnect.
- Embed status: which TruePage page the block is on; the scan-to-book QR.
- Keep it thin — this buyer wants to set it once and forget it.

---

## 10. v1.1 priorities (named so they're not forgotten)

1. **Payments / deposits at booking** (Stripe). Highest-value paid feature — deposits cut no-shows far more than reminders. Held out of v1 only for PCI/chargeback surface, not value. Build right after the core is stable.
2. Conversational / natural-language booking (the one honest AI play).
3. Waitlist auto-fill on cancellation.
4. Outlook + iCloud sync.
5. Web-component embed (replace iframe) once template CSS is stable.

---

## 11. Risks & flags for the build

- **Reliability is existential** (strategy §9): a double-booking or missed reminder damages trust across the *entire* suite, not just TrueBook. The conflict check and timezone math get the most testing.
- **Fail safe on calendar read failure:** hide unverifiable slots rather than risk double-booking.
- **Race conditions:** DB-level enforcement + final re-check in the booking transaction. Don't rely on cached availability alone.
- **OAuth secrets:** encrypt calendar tokens at rest; handle revocation gracefully.
- **Support load** will exceed TrueQR + TruePage combined — plan for it (strategy §9).
- **Don't detach from the loop:** v1 ships the embed first. A standalone booking page with no TruePage/TrueQR tie is the failure mode that drops us into the knife fight we chose to avoid.

---

## 12. Build sequence (suggested)

1. Account/business model + Google Calendar OAuth connection.
2. Services + availability rules + exceptions.
3. **Availability computation engine** (§5) with timezone correctness — prove this first; it's the core.
4. Calendar conflict read (build-vs-buy decided) + fail-safe behavior.
5. Booking flow + booking write to calendar + race-condition handling.
6. Notifications (email first, then SMS) via queue + worker.
7. TruePage embed contract (§3) — iframe widget themed by brand color.
8. Scan-to-book QR via TrueQR.
9. Owner dashboard.
10. Bundle pricing + tier gates across the suite.
11. (v1.1) Payments at booking — prioritize.

---

## 13. Open questions carried from strategy

- [ ] Calendar sync build vs. buy (Nylas/Cronofy vs. direct Google) — biggest cost/timeline fork.
- [ ] Confirm TrueQR exposes reusable QR generation for scan-to-book (shared open question with TruePage).
- [ ] Finalize embed mechanism (iframe v1, recommended) and the exact `content_json.booking` contract with TruePage.
- [ ] Bundle pricing across all three products, validated against the TrueQR list.
- [ ] Per-account calendar-API cost modeled against bundle price (depends on build-vs-buy).
- [ ] Decide v1.1 commitment level for conversational booking.
