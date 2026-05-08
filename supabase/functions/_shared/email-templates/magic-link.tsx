/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface MagicLinkEmailProps {
  siteName: string
  confirmationUrl: string
  token?: string
}

export const MagicLinkEmail = ({ confirmationUrl, token }: MagicLinkEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Your Remote Workher login code</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Your login code</Heading>
        <Text style={text}>
          Use this code to sign in to Remote Workher. It expires shortly.
        </Text>
        {token ? <Text style={code}>{token}</Text> : null}
        <Text style={text}>
          If the code does not work, you can also tap the button below to sign in.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Log in
        </Button>
        <Text style={footer}>
          Didn't request this? You can safely ignore this email.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default MagicLinkEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'DM Sans', Arial, sans-serif" }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontFamily: "'EB Garamond', Georgia, serif",
  fontSize: '28px',
  fontWeight: 'normal' as const,
  color: '#1A1A1A',
  margin: '0 0 20px',
}
const text = { fontSize: '15px', color: '#1A1A1A', lineHeight: '1.6', margin: '0 0 20px' }
const code = {
  fontSize: '32px',
  letterSpacing: '6px',
  color: '#1A1A1A',
  fontWeight: 'bold' as const,
  textAlign: 'center' as const,
  backgroundColor: '#F0EBE8',
  borderRadius: '14px',
  padding: '18px 16px',
  margin: '0 0 20px',
}
const button = {
  backgroundColor: '#E0487A',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '999px',
  padding: '14px 28px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '12px', color: '#777777', margin: '32px 0 0' }
