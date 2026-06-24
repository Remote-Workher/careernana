import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface Props {
  name?: string
  planLabel?: string       // e.g. "Monthly", "Quarterly", "Yearly"
  expiresOn?: string       // pre-formatted date, e.g. "Aug 4, 2026"
  daysLeft?: number        // 3, 1, or 0
  amountNaira?: number     // e.g. 6500
}

const RenewalReminder = ({ name, planLabel, expiresOn, daysLeft, amountNaira }: Props) => {
  const first = (name || '').split(' ')[0]
  const renewUrl = `${SITE_URL}/my-plan`
  const dayCopy =
    daysLeft === 0
      ? 'expires today'
      : daysLeft === 1
        ? 'expires tomorrow'
        : `expires in ${daysLeft ?? 3} days`

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Remote Workher membership {dayCopy}.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `${first}, your membership ${dayCopy}.` : `Your membership ${dayCopy}.`}
          </Heading>

          <Text style={text}>
            Your <strong>{planLabel || 'Remote Workher'}</strong> plan{' '}
            {expiresOn ? <>ends on <strong>{expiresOn}</strong>.</> : 'is ending soon.'}{' '}
            Renew now to keep your coins, downloads, vetted job access, AI tools and 90-day plan.
          </Text>

          <Section style={card}>
            <Text style={cardLabel}>What happens if you don't renew</Text>
            <Text style={cardItem}>• You lose access to vetted jobs and AI tools</Text>
            <Text style={cardItem}>• Your 90-day plan and progress pause</Text>
            <Text style={cardItem}>• Coins stop refilling each month</Text>
          </Section>

          <Button style={button} href={renewUrl}>
            {amountNaira ? `Renew for ₦${amountNaira.toLocaleString()}` : 'Renew my membership'}
          </Button>

          <Text style={small}>
            Already renewed? You can ignore this email — your access stays active.
          </Text>

          <Hr style={hr} />
          <Text style={footer}>See you inside. — Team Remote Workher</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RenewalReminder,
  subject: (d: Record<string, any>) => {
    const days = typeof d.daysLeft === 'number' ? d.daysLeft : 3
    if (days === 0) return 'Your Remote Workher membership expires today'
    if (days === 1) return 'Your Remote Workher membership expires tomorrow'
    return `Your Remote Workher membership expires in ${days} days`
  },
  displayName: 'Membership renewal reminder',
  previewData: {
    name: 'Amaka',
    planLabel: 'Monthly',
    expiresOn: 'Aug 4, 2026',
    daysLeft: 3,
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
