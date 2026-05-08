import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

type Status = 'in_review' | 'shortlisted' | 'interview' | 'hired' | 'rejected'

interface ApplicationStatusProps {
  name?: string
  jobTitle?: string
  companyName?: string
  status: Status
}

const labelFor = (s: Status) => {
  switch (s) {
    case 'in_review': return 'is now in review'
    case 'shortlisted': return 'has been shortlisted'
    case 'interview': return 'moved to the interview stage'
    case 'hired': return 'received an offer 🎉'
    case 'rejected': return 'was not selected this time'
  }
}

const ApplicationStatusEmail = ({
  name, jobTitle, companyName, status,
}: ApplicationStatusProps) => {
  const first = (name || '').split(' ')[0]
  const role = jobTitle || 'Your application'
  const at = companyName ? ` at ${companyName}` : ''
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Update on your application{at}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `Hi ${first},` : 'Hi there,'}
          </Heading>
          <Text style={text}>
            <strong>{role}</strong>{at} {labelFor(status)}.
          </Text>
          <Text style={text}>
            Open your tracker to see the full status, recruiter notes, and
            recommended next steps.
          </Text>
          <Button style={button} href={`${SITE_URL}/applications`}>
            View my applications
          </Button>
          <Text style={footer}>
            Keep doing the work. We're rooting for you.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: ApplicationStatusEmail,
  subject: (d: Record<string, any>) =>
    `Application update: ${d?.jobTitle || 'your role'}${d?.companyName ? ` at ${d.companyName}` : ''}`,
  displayName: 'Application status update',
  previewData: { name: 'Amaka', jobTitle: 'Product Designer', companyName: 'Acme', status: 'shortlisted' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '26px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '0 0 20px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 20px' }
const button = {
  backgroundColor: '#E0487A', color: '#ffffff',
  fontSize: '15px', fontWeight: 'bold' as const,
  borderRadius: '999px', padding: '14px 28px',
  textDecoration: 'none', display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#777777', margin: '32px 0 0' }
