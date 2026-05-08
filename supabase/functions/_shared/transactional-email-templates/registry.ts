/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as vettingDecision } from './vetting-decision.tsx'
import { template as welcome } from './welcome.tsx'
import { template as contactConfirmation } from './contact-confirmation.tsx'
import { template as applicationStatus } from './application-status.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'vetting-decision': vettingDecision,
  'welcome': welcome,
  'contact-confirmation': contactConfirmation,
  'application-status': applicationStatus,
}
