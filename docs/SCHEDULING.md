# Scheduling architecture

This foundation supports instant and request-based scheduling without representing configuration as live availability. The operational defaults are starting points, not statements about ritual duration, muhurta, tithi, nakshatra, or auspicious dates.

## Domain model

The shared model defines providers (`PANDIT` or `ASTROLOGER`), provider/service eligibility, availability rules and exceptions, bookings, location modes, and booking statuses. A provider can only be offered when an active `provider_services` mapping makes them eligible.

Recommended PostgreSQL tables are `providers`, `provider_services`, `availability_rules`, `availability_exceptions`, and `bookings`, using the fields represented by the TypeScript domain types. Booking rows should snapshot duration and buffer values so later configuration changes do not alter historical conflict calculations.

## Booking modes

- `INSTANT` means a customer chooses genuinely live availability. A successful atomic insert produces `CONFIRMED`.
- `REQUEST` captures a preferred date/time for later review. A successful insert produces `REQUESTED` or `PENDING_CONFIRMATION`; it must never be presented as guaranteed.

Astrology defaults to instant booking. Online Puja, Puja & Rituals, Marriage, and Bratopanayan default to request booking. Special Prasad is intentionally excluded.

## Availability algorithm

`generateAvailableSlots` is a pure function. It verifies provider/service eligibility and location mode, selects weekly or date-specific custom hours, closes unavailable dates, converts local windows with their IANA timezone, and accounts for duration, before/after buffers, active booking overlaps, and capacity. Cancelled, rejected, and completed bookings do not occupy capacity.

Availability rules store local wall-clock times and an IANA timezone. Bookings should store absolute start/end timestamps plus the submitted local date, local time, and timezone context. This prevents server-local time and UTC date-boundary assumptions.

## Persistence and concurrency

PostgreSQL persistence is implemented but activates only when `DATABASE_URL` is configured and `db/migrations/001_scheduling.sql` has been applied. Without that configuration, no booking is stored, the API returns HTTP 503, and availability is labelled `CONFIGURATION_ONLY` with no fabricated slots. No providers or availability are seeded automatically.

The PostgreSQL adapter begins a transaction, takes a provider-scoped advisory transaction lock, locks and checks overlapping bookings, verifies maximum concurrent capacity, inserts, and commits. The same database lock serializes competing writers across application instances, including capacity greater than one. A uniqueness constraint on `reference` backs the random human-readable reference generator. Instant booking also checks live rule/exception availability before entering the atomic capacity-and-insert transaction.

## API

- `GET /api/services` returns schedulable operational configuration and persistence status.
- `GET /api/availability?service=&date=&provider=&locationMode=` validates inputs. It returns configuration-only/no slots until a repository is connected; a configured adapter can return live provider slots.
- `POST /api/bookings` validates customer, service, date/time, timezone, venue, and location. It currently fails closed with 503 because persistence and atomic booking are unavailable.

## Administration roadmap

Future authenticated admin endpoints and UI should manage providers, provider/service mappings, weekly availability, exceptions, booking confirmation/rejection, rescheduling, and cancellation. Audit trails and role-based authorization are required before exposing these operations.

## Remaining production requirements

1. Provision PostgreSQL and apply `db/migrations/001_scheduling.sql`.
2. Configure real providers, mappings, hours, exceptions, and capacity.
3. Add authenticated administration and booking lifecycle operations.
4. Add durable notification delivery, idempotency keys, rate limiting, spam controls, audit logging, privacy retention rules, and monitoring.
5. Integration-test transaction races against the deployed PostgreSQL version before enabling instant booking.
