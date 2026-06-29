import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface Props {
  name?: string
  planLabel?: string       // e.g. "Monthly", "Quarterly", "Yearly"
  expiredOn?: string       // pre-formatted date, e.g. "Jun 12, 2026"
  amountNaira?: number     // e.g. 6500
}

const PlanExpired = ({ name, planLabel, expiredOn, amountNaira }: Props) => {
  const first = (name || '').split(' ')[0]
  const renewUrl = `${SITE_URL}/my-plan`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Remote Workher membership has expired — reactivate in one click.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `${first}, your membership has expired.` : 'Your membership has expired.'}
          </Heading>

          <Text style={text}>
            Your <strong>{planLabel || 'Remote Workher'}</strong> plan{' '}
            {expiredOn ? <>ended on <strong>{expiredOn}</strong>.</> : 'has ended.'}{' '}
            Your account is still here — but vetted jobs, AI tools, your 90-day plan and monthly coins are paused until you renew.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>What you're missing right now</Text>
            <Text style={cardItem}>• Vetted remote jobs hand-picked for Nigerian women</Text>
            <Text style={cardItem}>• Resume, LinkedIn, Apply Assistant + all AI tools</Text>
            <Text style={cardItem}>• Your 90-day career plan and weekly progress</Text>
            <Text style={cardItem}>• Monthly coin refills and downloads</Text>
          </Section>

          <Button style={button} href={renewUrl}>
            {amountNaira ? `Reactivate for ₦${amountNaira.toLocaleString()}` : 'Reactivate my membership'}
          </Button>

          <Text style={text}>
            One payment and you're back in — no re-onboarding, your saved jobs, brag file and roadmap are exactly where you left them.
          </Text>

          <Text style={small}>
            Hit reply if you had any trouble with your last payment or want help picking a plan. A real human reads every reply.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>We'd love to have you back. — Team Remote Workher</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PlanExpired,
  subject: (d: Record<string, any>) => {
    const first = (d?.name || '').split(' ')[0]
    return first
      ? `${first}, your Remote Workher membership has expired`
      : 'Your Remote Workher membership has expired'
  },
  displayName: 'Plan expired (win-back)',
  previewData: {
    name: 'Amaka',
    planLabel: 'Monthly',
    expiredOn: 'Jun 12, 2026',
    amountNaira: 6500,
  },
} satisfies TemplateEntry

const main = { backgroundColor: 'transparent', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', fontWeight: 'normal' as const, color: '#1A1A1A', margin: '0 0 20px', lineHeight: '1.25' }
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '0 0 20px' }
const card = { backgroundColor: '#F0EBE8', borderRadius: '14px', padding: '18px 20px', margin: '0 0 24px' }
const cardLabel = { fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '0.06em', color: '#777', margin: '0 0 8px', fontWeight: 'bold' as const }
const cardItem = { fontSize: '14px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 4px' }
const button = { backgroundColor: '#E0487A', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block', margin: '4px 0 20px' }
const small = { fontSize: '13px', color: '#777', lineHeight: '1.6', margin: '0' }
const hr = { borderColor: '#EEE', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#777', margin: '0' }
