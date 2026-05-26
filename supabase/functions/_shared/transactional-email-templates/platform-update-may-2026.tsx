import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Link, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface Props {
  name?: string
}

const PlatformUpdateEmail = ({ name }: Props) => {
  const first = (name || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>A few new things waiting for you inside Remote Workher</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `Hey ${first},` : 'Hey there,'}
          </Heading>

          <Text style={text}>
            A quick note from the Remote Workher team — we've been shipping. Here's
            what's new on the platform and worth logging in for this week.
          </Text>

          <Section style={card}>
            <Text style={cardEyebrow}>1. A walkthrough video is waiting for you</Text>
            <Text style={cardTitle}>See how to actually use the platform</Text>
            <Text style={cardBody}>
              We made a short walkthrough showing how to get the most out of your
              membership — your dashboard, plan, and tools. It's sitting at the top
              of your dashboard now. If you've dismissed it before, we've reopened it
              so you can watch it.
            </Text>
            <Button style={button} href={`${SITE_URL}/dashboard`}>
              Watch the walkthrough
            </Button>
          </Section>

          <Hr style={hr} />

          <Section style={card}>
            <Text style={cardEyebrow}>2. Two new AI tools live now</Text>
            <Text style={cardTitle}>Career Explorer & Interview Prep</Text>
            <Text style={cardBody}>
              <strong>Career Explorer</strong> helps you discover remote-friendly career paths
              based on your skills and where they're hiring — with Nigeria-specific salary
              context.
            </Text>
            <Text style={cardBody}>
              <strong>Interview Prep</strong> generates role-specific questions and STAR-style
              answers using your wins, so you walk into interviews ready.
            </Text>
            <Button style={buttonGhost} href={`${SITE_URL}/career-explorer`}>
              Try Career Explorer
            </Button>
            <Text style={{ ...cardBody, margin: '10px 0 0' }}>
              <Link href={`${SITE_URL}/tools/interview-prep`} style={link}>
                Open Interview Prep →
              </Link>
            </Text>
          </Section>

          <Hr style={hr} />

          <Section style={card}>
            <Text style={cardEyebrow}>3. We're building our community on Discord</Text>
            <Text style={cardTitle}>Challenges, feedback & real accountability</Text>
            <Text style={cardBody}>
              We're moving community to Discord so you can actually meet other women,
              ship together, and stay accountable. <strong>Challenges</strong> and
              <strong> Get Feedback</strong> will live there — because real accountability
              happens with real people, not a notification bell.
            </Text>
            <Text style={cardBody}>
              Invite link drops soon. Keep an eye on your inbox.
            </Text>
          </Section>

          <Hr style={hr} />

          <Text style={text}>
            That's it for now. Log in, watch the walkthrough, and try one of the new tools.
            We built them for you to use — not bookmark.
          </Text>

          <Text style={signoff}>
            — The Remote Workher team
          </Text>

          <Text style={footer}>
            Questions? Just reply to this email.{' '}
            <Link href={SITE_URL} style={link}>remoteworkher.com</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: PlatformUpdateEmail,
  subject: "What's new on Remote Workher — walkthrough, new tools & community",
  displayName: 'Platform update — May 2026',
  previewData: { name: 'Amaka' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '600px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '28px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '0 0 18px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.65', margin: '0 0 18px' }
const card = { margin: '8px 0' }
const cardEyebrow = {
  fontSize: '11px', fontWeight: 'bold' as const, textTransform: 'uppercase' as const,
  letterSpacing: '0.08em', color: '#E0487A', margin: '0 0 6px',
}
const cardTitle = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '20px', color: '#1A1A1A', margin: '0 0 10px', lineHeight: '1.3',
}
const cardBody = { fontSize: '14.5px', color: '#1A1A1A', lineHeight: '1.65', margin: '0 0 12px' }
const link = { color: '#E0487A', textDecoration: 'underline', fontWeight: 'bold' as const }
const button = {
  backgroundColor: '#E0487A', color: '#ffffff',
  fontSize: '14px', fontWeight: 'bold' as const,
  borderRadius: '999px', padding: '12px 24px',
  textDecoration: 'none', display: 'inline-block', marginTop: '4px',
}
const buttonGhost = {
  backgroundColor: '#1A1A1A', color: '#ffffff',
  fontSize: '14px', fontWeight: 'bold' as const,
  borderRadius: '999px', padding: '12px 24px',
  textDecoration: 'none', display: 'inline-block', marginTop: '4px',
}
const hr = { borderColor: '#F0EBE8', margin: '28px 0' }
const signoff = { fontSize: '15px', color: '#1A1A1A', margin: '0 0 24px' }
const footer = { fontSize: '12px', color: '#777777', margin: '24px 0 0', lineHeight: '1.6' }
