import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface IssueResolvedProps {
  name?: string
  // "login" → existing account, just sign in.
  // "set-password" → account was just provisioned; needs to set a password (actionLink required).
  // "email-changed" → email was corrected; password reset link (actionLink required).
  variant?: 'login' | 'set-password' | 'email-changed'
  actionLink?: string
}

const IssueResolvedEmail = ({ name, variant = 'login', actionLink }: IssueResolvedProps) => {
  const firstName = name ? name.split(' ')[0] : 'there'

  let intro = ''
  let cta = 'Sign in'
  let ctaLink = actionLink || 'https://remoteworkher.com/login'

  if (variant === 'set-password') {
    intro =
      "We noticed you paid for your Remote Workher membership but didn't receive your sign-up email. So sorry about that! Your account is now ready — just set your password using the link below and you're in."
    cta = 'Set your password'
  } else if (variant === 'email-changed') {
    intro =
      "We've corrected the typo on your email address. Your account and paid membership are intact — just set a new password using the link below to log in fresh."
    cta = 'Set your password'
  } else {
    intro =
      "We checked your account and your paid membership is fully active on our end. If you were being asked to pay, please fully sign out and sign back in once — that refreshes your membership on your device."
  }

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your Remote Workher account is sorted ✓</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Hi {firstName},</Heading>
          <Text style={text}>{intro}</Text>

          <Section style={{ textAlign: 'center' as const, margin: '28px 0' }}>
            <Button href={ctaLink} style={button}>{cta}</Button>
          </Section>

          {variant === 'login' && (
            <Text style={text}>
              If anything still feels off after signing back in, just reply to this email
              with a screenshot of where it's asking you to pay and we'll sort it
              immediately.
            </Text>
          )}

          {(variant === 'set-password' || variant === 'email-changed') && (
            <Text style={small}>
              The link above expires in 24 hours. If it expires, head to{' '}
              <a href="https://remoteworkher.com/login" style={link}>remoteworkher.com/login</a>{' '}
              and use "Forgot password".
            </Text>
          )}

          <Text style={text}>
            Thanks for your patience — and welcome to Remote Workher.
          </Text>
          <Text style={footer}>— Adeife & the Remote Workher team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: IssueResolvedEmail,
  subject: 'Your Remote Workher account is sorted ✓',
  displayName: 'Issue resolved (June 2026)',
  previewData: {
    name: 'Amaka',
    variant: 'set-password',
    actionLink: 'https://remoteworkher.com/reset-password?token=preview',
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
const small = { fontSize: '13px', color: '#6B6B6B', lineHeight: '1.55', margin: '0 0 16px' }
const button = {
  backgroundColor: '#E0487A',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontSize: '15px',
  fontWeight: 600 as const,
  display: 'inline-block',
}
const link = { color: '#E0487A', textDecoration: 'underline' }
const footer = { fontSize: '12px', color: '#777777', margin: '32px 0 0' }
