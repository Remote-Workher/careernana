import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr, Section, Link,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_URL = 'https://remoteworkher.com'

interface JobItem { title: string; company?: string; location?: string; url: string }
interface CourseItem { title: string; url: string }

interface Props {
  name?: string
  jobs?: JobItem[]
  courses?: CourseItem[]
}

const DigestEmail = ({ name, jobs = [], courses = [] }: Props) => {
  const first = (name || '').split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Today on Remote Workher: {jobs.length} jobs, {courses.length} courses</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{first ? `${first}, here's what's new today.` : "Here's what's new today."}</Heading>

          {jobs.length > 0 && (
            <Section>
              <Text style={subhead}>🆕 New jobs in your path</Text>
              {jobs.map((j, i) => (
                <Text key={i} style={item}>
                  <Link href={j.url} style={link}><strong>{j.title}</strong></Link>
                  {j.company ? ` · ${j.company}` : ''}{j.location ? ` · ${j.location}` : ''}
                </Text>
              ))}
              <Button style={button} href={`${SITE_URL}/jobs`}>Browse all jobs</Button>
            </Section>
          )}

          {courses.length > 0 && (
            <Section>
              <Text style={subhead}>📚 New courses for you</Text>
              {courses.map((c, i) => (
                <Text key={i} style={item}>
                  <Link href={c.url} style={link}><strong>{c.title}</strong></Link>
                </Text>
              ))}
              <Button style={button} href={`${SITE_URL}/courses`}>Open the Vault</Button>
            </Section>
          )}

          {jobs.length === 0 && courses.length === 0 && (
            <Text style={text}>No new picks today — log in tomorrow.</Text>
          )}

          <Hr style={hr} />
          <Text style={footer}>You're getting this because you're a Remote Workher member. Adjust email preferences in your Account.</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: DigestEmail,
  subject: (d: Record<string, any>) => {
    const j = (d.jobs || []).length, c = (d.courses || []).length
    if (j && c) return `${j} new jobs and ${c} new courses for you`
    if (j) return `${j} new ${j === 1 ? 'job' : 'jobs'} for you today`
    if (c) return `${c} new ${c === 1 ? 'course' : 'courses'} for you`
    return 'Your daily Remote Workher digest'
  },
  displayName: 'Daily jobs & courses digest',
  previewData: {
    name: 'Amaka',
    jobs: [{ title: 'Customer Success Lead', company: 'Acme', location: 'Remote', url: SITE_URL + '/jobs' }],
    courses: [{ title: 'Intro to Customer Success', url: SITE_URL + '/courses' }],
  },
} satisfies TemplateEntry

const main = { backgroundColor: 'transparent', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '580px' }
const h1 = { fontFamily: "'EB Garamond', Georgia, serif", fontSize: '28px', fontWeight: 'normal' as const, color: '#1A1A1A', margin: '0 0 24px' }
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.7', margin: '0 0 18px' }
const subhead = { fontSize: '15px', color: '#1A1A1A', margin: '24px 0 12px', fontWeight: 'bold' as const }
const item = { fontSize: '14px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 10px' }
const link = { color: '#1A1A1A', textDecoration: 'underline' }
const button = { backgroundColor: '#E0487A', color: '#ffffff', fontSize: '14px', fontWeight: 'bold' as const, borderRadius: '999px', padding: '12px 22px', textDecoration: 'none', display: 'inline-block', margin: '8px 0 16px' }
const hr = { borderColor: '#EEE', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#777', margin: '0' }
