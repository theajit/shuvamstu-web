# Shuvamstu Web

Modern rebuild of Shuvamstu.

## Principles
- Preserve original Shuvamstu imagery and core service information.
- No public telephone/contact number.
- Remove corporate/legal clutter from marketing UI.
- Mobile-first, accessible and SEO-friendly.

## Scheduling
The scheduling domain is adapted from the proven MyDoktor booking architecture, redesigned for Pandits, astrologers, pujas and ceremonies. See `docs/SCHEDULING-DESIGN.md`.

Initial scheduling service metadata is exposed at `GET /api/services`. Persistence, provider calendars, availability calculation and transactional booking are intentionally the next implementation layer; the current API does not claim live availability.

## Development
```bash
npm install
npm run dev
```
