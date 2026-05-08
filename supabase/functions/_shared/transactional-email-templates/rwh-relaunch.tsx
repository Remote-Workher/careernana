import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface RelaunchProps {
  name?: string
}

const RelaunchEmail = ({ name }: RelaunchProps) => {
  const first = (name || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Remote Workher 2.0 is here — and you're already in.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `${first}, this one's for you.` : 'This one\'s for you.'}
          </Heading>

          <Text style={text}>
            It's Adeife — founder of Remote Workher.
          </Text>

          <Text style={text}>
            Thank you for being one of the women who showed up early,
            paid for a membership, joined our sessions, and trusted us
            with your career growth. That meant everything.
          </Text>

          <Text style={text}>
            We listened to what you asked for: more execution, more jobs,
            more tools, and more real-time support. So we built version 2
            of Remote Workher around exactly that.
          </Text>

          <Text style={subhead}>Here's what's new and waiting for you:</Text>

          <Text style={bullet}>• A real <strong>job board</strong> with remote roles</Text>
          <Text style={bullet}>• Practical <strong>AI tools</strong> for resumes, cover letters, LinkedIn, applications and skills gaps</Text>
          <Text style={bullet}>• <strong>Live sessions</strong> for CV reviews, sales, audits, customer acquisition and real feedback in real time</Text>
          <Text style={bullet}>• New <strong>courses</strong> coming soon — the first one drops this month</Text>
          <Text style={bullet}>• A <strong>Brag File</strong> to store and document your career wins</Text>
          <Text style={bullet}>• A path to become <strong>vetted talent</strong> and join our talent pool</Text>


          <Text style={text}>
            Your membership is already active. Please log in to your dashboard
            to see everything waiting for you. You may need to set a new
            password the first time.
          </Text>

          <Button style={button} href={`${SITE_URL}/login`}>
            Log in to my dashboard
          </Button>

          <Text style={text}>
            Thank you for sticking with us. This is the version of Remote
            Workher I always wanted to give you. I hope you love it.
          </Text>

          <Hr style={hr} />

          <Text style={signature}>
            With love,<br />
            <strong>Adeife Adeoye</strong><br />
            Founder, Remote Workher
          </Text>

          <Text style={footer}>
            Questions? Just reply to this email — it comes straight to me.<br />
            <Link href={SITE_URL} style={link}>remoteworkher.com</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RelaunchEmail,
  subject: 'A personal note from Adeife — welcome to Remote Workher 2.0',
  displayName: 'RWH 2.0 Relaunch (Adeife)',
  from: 'Adeife Adeoye <adeife@remoteworkher.com>',
  previewData: { name: 'Amaka' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '28px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '0 0 24px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '0 0 18px' }
const subhead = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '24px 0 12px', fontWeight: 'bold' as const }
const bullet = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 12px' }
const link = { color: '#E0487A', textDecoration: 'underline' }
const button = {
  backgroundColor: '#E0487A', color: '#ffffff',
  fontSize: '15px', fontWeight: 'bold' as const,
  borderRadius: '999px', padding: '14px 28px',
  textDecoration: 'none', display: 'inline-block',
  margin: '8px 0 24px',
}
const hr = { borderColor: '#EEE', margin: '24px 0' }
const signature = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 24px' }
const footer = { fontSize: '12px', color: '#777777', margin: '24px 0 0', lineHeight: '1.6' }
