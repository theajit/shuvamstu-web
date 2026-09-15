# Shuvamstu Web

A modern, mobile-first rebuild of Shuvamstu.

## Product principles
- Preserve the existing Shuvamstu imagery; do not stylistically alter source photographs.
- Preserve the underlying spiritual/service information while improving information architecture and copy.
- Do not expose public telephone numbers.
- Keep corporate/legal clutter out of the marketing experience; required transactional disclosures should be handled separately when commerce is implemented.
- Avoid unrelated template/demo/donation content.

## Routes
- `/`
- `/about`
- `/services/[slug]` for Puja & Rituals, Marriage, Bratopanayan, Astrology, Online Puja and Special Prasad
- `/enquiry`
- `/sitemap.xml`

## Development
```bash
npm ci
npm run typecheck
npm run build
npm run dev
```

## Enquiry delivery
Set `ENQUIRY_WEBHOOK_URL` to an approved HTTPS endpoint that accepts the validated enquiry JSON. Optionally set `ENQUIRY_WEBHOOK_TOKEN` to send a bearer token. Without a configured endpoint, the API returns a service-unavailable response and does not claim that an enquiry was delivered.

## Scheduling
Scheduling uses PostgreSQL when `DATABASE_URL` is configured. Apply `db/migrations/001_scheduling.sql`, then add real providers, provider/service mappings, availability rules, and exceptions. Until then, availability is explicitly configuration-only and bookings fail closed. See `docs/SCHEDULING.md`.

Scheduling administration is available at `/admin`. In Dokploy, set `DATABASE_URL`, `ADMIN_PASSWORD`, and a random `ADMIN_SESSION_SECRET` containing at least 32 characters, apply the migration, redeploy, and sign in. Use HTTPS in production.
If Dokploy uses an internal proxy hostname, also set `ADMIN_ALLOWED_ORIGIN` to the public origin, for example `https://apps.shuvamstu.com` (no trailing slash).

Existing databases should also apply `db/migrations/002_numerology.sql` to enable Numerologist providers and Numerology scheduling.

Apply `db/migrations/003_practitioner_profiles.sql` to add public practitioner profiles. Complete the profile in `/admin`, provide a unique lowercase URL slug, then enable “Publish profile publicly.” Published profiles appear in the practitioner directories and XML sitemap.

## Automatic database migrations

`npm run build` and `npm start` automatically run every pending SQL file in `db/migrations` when `DATABASE_URL` is configured. Dokploy image builds may not share the runtime database network; DNS and connection failures during `prebuild` are therefore deferred to the strict `prestart` run. Applied filenames and SHA-256 checksums are recorded in `schema_migrations`. A PostgreSQL advisory lock prevents multiple Dokploy instances from migrating concurrently. Existing installations created before the ledger are detected and safely baseline migration 001 before applying the additive migrations.

Run migrations manually with `npm run migrate`. Set `SKIP_DB_MIGRATIONS=1` only when a build environment must not access the database; startup will also skip migrations while this value remains set. Never edit an applied migration—add a new numbered migration instead.
