import LegalLayout from "./legal/LegalLayout";
import { useSEO } from "@/components/SEO";


export default function Terms() {
  useSEO({ title: "Terms of Service" });
  return (
    <LegalLayout title="Terms of Service" updated="May 7, 2026">
      <p>
        Welcome to Remote Workher ("we", "us", "our"). These Terms of Service ("Terms") govern your access to
        and use of our website, mobile experience, and related services (collectively, the "Platform"). By
        creating an account or using the Platform, you agree to these Terms.
      </p>

      <h2>1. Who we are</h2>
      <p>
        Remote Workher is an execution-first career platform built for Nigerian and African women. We
        provide tools, content, AI-assisted workflows, a vetted talent program, and community features to
        help members move their careers forward.
      </p>

      <h2>2. Eligibility & accounts</h2>
      <ul>
        <li>You must be at least 18 years old to create an account.</li>
        <li>You agree to provide accurate information and to keep your account credentials secure.</li>
        <li>You are responsible for all activity under your account.</li>
        <li>We may suspend or terminate accounts that violate these Terms or harm other members.</li>
      </ul>

      <h2>3. Membership tiers & payments</h2>
      <p>
        We offer Free, Standard, and Premium tiers. Paid memberships are billed in Nigerian Naira (₦)
        through our payment processor (Paystack). By subscribing you authorize recurring charges until you
        cancel.
      </p>
      <ul>
        <li>Subscriptions renew automatically at the end of each billing period.</li>
        <li>You can cancel anytime from your Account page; cancellation takes effect at the end of the current period.</li>
        <li>Premium members receive a monthly allowance of resource downloads (e.g. 3/month). Already-unlocked items do not consume your allowance on re-download.</li>
        <li>Coins, credits, and similar in-app balances have no cash value and are non-transferable.</li>
      </ul>

      <h2>4. Refunds</h2>
      <p>
        Subscription fees are generally non-refundable except where required by law or where we determine,
        at our discretion, that a refund is appropriate (for example, a duplicate charge or a clear
        platform error). To request a refund, contact us within 7 days of the charge.
      </p>

      <h2>5. Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Platform for unlawful, fraudulent, or harmful purposes.</li>
        <li>Misrepresent your identity, qualifications, or work history.</li>
        <li>Scrape, copy, or redistribute Platform content (including resources, courses, AI outputs) outside personal use.</li>
        <li>Upload malware or attempt to disrupt the service.</li>
        <li>Harass, abuse, or discriminate against other members.</li>
      </ul>

      <h2>6. AI features</h2>
      <p>
        Our AI tools (including the Apply Assistant, the Resume Builder, and similar workspaces)
        generate content based on your inputs. Outputs are suggestions only. You are responsible for
        reviewing them before sending to employers, posting publicly, or relying on them for decisions.
        We do not guarantee accuracy, employment outcomes, salary results, or interview success.
      </p>

      <h2>7. User content</h2>
      <p>
        You retain ownership of content you submit (resume data, brag-file entries, portfolio details,
        community posts). You grant us a worldwide, royalty-free licence to host, display, and process
        that content as needed to operate the Platform and the features you opt into (such as a public
        portfolio at <code>/u/[username]</code>).
      </p>

      <h2>8. Vetted talent & recruiter features</h2>
      <p>
        Submitting a vetting application does not guarantee acceptance, job offers, or recruiter
        introductions. Recruiters using our platform agree to separate recruiter terms presented at
        sign-up.
      </p>

      <h2>9. Intellectual property</h2>
      <p>
        The Platform, including its design, code, templates, written content, and brand, is owned by
        Remote Workher and protected by intellectual property laws. We grant you a limited, personal,
        non-transferable licence to use it under these Terms.
      </p>

      <h2>10. Third-party services</h2>
      <p>
        We integrate with third parties (e.g. Paystack for payments, AI model providers, email and
        analytics tools). Their terms apply to their portions of the experience and we are not
        responsible for their actions.
      </p>

      <h2>11. Disclaimers</h2>
      <p>
        The Platform is provided "as is" without warranties of any kind. We do not guarantee that the
        Platform will be uninterrupted, error-free, or that it will produce specific career outcomes.
      </p>

      <h2>12. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Remote Workher is not liable for indirect, incidental,
        consequential, or special damages, or for lost profits or lost opportunities. Our total
        liability for any claim is limited to the amount you paid us in the 12 months before the claim.
      </p>

      <h2>13. Termination</h2>
      <p>
        You can stop using the Platform at any time and delete your account from the Account page. We
        may suspend or terminate access if you breach these Terms. Some provisions (IP, disclaimers,
        liability) survive termination.
      </p>

      <h2>14. Changes to these Terms</h2>
      <p>
        We may update these Terms from time to time. Material changes will be communicated via the
        Platform or email. Continued use after changes means you accept the updated Terms.
      </p>

      <h2>15. Governing law</h2>
      <p>
        These Terms are governed by the laws of the Federal Republic of Nigeria. Disputes will be
        resolved in the competent courts of Lagos State, Nigeria, unless otherwise required by law.
      </p>

      <h2>16. Contact</h2>
      <p>
        Questions? Reach us at <a href="mailto:hello@remoteworkher.com">hello@remoteworkher.com</a>.
      </p>
    </LegalLayout>
  );
}
