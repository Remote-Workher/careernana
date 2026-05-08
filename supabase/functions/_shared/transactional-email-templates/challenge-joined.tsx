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
  endsAt?: string
}

const ChallengeJoinedEmail = ({ name, challengeTitle, challengeKey, endsAt }: Props) => {
  const first = (name || '').split(' ')[0]
  const link = challengeKey ? `${SITE_URL}/challenges/${challengeKey}` : `${SITE_URL}/challenges`
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>You joined {challengeTitle || 'a new challenge'} 💪</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{first ? `Let's go, ${first}.` : "Let's go."}</Heading>
          <Text style={text}>
            You just joined <strong>{challengeTitle || 'a new challenge'}</strong>.
            This is execution time — small daily reps add up to real career wins.
          </Text>
          {endsAt ? <Text style={text}>⏳ Wraps up <strong>{endsAt}</strong></Text> : null}
          <Text style={text}>Open the challenge and tick off your first task today.</Text>
          <Button style={button} href={link}>Open my challenge</Button>
          <Hr style={hr} />
          <Text style={footer}>You've got this. — Team Remote Workher</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ChallengeJoinedEmail,
  subject: (d: Record<string, any>) =>
    d.challengeTitle ? `You joined: ${d.challengeTitle}` : "You joined a new challenge",
  displayName: 'Challenge joined',
  previewData: { name: 'Amaka', challengeTitle: '7-Day LinkedIn Glow-Up', endsAt: 'Sun, May 18' },
} satisfies TemplateEntry

const main = { backgroundColor: 'transparent', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', fontWeight: 'normal' as const, color: '#1A1A1A', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '0 0 18px' }
const button = { backgroundColor: '#E0487A', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block', margin: '8px 0 24px' }
const hr = { borderColor: '#EEE', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#777', margin: '0' }
