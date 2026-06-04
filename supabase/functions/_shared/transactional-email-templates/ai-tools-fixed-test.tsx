import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props {
  name?: string
}

const AiToolsFixedTestEmail = ({ name }: Props) => {
  const first = name ? name.split(' ')[0] : 'there'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Resume AI is fixed — and a webinar tomorrow you don't want to miss</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>A quick update from Remote Workher</Heading>
          <Text style={p}>Hi {first},</Text>
          <Text style={p}>
            For the past 72 hours, our <strong>Resume AI</strong>, <strong>Cover Letter AI</strong>, and{' '}
            <strong>Resume Optimizer</strong> were glitching. We're sorry about that.
          </Text>
          <Text style={p}>
            Everything is now fixed — and the resumes generated are even stronger on ATS scoring than
            before. Jump back in whenever you're ready.
          </Text>

          <Section style={callout}>
            <Heading as="h2" style={h2}>Webinar tomorrow — don't miss it</Heading>
            <Text style={pTight}>
              We're going live tomorrow with a session you'll want to be in. Block out the time and
              show up — we'll share what's next for your career execution plan.
            </Text>
          </Section>

          <Text style={p}>See you there,</Text>
          <Text style={p}>The Remote Workher team</Text>

          <Hr style={hr} />
          <Text style={small}>
            Remote Workher · <a href="https://remoteworkher.com" style={link}>remoteworkher.com</a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AiToolsFixedTestEmail,
  subject: 'Resume AI is fixed + webinar tomorrow 🎯',
  displayName: 'AI Tools Fixed + Webinar (test)',
  previewData: { name: 'Adeife' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif", color: '#1A1A1A' }
const container = { maxWidth: '600px', margin: '0 auto', padding: '32px 28px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', lineHeight: '1.2', margin: '0 0 16px', color: '#1A1A1A' }
const h2 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '20px', margin: '0 0 8px', color: '#1A1A1A' }
const p = { fontSize: '16px', lineHeight: '1.6', margin: '0 0 16px' }
const pTight = { fontSize: '15px', lineHeight: '1.5', margin: '0' }
const callout = { backgroundColor: '#F0EBE8', borderLeft: '4px solid #E0487A', padding: '16px 20px', margin: '24px 0', borderRadius: '6px' }
const hr = { border: 'none', borderTop: '1px solid #eee', margin: '32px 0 16px' }
const small = { fontSize: '12px', color: '#888', margin: '0' }
const link = { color: '#E0487A', textDecoration: 'none' }
