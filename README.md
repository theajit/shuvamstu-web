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
npm install
npm run build
npm run dev
```

## Production TODO
The enquiry UI is intentionally frontend-only. Connect it to an approved email/CRM/API endpoint before launch.