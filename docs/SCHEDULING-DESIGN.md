# Shuvamstu Scheduling Design

Adapt the proven MyDoktor availability/booking model for spiritual services.

Provider (Pandit/Astrologer) → Service → Mode/Location → Availability Rule → Exception/Block → Bookable Window → Booking.

Key differences: service-defined duration; group capacity for online puja; travel buffers for off-site ceremonies; and request-based confirmation for muhurta-sensitive or long ceremonies.

Availability: resolve provider-local date, expand recurring rules, apply exceptions, subtract bookings plus buffers, generate candidate starts, enforce capacity, return local display time and canonical UTC timestamps.

Booking creation must run transactionally and re-check availability. Never trust a previously returned slot. Add database-level overlap protection before production.

Suggested APIs: GET /api/providers, GET /api/services, GET /api/availability, POST /api/bookings, GET /api/bookings/:reference, POST /api/bookings/:reference/cancel.

Reuse MyDoktor concepts for timezone handling, recurring schedules, exceptions and transaction-safe booking. Do not import healthcare PHI/patient/doctor lifecycle concerns.