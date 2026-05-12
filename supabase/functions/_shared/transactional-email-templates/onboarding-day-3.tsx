import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { firstName?: string }

const Email = ({ firstName }: Props) => {
  const name = firstName || 'there'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Don't miss our Friday Live Classes</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Don't miss our Friday Live Classes</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>One of the best parts of Remote WorkHER?</Text>
          <Text style={text}>Our live Friday classes 💻✨</Text>
          <Text style={text}>
            Every Friday, we host implementation-focused sessions designed to help you
            grow your career online in real time.
          </Text>
          <Text style={text}>These are not just "sit down and listen" classes.</Text>
          <Text style={text}><strong>Inside our Friday sessions, we:</strong></Text>
          <Text style={text}>
            ✅ review CVs live<br />
            ✅ audit LinkedIn pages<br />
            ✅ fix applications together<br />
            ✅ talk freelancing & positioning<br />
            ✅ break down career strategy<br />
            ✅ answer questions live<br />
            ✅ help you implement immediately
          </Text>
          <Text style={text}><strong>You'll also get access to:</strong></Text>
          <Text style={text}>
            • tutors<br />
            • experts<br />
            • workshops<br />
            • practical career guidance<br />
            • real-time feedback
          </Text>
          <Text style={text}>
            If you really want to grow inside Remote WorkHER, showing up consistently
            to the Friday sessions is one of the best things you can do.
          </Text>
          <Text style={text}>
            Your next opportunity could genuinely come from one thing you learn or
            fix during a session 💕
          </Text>
          <Text style={text}>See you on Friday 🎀<br />— Remote WorkHER Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: "Don't miss our Friday Live Classes",
  displayName: 'Onboarding · Day 3 (Friday Live)',
  previewData: { firstName: 'Amaka' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '28px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '0 0 20px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 16px' }
