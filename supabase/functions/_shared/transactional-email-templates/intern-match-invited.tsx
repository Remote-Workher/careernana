import * as React from 'npm:react@18.3.1'
import { Body, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { name?: string; company?: string; role_title?: string; invite_message?: string }

const Email = ({ name, company, role_title, invite_message }: Props) => (
  <Html lang="en">
    <Head />
    <Preview>{company || 'A founder'} wants to interview you</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>{company || 'A founder'} wants to interview you 🎯</Heading>
        <Text style={text}>
          {name ? `Hi ${name.split(' ')[0]}, ` : 'Hi, '}
          great news — <strong>{company || 'the founder'}</strong> just invited you to interview for
          {role_title ? <> <strong>{role_title}</strong></> : ' the role'}.
        </Text>
        {invite_message && (
          <Text style={quote}>"{invite_message}"</Text>
        )}
        <Text style={text}>
          Reply to this email or expect them to reach out shortly with next steps.
        </Text>
        <Text style={footer}>— Remote Workher</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: any) => `${d?.company || 'A founder'} invited you to interview${d?.role_title ? ` for ${d.role_title}` : ''}`,
  displayName: 'Intern Match — invited to interview (talent)',
  previewData: { name: 'Amaka', company: 'Acme Studios', role_title: 'Marketing Intern', invite_message: "Loved your portfolio — can we chat Thursday?" },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '26px', color: '#1A1A1A', margin: '0 0 18px' }
const text = { fontSize: '14.5px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 18px' }
const quote = { fontSize: '14px', color: '#6B6B6B', fontStyle: 'italic' as const, borderLeft: '3px solid #E0487A', padding: '8px 16px', margin: '0 0 20px', lineHeight: '1.6' }
const footer = { fontSize: '12px', color: '#777', margin: '32px 0 0' }
