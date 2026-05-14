import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface InnerCircleWelcomeProps {
  name?: string
}

const InnerCircleWelcomeEmail = ({ name }: InnerCircleWelcomeProps) => {
  const first = (name || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Welcome to the Inner Circle — your Remote WorkHER access is ready</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `${first}, you're back in.` : 'You're back in.'}
          </Heading>

          <Text style={text}>
            As one of our <strong>Inner Circle</strong> members, you've now been
            re-added to the new <strong>Remote WorkHER</strong> platform — the
            home we've been building for everything we do together.
          </Text>

          <Text style={text}>
            This isn't another course platform or another community of people{' '}
            <em>talking</em> about careers. It's an <strong>execution</strong>{' '}
            platform — built to help you actually do the work that moves your
            career and your income forward.
          </Text>

          <Heading as="h2" style={h2}>What's waiting for you inside</Heading>

          <Text style={text}>
            <strong>A 90-day career plan</strong> tailored to where you are
            and where you want to go — broken into weekly steps so you always
            know what to do next.
          </Text>
          <Text style={text}>
            <strong>Vetted remote and hybrid jobs</strong> from companies
            actively hiring African women — many of them members-only and not
            posted publicly anywhere else.
          </Text>
          <Text style={text}>
            <strong>AI tools</strong> to build your CV, optimise your LinkedIn,
            write cover letters, prep for interviews, calculate your tax,
            negotiate salary, and explore new careers — all built around the
            Nigerian market.
          </Text>
          <Text style={text}>
            <strong>The Brag File, challenges, courses, live sessions, and a
            community</strong> of women doing the same work alongside you.
          </Text>

          <Hr style={hr} />

          <Heading as="h2" style={h2}>How to log in</Heading>
          <Text style={text}>
            Your account is already set up with this email address. Click the
            button below, choose <strong>"Sign in with email"</strong>, and
            we'll send you a one-time code to log in — no password needed.
          </Text>

          <div style={{ textAlign: 'center' as const, margin: '24px 0 8px' }}>
            <Button style={button} href={`${SITE_URL}/login`}>
              Log in to Remote WorkHER
            </Button>
          </div>
          <Text style={small}>
            Or open this link in your browser:{' '}
            <Link href={`${SITE_URL}/login`} style={link}>{SITE_URL}/login</Link>
          </Text>

          <Hr style={hr} />

          <Text style={text}>
            One small ask — log in this week, finish onboarding, and let the
            platform build your 90-day plan. That single step unlocks
            everything else.
          </Text>

          <Text style={signature}>
            Welcome to the circle,<br />
            <strong>Adeife</strong><br />
            <span style={signatureSub}>Founder, Remote WorkHER</span>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InnerCircleWelcomeEmail,
  subject: 'Welcome to the Inner Circle — your Remote WorkHER is here',
  displayName: 'Inner Circle — welcome',
  previewData: { name: 'Amaka' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '32px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '0 0 24px', lineHeight: '1.2',
}
const h2 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '20px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '32px 0 12px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '0 0 16px' }
const small = { fontSize: '12px', color: '#777777', textAlign: 'center' as const, margin: '0 0 8px' }
const link = { color: '#E0487A', textDecoration: 'underline' }
const button = {
  backgroundColor: '#E0487A', color: '#ffffff',
  fontSize: '15px', fontWeight: 'bold' as const,
  borderRadius: '999px', padding: '14px 32px',
  textDecoration: 'none', display: 'inline-block',
}
const hr = { border: 'none', borderTop: '1px solid #EEE7E3', margin: '32px 0' }
const signature = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '24px 0 0' }
const signatureSub = { fontSize: '13px', color: '#777777' }
