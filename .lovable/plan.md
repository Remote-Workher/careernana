# Intern Match — Two-Sided Matching

Founders' Intern Match briefs are private. The platform auto-scores every vetted intern against each brief, sends the top 5 (≥80% match) to the talents, and exposes their interest back to the founder for an interview/reject decision.

## Match score (out of 100)

| Signal | Weight | How it's calculated |
|---|---|---|
| Skills overlap | 50 | `matched_skills / required_skills` (jaccard on lowercased trimmed strings) |
| Location | 15 | Same city = 15, same country = 10, otherwise 0 (remote-friendly briefs always = 15) |
| Experience match | 20 | Full if `years_experience` is inside the brief's min–max band; partial (10) within ±1; otherwise 0 |
| Salary / stipend alignment | 15 | Full if `expected_salary_min ≤ stipend × 4 weeks × duration`; partial (8) within 25%; otherwise 0 (interns who left expected_salary blank = full credit) |

Top match candidates must score **≥ 80** and **must be `vetted_status = 'approved'`** and `open_to_hire_for_me = true`. Cap shortlist at **5 per brief**.

## Flow

```text
Founder submits brief (private)
        │
        ▼
shortlist-intern-matches edge function:
  - loads brief + all approved vetted talents
  - scores each, filters ≥80, picks top 5
  - inserts intern_match_assignments (status='shortlisted', match_score, match_reasons)
  - emails each talent: "You've been shortlisted for X"
        │
        ▼
Talent /internship page shows match card
   ├─ "I'm interested"     → status='interested', notifies founder
   └─ "Not for me"         → status='not_interested'
        │
        ▼
Founder /recruiter/intern-match/:id/matches page shows interested talents
   ├─ "Invite to interview" → status='invited', emails talent w/ founder contact
   └─ "Pass"                → status='rejected_by_founder'
```

## Database

`intern_match_assignments` — extend:
- new statuses: `interested`, `not_interested`, `invited`, `rejected_by_founder` (keep existing `shortlisted`, `accepted`, `declined`, `withdrawn` for back-compat; map `accepted`→`interested`, `declined`→`not_interested` in UI)
- add `match_score int`, `match_reasons jsonb` (skill_hits, location_hit, exp_hit, salary_hit)
- new RLS policy so founders can UPDATE their own brief's assignments to set `invited` / `rejected_by_founder`

## Frontend

**Talent — `/internship`**
- Rename action buttons to "I'm interested" / "Not for me"
- Show match score badge (e.g. "92% match")
- Show "Why we matched you" chips from `match_reasons`
- New status pills for `invited` ("Founder invited you — check your email") and `rejected_by_founder`

**Founder — new page `/recruiter/intern-match/:briefId/matches`**
- Lists assignments grouped by status: Interested, Shortlisted (no response), Invited, Passed
- Each talent card: avatar, name, role, years exp, match score, top skills, resume link, "Invite to interview" / "Pass" buttons
- "Invite to interview" opens a small modal to send an intro message + founder email/Calendly link, then sets `invited` and triggers email
- Brief summary at top + link from existing `/recruiter/intern-match` list

**Founder — `/recruiter/intern-match` (existing)**
- Add a "View matches (N interested)" link per submitted brief

## Edge function: `shortlist-intern-matches`
- Input: `{ brief_id }` (auth required, callable by admin or by `recruiter_user_id` of that brief)
- Loads brief, queries `vetting_applications` joined with `profiles` for vetted_status='approved'
- Computes score, inserts assignments (unique on brief+talent), emails each talent via existing transactional email template
- Returns `{ shortlisted: n }`
- Auto-invoked client-side right after brief submission in `InternMatch.tsx`

## Email templates (transactional)
- `intern_match_talent_shortlisted` — to talent when shortlisted
- `intern_match_founder_interested` — to founder when a talent says interested
- `intern_match_talent_invited` — to talent when founder invites to interview

## Out of scope (next iteration)
- Admin manual override / re-run shortlisting
- Talent profile preview for founders before invite
- In-app realtime notifications
