## Goal

Re-send the 6 issue-resolution emails from yesterday. Logs show all 6 sent successfully, but the user wants them re-fired with **fresh recovery links** for the 4 set-password recipients.

## Approach

Build a one-off Node script (run via `code--exec`, no UI, no committed code) that:

1. For each of the 4 set-password recipients (`ajayitemiloluwaoyindamola`, `faithmicheal205`, `oreofe.adebola`, `opuere`):
   - Calls Supabase Admin API `generateLink({ type: 'recovery', email })` using `SUPABASE_SERVICE_ROLE_KEY`
   - Extracts the `action_link` (full reset URL with token)
   - Invokes `send-transactional-email` with template `issue-resolved-202606`, `variant: 'set-password'`, `actionLink: <fresh link>`
2. For the 2 login-variant recipients (`igwecherie`, `akinyemimaryoluwaseun`):
   - Invokes `send-transactional-email` with `variant: 'login'` (no link needed; defaults to `/login`)
3. Uses a fresh `idempotencyKey` (`issue-resolved-202606-resend2-<email>`) so the suppression/idempotency layer doesn't dedupe against yesterday's send.

The existing template (`supabase/functions/_shared/transactional-email-templates/issue-resolved-202606.tsx`) and the `send-transactional-email` edge function (which already routes through Resend via the Lovable email pipeline) are unchanged. **No file edits, no migrations, no deploys.**

## Verification

After running, query `email_send_log` for rows created in the last 5 minutes for these 6 addresses with template `issue-resolved-202606` and confirm status moves from `pending` → `sent`. Report the result back.

## Notes

- The send path is already Resend-backed (Lovable Emails → Resend under the hood). No need to call Resend's API directly.
- If any recipient is on the `suppressed_emails` list (e.g. previously unsubscribed/bounced), the send will be blocked and reported as such — I'll flag that in the verification step rather than try to bypass it.
