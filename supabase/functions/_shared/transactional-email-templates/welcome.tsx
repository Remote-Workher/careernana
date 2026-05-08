import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface WelcomeProps {
  name?: string
}

const WelcomeEmail = ({ name }: WelcomeProps) => {
  const first = (name || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to Remote Workher — let's start doing the work</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `Welcome, ${first}` : 'Welcome to Remote Workher'}
          </Heading>
          <Text style={text}>
            You're in. Remote Workher is execution-first — less learning,
            more doing. Your dashboard, 90-day plan, and Zara your AI coach
            are ready when you are.
          </Text>
          <Button style={button} href={`${SITE_URL}/dashboard`}>
            Open my dashboard
          </Button>
          <Text style={footer}>
            Need help getting started? Reply to this email or visit{' '}
            <Link href={`${SITE_URL}/help`} style={link}>the Help Center</Link>.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WelcomeEmail,
  subject: 'Welcome to Remote Workher',
  displayName: 'Welcome',
  previewData: { name: 'Amaka' },
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
