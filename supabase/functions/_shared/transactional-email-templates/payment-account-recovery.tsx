import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface PaymentRecoveryProps {
  name?: string
  reference?: string
  plan_name?: string
  amount_naira?: number
}

const PaymentAccountRecoveryEmail = ({ name, reference, plan_name, amount_naira }: PaymentRecoveryProps) => {
  const first = (name || '').split(' ')[0]
  const link = reference
    ? `${SITE_URL}/payment-success?reference=${encodeURIComponent(reference)}`
    : `${SITE_URL}/payment-success`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Finish setting up your Remote Workher account</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `Almost there, ${first}` : 'Almost there'}
          </Heading>
          <Text style={text}>
            We received your payment{plan_name ? ` for the ${plan_name} plan` : ''}
            {amount_naira ? ` (₦${amount_naira.toLocaleString()})` : ''} — thank you!
          </Text>
          <Text style={text}>
            But your account isn't active yet because you didn't finish creating it.
            Click the button below to set your password and unlock your dashboard.
            It takes less than a minute.
          </Text>
          <Button style={button} href={link}>
            Finish setting up my account
          </Button>
          <Text style={footer}>
            Trouble with the button? Copy and paste this link:{' '}
            <Link href={link} style={linkStyle}>{link}</Link>
          </Text>
          <Text style={footer}>
            Need help? Just reply to this email — we'll get you sorted.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PaymentAccountRecoveryEmail,
  subject: 'Finish setting up your Remote Workher account',
  displayName: 'Payment account recovery',
  previewData: {
    name: 'Amaka',
    reference: 'rwh_talent_membership_demo',
    plan_name: 'Standard',
    amount_naira: 6988,
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '28px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '0 0 20px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 16px' }
const linkStyle = { color: '#E0487A', textDecoration: 'underline', wordBreak: 'break-all' as const }
const button = {
  backgroundColor: '#E0487A', color: '#ffffff',
  fontSize: '15px', fontWeight: 'bold' as const,
  borderRadius: '999px', padding: '14px 28px',
  textDecoration: 'none', display: 'inline-block',
  margin: '8px 0 24px',
}
const footer = { fontSize: '12px', color: '#777777', margin: '12px 0 0', lineHeight: '1.5' }
