import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { firstName?: string }

const Email = ({ firstName }: Props) => {
  const name = firstName || 'there'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Where should you start inside Remote WorkHER?</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Where should you start?</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>One of the biggest problems with career growth online is overwhelm.</Text>
          <Text style={text}>
            There's: LinkedIn, job boards, YouTube, AI tools, random courses, endless advice.
            And it's easy to feel scattered.
          </Text>
          <Text style={text}>
            That's why Remote WorkHER is structured around <strong>3 clear paths:</strong>
          </Text>
          <Text style={text}>
            💼 <strong>Land a Remote Job</strong><br />
            For women looking for remote opportunities, better applications, and career growth.
          </Text>
          <Text style={text}>
            💻 <strong>Become a Freelancer</strong><br />
            For women looking to get clients, freelance online, and build income online.
          </Text>
          <Text style={text}>
            🌱 <strong>Build Your Career Brand</strong><br />
            For women looking to become visible, position themselves better, and grow professionally online.
          </Text>
          <Text style={text}><strong>Here's what we recommend:</strong></Text>
          <Text style={text}>
            <strong>If you want a remote job:</strong><br />
            → Start with the Resume Builder + Job Board
          </Text>
          <Text style={text}>
            <strong>If you want freelance clients:</strong><br />
            → Start with the Resources + Templates
          </Text>
          <Text style={text}>
            <strong>If you want visibility:</strong><br />
            → Start with the LinkedIn tools + Brand Bible Template
          </Text>
          <Text style={text}>
            You do NOT need to figure everything out at once.<br />
            Start small. Stay consistent. Implement.
          </Text>
          <Text style={text}>See you inside 💻✨</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Where should you start inside Remote WorkHER?',
  displayName: 'Onboarding · Day 1 (Pick a path)',
  previewData: { firstName: 'Amaka' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '28px', fontWeight: 'normal' as const,
  color: '#1A1A1A', margin: '0 0 20px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 16px' }
