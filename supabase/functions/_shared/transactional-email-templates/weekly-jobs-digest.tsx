import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr, Section, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface JobItem {
  title: string
  company?: string
  location?: string
  workType?: string
  employmentType?: string
  salary?: string
  url: string
}

interface Props {
  name?: string
  jobs?: JobItem[]
}

const WeeklyJobsDigestEmail = ({ name, jobs = [] }: Props) => {
  const first = (name || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>{jobs.length} fresh remote roles to apply to this week</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {first ? `${first}, here are this week's picks.` : "Here are this week's picks."}
          </Heading>
          <Text style={lede}>
            Five remote roles we think are worth your application this week. Tap any role to view details and apply.
          </Text>

          {jobs.length > 0 ? (
            <Section>
              {jobs.map((j, i) => (
                <Section key={i} style={card}>
                  <Text style={jobTitle}>
                    <Link href={j.url} style={titleLink}>{j.title}</Link>
                  </Text>
                  <Text style={jobMeta}>
                    {[j.company, j.location, j.workType, j.employmentType].filter(Boolean).join(' · ')}
                  </Text>
                  {j.salary && <Text style={jobSalary}>{j.salary}</Text>}
                  <Button style={smallButton} href={j.url}>View & apply</Button>
                </Section>
              ))}
              <Section style={{ textAlign: 'center' as const, margin: '24px 0 8px' }}>
                <Button style={button} href={`${SITE_URL}/jobs`}>View all jobs</Button>
              </Section>
            </Section>
          ) : (
            <Text style={text}>No new roles this week — the job board updates daily, check back soon.</Text>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            You're getting this because you're an active Remote Workher member. Manage email preferences in your Account.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: WeeklyJobsDigestEmail,
  subject: (d: Record<string, any>) => {
    const j = (d.jobs || []).length
    if (j) return `${j} remote ${j === 1 ? 'role' : 'roles'} to apply to this week`
    return 'Your weekly Remote Workher jobs digest'
  },
  displayName: 'Weekly jobs digest (Mondays)',
  previewData: {
    name: 'Amaka',
    jobs: [
      { title: 'Customer Success Lead', company: 'Acme', location: 'Remote (Nigeria)', workType: 'Remote', employmentType: 'Full-time', salary: '₦600,000 – ₦900,000', url: SITE_URL + '/jobs' },
      { title: 'Product Designer', company: 'Linear', location: 'Remote (Africa)', workType: 'Remote', employmentType: 'Full-time', salary: '$2,500 – $4,000', url: SITE_URL + '/jobs' },
    ],
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '600px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', fontWeight: 'normal' as const, color: '#1A1A1A', margin: '0 0 12px', lineHeight: '1.2' }
const lede = { fontSize: '14px', color: '#555', lineHeight: '1.6', margin: '0 0 24px' }
const text = { fontSize: '14px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 16px' }
const card = { backgroundColor: '#F0EBE8', borderRadius: '12px', padding: '18px 18px', margin: '0 0 14px' }
const jobTitle = { fontSize: '16px', fontWeight: 'bold' as const, color: '#1A1A1A', margin: '0 0 6px', lineHeight: '1.3' }
const titleLink = { color: '#1A1A1A', textDecoration: 'none' }
const jobMeta = { fontSize: '13px', color: '#555', margin: '0 0 4px', lineHeight: '1.5' }
const jobSalary = { fontSize: '13px', color: '#1A1A1A', fontWeight: 'bold' as const, margin: '0 0 10px' }
const smallButton = { backgroundColor: '#1A1A1A', color: '#ffffff', fontSize: '12px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '8px 16px', textDecoration: 'none', display: 'inline-block' }
const button = { backgroundColor: '#E0487A', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '12px 26px', textDecoration: 'none', display: 'inline-block' }
const hr = { borderColor: '#EEE', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0', lineHeight: '1.5' }
