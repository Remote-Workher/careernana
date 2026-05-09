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

type Status = 'pending' | 'verified' | 'rejected'

interface RecruiterVerificationProps {
  contactName?: string
  companyName?: string
  status: Status
  reviewerNotes?: string
  ctaUrl?: string
}

const COPY: Record<Status, {
  badge: string
  badgeStyle: 'approved' | 'rejected' | 'neutral'
  heading: (first: string) => string
  intro: (company: string) => string
  body: string[]
  list?: { label: string; items: string[] }
  cta: string
}> = {
  pending: {
    badge: 'Under Review',
    badgeStyle: 'neutral',
    heading: (first) => `Thanks ${first} — we're reviewing your company`,
    intro: (company) =>
      `We've received your company page${company ? ` for ${company}` : ''} and our team is reviewing it now.`,
    body: [
      `To keep Remote Workher safe for our members, every employer is verified before they can post jobs. This usually takes less than 24 hours during business days.`,
      `We'll email you the moment your company is verified. After that, you can post jobs, search talent, and reach our community.`,
    ],
    list: {
      label: 'While you wait',
      items: [
        '• Browse vetted talent profiles for inspiration.',
        '• Draft your first job description so it\'s ready to publish.',
        '• Add a logo and team details if you haven\'t already.',
      ],
    },
    cta: 'Open recruiter dashboard',
  },
  verified: {
    badge: '✓ Verified',
    badgeStyle: 'approved',
    heading: (first) => `You're verified, ${first} 🎉`,
    intro: (company) =>
      `Great news — ${company || 'your company'} has been verified on Remote Workher. You can start posting jobs and reaching candidates right away.`,
    body: [
      `Verified employers get a trust badge on their job posts and company page, which means more applications from serious candidates.`,
    ],
    list: {
      label: 'Next steps',
      items: [
        '1. Post your first job — it goes live as soon as our team approves the listing.',
        '2. Search our vetted talent pool to shortlist candidates directly.',
        '3. Invite teammates if more than one person will be hiring.',
      ],
    },
    cta: 'Post your first job',
  },
  rejected: {
    badge: 'Action Needed',
    badgeStyle: 'rejected',
    heading: (first) => `Hi ${first}, we need a bit more info`,
    intro: (company) =>
      `We weren't able to verify ${company || 'your company'} based on the details on your company page.`,
    body: [
      `This usually means we couldn't confirm the company website, the contact email doesn't match the company domain, or the description was too thin for us to vet.`,
      `Please update your company page with a working website, a work email at your company domain, and a short description of what your team does. Once you save the changes we'll review again within 24 hours.`,
    ],
    cta: 'Update company page',
  },
}

const RecruiterVerificationEmail = ({
  contactName,
  companyName,
  status,
  reviewerNotes,
  ctaUrl,
}: RecruiterVerificationProps) => {
  const firstName = (contactName || 'there').split(' ')[0]
  const copy = COPY[status] || COPY.pending
  const cta = ctaUrl || (status === 'verified'
    ? 'https://remoteworkher.com/recruiter/post-job'
    : status === 'rejected'
      ? 'https://remoteworkher.com/recruiter/company-profile'
      : 'https://remoteworkher.com/recruiter')

  const badgeStyle =
    copy.badgeStyle === 'approved' ? badgeApproved
    : copy.badgeStyle === 'rejected' ? badgeRejected
    : badgeNeutral

  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{copy.heading(firstName)}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={brandBar}>
            <Text style={brandMark}>Remote Workher · For Employers</Text>
          </Section>

          <Section style={{ textAlign: 'center', padding: '32px 0 8px' }}>
            <Text style={badgeStyle}>{copy.badge}</Text>
          </Section>

          <Section style={contentSection}>
            <Heading style={h1}>{copy.heading(firstName)}</Heading>

            <Text style={text}>{copy.intro(companyName || '')}</Text>
            {copy.body.map((p, i) => (
              <Text key={i} style={text}>{p}</Text>
            ))}

            {reviewerNotes && reviewerNotes.trim().length > 0 && (
              <Section style={status === 'verified' ? noteBoxApproved : noteBoxRejected}>
                <Text style={noteLabel}>A note from our team</Text>
                <Text style={noteText}>{reviewerNotes}</Text>
              </Section>
            )}

            {copy.list && (
              <Section style={status === 'verified' ? cardApproved : cardNeutral}>
                <Text style={cardLabel}>{copy.list.label}</Text>
                {copy.list.items.map((item, i) => (
                  <Text key={i} style={cardItem}>{item}</Text>
                ))}
              </Section>
            )}

            <Section style={{ textAlign: 'center', padding: '12px 0 4px' }}>
              <Button style={button} href={cta}>{copy.cta}</Button>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              Helping you hire great women, faster.<br />
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
  component: RecruiterVerificationEmail,
  subject: (data: Record<string, any>) => {
    const status = (data?.status || 'pending') as Status
    if (status === 'verified') return `You're verified — start hiring on Remote Workher`
    if (status === 'rejected') return `We need a bit more info to verify your company`
    return `We've received your company page — review in progress`
  },
  displayName: 'Recruiter verification status',
  previewData: {
    contactName: 'Adaeze Okonkwo',
    companyName: 'Acme Africa',
    status: 'pending',
    reviewerNotes: '',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "DM Sans", sans-serif',
  margin: 0,
  padding: 0,
}
const container = { maxWidth: '560px', margin: '0 auto', padding: 0, backgroundColor: '#ffffff' }
const brandBar = { backgroundColor: DARK, padding: '18px 28px', textAlign: 'center' as const }
const brandMark = {
  color: '#ffffff', fontSize: '15px', fontWeight: 700, letterSpacing: '0.02em',
  margin: 0, fontFamily: 'Georgia, "EB Garamond", serif',
}
const contentSection = { padding: '8px 28px 32px' }
const badgeBase = {
  display: 'inline-block', padding: '6px 14px', borderRadius: '999px',
  fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em',
  textTransform: 'uppercase' as const, margin: 0,
}
const badgeApproved = { ...badgeBase, backgroundColor: '#ECFDF5', color: '#047857' }
const badgeRejected = { ...badgeBase, backgroundColor: '#FEF2F2', color: '#B91C1C' }
const badgeNeutral = { ...badgeBase, backgroundColor: BG_WARM, color: DARK }
const h1 = {
  fontSize: '26px', fontWeight: 700, color: DARK, margin: '12px 0 16px',
  lineHeight: 1.2, fontFamily: 'Georgia, "EB Garamond", serif',
}
const text = { fontSize: '15px', color: '#2A2A2A', lineHeight: 1.6, margin: '0 0 14px' }
const cardApproved = {
  backgroundColor: '#FDF2F8', border: `1px solid ${PRIMARY}33`,
  borderRadius: '12px', padding: '18px 20px', margin: '20px 0',
}
const cardNeutral = { backgroundColor: BG_WARM, borderRadius: '12px', padding: '18px 20px', margin: '20px 0' }
const cardLabel = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase' as const, color: DARK, margin: '0 0 8px',
}
const cardItem = { fontSize: '14px', color: '#2A2A2A', lineHeight: 1.55, margin: '0 0 6px' }
const noteBoxApproved = {
  borderLeft: `3px solid ${PRIMARY}`, backgroundColor: '#FFF5F8',
  padding: '14px 16px', margin: '18px 0', borderRadius: '6px',
}
const noteBoxRejected = {
  borderLeft: `3px solid #B91C1C`, backgroundColor: '#FEF2F2',
  padding: '14px 16px', margin: '18px 0', borderRadius: '6px',
}
const noteLabel = {
  fontSize: '11px', fontWeight: 700, letterSpacing: '0.08em',
  textTransform: 'uppercase' as const, color: MUTED, margin: '0 0 6px',
}
const noteText = { fontSize: '14px', color: DARK, lineHeight: 1.6, margin: 0, fontStyle: 'italic' as const }
const button = {
  backgroundColor: PRIMARY, color: '#ffffff', padding: '13px 28px',
  borderRadius: '999px', fontSize: '14px', fontWeight: 700,
  textDecoration: 'none', display: 'inline-block', letterSpacing: '0.02em',
}
const hr = { border: 'none', borderTop: '1px solid #EDEDED', margin: '28px 0 18px' }
const footer = { fontSize: '13px', color: DARK, lineHeight: 1.5, margin: '0 0 10px', fontWeight: 600 }
const footerSmall = { fontSize: '12px', color: MUTED, margin: 0, lineHeight: 1.5 }
const footerLink = { color: PRIMARY, textDecoration: 'none', fontWeight: 600 }
