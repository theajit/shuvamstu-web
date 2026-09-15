# Shuvamstu Product Requirements

## Product thesis

Shuvamstu is a two-sided religious-services marketplace for booking verified Pujaris and, behind that marketplace, a lightweight operating system for Pujaris and city operations. The first live market is Dhenkanal, followed by Bhubaneswar and Cuttack. The product must prove reliable fulfillment of 100 completed bookings before adding unrelated verticals.

The attached execution instruction supersedes the earlier Phase 1-only boundary. This release contains:

- a production-ready transaction core for the first customers;
- a working Phase 2 Pujari OS and retention loop;
- demo-ready multi-city and investor analytics features, clearly labelled as illustrative;
- no Phase 3 marketplace verticals or expensive infrastructure.

## Users and jobs

### Customer

Find a suitable, verified Pujari; understand the full price; book a specific time and service mode; track fulfillment; and confidently book again.

### Pujari

Maintain a profile, services, pricing, service area and availability; respond to requests; run the day's work; see customer history, ratings, performance and settlements on a phone.

### Founder/admin

Operate exceptions without database access: verify supply, configure catalogue and cities, assign or reassign bookings, adjust fulfillment, record money movement, moderate reviews, inspect audit history and understand marketplace performance.

## Release scope

### Production core

1. Customer signup/login, profile, saved addresses and favorites.
2. Public puja and verified-Pujari discovery.
3. Location, language, mode, date and time capture.
4. Deterministic eligibility and configurable ranking.
5. Package, samagri and transparent price selection.
6. Booking creation, status history and customer tracking.
7. Pujari acceptance/decline, service progress and completion.
8. Admin assignment, overrides, notes and audit logs.
9. Payment/refund abstraction and manual settlement recording.
10. Samagri partner assignment and fulfillment status.
11. Completed-booking-only reviews and moderation.
12. Booking history, favorite Pujari and streamlined rebooking.
13. Notification outbox with mocked WhatsApp/SMS/email adapters until credentials exist.

### Phase 2 Pujari OS

- day/week/month calendar;
- one-off blocks and recurring availability;
- catalogue, pricing, radius, modes, languages and specializations;
- upcoming/history/customer views;
- earnings and settlement views;
- ratings, acceptance, completion and repeat-customer metrics.

### Demo-ready scale layer

- live/demo data partition and conspicuous `Demo / Illustrative Data` label;
- 6-8 demo cities, about 50 fictional demo Pujaris, 500 customers and 1,000 bookings;
- city and investor analytics using only the selected data mode;
- deterministic reset available only in non-production environments;
- a 7-10 minute founder demo path across customer, Pujari, admin, matching, retention and scale.

## Canonical customer journey

1. Select a puja.
2. Select city/location, address/pincode, date and time.
3. Optionally specify language and purpose-limited ritual notes; select in-person, online or temple mode.
4. View eligible verified Pujaris ranked by deterministic score.
5. Choose a Pujari and package.
6. Choose own samagri or a complete kit.
7. Review an itemized, immutable-at-submission price quote.
8. Sign in or provide the minimum customer details.
9. Submit the booking and receive a reference/status page.
10. Track confirmation, assignment, service and completion.
11. Review the completed service or book it again.

## Marketplace rules

- Availability is mandatory for a recommended time; unavailable Pujaris are excluded.
- Only active, verified, non-demo Pujaris appear in live customer results.
- Demo records never contribute to live metrics.
- The booking stores price snapshots; later catalogue changes cannot alter an existing total.
- Every state change writes a status-history row in the same transaction.
- Admin overrides require a reason and create an audit entry.
- A Pujari can access private booking details only after assignment.
- Reviews require a completed booking owned by the reviewing customer and are unique per booking.
- Religious/tradition notes are optional, purpose-limited and never used to infer caste or other sensitive traits.

## Booking states

`REQUESTED -> AWAITING_CONFIRMATION -> CONFIRMED -> PUJARI_ASSIGNED -> IN_PROGRESS -> COMPLETED`

Terminal/financial exception states are `CANCELLED`, `REFUND_PENDING`, and `REFUNDED`. Valid transitions are centralized in domain code. Admin may override with a recorded reason; an override does not erase prior history.

## Matching

Eligibility gates precede scoring: active/verified, data mode, service, city/service area, mode and availability. Default score weights are service 30, geography 20, language 15, specialization 10, rating 10, completion 5, acceptance 5 and previous relationship 5. Admin can configure weights, and the system versions the configuration used. Customers see “Recommended”; only admins see score explanations.

## Success measures

Primary: completed live bookings, completion rate, cancellation rate, repeat booking rate and contribution margin. Supporting measures: conversion, AOV, GMV, net platform revenue, take rate, Pujari acceptance, active Pujaris, bookings per Pujari and samagri attach rate.

Investor demo data is illustrative and is never presented as company traction.

## Explicit cuts

The release excludes native apps, proprietary video, astrology marketplace, donations, temple accounting, national prasad logistics, AI priest/astrology, ML recommendations, blockchain/crypto, subscriptions and automated nationwide logistics. It also cuts automated Pujari payouts, a merchant-facing app, religious-calendar automation, customer-to-Pujari direct messaging, route optimization and multi-provider payment orchestration.

## Founder decisions required

The implementation keeps these configurable or disabled until decided:

1. Authentication provider and production login method (recommended: managed email/phone OTP; demo credentials only outside production).
2. Cancellation windows, refund rules and who absorbs payment fees.
3. Platform/convenience fee, tax treatment, discount authority and travel-fee formula.
4. Whether customer payment happens at request, confirmation or both by package/city.
5. Exact service-area model for launch (pincode allowlist recommended; radius can supplement it).
6. Pujari response SLA and auto-expiry/reassignment behavior.
7. When customer/Pujari phone numbers are revealed and whether calls are masked.
8. Merchant commercial terms and delivery responsibility for samagri.
9. Review publication/moderation default.
10. Production support and WhatsApp numbers, privacy/terms text, and legal entity/GST details.
11. Whether `TEMPLE` mode is available to live customers at launch or demo-only.
12. Odia copy review process; architecture supports locale fields but no unreviewed translation is shipped.

## Milestones

1. Product contract: requirements, architecture, schema and baseline verification.
2. Foundation: migrations/ORM, seed modes, auth/session/RBAC, cities, catalogue, profiles and admin CRUD.
3. Marketplace: public discovery, availability, matching, packages and booking/pricing flow.
4. Operations: admin booking workbench, notifications, payments, refunds, settlements and samagri.
5. Role products: customer account/retention and mobile Pujari OS.
6. Trust and insight: reviews, analytics, audit views and demo/live safeguards.
7. Demonstration: deterministic demo seed/reset, scripts and polished end-to-end journeys.
8. Release: responsive/accessibility, integration/security tests, deployment documentation and production checklist.

Each milestone must leave the application runnable and preserve existing public routes until replacements are verified.
