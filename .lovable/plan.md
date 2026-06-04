# Resume Builder — Harvard-style rebuild

Convert the Resume Builder from a "pink, design-project" output to a corporate, recruiter-grade document — and replace the template chooser with a career-level chooser that auto-assigns the right template.

## 1. Replace template picker with career-level picker

Remove "Classic / Modern / Minimal". Replace with a single question:

**What best describes you?**
- Student / Graduate
- Early Career Professional (0–3 years)
- Professional (3–10 years)
- Senior Leader / Executive

Auto-mapping (internal):

| Choice | Template id |
|---|---|
| Student / Graduate | `student` |
| Early Career (0–3) | `ats` (default) |
| Professional (3–10) | `professional` |
| Senior Leader / Executive | `executive` |

Default selection = `ats` (Early Career). The mapping is hidden — the user only sees the four career-level options. Persist the choice on the user's profile so it pre-selects next time.

## 2. Use the user's real name everywhere

- Pull `full_name` (and email/phone/city/linkedin) from `profiles` on mount and seed `details` automatically.
- Preview/PDF header MUST render the real name. Remove the "Your Name" / "Candidate" / "Professional" placeholders — if the name is genuinely missing, show a one-line prompt to complete profile instead of inventing a label.
- Same for the AI prompt: the edge function (`generate-resume`) must pass the signed-in user's name and forbid the model from outputting "Candidate", "Your Name", "[Name]" etc.

## 3. Harvard-style visual rebuild (no pink, no gradients, no chips)

All four templates share the same base:

- **Page**: A4 (210×297mm), single column, white bg, **black text only**, 0.75" margins (≈19mm) on all sides.
- **Fonts**: Calibri for Student / ATS / Professional. Cambria for Executive. (Register Carlito as Calibri-metric fallback + Caladea as Cambria-metric fallback for `@react-pdf/renderer` since real Calibri/Cambria can't be redistributed.)
- **Sizing**: Name 24pt bold (26pt for Executive). Section headings 12pt bold UPPERCASE. Body 10.5pt (11pt Executive). Line-height 1.15.
- **Dividers**: thin black/dark-grey rule under each section heading. No colour accents, no pills, no rounded chips, no gradient header bar.
- **Skills**: rendered as a single horizontal pipe-delimited line (`Excel | Power BI | SQL | …`), not chips.
- **Bullets**: plain `•` in black, hanging indent.
- **Header**: left-aligned name, role line under it, then contact on one line: `City, Country | Phone | Email | LinkedIn`.

### Per-template section order

**Student** — Name → Summary → Education → Projects → Leadership → Volunteer → Skills → Certifications → Awards (optional)

**ATS Standard (default)** — Name → Contact → Summary → Work Experience → Education → Skills → Certifications

**Professional** — Name → Title → Contact → Summary → Core Competencies → Professional Experience → Education → Certifications → Tools & Technologies

**Executive** — Name → Executive Title → Executive Profile → Key Achievements → Professional Experience → Board Experience (optional) → Education → Certifications → Technical Skills

Sections the user hasn't filled are simply omitted (no dashed "you didn't add…" cards in the printed/downloaded version).

## 4. Data-model additions

`ResumeData` gains optional fields used by Student/Executive:
`projects[]`, `leadership[]`, `volunteer[]`, `awards[]`, `boardExperience[]`, `coreCompetencies[]`, `tools[]`, `keyAchievements[]` (separate from existing `achievements`), `executiveProfile`.

`ResumeDetails` (the form) gets matching inputs that show/hide based on chosen career level (e.g. Projects only for Student, Board Experience only for Executive).

The AI edge function (`generate-resume`) is updated to accept a `career_level` field and tailor the JSON it returns to that template's section list (e.g. for Student, populate `projects`/`leadership`/`volunteer` instead of long work history; for Executive, lead with `keyAchievements` and `executiveProfile`).

## 5. Files touched

- `src/pages/tools/ResumeBuilder.tsx` — swap template picker for career-level picker, seed name/contact from profile, persist choice, drop the 3-template download buttons (keep a single "Download PDF" + existing "ATS-friendly PDF" toggle).
- `src/components/tools/ResumePreview.tsx` — rewrite as 4 Harvard-style layouts sharing one black-and-white style system.
- `src/components/tools/ResumePdfDocument.tsx` — same 4 layouts in `@react-pdf/renderer`, register Carlito + Caladea fonts, drop accent-colour code paths. Existing `mode="ats"` becomes the ATS template's PDF directly.
- `src/components/tools/ResumeDetailsForm.tsx` — add conditional sections (Projects / Leadership / Volunteer / Board / Core Competencies / Tools / Key Achievements / Executive Profile) gated on career level.
- `supabase/functions/generate-resume/index.ts` — accept `career_level`, force `name = profile.full_name`, return the right sections per template, ban placeholder names.
- DB: add `career_level` (text) and `preferred_resume_template` (text) to `profiles` via a migration so the choice persists.

## 6. Out of scope

- No changes to the AI source pickers (Job board / Paste JD / Tell AI).
- No changes to ATS score logic, paywall, save-to-profile, or the Cover Letter tool.
- Accent colour is removed from resumes only; the rest of the app keeps the Remote Workher pink.
