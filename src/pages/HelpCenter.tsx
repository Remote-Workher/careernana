import { useMemo, useState } from "react";
import { Mail, MessageCircle, ChevronDown, LifeBuoy, Search, Wrench } from "lucide-react";
import { useSEO } from "@/components/SEO";
import { PRICING_COPY } from "@/lib/pricing";


const SUPPORT_EMAIL = "hello@remoteworkher.com";
const WHATSAPP_NUMBER = "+234 907 126 6676";
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
  "Hi Remote Workher! I need help with my account.",
)}`;

type Item = { q: string; a: string };
type Group = { category: string; items: Item[] };

const FAQ_GROUPS: Group[] = [
  {
    category: "Getting started",
    items: [
      {
        q: "What is Remote Workher?",
        a: "Remote Workher is an execution-first platform helping Nigerian and African women land remote roles — through AI tools, real jobs, weekly challenges and live webinars.",
      },
      {
        q: "Do I need a paid membership to use the platform?",
        a: "Yes. Remote Workher is a members-only platform. You need an active membership (monthly, quarterly, or yearly) to access jobs, AI tools, courses, resources, and community features.",
      },
      {
        q: "How do I complete onboarding?",
        a: "After signup you'll be guided through a 3-step wizard (career path, persona, goals). This generates your personalised 13-week roadmap. You can re-run it anytime from Profile → Career plan.",
      },
    ],
  },
  {
    category: "Membership & billing",
    items: [
      {
        q: "How much does membership cost?",
        a: PRICING_COPY.pricingAnswer,
      },
      {
        q: "What's the difference between the plans?",
        a: "Every paid plan includes the full platform — dashboard, jobs, AI tools, brag file, resources, courses, and live sessions. Quarterly and yearly are simply better value per month than the trial.",
      },
      {
        q: "How do I cancel my membership?",
        a: "Go to Profile → Membership → Manage. Your access stays active until the end of the current billing period — no early cut-off.",
      },
      {
        q: "Can I get a refund?",
        a: "If something's not working as promised, message us within 7 days of your payment with your payment reference and we'll make it right.",
      },
      {
        q: "I paid but my account isn't upgraded — what now?",
        a: "Give it 1–2 minutes for Paystack to confirm. If it still hasn't updated, message us on WhatsApp with your payment reference (starts with 'ref_' or shown on the success page) and we'll fix it within an hour.",
      },
    ],
  },
  {
    category: "AI Coins",
    items: [
      {
        q: "What are AI Coins?",
        a: "Coins power your AI tools — resume builder, cover letter, interview prep, LinkedIn optimizer, skills gap, career exploration. Each generation uses 1 coin.",
      },
      {
        q: "How do I get coins?",
        a: "Free accounts get 5 coins on signup. Members get a monthly allocation that doesn't expire and rolls over. You can top up anytime from Profile → Buy more coins.",
      },
      {
        q: "Do my coins expire?",
        a: "No. Coins never expire and carry over month-to-month, including top-ups.",
      },
      {
        q: "I ran out of coins — what now?",
        a: "Buy a top-up pack from Profile → Buy more coins, or upgrade to a paid membership for a recurring monthly allowance.",
      },
    ],
  },
  {
    category: "Jobs & applications",
    items: [
      {
        q: "Are the jobs on the platform real?",
        a: "Yes. Every role is posted by a verified recruiter or sourced from trusted remote-friendly companies. We don't list scams, MLM, or unpaid 'opportunities'.",
      },
      {
        q: "How do I track my applications?",
        a: "Use the Application Tracker (sidebar → Applications). Every job you apply to via the platform is logged automatically; you can also add external applications manually.",
      },
      {
        q: "How does Apply Assistant work?",
        a: "Paste a job description and Apply Assistant generates a tailored resume, cover letter, and outreach message in one go. It uses your saved brag entries and profile to personalise everything.",
      },
      {
        q: "Why is my match score low?",
        a: "Match score compares the job's required skills with the skills on your profile. Add more skills (Profile → Skills), upload an updated resume, or use Skills Gap Analyzer to see what's missing.",
      },
    ],
  },
  {
    category: "Account & profile",
    items: [
      {
        q: "How do I change my email or password?",
        a: "Profile → Account settings. For email changes you'll need to verify the new address via the link we send.",
      },
      {
        q: "How do I make my portfolio public?",
        a: "Profile → Public portfolio → toggle 'Make public'. Your shareable link is /u/[your-username]. You control which sections are visible.",
      },
      {
        q: "Can I delete my account?",
        a: "Yes. Email us at hello@remoteworkher.com from the address on your account and we'll delete it within 48 hours along with all associated data.",
      },
    ],
  },
];

type TroubleshootStep = { step: string; detail?: string };
type Trouble = { title: string; symptom: string; steps: TroubleshootStep[] };

const TROUBLESHOOTING: Trouble[] = [
  {
    title: "Resume PDF download is blank or blurry",
    symptom: "You click Download PDF and the file is empty, blank or low quality.",
    steps: [
      { step: "Wait for the preview to fully load before downloading.", detail: "If text looks unstyled, give it 2–3 seconds — fonts may still be loading." },
      { step: "Try a different browser.", detail: "Chrome and Edge produce the cleanest output. Some Safari/iOS PDF viewers display rasterised resumes softly even when sharp." },
      { step: "Disable browser extensions that block canvas/CORS (ad-blockers, privacy tools).", detail: "These can prevent fonts from being captured into the PDF." },
      { step: "Use the ATS PDF button if you only need clean text for an applicant tracking system." },
    ],
  },
  {
    title: "AI tool won't generate / button stuck on 'Loading...'",
    symptom: "You click Generate and nothing happens, or it hangs and times out.",
    steps: [
      { step: "Check your coin balance.", detail: "If you're at 0 coins the tool will block before calling the AI. Top up from Profile → Buy more coins." },
      { step: "Refresh the page and try again.", detail: "Most hangs are caused by an interrupted network request that didn't surface an error." },
      { step: "Make sure required fields are filled in.", detail: "Some tools won't run without a target role, job description, or selected brag entries." },
      { step: "Try with shorter input.", detail: "Pasting a 10-page job description sometimes exceeds the model's context window." },
    ],
  },
  {
    title: "I paid but my account still says Free",
    symptom: "Paystack confirmed your payment but the badge in the sidebar hasn't changed.",
    steps: [
      { step: "Wait 60–120 seconds and refresh the page." },
      { step: "Sign out and sign back in." },
      { step: "If it's still wrong after 5 minutes, message us on WhatsApp with your Paystack reference.", detail: "We can manually upgrade your account within an hour." },
    ],
  },
  {
    title: "Can't sign in / 'invalid login credentials'",
    symptom: "You're sure your password is correct but login is failing.",
    steps: [
      { step: "Check Caps Lock and that you're using the same email you signed up with." },
      { step: "Use 'Forgot password?' on the login page to reset.", detail: "The reset email arrives within 2 minutes — check spam if you don't see it." },
      { step: "If you signed up with Google originally, use 'Continue with Google' instead of email/password." },
    ],
  },
  {
    title: "Resume parser missed half my experience",
    symptom: "You uploaded a PDF resume and the parser only pulled some of your roles.",
    steps: [
      { step: "Make sure the PDF has selectable text, not a scan.", detail: "Try copying text out of the PDF — if you can't, it's an image-only file and needs to be exported as text-based PDF first." },
      { step: "Avoid heavy multi-column layouts.", detail: "Modern parsers can lose order when content is in side-by-side columns or text boxes." },
      { step: "Re-export from Word or Google Docs as 'PDF (text)'.", detail: "Avoid 'Print to PDF' from a design tool like Canva." },
      { step: "After upload, edit any missing sections directly in the form — your edits are saved." },
    ],
  },
  {
    title: "Applications page is empty even though I applied",
    symptom: "You applied to roles but the Applications tracker is empty.",
    steps: [
      { step: "Confirm you applied while signed in to your account.", detail: "Applications submitted while logged out can't be linked to your profile." },
      { step: "Refresh the page — newly added applications can take a few seconds to appear." },
      { step: "If you applied externally, add the role manually with 'Track an external application'." },
    ],
  },
  {
    title: "Notifications / emails aren't reaching me",
    symptom: "You're not getting reply emails, magic links, or recruiter messages.",
    steps: [
      { step: "Check your spam, promotions and 'Updates' folders.", detail: "Gmail often files our emails under Promotions on the first message." },
      { step: "Add hello@remoteworkher.com to your contacts.", detail: "This trains your provider to deliver future emails to your inbox." },
      { step: "Confirm the email on your profile is correct.", detail: "Profile → Account settings." },
    ],
  },
];

export default function HelpCenter() {
  useSEO({ title: "Help Center" });
  const [query, setQuery] = useState("");
  const [openKey, setOpenKey] = useState<string | null>("0-0");

  const q = query.trim().toLowerCase();

  const filteredFAQ: Group[] = useMemo(() => {
    if (!q) return FAQ_GROUPS;
    return FAQ_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [q]);

  const filteredTrouble: Trouble[] = useMemo(() => {
    if (!q) return TROUBLESHOOTING;
    return TROUBLESHOOTING.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        t.symptom.toLowerCase().includes(q) ||
        t.steps.some((s) => s.step.toLowerCase().includes(q) || s.detail?.toLowerCase().includes(q)),
    );
  }, [q]);

  const totalResults =
    filteredFAQ.reduce((acc, g) => acc + g.items.length, 0) + filteredTrouble.length;

  return (
    <div className="font-sans w-full">
      <div className="mb-6">
        <p className="eyebrow mb-2">Support</p>
        <h1 className="headline text-[28px] md:text-[36px] text-foreground leading-[1.1]">
          How can we <em>help?</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-[520px]">
          Search our FAQs and troubleshooting guides below, or reach our team on WhatsApp or email — we usually reply within an hour.
        </p>
      </div>

      {/* Search */}
      <div className="relative mb-5">
        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help — e.g. 'paystack', 'coins', 'pdf'…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border border-border text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          aria-label="Search help center"
        />
        {q && (
          <p className="text-[11.5px] text-muted-foreground mt-1.5 ml-1">
            {totalResults} result{totalResults === 1 ? "" : "s"} for "{query}"
          </p>
        )}
      </div>

      {/* Contact cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="group flex items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-card transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-foreground">Chat on WhatsApp</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              Fastest way to reach us — typically reply in minutes.
            </p>
            <p className="text-[11.5px] font-semibold text-primary mt-1.5 group-hover:underline">
              {WHATSAPP_NUMBER}
            </p>
          </div>
        </a>

        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Remote Workher support")}`}
          className="group flex items-start gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-card transition-all"
        >
          <div className="w-10 h-10 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-foreground">Send us an email</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              For account issues, refunds, or detailed questions.
            </p>
            <p className="text-[11.5px] font-semibold text-primary mt-1.5 group-hover:underline break-all">
              {SUPPORT_EMAIL}
            </p>
          </div>
        </a>
      </div>

      {/* FAQs */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card mb-5">
        <div className="flex items-center gap-2 mb-4">
          <LifeBuoy className="w-4 h-4 text-primary" />
          <h2 className="text-[16px] font-extrabold text-foreground">Frequently asked</h2>
        </div>

        {filteredFAQ.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-4">No FAQs match your search.</p>
        ) : (
          <div className="space-y-5">
            {filteredFAQ.map((group, gi) => (
              <div key={group.category}>
                <p className="label-caps mb-2">{group.category}</p>
                <div className="divide-y divide-border">
                  {group.items.map((f, i) => {
                    const key = `${gi}-${i}`;
                    const open = openKey === key;
                    return (
                      <div key={key} className="py-3">
                        <button
                          onClick={() => setOpenKey(open ? null : key)}
                          className="w-full flex items-center justify-between gap-3 text-left"
                          aria-expanded={open}
                        >
                          <span className="text-[13.5px] font-bold text-foreground">{f.q}</span>
                          <ChevronDown
                            className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${
                              open ? "rotate-180" : ""
                            }`}
                          />
                        </button>
                        {open && (
                          <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">{f.a}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Troubleshooting */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-1">
          <Wrench className="w-4 h-4 text-primary" />
          <h2 className="text-[16px] font-extrabold text-foreground">Troubleshooting</h2>
        </div>
        <p className="text-[12.5px] text-muted-foreground mb-4">
          Step-by-step fixes for the most common issues. Try these before contacting support — most are resolved in under a minute.
        </p>

        {filteredTrouble.length === 0 ? (
          <p className="text-[13px] text-muted-foreground py-4">No guides match your search.</p>
        ) : (
          <div className="divide-y divide-border">
            {filteredTrouble.map((t, i) => {
              const key = `t-${i}`;
              const open = openKey === key;
              return (
                <div key={key} className="py-3">
                  <button
                    onClick={() => setOpenKey(open ? null : key)}
                    className="w-full flex items-center justify-between gap-3 text-left"
                    aria-expanded={open}
                  >
                    <span className="text-[13.5px] font-bold text-foreground">{t.title}</span>
                    <ChevronDown
                      className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${
                        open ? "rotate-180" : ""
                      }`}
                    />
                  </button>
                  {open && (
                    <div className="mt-2.5">
                      <p className="text-[12.5px] text-muted-foreground italic mb-2.5">
                        {t.symptom}
                      </p>
                      <ol className="space-y-2">
                        {t.steps.map((s, j) => (
                          <li key={j} className="flex gap-2.5">
                            <span className="shrink-0 w-5 h-5 rounded-full bg-primary-tint text-primary text-[11px] font-extrabold flex items-center justify-center">
                              {j + 1}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] text-foreground font-semibold leading-snug">
                                {s.step}
                              </p>
                              {s.detail && (
                                <p className="text-[12px] text-muted-foreground mt-0.5 leading-relaxed">
                                  {s.detail}
                                </p>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <p className="text-center text-[12px] text-muted-foreground mt-6">
        Still stuck? Message us on{" "}
        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="text-primary font-semibold underline">
          WhatsApp
        </a>{" "}
        — we'll sort it.
      </p>
    </div>
  );
}
