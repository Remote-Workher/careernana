import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Link, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'
const LOGIN_URL = `${SITE_URL}/login`

interface DowntimeProps {
  name?: string
}

const DowntimeNoticeEmail = ({ name }: DowntimeProps) => {
  const first = (name || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>We had a brief hiccup this morning — Remote Workher is back up.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `${first}, we're back up.` : "We're back up."}
          </Heading>

          <Text style={text}>
            Quick note from the Remote Workher team — between
            <strong> 3:50am and 10:33am (WAT) </strong>
            today, our site experienced a short period of downtime, which
            meant some of you couldn't log in or load pages.
          </Text>

          <Text style={text}>
            The issue has been fully resolved. Everything is working again
            and you can log in as normal.
          </Text>

          <Button style={button} href={LOGIN_URL}>
            Log in to Remote Workher
          </Button>

          <Text style={text}>
            We're sorry for the disruption and grateful for your patience.
            If you're still seeing anything strange, please reply to this
            email and we'll jump on it right away.
          </Text>

          <Hr style={hr} />

          <Text style={signature}>
            — The Remote Workher Team
          </Text>

          <Text style={footer}>
            <Link href={SITE_URL} style={link}>remoteworkher.com</Link>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DowntimeNoticeEmail,
  subject: "We're back up — quick note about this morning's downtime",
  displayName: 'Service downtime notice (May 13)',
  from: 'Remote Workher <hello@remoteworkher.com>',
  previewData: { name: 'Amaka' },
} satisfies TemplateEntry

const main = { backgroundColor: 'transparent', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '28px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '0 0 24px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '0 0 18px' }
const link = { color: '#E0487A', textDecoration: 'underline' }
const button = {
  backgroundColor: '#E0487A', color: '#ffffff',
  fontSize: '15px', fontWeight: 'bold' as const,
  borderRadius: '999px', padding: '14px 28px',
  textDecoration: 'none', display: 'inline-block',
  margin: '8px 0 24px',
}
const hr = { borderColor: '#EEE', margin: '24px 0' }
const signature = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 12px' }
const footer = { fontSize: '12px', color: '#777777', margin: '12px 0 0', lineHeight: '1.6' }
