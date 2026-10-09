# PRD — Masjid e Mohammadi · Masjid Kidmat Committee Family Records
_v1.0 (final draft) — 2026-10-09 · locked decisions baked in_

## 1. Product vision
Masjid-e-Mohammadi (mohalla) ki **Kidmat Committee** ke liye ek safe digital
register — har ghar aur har member ka poora record ek jagah, live dashboard
counts, auto Family ID + QR, aur PDF/Excel export. Data cloud (Supabase) me
surakshit, taaki sab committee members ek hi data dekh sakein.

## 2. Goals
- Family entry minute se kam samay me, ek hi screen par (family + member rows).
- Dashboard par 9 key numbers live, har ek apne box me.
- Har family → automatic **Family ID + QR code**.
- 3-level access: Super Admin > Admin > Family (view-only).
- Export: PDF, Excel (.xlsx), print document.
- Mobile-first; English UI.

## 3. Locked decisions (2026-10-09)
| # | Decision | Choice |
|---|---|---|
| 1 | Data storage | **Supabase free** (cloud Postgres + Auth) + localStorage fallback for offline/demo |
| 2 | Form structure | **Family form + member rows** (ek screen) |
| 3 | UI language | **English** |
| 4 | OTP | **Deferred** → demo/on-screen OTP placeholder abhi; real SMS baad me |

## 4. Users & permissions
| Role | Kaun | Permissions |
|---|---|---|
| Super Admin | Committee head (pehla setup wizard) | Sab: add/edit/delete, admins manage, family credentials banaye |
| Admin | Committee members | Add/edit records, export |
| Family Member | Mohalla family | Sirf apna record **view** (edit = disabled) |

## 5. Features (must-have)
1. **First-run setup wizard** — pehli baar khole to Super Admin form (naam,
   phone, ID, password) → save → uske baad login screen.
2. **Login** — 3 login types, same mechanism: ID + password, mobile OTP
   (demo), captcha. Family ID bhi ek login ID.
3. **Dashboard** — 9 stat boxes: Total Houses/Families · Men · Women ·
   Children · Married · Unmarried · Widow · Disability · Govt-Scheme.
4. **Family form** (one screen):
   - Family block: House/Family name, Address, Phone, House number.
   - Member rows (add/remove): Name, Father name, Mother name, DOB,
     Education, Marital status, Children count, Gender.
   - Documents per member/family: YES/NO toggles — Aadhaar, PAN, Passport,
     Birth Certificate, Voter ID, Ration Card, Driving Licence, Income
     Certificate, Disability Certificate, BPL/Ayushman + **10 empty custom
     boxes** (label user khud likhe).
5. **Family ID + QR** — save karte hi generate; screen par QR + printable ID.
6. **Records list** — searchable, filters (gender/status/document), pagination.
7. **Export** — per-record & bulk: PDF, Excel, print document.
8. **Role-based UI** — role 3 me edit/delete buttons hidden/disabled.

## 6. Non-functional
- Passwords hashed (Supabase Auth). Row Level Security: family sirf apna record.
- XSS-safe rendering (escape all user input). Input validation on every field.
- Fast on 4G; responsive 375px+; accessible labels & focus states.

## 7. User flows
- **Setup:** open → setup wizard → save Super Admin → login.
- **Entry:** login (captcha+OTP) → Dashboard → "Add Family" → form + members
  + docs → Save → Family ID+QR screen → export/print.
- **Family view:** login (Family ID+pass) → apna record read-only.

## 8. Out of scope (v1)
Payments/donations · SMS/WhatsApp blast · multi-masjid · native app ·
real SMS OTP (deferred).

## 9. Success metrics
Family entry < 2 min · dashboard counts exactly match raw data · export opens
in Excel & PDF viewer · all 3 role permission tests pass.
