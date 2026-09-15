# Shuvamstu Database Schema

## Conventions

- PostgreSQL UUID primary keys; `created_at`, `updated_at`, and optional `deleted_at` on mutable master data.
- Money is integer paise (`bigint` where totals aggregate); never floating point.
- Timestamps are `timestamptz`; local schedules also store local date/time and IANA timezone.
- `realm` is `LIVE | DEMO`. Realm is explicit on users/profiles and operational aggregates.
- Flexible JSON is limited to audited before/after snapshots, provider payloads and optional recurrence metadata.
- Public slugs are unique among non-deleted rows. Private IDs are never sequential public references.

## Identity and tenancy

### `users`

`id`, `realm`, `auth_provider`, `auth_subject`, `email`, `phone_e164`, `role (CUSTOMER|PUJARI|ADMIN)`, `status`, consent timestamps, last login, timestamps, deleted timestamp. Unique `(auth_provider, auth_subject)` and realm-safe email/phone indexes.

### `sessions`

Only if the chosen auth provider requires app-managed database sessions: hashed token, user, expiry, timestamps and revocation.

### `customer_profiles`

User PK/FK, display name, WhatsApp E.164, preferred language, privacy/export/deletion request state and timestamps.

### `pujari_profiles`

User PK/FK, slug, display name, bio, image key, years experience, verification status (`PENDING|VERIFIED|REJECTED|SUSPENDED`), online enabled, service radius, rating aggregates, completed/accepted/declined counters, sandbox flag, active and timestamps.

### `admin_profiles`

User PK/FK, display name and active.

## Geography and catalogue

### `cities`

`id`, `realm`, name, state, country, timezone, slug, launch stage, active and timestamps. Seed live cities Dhenkanal/Bhubaneswar/Cuttack; expansion cities are demo until activated deliberately.

### `service_areas`

`id`, city, name, pincode, optional latitude/longitude, active. A join table `pujari_service_areas` links supply to supported areas and may include travel fee/radius override.

### `languages`

Reference rows (`en`, `or`, `hi`, etc.); `pujari_languages` joins Pujaris with proficiency and `primary_language`.

### `specializations`

Controlled ritual/service tags; `pujari_specializations` joins profiles. These must never encode caste/community.

### `pujas`

`id`, `realm`, slug, name, short/full descriptions, duration, base min/max price, samagri required/kit available, online/temple capability, restrictions, disclaimer, active and timestamps. Optional localized text lives in `puja_translations` keyed by locale.

### `puja_packages`

`id`, puja, name, description, duration, service amount, platform fee, tax policy, inclusions, modes, active, display order and timestamps.

### `pujari_services`

Pujari, puja, optional package, price adjustment, duration override, modes, active. Unique active service mapping.

### `samagri_items`, `samagri_kits`, `samagri_kit_items`

Normalized item catalogue, puja/package kit with price and availability, and quantity/unit rows.

## Availability and matching

### `availability_rules`

Pujari, weekday, local start/end, timezone, effective range, recurrence frequency, active.

### `availability_exceptions`

Pujari, local date, available/blocked type, optional time range and reason.

### `matching_configs`

`id`, realm, name, version, eight integer weights, active, effective timestamp and admin actor. A constraint requires a total of 100 for active configs.

### `matching_runs`

Optional operational trace: booking/search correlation, config version and request facts. `matching_candidates` stores candidate score and factor breakdown JSON for admin explanation; it contains no inferred sensitive traits and has short retention.

## Booking

### `bookings`

`id`, `realm`, public reference, customer, city/service area, puja/package snapshot IDs, selected Pujari, mode, status, local date/time/timezone, scheduled start/end UTC, service address snapshot, language, purpose-limited ritual notes, meeting URL/instructions, quote totals, source/rebook parent, idempotency key and timestamps.

Money columns: `service_amount`, `pujari_amount`, `samagri_amount`, `platform_fee`, `travel_fee`, `discount_amount`, `tax_amount`, `gross_amount`, `refund_amount`, all in paise.

### `booking_assignments`

Booking, Pujari, assigned/unassigned timestamps, actor, reason, response (`PENDING|ACCEPTED|DECLINED|EXPIRED`) and response time. Partial unique constraint permits one active assignment.

### `booking_status_history`

Booking, from/to status, actor user/system, reason, metadata, timestamp. Append-only.

### `booking_items`

Booking, type (`SERVICE|SAMAGRI|PLATFORM_FEE|TRAVEL|DISCOUNT|TAX|ADJUSTMENT`), description snapshot, quantity, unit amount and total.

### `internal_notes`

Realm, entity type/id, admin author, body and timestamp. Never returned to customer/Pujari APIs.

## Customer retention and CRM

### `customer_addresses`

Customer, label, address fields, pincode, city, optional coordinates, default and timestamps.

### `favorite_pujaris`

Customer, Pujari and timestamp; unique pair, same-realm constraint.

### `customer_pujari_notes`

Pujari/customer, operational note, author and timestamps. Access is limited to that Pujari and admins; no sensitive inference fields.

Rebooking uses `bookings.rebook_parent_id`; history is derived rather than duplicated.

## Money

### `payments`

Booking, provider (`MANUAL|RAZORPAY`), method (`PAY_ON_CONFIRMATION|ONLINE_PAYMENT|CASH`), provider order/payment IDs, idempotency key, amount, currency, status, received/recorded timestamps, recorder and safe provider metadata.

### `payment_webhook_events`

Provider event ID/type, signature-valid flag, encrypted/redacted payload, processing state/error and timestamps. Unique provider event ID.

### `refunds`

Payment/booking, amount, reason, provider refund ID, status and timestamps.

### `pujari_settlements`

Pujari, period, amount, status, method/reference, recorded/paid timestamps and admin actor. `settlement_booking_items` links included bookings.

## Samagri

### `merchants`

Realm, name, private contact, city, address, notes and active.

### `merchant_service_areas`

Merchant/service-area join.

### `samagri_fulfilments`

Booking, kit, merchant, status (`NOT_REQUIRED|REQUESTED|ASSIGNED|PREPARING|READY|DELIVERED|CANCELLED`), promised/delivered timestamps and admin notes.

## Trust and communications

### `reviews`

Booking/customer/Pujari, overall 1-5, punctuality, professionalism, service experience, text, moderation status, moderator/reason, published timestamp and timestamps. Unique booking; database/application checks require completed same-realm booking ownership.

### `notification_events`

Realm, aggregate/type, template key, recipient user, channels requested and event payload with minimum necessary fields.

### `notification_deliveries`

Event, channel/provider, redacted destination, status, attempts, provider message ID, next attempt and error code.

### `audit_logs`

Realm, actor, action, entity type/id, reason, correlation ID, IP hash, before/after summaries and timestamp. Append-only and excluded from ordinary deletion.

## Analytics and configuration

### `analytics_manual_inputs`

Realm, city/date range, metric key (initially CAC and contribution-cost inputs), integer/decimal value, note and admin actor.

Operational metrics are queries/materialized summaries over bookings, items, payments, profiles and cities. A warehouse is deferred.

### `app_settings`

Realm-scoped versioned settings for configurable business rules (confirmation SLA, fee policy references, feature flags). Secret credentials are never stored here.

### `seed_runs`

Realm, seed version, checksum, executed timestamp and environment. Demo reset targets only demo-owned rows associated with the known seed version.

## Critical indexes and constraints

- Booking unique `(realm, public_reference)` and `(realm, idempotency_key)`.
- Availability indexes on Pujari/date/time and active rules.
- Search indexes on active city/puja/Pujari/service/language relations.
- Booking indexes on realm/status/scheduled start, customer, selected Pujari and city.
- Payment/refund provider IDs and webhook event IDs unique when present.
- Check constraints for ratings 1-5, non-negative money, scheduled end after start and valid time ranges.
- Composite realm FKs or transaction checks prevent live/demo relationships.
- Soft-deleted catalogue/supply cannot receive new bookings; historical foreign keys remain intact.

## Migration from current schema

1. Preserve migrations `001`-`006` unchanged.
2. Add realm and identity/catalogue tables without modifying existing data.
3. Backfill existing providers as live Pujari candidates requiring admin verification.
4. Map existing service slugs to new pujas and provider services.
5. Backfill existing bookings with price/realm fields and status mappings (`PENDING_CONFIRMATION` becomes `AWAITING_CONFIRMATION`).
6. Run dual-read validation, switch repository queries, then retire legacy tables only in a later release after reconciliation.

No destructive migration is part of the initial marketplace rollout.
