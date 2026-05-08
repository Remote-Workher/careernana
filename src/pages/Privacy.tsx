import LegalLayout from "./legal/LegalLayout";
import { useSEO } from "@/components/SEO";


export default function Privacy() {
  useSEO({ title: "Privacy Policy" });
  return (
    <LegalLayout title="Privacy Policy" updated="May 7, 2026">
      <p>
        This Privacy Policy explains how Remote Workher ("we", "us") collects, uses, and protects your
        personal information when you use our platform. We respect your privacy and are committed to
        handling your data responsibly, in line with the Nigeria Data Protection Act (NDPA) 2023 and
        applicable global standards.
      </p>

      <h2>1. Information we collect</h2>
      <h3>Information you provide</h3>
      <ul>
        <li>Account details: name, email, phone number, password.</li>
        <li>Profile data: career path, persona, skills, work history, location, portfolio details.</li>
        <li>Resume, cover letter, brag-file, and application content.</li>
        <li>Payment details processed through our payment partner (we do not store full card numbers).</li>
        <li>Community posts, messages to Zara (AI coach), and content you upload.</li>
      </ul>
      <h3>Information collected automatically</h3>
      <ul>
        <li>Device and browser data, IP address, approximate location.</li>
        <li>Usage data: pages visited, features used, timestamps, referrers.</li>
        <li>Cookies and similar technologies for sessions, preferences, and analytics.</li>
      </ul>
      <h3>From third parties</h3>
      <ul>
        <li>OAuth providers (e.g. Google) when you sign in with them.</li>
        <li>LinkedIn profile PDFs you choose to import.</li>
        <li>Payment confirmations from Paystack.</li>
      </ul>

      <h2>2. How we use your information</h2>
      <ul>
        <li>To create and manage your account and membership.</li>
        <li>To deliver core features: 90-day plan, AI tools, resume building, application tracking, community.</li>
        <li>To process payments, downloads, and coin balances.</li>
        <li>To personalise your experience based on your career persona.</li>
        <li>To send transactional emails (receipts, reminders) and, with your consent, marketing updates.</li>
        <li>To detect and prevent fraud, abuse, and security incidents.</li>
        <li>To improve and develop new features.</li>
      </ul>

      <h2>3. AI processing</h2>
      <p>
        When you use AI features, your prompts and relevant context (e.g. resume, plan, job description)
        are sent to AI model providers via the Lovable AI Gateway to generate a response. We do not allow
        providers to use your inputs to train their public models. Outputs are returned to you and stored
        in your account so you can revisit them.
      </p>

      <h2>4. Sharing your information</h2>
      <p>We share data only as needed to operate the Platform:</p>
      <ul>
        <li><strong>Service providers</strong>: hosting, database, email, analytics, AI providers, payment processors.</li>
        <li><strong>Recruiters</strong>: only profile information you have explicitly made available (e.g. via vetted talent or public portfolio opt-in).</li>
        <li><strong>Legal</strong>: when required by law, regulation, or to protect rights and safety.</li>
        <li><strong>Business transfers</strong>: in the event of a merger, acquisition, or asset sale, with notice to you.</li>
      </ul>
      <p>We do not sell your personal information.</p>

      <h2>5. Public content</h2>
      <p>
        Community posts, public portfolio pages (<code>/u/[username]</code>), and similar opt-in features are
        visible to others. Do not share information you wouldn't want public.
      </p>

      <h2>6. Cookies</h2>
      <p>
        We use cookies for essential functionality (authentication, security), preferences, and analytics.
        You can control cookies via your browser settings; disabling some cookies may break parts of the
        Platform.
      </p>

      <h2>7. Data retention</h2>
      <p>
        We retain your data for as long as your account is active and as needed for the purposes above.
        When you delete your account, we delete or anonymise personal data within a reasonable period,
        except where we must keep records for legal, tax, or fraud-prevention purposes.
      </p>

      <h2>8. Security</h2>
      <p>
        We use industry-standard safeguards (encryption in transit, access controls, row-level security
        on our database) to protect your data. No system is 100% secure, but we work hard to keep your
        information safe and to notify you of material breaches as required by law.
      </p>

      <h2>9. Your rights</h2>
      <p>Subject to applicable law (including the NDPA 2023), you have the right to:</p>
      <ul>
        <li>Access the personal data we hold about you.</li>
        <li>Correct inaccurate or incomplete data.</li>
        <li>Request deletion of your data (subject to legal exceptions).</li>
        <li>Object to or restrict certain processing.</li>
        <li>Withdraw consent for marketing at any time.</li>
        <li>Lodge a complaint with the Nigeria Data Protection Commission (NDPC) or your local authority.</li>
      </ul>
      <p>
        To exercise these rights, email <a href="mailto:privacy@remoteworkher.com">privacy@remoteworkher.com</a>.
      </p>

      <h2>10. International transfers</h2>
      <p>
        Some of our service providers may process your data outside Nigeria. When this happens, we rely
        on appropriate safeguards (such as standard contractual terms) to protect your data.
      </p>

      <h2>11. Children</h2>
      <p>
        The Platform is not intended for children under 18. We do not knowingly collect data from
        children. If you believe a child has provided us data, please contact us so we can remove it.
      </p>

      <h2>12. Changes to this policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you of material changes via
        the Platform or email. Continued use after changes means you accept the updated policy.
      </p>

      <h2>13. Contact</h2>
      <p>
        Questions or requests? Email{" "}
        <a href="mailto:privacy@remoteworkher.com">privacy@remoteworkher.com</a>.
      </p>
    </LegalLayout>
  );
}
