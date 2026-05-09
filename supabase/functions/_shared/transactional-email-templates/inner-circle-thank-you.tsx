import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface InnerCircleProps {
  name?: string
}

const InnerCircleEmail = ({ name }: InnerCircleProps) => {
  const first = (name || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>A thank you from Adeife — your new Remote WorkHER is here</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `${first}, thank you.` : 'Thank you.'}
          </Heading>

          <Text style={text}>
            You believed in Remote WorkHER before there was much to believe in.
            You paid. You waited. You stayed — even when we were quiet, even
            when we were rebuilding behind the scenes, even when we had nothing
            shiny to show you.
          </Text>

          <Text style={text}>
            I don't take that lightly. You are part of the very first
            circle — the women who made this possible. There would be no
            Remote WorkHER without you, and I want you to know I'm deeply,
            genuinely grateful.
          </Text>

          <Text style={text}>
            We've spent the last few months rebuilding Remote WorkHER from the
            ground up — not a course platform, not another community of people
            talking about careers. An <em>execution</em> platform. One built to
            help you actually do the work that changes your career and your
            income.
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

          <Text style={text}>
            All of it pointed at one thing: helping you land better
            opportunities, grow professionally, and earn more — through your
            career, on your own terms.
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
            Thank you for being here from the beginning. I hope you use every
            corner of what we've built — and I hope it pays you back, many
            times over, for the trust you placed in us.
          </Text>

          <Text style={signature}>
            With so much love,<br />
            <strong>Adeife</strong><br />
            <span style={signatureSub}>Founder, Remote WorkHER</span>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: InnerCircleEmail,
  subject: 'Thank you for believing in us — your new Remote WorkHER is here',
  displayName: 'Inner Circle — thank you & relaunch',
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
