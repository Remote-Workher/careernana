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
      <Preview>Welcome to Remote Workher</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Welcome to Remote Workher</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>Welcome to Remote WorkHER. We're so excited to have you here.</Text>
          <Text style={text}>
            Remote WorkHER was built to help women:
            <br />💻 land remote jobs
            <br />✨ become freelancers
            <br />🌱 grow their careers online
            <br /><br />
            without needing 10 different platforms to figure everything out.
          </Text>
          <Text style={text}><strong>Inside Remote WorkHER, you'll find:</strong></Text>
          <Text style={text}>
            • Remote job opportunities<br />
            • AI career tools<br />
            • Resume & LinkedIn support<br />
            • Live workshops every Friday<br />
            • Career challenges<br />
            • Templates & guides<br />
            • Career growth support
          </Text>
          <Text style={text}>This isn't just another course platform.</Text>
          <Text style={text}>
            It's an active career growth ecosystem designed to help you stop feeling
            overwhelmed and start creating opportunities online.
          </Text>
          <Text style={text}><strong>Here's what we recommend you do first:</strong></Text>
          <Text style={text}>
            ✅ Complete your profile<br />
            ✅ Explore the platform<br />
            ✅ Pick a career path<br />
            ✅ Attend a live class this Friday<br />
            ✅ Try one of the AI tools
          </Text>
          <Text style={text}>We're genuinely excited to grow with you 💕</Text>
          <Text style={text}>— Adeife & The Remote WorkHER Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Welcome to Remote Workher',
  displayName: 'Onboarding · Day 0 (Welcome)',
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
