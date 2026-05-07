import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Button, Hr, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Remote Workher'
const PRIMARY = '#E0487A'
const DARK = '#1A1A1A'
const BG_WARM = '#F0EBE8'
const MUTED = '#6B6B6B'

interface VettingDecisionProps {
  name?: string
  decision: 'approved' | 'rejected'
  reviewerNotes?: string
  roleTitle?: string
  ctaUrl?: string
}

const VettingDecisionEmail = ({
  name,
  decision,
  reviewerNotes,
  roleTitle,
  ctaUrl,
}: VettingDecisionProps) => {
  const firstName = (name || 'there').split(' ')[0]
  const isApproved = decision === 'approved'

  const subject = isApproved
    ? `You're in — welcome to the Remote Workher Vetted Talent Pool`
    : `An update on your Remote Workher Vetted Talent application`

  const cta = ctaUrl || (isApproved
    ? 'https://remoteworkher.com/dashboard'
    : 'https://remoteworkher.com/dashboard')

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{subject}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Brand bar */}
          <Section style={brandBar}>
            <Text style={brandMark}>Remote Workher</Text>
          </Section>

          {/* Status badge */}
          <Section style={{ textAlign: 'center', padding: '32px 0 8px' }}>
            <Text style={isApproved ? badgeApproved : badgeRejected}>
              {isApproved ? '✓ Application Approved' : 'Application Update'}
            </Text>
          </Section>

          <Section style={contentSection}>
            <Heading style={h1}>
              {isApproved
                ? `Welcome in, ${firstName} 🎉`
                : `Hi ${firstName},`}
            </Heading>

            {isApproved ? (
              <>
                <Text style={text}>
                  Congratulations — you've been approved into the{' '}
                  <strong>Remote Workher Vetted Talent Pool</strong>.
                </Text>
                <Text style={text}>
                  This is a curated pool we hand-search whenever an employer
                  comes to us saying "we want to hire someone." When your
                  profile matches, we'll reach out directly with the role,
                  shortlist you, and connect you to the team. No cold
                  applications. No black holes.
                </Text>
                {roleTitle && (
                  <Text style={text}>
                    You're listed under: <strong>{roleTitle}</strong>.
                  </Text>
                )}

                <Section style={cardApproved}>
                  <Text style={cardLabel}>What happens next</Text>
                  <Text style={cardItem}>1. Keep your profile + Brag File current — that's what we search.</Text>
                  <Text style={cardItem}>2. Make sure your email is one you check.</Text>
                  <Text style={cardItem}>3. When a fit lands, we'll email you with the role and ask if you're interested.</Text>
                </Section>
              </>
            ) : (
              <>
                <Text style={text}>
                  Thank you for applying to the Remote Workher Vetted Talent
                  Pool. After reviewing your application, we won't be
                  approving it at this time.
                </Text>
                <Text style={text}>
                  Please don't read this as a verdict on you — being vetted
                  is a narrow signal we use for a specific kind of employer
                  match. Many incredible women aren't a fit today and become
                  a strong fit a few months later.
                </Text>
              </>
            )}

            {reviewerNotes && reviewerNotes.trim().length > 0 && (
              <Section style={isApproved ? noteBoxApproved : noteBoxRejected}>
                <Text style={noteLabel}>A note from our team</Text>
                <Text style={noteText}>{reviewerNotes}</Text>
              </Section>
            )}

            {!isApproved && (
              <Section style={cardRejected}>
                <Text style={cardLabel}>You can still:</Text>
                <Text style={cardItem}>• Keep using every tool in your dashboard — Resume Builder, Apply Assistant, AI Coach, Brag File.</Text>
                <Text style={cardItem}>• Apply to roles directly through the Jobs board.</Text>
                <Text style={cardItem}>• Reapply to be vetted again in 90 days with stronger proof of work.</Text>
              </Section>
            )}

            <Section style={{ textAlign: 'center', padding: '12px 0 4px' }}>
              <Button style={button} href={cta}>
                {isApproved ? 'Open your dashboard' : 'Back to your dashboard'}
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Doing, not learning.<br />
              The {SITE_NAME} Team
            </Text>
            <Text style={footerSmall}>
              Questions? Reply to this email or write to{' '}
              <Link href="mailto:hello@remoteworkher.com" style={footerLink}>
                hello@remoteworkher.com
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: VettingDecisionEmail,
  subject: (data: Record<string, any>) =>
    data?.decision === 'approved'
      ? `You're in — welcome to the Remote Workher Vetted Talent Pool`
      : `An update on your Remote Workher Vetted Talent application`,
  displayName: 'Vetting decision (approval / rejection)',
  previewData: {
    name: 'Adaeze Okonkwo',
    decision: 'rejected',
    reviewerNotes:
      "Strong portfolio, but we look for at least 3 years of shipped product work for the senior pool right now. Reapply in 90 days with 1–2 fresh case studies that show measurable outcomes (revenue, retention, conversion).",
    roleTitle: 'Senior Product Designer',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "DM Sans", sans-serif',
  margin: 0,
  padding: 0,
}
const container = {
  maxWidth: '560px',
  margin: '0 auto',
  padding: '0',
  backgroundColor: '#ffffff',
}
const brandBar = {
  backgroundColor: DARK,
  padding: '18px 28px',
  textAlign: 'center' as const,
}
const brandMark = {
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 700,
  letterSpacing: '0.02em',
  margin: 0,
  fontFamily: 'Georgia, "EB Garamond", serif',
}
const contentSection = { padding: '8px 28px 32px' }
const badgeApproved = {
  display: 'inline-block',
  backgroundColor: '#ECFDF5',
  color: '#047857',
  padding: '6px 14px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  margin: 0,
}
const badgeRejected = {
  display: 'inline-block',
  backgroundColor: BG_WARM,
  color: DARK,
  padding: '6px 14px',
  borderRadius: '999px',
  fontSize: '12px',
  fontWeight: 700,
  letterSpacing: '0.04em',
  textTransform: 'uppercase' as const,
  margin: 0,
}
const h1 = {
  fontSize: '26px',
  fontWeight: 700,
  color: DARK,
  margin: '12px 0 16px',
  lineHeight: 1.2,
  fontFamily: 'Georgia, "EB Garamond", serif',
}
const text = {
  fontSize: '15px',
  color: '#2A2A2A',
  lineHeight: 1.6,
  margin: '0 0 14px',
}
const cardApproved = {
  backgroundColor: '#FDF2F8',
  border: `1px solid ${PRIMARY}33`,
  borderRadius: '12px',
  padding: '18px 20px',
  margin: '20px 0',
}
const cardRejected = {
  backgroundColor: BG_WARM,
  borderRadius: '12px',
  padding: '18px 20px',
  margin: '20px 0',
}
const cardLabel = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: DARK,
  margin: '0 0 8px',
}
const cardItem = {
  fontSize: '14px',
  color: '#2A2A2A',
  lineHeight: 1.55,
  margin: '0 0 6px',
}
const noteBoxApproved = {
  borderLeft: `3px solid ${PRIMARY}`,
  backgroundColor: '#FFF5F8',
  padding: '14px 16px',
  margin: '18px 0',
  borderRadius: '6px',
}
const noteBoxRejected = {
  borderLeft: `3px solid ${DARK}`,
  backgroundColor: BG_WARM,
  padding: '14px 16px',
  margin: '18px 0',
  borderRadius: '6px',
}
const noteLabel = {
  fontSize: '11px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  textTransform: 'uppercase' as const,
  color: MUTED,
  margin: '0 0 6px',
}
const noteText = {
  fontSize: '14px',
  color: DARK,
  lineHeight: 1.6,
  margin: 0,
  fontStyle: 'italic' as const,
}
const button = {
  backgroundColor: PRIMARY,
  color: '#ffffff',
  padding: '13px 28px',
  borderRadius: '999px',
  fontSize: '14px',
  fontWeight: 700,
  textDecoration: 'none',
  display: 'inline-block',
  letterSpacing: '0.02em',
}
const hr = {
  border: 'none',
  borderTop: '1px solid #EDEDED',
  margin: '28px 0 18px',
}
const footer = {
  fontSize: '13px',
  color: DARK,
  lineHeight: 1.5,
  margin: '0 0 10px',
  fontWeight: 600,
}
const footerSmall = {
  fontSize: '12px',
  color: MUTED,
  margin: 0,
  lineHeight: 1.5,
}
const footerLink = {
  color: PRIMARY,
  textDecoration: 'none',
  fontWeight: 600,
}
