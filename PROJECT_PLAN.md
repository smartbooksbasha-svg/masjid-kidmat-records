# PROJECT PLAN — "Masjid e Mohammadi by Masjid Kidmat Committee"

**What:** Mohalla family-records website — har ghar/person ka data safely
save, dashboard counts, Family ID + QR, 3-role login, PDF/Excel export.
**Source folder:** `$HOME/masjid-kidmat-records`
**Pipeline:** webdev skill (loaded 2026-10-09) — one stage at a time, tick when done.
**Boot questions sent:** 2026-10-09 (data storage · form structure · UI language · OTP mode)

## Stages (webdev pipeline)

- [x] 1. Idea Discovery
- [x] 2. User Research
- [x] 3. Requirements (must/should/nice/future)
- [x] 4. PRD.md — full blueprint
- [ ] 5. PRD Review + validate WITH user (one short message, wait for OK)
- [ ] 6. User Flow
- [ ] 7. UX (wireframe, IA, nav, states, mobile)
- [ ] 8. UI Design System — load design-taste-frontend + ui-ux-pro-max engine
- [ ] 9. Technical Spec (stack, schema, auth, file structure)
- [ ] 10. Build Plan (milestones)
- [ ] 11. Implementation (→ UI PREVIEW GATE after first screen)
- [ ] 12. Testing (forms, auth, roles, exports, edge cases)
- [ ] 13. Responsive (375px + desktop)
- [ ] 14. Security (password hashing, role perms, input validation, XSS)
- [ ] 15. Performance
- [ ] 16. Accessibility
- [ ] 17. SEO (meta, OG, favicon)
- [ ] 18. User Acceptance (real task for Shan)
- [ ] 19. Iterate → 19b. CUSTOMIZATION ROUND (mandatory, before any deploy)
- [ ] 20. Pre-Launch checklist
- [ ] 21. Deploy (GitHub Pages static / full-stack host — depends on Q1 answer)
- [ ] 22. Post-Launch

## Touchpoints (only these interrupt autonomy)

1. Boot questions — sent 2026-10-09 ✅
2. PRD validation (stage 5)
3. UI preview gate (stage 11) — 2-3 design directions, Shan picks
4. Customization round (19b)
5. Deploy approval

## Spec anchors (from Shan's brief, 2026-10-09)

- **Dashboard stat boxes:** total ghar · men · women · children · married ·
  unmarried · widow · disability · government-scheme — har ek alag text box me.
- **Family form:** name, father name, mother name, DOB, education, married,
  number of children, gender, phone, address + documents list YES/NO toggles
  (Aadhaar, PAN, Passport, Birth Certificate, …) + **10+ EMPTY custom boxes**.
- **On save:** auto Family ID + QR code generate.
- **3 logins (same mechanism on all):** 1) Super Admin 2) Admin
  3) Family Member — id + password create option, mobile OTP, captcha.
  Super admin = FIRST-RUN setup (details fill → then login appears).
- **Permissions:** roles 1 & 2 edit data; role 3 (family) view only.
- **Export:** PDF, Excel sheet, document file.
- **UI:** "accha UI" — preview gate will show 2-3 directions.

## Decisions (locked 2026-10-09)

- [x] **Data storage: Supabase free (cloud)** — real multi-user; app ships with
      localStorage fallback so everything demos before keys are added.
- [x] **Form structure: family form + member rows** (one screen).
- [x] **UI language: English** (language switcher possible later).
- [x] **OTP: deferred** — demo/on-screen OTP placeholder for now; real SMS
      (MSG91/Twilio) baad me decide.
