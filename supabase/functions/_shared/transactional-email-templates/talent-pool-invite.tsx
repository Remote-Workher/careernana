import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface Props { name?: string }

const VettingEmail = ({ name }: Props) => {
  const first = (name || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>You're now eligible to join our vetted talent pool.</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{first ? `${first}, you're eligible.` : "You're eligible."}</Heading>
          <Text style={text}>
            As a paid Remote Workher member, you can now apply to join our
            <strong> vetted talent pool</strong>. Vetted members get surfaced
            directly to recruiters hiring remote roles — including roles
            that never hit a public job board.
          </Text>
          <Text style={subhead}>What you get when you're vetted:</Text>
          <Text style={bullet}>• Featured profile shown to paid recruiters</Text>
          <Text style={bullet}>• First access to private hiring requests</Text>
          <Text style={bullet}>• A trust signal employers actually look for</Text>
          <Text style={text}>
            The application takes about 5 minutes. We'll review it and let you know.
          </Text>
          <Button style={button} href={`${SITE_URL}/vetting`}>Apply to be vetted</Button>
          <Hr style={hr} />
          <Text style={footer}>With love, Adeife &amp; Team Remote Workher</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: VettingEmail,
  subject: 'Apply to join our vetted talent pool',
  displayName: 'Talent pool invite',
  previewData: { name: 'Amaka' },
} satisfies TemplateEntry

const main = { backgroundColor: 'transparent', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', fontWeight: 'normal' as const, color: '#1A1A1A', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '0 0 18px' }
const subhead = { fontSize: '15px', color: '#1A1A1A', margin: '24px 0 12px', fontWeight: 'bold' as const }
const bullet = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 10px' }
const button = { backgroundColor: '#E0487A', color: '#ffffff', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '14px 28px', textDecoration: 'none', display: 'inline-block', margin: '8px 0 24px' }
const hr = { borderColor: '#EEE', margin: '24px 0' }
const footer = { fontSize: '13px', color: '#777', margin: '0' }
