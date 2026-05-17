import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text, Button } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { founder_name?: string; talent_name?: string; role_title?: string; match_score?: number }

const Email = ({ founder_name, talent_name, role_title, match_score }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>A vetted intern is interested in {role_title || 'your brief'}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{talent_name || 'A vetted intern'} is interested</Heading>
        <Text style={text}>
          {founder_name ? `Hi ${founder_name.split(' ')[0]}, ` : 'Hi, '}
          <strong>{talent_name || 'a vetted intern'}</strong> just said yes to your Intern Match brief
          {role_title ? <> for <strong>{role_title}</strong></> : null}
          {match_score ? ` (${match_score}% match).` : '.'}
        </Text>
        <Text style={text}>
          You can review her profile and either invite her to an interview or pass.
        </Text>
        <Button href="https://remoteworkher.com/recruiter/intern-match" style={btn}>Review matches</Button>
        <Text style={footer}>— Remote Workher</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: any) => `${d?.talent_name || 'A vetted intern'} is interested in ${d?.role_title || 'your brief'}`,
  displayName: 'Intern Match — talent interested (founder)',
  previewData: { founder_name: 'Tunde', talent_name: 'Amaka Okeke', role_title: 'Marketing Intern', match_score: 92 },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '26px', color: '#1A1A1A', margin: '0 0 18px' }
const text = { fontSize: '14.5px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 18px' }
const btn = { background: '#E0487A', color: '#fff', padding: '12px 22px', borderRadius: '10px', fontSize: '14px', fontWeight: 600, textDecoration: 'none' }
const footer = { fontSize: '12px', color: '#777', margin: '32px 0 0' }
