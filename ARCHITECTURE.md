# Shuvamstu Architecture

## Current repository

The repository is a Next.js 16.3 App Router application on React 19 and TypeScript 7. It already includes:

- public marketing, service and practitioner routes;
- raw PostgreSQL access through `postgres`;
- six additive SQL migrations for scheduling, profiles, bookings and enquiries;
- availability calculation and atomic booking creation;
- a password-protected admin surface with signed cookies;
- booking management links, notification webhooks and Playwright workflow tests.

It does not yet provide a user/account model, three-role authorization, marketplace catalogue/packages/pricing, city/service-area relations, deterministic ranking, payments/refunds/settlements, reviews, CRM, investor analytics or strict demo/live isolation. Existing “provider/practitioner” concepts will be migrated rather than deleted abruptly.

## Target shape

Use a Vercel-compatible modular monolith:

```text
Next.js App Router
  public/customer/Pujari/admin route groups
        |
  server actions + route handlers (thin delivery layer)
        |
  domain services (booking, matching, pricing, payments, notifications)
        |
  repositories / transactions
        |
  PostgreSQL + object storage
```

There are no microservices. Domain boundaries exist as modules so high-risk integrations can be replaced independently later.

## Route architecture

- `(public)`: homepage, `/pujas`, `/pujas/[slug]`, `/pujaris`, `/pujaris/[slug]`, `/about`, `/contact`.
- `(customer)`: `/book`, `/booking/[id]`, `/account/*`.
- `(pujari)`: `/pujari/*` optimized for 360-430 px.
- `(admin)`: `/admin/*` optimized for desktop/tablet.
- `api`: auth callbacks, webhooks, public availability/search, and integration endpoints.

Route groups may be introduced incrementally so current URLs remain stable. Server Components read data directly through domain queries. Client Components are limited to interactive forms, calendars and charts.

## Modules

- `identity`: managed-auth adapter, database sessions/identity mapping, RBAC and ownership policies.
- `catalogue`: cities, pujas, packages, services, service areas and samagri kits.
- `supply`: Pujari profiles, verification, availability, pricing and performance.
- `matching`: eligibility gates, versioned weights, score breakdown and ranking.
- `pricing`: quote calculation and immutable booking snapshots.
- `booking`: state machine, assignment, booking items, history and rebooking.
- `fulfillment`: samagri merchants and external online-meeting details.
- `money`: provider-neutral payments, Razorpay adapter boundary, refunds and manual settlements.
- `trust`: reviews and moderation.
- `notifications`: event/outbox, template keys and WhatsApp/SMS/email adapters.
- `analytics`: aggregate queries with explicit live/demo scope and manual acquisition-cost inputs.
- `audit`: admin action, target, before/after summary, reason and actor.

## Authentication and authorization

Use passwordless email OTP delivered through Resend. OTP challenges are short-lived, attempt-limited, stored only as keyed hashes, and consumed once. Successful verification creates a revocable opaque database session whose browser cookie is HttpOnly, Secure in production, and SameSite=Lax. `CUSTOMER`, `PUJARI`, and `ADMIN` roles and account status are resolved from PostgreSQL for every protected request; Pujari and Admin accounts are invitation-only. The legacy shared admin password remains only during migration and is removed after the founder account is verified.

Authorization uses a data-access layer returning minimal DTOs. Page-level checks are usability, not the security boundary. Sensitive phone/address fields are selected only for an assigned Pujari or authorized operator. Admin support impersonation is excluded; an explicit audited “view as” capability can be considered later.

## Data access and migrations

PostgreSQL is the source of truth. Introduce Prisma as the requested ORM for the new model while retaining raw SQL only for migrations, complex analytics and lock-sensitive scheduling queries. Existing SQL migrations remain immutable; a bridge migration maps current providers/bookings into the new relational model. Prisma schema and additive SQL migrations are reviewed together. Transactions protect booking creation, assignment, status updates and money records.

If Prisma compatibility with this exact Next.js/TypeScript release proves unsafe in baseline validation, retain the typed repository layer on `postgres` temporarily and document the exception rather than blocking the booking core.

## Live and demo isolation

Every business record belongs to a `DataRealm` (`LIVE` or `DEMO`) directly or through a realm-owned aggregate. Requests resolve a realm server-side. Public production routes always use `LIVE`; only authorized demo/admin sessions can select `DEMO`. Analytics queries require an explicit realm parameter. Database constraints prevent cross-realm assignment.

Demo reset uses an idempotent seed version and is compiled/routable only when `NODE_ENV !== 'production'` and `DEMO_RESET_ENABLED=true`. It deletes/reseeds only rows carrying the demo realm and never accepts a realm or arbitrary table from the request.

## Core workflows

### Booking

The client requests candidates and a quote. The server recomputes both at submission, locks the selected availability boundary, stores price/item snapshots, creates the booking/history/outbox records in one transaction, then dispatches notifications asynchronously/best-effort. Idempotency keys prevent duplicate submission.

### Matching

SQL/repository queries enforce eligibility. A pure domain function scores eligible candidates from a versioned weight set, returns ordered candidates and an admin-only explanation. Tests cover each input and stable tie-breaking.

### Payments

`PaymentProvider` defines order creation, webhook verification, payment lookup and refund request. `ManualPaymentProvider` supports cash/pay-on-confirmation. `RazorpayPaymentProvider` is configured only through environment variables. Webhook payloads are signature-verified, idempotently stored and translated into internal payment events; provider state never directly mutates booking state without domain validation.

### Notifications

Domain events create notification outbox rows. Adapters implement WhatsApp, SMS and email. A mock adapter records rendered attempts in development. Provider credentials and phone values never enter logs.

## Operational qualities

- Validation: shared schemas at every trust boundary.
- Rate limits: login, public availability, booking creation, review and webhooks.
- Audit: all admin mutations and sensitive state changes.
- Privacy: minimum fields, purpose-limited ritual notes, deletion/export request workflow and retention policy hooks.
- Storage: object-storage adapter for profile images and verification documents; documents are private with short-lived signed access.
- Observability: structured request/event logs with correlation IDs and redaction; health checks do not expose dependencies or secrets.
- SEO: metadata per public record, JSON-LD where accurate, sitemap only for active substantial pages, no thin city permutations.
- Accessibility: semantic controls, visible focus, keyboard operation, error summaries and WCAG AA contrast.

## Deployment

The app remains compatible with Vercel plus Supabase/Postgres. Required services are PostgreSQL, managed auth, object storage and optional notification/payment providers. Build does not require a reachable runtime database. Migrations run as a controlled release step, not concurrently from every web instance once productionized.

## Architecture decisions and assumptions

- Indian rupees are stored as integer paise; timestamps are UTC with an IANA timezone on city/Pujari data.
- A booking has exactly one active Pujari assignment at a time, with assignment history retained.
- Package/service prices are snapshots at booking time.
- Availability recurrence is stored relationally; uncommon rule metadata may use JSON only when necessary.
- Meeting URLs are external and treated as private booking data.
- Analytics are computed from operational tables initially; no warehouse is needed for 100 live/1,000 demo bookings.
