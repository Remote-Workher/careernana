## Goal

Stop blocking free users at the door. Let them complete every AI tool, Career Explorer guide, and Skill Check, then reveal a **blurred / half-shown result** with an upgrade card on top. They've already invested effort → much higher conversion.

## What changes (UX)

**1. AI Tools** (Resume Builder, Resume Optimizer, Cover Letter, Cold Pitch, Interview Prep, Interview AI, LinkedIn Optimizer, LinkedIn Post Generator, Career Roadmap, Salary Analyzer, Explore Careers)
- Free + signed-in users can fill the full form and hit Generate.
- The AI call runs as normal.
- When results render: full output is blurred (`blur-md select-none pointer-events-none`) with an overlay card: *"Your [resume / cover letter / questions] is ready. Join Remote Workher to unblur, download and edit."* + primary CTA → opens the existing `UpgradeModal`.
- Paid members: no blur, no overlay. Existing copy/download/export buttons all stay hidden behind the blur for free users.

**2. Career Explorer Role Guide** (`CareerExplorerRole.tsx`)
- Show the **top half** clearly: hero, salary, what you do, must-have skills.
- After ~50% of the page (after "What you do" / before "Salaries / Companies / Entry paths / Resources / Growth path"), insert a fade-to-white gradient + sticky "Unlock the full guide" card.
- Lower half is rendered but covered with a gradient mask + blur so they can sense there's more.

**3. Skill Check** (`CareerExplorerSkillResult.tsx` + skill-check flow in `CareerExplorer.tsx`, plus `SkillsGapAnalyzer.tsx`)
- Free users answer every question and submit.
- Results page renders the score header but everything below (strengths / gaps / recommendations / roadmap) is blurred with an upgrade overlay.

## Implementation

### New shared component

`src/components/PaywallBlur.tsx`
- Props: `{ isPaid: boolean; heading?: string; subtext?: string; ctaLabel?: string; mode?: "blur" | "fade"; children: ReactNode }`
- `blur` mode (AI tools, skill results): wraps children in a div with `filter blur-md select-none pointer-events-none` and renders a centered absolute-positioned card with heading, subtext, and an "Unlock with Remote Workher" button that calls `openUpgradeModal({ heading, subtext })`.
- `fade` mode (Career Explorer role guide): renders children at full opacity but adds a bottom-fading gradient overlay (`bg-gradient-to-b from-transparent via-background/80 to-background`) over the lower ~60% with the same upgrade card sticky at bottom.
- If `isPaid === true`, returns children unwrapped.

### Membership check hook

Use the existing `usePlanTier()` → `isPaidActive` everywhere. No new DB / RPC work.

### Files to edit

- `src/components/PaywallBlur.tsx` — new
- `src/pages/tools/ResumeBuilder.tsx` — wrap results section
- `src/pages/tools/ResumeOptimizer.tsx`
- `src/pages/tools/CoverLetterAI.tsx`
- `src/pages/tools/ColdPitchAI.tsx`
- `src/pages/tools/InterviewPrep.tsx` — wrap generated questions list (also disable download)
- `src/pages/tools/InterviewAI.tsx`
- `src/pages/tools/LinkedInOptimizer.tsx`
- `src/pages/tools/LinkedInPostGenerator.tsx`
- `src/pages/tools/CareerRoadmap.tsx`
- `src/pages/tools/SalaryAnalyzer.tsx`
- `src/pages/tools/ExploreCareers.tsx`
- `src/pages/tools/SkillsGapAnalyzer.tsx` — wrap results
- `src/pages/CareerExplorerRole.tsx` — split into "above the fold" and "below the fold", wrap below in `PaywallBlur mode="fade"`
- `src/pages/CareerExplorerResults.tsx` — leave first 3 role cards visible, blur the rest
- `src/pages/CareerExplorerSkillResult.tsx` — wrap detailed breakdown
- `src/pages/tools/TaxCalculator.tsx` — leave fully free (utility, not a “result” worth gating)

### What we do NOT change

- No edge function changes — the AI still runs for everyone (cost is acceptable because conversion lift > AI cost, and we already require sign-in).
- No DB schema changes.
- Existing `requireSignedIn` stays as the first gate — users still must create an account to generate.
- `TierPaywall` and other existing paid-only routes (Courses, Resources, etc.) stay as-is.

## Open question (one)

Should I keep `requireSignedIn` on Generate (current behaviour: must sign up before generating) or also remove it so completely anonymous visitors can fill the form and only hit the wall at the signup+payment step?

I'll proceed with **keep sign-in required to generate, then blur results unless paid** — confirm if you want the more aggressive variant.