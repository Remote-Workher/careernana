import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface TalentWelcomeInviteProps {
  name?: string
  actionLink?: string
  planLabel?: string
}

const TalentWelcomeInviteEmail = ({ name, actionLink, planLabel }: TalentWelcomeInviteProps) => {
  const first = (name || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Remote Workher account is ready — set your password to log in</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `Welcome, ${first}` : 'Welcome to Remote Workher'}
          </Heading>
          <Text style={text}>
            Your Remote Workher account has been created{planLabel ? ` on the ${planLabel} plan` : ''}.
            To log in, set your password using the secure link below.
          </Text>
          {actionLink ? (
            <Button style={button} href={actionLink}>
              Set my password & log in
            </Button>
          ) : (
            <Button style={button} href={`${SITE_URL}/login`}>
              Go to login
            </Button>
          )}
          <Text style={text}>
            Once you're in, your dashboard, 90-day plan, and AI tools are ready to go.
            Remote Workher is execution-first — less learning, more doing.
          </Text>
          <Text style={footer}>
            Need help? Reply to this email or visit{' '}
            <Link href={`${SITE_URL}/help`} style={link}>the Help Center</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: TalentWelcomeInviteEmail,
  subject: 'Your Remote Workher account is ready',
  displayName: 'Talent welcome (invite)',
  previewData: { name: 'Amaka', actionLink: 'https://remoteworkher.com/auth/callback?token=...', planLabel: 'Monthly' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '28px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '0 0 20px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 20px' }
const link = { color: '#E0487A', textDecoration: 'underline' }
const button = {
  backgroundColor: '#E0487A', color: '#ffffff',
  fontSize: '15px', fontWeight: 'bold' as const,
  borderRadius: '999px', padding: '14px 28px',
  textDecoration: 'none', display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#777777', margin: '32px 0 0' }
