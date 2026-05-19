## Goal

Stop auto-creating recruiter accounts. Instead, recruiters fill a 2-step application (basics + full company page), wait for admin approval, and only set their password — and get a real account — once we accept them.

## New flow

```
Step 1 (Apply)              Step 2 (Apply)               Admin reviews        Approved
┌─────────────────┐         ┌──────────────────────┐    ┌──────────────┐    ┌──────────────────────┐
│ Your name       │  ───►   │ Logo, website        │ ►  │ Approve /    │ ►  │ Email: "Set your     │
│ Company name    │         │ Industry, size       │    │ Reject in    │    │ password" → /recruiter│
│ Work email      │         │ Description, social  │    │ admin panel  │    │ /set-password         │
└─────────────────┘         │ etc.                 │    └──────────────┘    └──────────────────────┘
                            │  → Request to join   │
                            └──────────────────────┘
```

No `auth.users` row is created until approval.

## Database

New table `public.recruiter_applications` (no FK to `auth.users`):

- `id`, `created_at`, `updated_at`
- `email` (unique), `contact_name`, `company_name`
- All company-page fields: `company_website`, `company_size`, `industry`, `company_logo_url`, `company_description`, `role_title`, `culture`, `hiring_process`, `linkedin_url`, `twitter_url`, `instagram_url`, `facebook_url`, `youtube_url`
- `status` text default `'pending'` (`pending` | `approved` | `rejected`)
- `reviewer_notes`, `reviewed_at`, `reviewed_by`
- `approved_user_id` (set after we provision the auth user)

RLS:
- Public/anon **INSERT** allowed (apply without account).
- **SELECT/UPDATE** restricted to admins.

## Frontend

**`/recruiter/apply` (new page)** — replaces signup form
- Step 1: name, company name, work email (+ validate email not already an applicant or recruiter)
- Step 2: full company page form (reuse fields from `CompanyProfile.tsx` — extract a shared `CompanyPageFields` component so we don't duplicate)
- A logo upload endpoint that works pre-auth (new edge function `upload-applicant-logo` writing to `company-logos` bucket under an `applicants/` prefix, since the existing one requires auth).
- Submit → insert into `recruiter_applications` → show "We've received your application — we'll email you within 24h" screen.

**`RecruiterAuthScreen.tsx`** — keep login only; remove signup. Replace "Create recruiter account" link with "Apply to hire on Remote Workher" → `/recruiter/apply`.

**`/recruiter/set-password` (new page)** — landing page from approval email (uses recovery token), lets the new recruiter set their password, then signs them in and routes to `/recruiter`.

## Backend

**Edge function `recruiter-approve-application`** (admin-only, verifies admin role):
- Inputs: `applicationId`, `notes?`
- Creates auth user via service-role `admin.createUser({ email, email_confirm: true, user_metadata: { account_type: 'recruiter', contact_name, company_name } })`
- Inserts/updates `recruiter_profiles` with all the saved application fields (`verification_status='verified'`, `verified_at=now()`)
- Marks application `approved` + `approved_user_id`
- Generates a recovery link (`admin.generateLink({ type: 'recovery', redirectTo: '/recruiter/set-password' })`) and sends `recruiter-verification` email (status `verified`) with that link as the CTA
- Returns success

**Edge function `recruiter-reject-application`** (admin-only):
- Marks `rejected`, stores notes, sends `recruiter-verification` email with status `rejected`.

**`RecruiterOverview.tsx` admin UI**:
- Add a "Pending applications" section listing `recruiter_applications` where status='pending', with Approve / Reject buttons that call the new edge functions.

## Update `handle_new_user` trigger

The trigger currently creates `recruiter_profiles` from user metadata. Since we now create the profile in the approval edge function (with all the company data), update the trigger: if `account_type='recruiter'` AND a row already exists for that `user_id`, do nothing (upsert no-op). Keeps backward compatibility.

## What does NOT change

- Existing recruiter logins, sessions, posting jobs, etc.
- Talent signup flow.
- Company page editing for already-approved recruiters (still `/recruiter/company-profile`).

## Out of scope (ask later)

- Migrating existing `pending` recruiter accounts into the new application table — they stay as-is and can still log in.
- Optional bot/captcha protection on the public apply form.
