import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface Props {
  name?: string
  sessionTitle?: string
  startsAt?: string
  host?: string
  joinUrl?: string
  sessionId?: string
}

const RsvpEmail = ({ name, sessionTitle, startsAt, host, joinUrl, sessionId }: Props) => {
  const first = (name || '').split(' ')[0]
  const link = joinUrl || (sessionId ? `${SITE_URL}/live-sessions/${sessionId}` : `${SITE_URL}/live-sessions`)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>You're registered for {sessionTitle || 'the session'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{first ? `You're in, ${first}.` : "You're in."}</Heading>
          <Text style={text}>
            You just registered for <strong>{sessionTitle || 'a Remote Workher live session'}</strong>
            {host ? <> with <strong>{host}</strong></> : null}.
          </Text>
          {startsAt ? <Text style={text}>📅 <strong>{startsAt}</strong></Text> : null}
          <Text style={text}>
            We'll send you a reminder closer to the session. In the meantime,
            block your calendar and come ready with questions.
          </Text>
          <Button style={button} href={link}>View session details</Button>
          <Hr style={hr} />
          <Text style={footer}>See you there — Team Remote Workher</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: RsvpEmail,
  subject: (d: Record<string, any>) =>
    d.sessionTitle ? `You're registered: ${d.sessionTitle}` : "You're registered for a live session",
  displayName: 'Live session RSVP',
  previewData: { name: 'Amaka', sessionTitle: 'CV Review Live', startsAt: 'Sat, May 17 at 4:00 PM WAT', host: 'Adeife' },
} satisfies TemplateEntry

const main = { backgroundColor: 'transparent', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', fontWeight: 'normal' as const, color: '#1A1A1A', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '0 0 18px' }
const button = { backgroundColor: '#E0487A', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block', margin: '8px 0 24px' }
const hr = { borderColor: '#EEE', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#777', margin: '0' }
