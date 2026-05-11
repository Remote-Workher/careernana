/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  from?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as vettingDecision } from './vetting-decision.tsx'
import { template as welcome } from './welcome.tsx'
import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as applicationStatus } from './application-status.tsx'
import { template as rwhRelaunch } from './rwh-relaunch.tsx'
import { template as liveSessionRsvp } from './live-session-rsvp.tsx'
import { template as challengeJoined } from './challenge-joined.tsx'
import { template as challengeReminder } from './challenge-reminder.tsx'
import { template as dailyDigest } from './daily-digest.tsx'
import { template as talentPoolInvite } from './talent-pool-invite.tsx'
import { template as innerCircleThankYou } from './inner-circle-thank-you.tsx'
import { template as recruiterVerification } from './recruiter-verification.tsx'
import { template as paymentAccountRecovery } from './payment-account-recovery.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'inner-circle-thank-you': innerCircleThankYou,
  'vetting-decision': vettingDecision,
  'welcome': welcome,
  'contact-confirmation': contactConfirmation,
  'application-status': applicationStatus,
  'rwh-relaunch': rwhRelaunch,
  'live-session-rsvp': liveSessionRsvp,
  'challenge-joined': challengeJoined,
  'challenge-reminder': challengeReminder,
  'daily-digest': dailyDigest,
  'talent-pool-invite': talentPoolInvite,
  'recruiter-verification': recruiterVerification,
  'payment-account-recovery': paymentAccountRecovery,
}

