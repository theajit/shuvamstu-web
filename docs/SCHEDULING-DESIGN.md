# Shuvamstu Scheduling Design

Adapted from the proven MyDoktor availability/booking model, but modeled for spiritual services rather than medical appointments.

## Domain

Provider (Pandit/Astrologer) → Service → Mode/Location → Availability Rule → Exception/Block → Bookable Window → Booking.

## Key differences from clinic scheduling

- Duration is service-defined, not globally slot-defined. Astrology can be short while ceremonies can reserve hours.
- Capacity can exceed one for online/group puja.
- Travel buffers apply around at-home/off-site ceremonies.
- A service may require a muhurta/request workflow instead of instant confirmation.
- Providers can serve multiple service categories with different durations and modes.

## V1 data model

### providers
- id, slug, name, type (`pandit|astrologer`), active

### services
- id, slug, name, category
- duration_minutes
- buffer_before_minutes / buffer_after_minutes
- capacity
- booking_mode (`instant|request`)
- location_mode (`online|customer_location|temple|office`)

### provider_services
- provider_id, service_id, active
- optional duration/capacity overrides

### availability_rules
- provider_id, weekday
- local_start/local_end
- timezone
- effective_from/effective_to

### availability_exceptions
- provider_id, local_date
- start/end or full_day
- type (`available|blocked`)
- reason

### bookings
- id, reference
- provider_id, service_id
- local_date, starts_at, ends_at
- timezone
- status (`requested|confirmed|in_progress|completed|cancelled`)
- customer_name/email
- location_mode/location_notes
- party_size

## Availability algorithm

1. Resolve requested date in provider/service timezone.
2. Load active provider-service configuration.
3. Expand recurring rules for the requested day.
4. Apply available/blocked exceptions.
5. Subtract confirmed/request-held bookings including buffers.
6. Generate candidate starts using service duration and configurable step interval.
7. Enforce capacity for group/online services.
8. Return local display time plus canonical UTC timestamps.

## Booking integrity

Booking creation must run in a DB transaction and re-check availability while holding the relevant booking range/provider lock. Do not trust a slot returned earlier by the availability endpoint. Add a database-level overlap protection strategy before production.

## API proposal

- `GET /api/providers`
- `GET /api/services`
- `GET /api/availability?serviceId=&providerId=&date=`
- `POST /api/bookings`
- `GET /api/bookings/:reference`
- `POST /api/bookings/:reference/cancel`

Admin/provider APIs should manage services, recurring schedules, exceptions and bookings.

## UX

Service → Online/Location → preferred date → available time/provider → customer details → request/confirm.

For marriage and long ceremonies, default to `request` and show a preferred start/window instead of promising an instantly confirmed exact slot. Astrology can normally use instant fixed-duration booking.

## Migration note

Reuse concepts and tested edge cases from `theajit/mydoktor`, especially clinic-local date handling, recurring-rule expansion, exception subtraction, transaction-safe booking and queue/status patterns. Do not copy healthcare-specific PHI, patient, doctor lifecycle, clinic, Razorpay or medical workflow concerns into Shuvamstu.