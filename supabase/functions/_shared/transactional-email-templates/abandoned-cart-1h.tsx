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
      <Preview>You're one step away from joining Remote WorkHER</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>You're almost in 💕</Heading>
          <Text style={text}>Hi {name},</Text>
          <Text style={text}>
            We noticed you started signing up for {plan} but didn't finish checkout.
            No stress — your spot is still here, and it only takes 2 minutes to complete.
          </Text>
          <Section style={{ textAlign: 'center', margin: '28px 0' }}>
            <Button href={url} style={btn}>Finish your signup</Button>
          </Section>
          <Text style={text}><strong>What you'll unlock the moment you join:</strong></Text>
          <Text style={text}>
            ✅ Live remote jobs hand-picked for women<br />
            ✅ AI tools (Resume, Cover Letter, LinkedIn, Cold Pitch)<br />
            ✅ Friday live classes<br />
            ✅ Career challenges + templates<br />
            ✅ Direct support from the team
          </Text>
          <Text style={text}>
            If something went wrong with payment, just reply to this email or message us
            on WhatsApp at +234 907 126 6676 — we'll sort it within the hour.
          </Text>
          <Text style={text}>— Adeife & The Remote WorkHER Team</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: "You're almost in — finish joining Remote WorkHER",
  displayName: 'Abandoned cart · 1 hour',
  previewData: { firstName: 'Amaka', planLabel: 'the Quarterly plan', checkoutUrl: 'https://remoteworkher.com/checkout' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', fontWeight: 'normal' as const, color: '#1A1A1A', margin: '0 0 20px' }
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 16px' }
const btn = { backgroundColor: '#E0487A', color: '#ffffff', padding: '14px 28px', borderRadius: '999px', fontSize: '15px', fontWeight: 'bold' as const, textDecoration: 'none', display: 'inline-block' }
