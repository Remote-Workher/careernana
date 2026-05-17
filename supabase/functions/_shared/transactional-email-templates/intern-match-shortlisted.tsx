import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; role_title?: string; match_score?: number }

const Email = ({ name, role_title, match_score }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>You've been shortlisted for {role_title || 'an Intern Match brief'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>You're shortlisted{name ? `, ${name.split(' ')[0]}` : ''} 🎉</Heading>
        <Text style={text}>
          A founder just posted an Intern Match brief and our matching engine put you in the
          top {match_score ? `${match_score}%` : '5'} for the role
          {role_title ? <> — <strong>{role_title}</strong></> : null}.
        </Text>
        <Text style={text}>
          Open the Internship Program page to see the brief and tell us if you're interested.
          If you say yes, the founder will see your profile and can invite you to interview.
        </Text>
        <Button href="https://remoteworkher.com/internship" style={btn}>See the match</Button>
        <Text style={footer}>— Remote Workher</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: any) => `You're shortlisted for ${d?.role_title || 'an Intern Match brief'}`,
  displayName: 'Intern Match — shortlisted (talent)',
  previewData: { name: 'Amaka', role_title: 'Marketing Intern', match_score: 92 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '26px', color: '#1A1A1A', margin: '0 0 18px' }
const text = { fontSize: '14.5px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 18px' }
const btn = { background: '#E0487A', color: '#fff', padding: '12px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#777', margin: '32px 0 0' }
