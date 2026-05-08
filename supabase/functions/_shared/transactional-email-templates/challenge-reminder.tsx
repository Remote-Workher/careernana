import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface Props {
  name?: string
  challengeTitle?: string
  challengeKey?: string
  tasksDone?: number
  tasksTotal?: number
  endsAt?: string
}

const ReminderEmail = ({ name, challengeTitle, challengeKey, tasksDone, tasksTotal, endsAt }: Props) => {
  const first = (name || '').split(' ')[0]
  const link = challengeKey ? `${SITE_URL}/challenges/${challengeKey}` : `${SITE_URL}/challenges`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Halfway through {challengeTitle || 'your challenge'} — keep going.</Preview>
      <Body style={main}>
        <Container style={container>
          <Heading style={h1}>{first ? `${first}, halfway check-in.` : 'Halfway check-in.'}</Heading>
          <Text style={text}>
            You're at the midpoint of <strong>{challengeTitle || 'your challenge'}</strong>.
          </Text>
          {typeof tasksDone === 'number' && typeof tasksTotal === 'number' ? (
            <Text style={text}>So far: <strong>{tasksDone} of {tasksTotal}</strong> tasks completed.</Text>
          ) : null}
          {endsAt ? <Text style={text}>⏳ Ends <strong>{endsAt}</strong></Text> : null}
          <Text style={text}>
            Pop in for 15 minutes today and knock out the next task. Future-you
            will thank you.
          </Text>
          <Button style={button} href={link}>Continue my challenge</Button>
          <Hr style={hr} />
          <Text style={footer}>Keep going. — Team Remote Workher</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ReminderEmail,
  subject: (d: Record<string, any>) =>
    d.challengeTitle ? `Halfway through ${d.challengeTitle} — keep going` : 'Halfway through your challenge',
  displayName: 'Challenge midpoint reminder',
  previewData: { name: 'Amaka', challengeTitle: '7-Day LinkedIn Glow-Up', tasksDone: 2, tasksTotal: 7 },
} satisfies TemplateEntry

const main = { backgroundColor: 'transparent', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', fontWeight: 'normal' as const, color: '#1A1A1A', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '0 0 18px' }
const button = { backgroundColor: '#E0487A', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block', margin: '8px 0 24px' }
const hr = { borderColor: '#EEE', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#777', margin: '0' }
