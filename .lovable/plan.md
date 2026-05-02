## Plan

### What I found
- The slow loading is real: the homepage is doing repeated auth/profile/role lookups across multiple components, and the browser profile shows poor paint timing plus multiple duplicate backend requests.
- The recruiter area is currently using destructive role enforcement. Non-recruiters are being pushed into recruiter auth instead of seeing the recruiter public home, and recruiter/talent switching can trigger false sign-outs and greeting flicker.
- Your account record is inconsistent: your paid access date is active, but your plan tier is still `free`. That explains why Brag File still says upgrade.
- The jobs board is now showing only platform-posted jobs. External aggregation still exists in the backend, but the UI is no longer using it.
- Several tools are still mock or half-wired:
  - Create Job Alert button has no action
  - Salary Analyzer negotiation script button has no action
  - Explore Careers has no download/export
  - Resume Optimizer only accepts text files and caps at 5MB
  - Resume Builder PDF export is single-page only, so long resumes get cut off
  - Skills Gap Analyzer is pulling the wrong profile shape and is too generic
  - Challenge completion/join state is mostly local mock state, and the mock discussion tab is still present
- AI coin deduction is inconsistent: some AI flows deduct coins, but several core tools do not.

### Phase 1 — Stop the auth glitches and make pages load fast
1. Replace the current side-switch sign-out logic with non-destructive role-aware routing.
   - Visiting the recruiter area as a guest or talent user should show the recruiter public home, not recruiter auth.
   - Recruiter auth should only appear when someone explicitly chooses recruiter login/signup or tries a recruiter-only action.
2. Unify session/profile loading so the app hydrates once and shares that state instead of re-querying from multiple places.
3. Remove the greeting flicker so users do not see “Hello there”, “Hello recruiter”, then their real name.
4. Hide the FOMO popup for all logged-in users, not just by route.
5. Reduce layout shifts by replacing empty suspense/auth fallbacks with stable shells.
6. Trim duplicate homepage/sidebar queries and cache the current user/profile/plan state.

### Phase 2 — Fix recruiter experience and jobs/applications flow
1. Restore the recruiter experience to two clear states:
   - public recruiter landing for guests/non-recruiters
   - recruiter dashboard only for authenticated recruiter accounts
2. Bring back a mixed jobs board:
   - platform jobs posted inside Remote Workher
   - external aggregated jobs from supported boards
3. Keep application rules simple:
   - platform jobs: free for any signed-in user to apply
   - AI tailoring: members only
   - external jobs: send users to the original source to apply externally
4. Update job cards and job detail pages to show source clearly and switch CTA behavior correctly.
5. Make platform applications support the real inputs you described:
   - resume
   - portfolio/link
   - screening questions/answers
6. Replace the current paid-membership apply copy with accurate messaging.
7. Make “Create Job Alert” actually work by opening a real alert flow and saving alert preferences.

### Phase 3 — Make the AI tools useful, contextual, and honest
1. Skills Gap Analyzer
   - rebuild it around a dream role or selected job
   - pull skills from the signed-in user’s profile/resume instead of generic freeform only
   - return role-specific gaps, transferable strengths, and a cleaner result layout
   - stop using the wrong profile-loading pattern
2. Resume Builder
   - remove invented companies, roles, and certifications
   - replace the loose prompt with a structured intake form that asks for real details first
   - include fields like name, address, email, LinkedIn, work history, achievements, certifications, target role, and portfolio
   - add color theme choices beyond pink
   - fix PDF export with proper multi-page pagination so nothing gets cut off
3. Resume Optimizer
   - support PDF and DOCX uploads, not just TXT
   - increase file size limit
   - when optimizing for a specific role, allow either pasted JD or choosing a job from the platform board
4. Explore Careers
   - add a working download/export action
5. Salary Analyzer
   - wire up the negotiation script flow so the CTA does something useful
6. Tax Analyzer
   - correct the Nigerian tax calculation logic and bracket math so results are accurate
7. Coin deduction
   - standardize AI coin usage across all AI tools and log deductions consistently

### Phase 4 — Fix membership, brag file, challenges, and community
1. Premium access
   - update your account to Premium properly so Brag File works immediately
   - align plan tier with active paid access so the platform stops misclassifying you
2. Brag File
   - remove the incorrect upgrade gate for your account
   - verify win input works end to end
3. Challenges
   - add a real completion state and congratulatory success message
   - once completed, show “Completed” instead of “Continue”
   - remove the mock discussion area/tab
   - clean up challenge state so joined/completed progress behaves consistently
4. Community
   - reduce slow loading by batching post/profile/reaction loading more efficiently
   - keep the page interactive while data fills in

### External job aggregation recommendation
I do not recommend depending on direct Google Jobs scraping as the main source.

Better approach:
- keep platform jobs in the main jobs table
- aggregate external jobs from supported boards/feeds into the external jobs table
- show both in one board with clear source labels
- use outbound apply for external jobs

If approved, I’ll extend the existing ingestion flow in that direction rather than building around fragile Google Jobs scraping.

### Backend and data work included
- Update your membership record to Premium
- Add persistent job alerts storage
- Add persistent challenge progress/completion storage if needed for reliable completion state
- Update AI backend functions so tool outputs are contextual and coins are deducted consistently

### Technical areas I’ll touch
- App shell, auth/session hydration, sidebar, recruiter layout, homepage greeting, popup gating
- Jobs list, job detail, apply dialog, recruiter landing/dashboard routing
- Skills Gap Analyzer, Resume Builder, Resume Optimizer, Explore Careers, Salary Analyzer, Tax Analyzer
- Challenge pages, Brag File, Community
- Backend tables/functions for alerts, progress, AI usage, and membership correction

### Result after implementation
- No more forced recruiter auth for non-recruiters
- No more random sign-out/flicker behavior
- Much faster initial loading and fewer duplicate requests
- One jobs board with both platform and external jobs behaving correctly
- Honest, contextual AI tools
- Correct Nigerian tax outputs
- Working premium access, job alerts, challenge completion, exports, uploads, and coin deduction