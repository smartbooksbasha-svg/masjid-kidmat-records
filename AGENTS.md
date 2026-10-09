# AGENTS.md — Masjid Kidmat Records

## What this is
"Masjid e Mohammadi by Masjid Kidmat Committee" — mohalla family-records web
app. Dashboard counts, family+member register, documents checklist, auto
Family ID + QR, 3-role login, PDF/Excel export. UI = "Emerald Lattice"
(emerald/mint, Sora + Manrope), day + night.

## Stack
Vanilla JS single-page app, no build step. Local-first via `localStorage`,
with an optional Supabase (Postgres) backend.

Files (deploy root = repo root, GitHub Pages serves `index.html`):
- `index.html`   — shell: auth screen, app shell (sidebar/topbar), print area
- `styles.css`   — Emerald Lattice design system, day + night tokens
- `app.js`       — all logic (~860 lines): auth, dashboard, families,
                   family form, detail, users, settings, exports, QR, sample data
- `config.js`    — `window.APP_CONFIG` (ORG name, FAMILY_ID_PREFIX, empty
                   SUPABASE_URL / SUPABASE_ANON_KEY)
- `ui-preview.html` — historical: the 3 design directions preview
- `supabase/schema.sql` — tables (families, members, app_users), RLS ON,
                   `next_family_id()` sequence fn

## Data model (localStorage keys)
`memc_users` · `memc_families` · `memc_seq` · `memc_session` · `memc_theme` ·
`memc_seeded`. Passwords = SHA-256 + per-user salt (`crypto.subtle`, fnv
fallback). Family ID = `MEMC-<year>-<6-digit seq>`.

## Roles
`super` (first-run setup; manage users) · `admin` (edit data) ·
`family` (view-only, linked via `familyId`, login ID = the Family ID).

## Commands
- Syntax check: `node --check app.js`
- Serve locally: `python -m http.server 8484` then open
  `http://127.0.0.1:8484/`
- Smoke test (headless): see skill `html-jsdom-smoke-test`.

## Key conventions / gotchas
- **Form field reads use `form.elements.X`** (NOT `form.X`). Inputs named
  `name`/`id`/`pass` collide with the form's own IDL attributes in
  standards engines — `elements` is correct everywhere.
- All output goes through `esc()` (XSS). Keep it that way.
- Event handling is centralised: one `document` click delegation for
  `[data-act]`, plus `input`/`change`/`submit` delegation. New buttons =
  add a `data-act="..."` branch, not a new listener.
- CDN deps loaded with `defer`: qrcode-generator@1.4.4, xlsx@0.18.5.
- Build ONE screen → test → next. Shan's rule.

## State of things (2026-10-09)
Shipped & live: https://smartbooksbasha-svg.github.io/masjid-kidmat-records/
(commit `0b7a976`). jsdom smoke test 22/22 green.
Open: wire Supabase keys; 375px responsive polish; real OTP SMS; optional PWA.
