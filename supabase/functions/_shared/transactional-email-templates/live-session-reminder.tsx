import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr, Section,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface Props {
  name?: string
  sessionTitle?: string
  startsAt?: string
  startsAtIso?: string
  endsAtIso?: string
  host?: string
  joinUrl?: string
  sessionId?: string
  location?: string
  description?: string
}

const ReminderEmail = (p: Props) => {
  const { name, sessionTitle, startsAt, host, joinUrl, sessionId } = p
  const first = (name || '').split(' ')[0]
  const link = joinUrl || (sessionId ? `${SITE_URL}/live-sessions/${sessionId}` : `${SITE_URL}/live-sessions`)
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Starting in 1 hour: {sessionTitle || 'your session'}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{first ? `Quick reminder, ${first}.` : 'Quick reminder.'}</Heading>
          <Text style={text}>
            <strong>{sessionTitle || 'Your Remote Workher live session'}</strong>
            {host ? <> with <strong>{host}</strong></> : null} starts in <strong>1 hour</strong>.
          </Text>
          {startsAt ? <Text style={text}>📅 <strong>{startsAt}</strong></Text> : null}
          <Text style={text}>
            Grab a notebook, find a quiet spot, and come ready with your questions.
          </Text>
          <Section style={{ margin: '8px 0 24px' }}>
            <Button style={button} href={link}>Join the session</Button>
          </Section>
          {joinUrl ? (
            <Text style={small}>
              Join link: <a href={joinUrl} style={{ color: '#E0487A' }}>{joinUrl}</a>
            </Text>
          ) : null}
          <Hr style={hr} />
          <Text style={footer}>See you in a bit — Team Remote Workher</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ReminderEmail,
  subject: (d: Record<string, any>) =>
    d.sessionTitle ? `Starting in 1 hour | ${d.sessionTitle}` : 'Your live session starts in 1 hour',
  displayName: 'Live session reminder (1h)',
  from: 'Remote WorkHER Events <events@remoteworkher.com>',
  previewData: {
    name: 'Amaka',
    sessionTitle: 'CV Review Live',
    startsAt: 'Sat, May 17 at 4:00 PM WAT',
    host: 'Adeife',
    joinUrl: 'https://zoom.us/j/123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', fontWeight: 'normal' as const, color: '#1A1A1A', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '0 0 18px' }
const small = { fontSize: '13px', color: '#555', lineHeight: '1.6', margin: '0 0 18px', wordBreak: 'break-all' as const }
const button = { backgroundColor: '#E0487A', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#EEE', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#777', margin: '0' }
