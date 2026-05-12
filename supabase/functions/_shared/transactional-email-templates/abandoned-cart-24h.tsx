import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { firstName?: string; planLabel?: string; checkoutUrl?: string }

const Email = ({ firstName, planLabel, checkoutUrl }: Props) => {
  const name = firstName || 'there'
  const plan = planLabel || 'your Remote WorkHER membership'
  const url = checkoutUrl || 'https://remoteworkher.com/checkout'
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your spot at Remote WorkHER is still waiting</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>Still thinking about it?</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            Yesterday you started signing up for {plan}. Totally get it — life happens.
            But here's what made us build Remote WorkHER in the first place:
          </Text>
          <Text style={quote}>
            "Most career platforms make women learn theory. We built Remote WorkHER so
            you actually <em>do</em> the thing — apply, pitch, get the role."
          </Text>
          <Text style={text}><strong>What our members are doing this week:</strong></Text>
          <Text style={text}>
            💼 Sarah landed her first remote role at a UK startup<br />
            ✍️ Tomi sent 12 cold pitches using the AI Pitch tool<br />
            🎯 Aisha got 3 recruiter replies after rewriting her LinkedIn
          </Text>
          <Text style={text}>
            You don't need another course. You need a system that pushes you to apply,
            with the tools, jobs, and people in one place.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={url} style={btn}>Pick up where you left off</Button>
          </Section>
          <Text style={text}>
            Questions before you join? Just reply, or WhatsApp us at +234 907 126 6676.
            We reply within an hour.
          </Text>
          <Text style={text}>— Adeife & The Remote WorkHER Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Your Remote WorkHER spot is still waiting',
  displayName: 'Abandoned cart · 24 hours',
  previewData: { firstName: 'Amaka', planLabel: 'the Quarterly plan', checkoutUrl: 'https://remoteworkher.com/checkout' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', fontWeight: 'normal' as const, color: '#1A1A1A', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 16px' }
const quote = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 20px', padding: '12px 16px', borderLeft: '3px solid #E0487A', backgroundColor: '#FAF6F4', fontStyle: 'italic' as const }
const btn = { backgroundColor: '#E0487A', color: '#ffffff', padding: '14px 28px', borderRadius: '999px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' }
