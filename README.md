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
