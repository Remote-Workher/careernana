import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface ContactConfirmProps {
  name?: string
  message?: string
}

const ContactConfirmationEmail = ({ name, message }: ContactConfirmProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>We got your message — Remote Workher</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>
          {name ? `Thanks, ${name.split(' ')[0]}!` : 'Thanks for reaching out!'}
        </Heading>
        <Text style={text}>
          We received your message and the Remote Workher team will get
          back to you shortly. We typically reply within 1–2 business days.
        </Text>
        {message && (
          <Text style={quote}>"{message}"</Text>
        )}
        <Text style={footer}>— The Remote Workher team</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: ContactConfirmationEmail,
  subject: 'We got your message — Remote Workher',
  displayName: 'Contact form confirmation',
  previewData: { name: 'Amaka', message: 'I have a question about Premium membership.' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '28px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '0 0 20px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 20px' }
const quote = {
  fontSize: '14px', color: '#6B6B6B', fontStyle: 'italic' as const,
  borderLeft: '3px solid #E0487A', padding: '8px 16px',
  margin: '0 0 24px', lineHeight: '1.6',
}
const footer = { fontSize: '12px', color: '#777777', margin: '32px 0 0' }
