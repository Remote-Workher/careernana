import { useMemo, useState } from "react";
import { Mail, MessageCircle, ChevronDown, LifeBuoy, Search, CreditCard, Briefcase, Users, Megaphone } from "lucide-react";

const SUPPORT_EMAIL = "recruiters@remoteworkher.com";
const WHATSAPP_NUMBER = "+2348000000000"; // shared with talent support
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
  "Hi Remote Workher! I'm a recruiter and I need help.",
)}`;

type Item = { q: string; a: string };
type Group = { category: string; icon: any; items: Item[] };

const FAQ_GROUPS: Group[] = [
  {
    category: "Posting jobs",
    icon: Briefcase,
    items: [
      {
        q: "How do I post my first job?",
        a: "Go to ‘Post a Job’ in the sidebar, fill in the role details (title, description, location, level, salary range), pick screening questions, and publish. Your first 3 active job posts are completely free — no card required.",
      },
      {
        q: "How long does a job stay live?",
        a: "Jobs stay active for 30 days from the date you publish. You can close, edit, or repost them at any time from your Jobs dashboard.",
      },
      {
        q: "Can I edit a job after publishing?",
        a: "Yes — open the job from the Jobs page and click ‘Edit’. Changes go live immediately. Applicants who already applied are not re-notified.",
      },
      {
        q: "What happens after I’ve used my 3 free posts?",
        a: "You can buy a single extra job slot from the Pricing page (one-off, no subscription) and keep posting whenever you’re ready.",
      },
    ],
  },
  {
    category: "Featuring & visibility",
    icon: Megaphone,
    items: [
      {
        q: "What does ‘Featured’ actually do?",
        a: "Featured jobs sit at the top of the talent board for 30 days, get included in our weekly newsletter to ~all signed-up talent, and are promoted on our Instagram, LinkedIn and X. They also carry a visible ‘Featured’ badge.",
      },
      {
        q: "How do I feature a job I already posted?",
        a: "Go to your Jobs page, open the role, and click ‘Feature this job’. You’ll be sent to Paystack to complete payment — featuring activates within minutes.",
      },
      {
        q: "Can I unfeature a job early?",
        a: "Featuring runs for the full 30 days you paid for. We don’t pro-rate refunds, but you can pause or close the job at any time without losing the feature window.",
      },
    ],
  },
  {
    category: "Applicants & messaging",
    icon: Users,
    items: [
      {
        q: "Where do I see who applied?",
        a: "Open ‘Applicant tracker’ in the sidebar to see every applicant across all your jobs, or open a specific job and click the Applicants tab.",
      },
      {
        q: "How do I email a candidate?",
        a: "Open the applicant, choose a template (interview invite, offer, rejection, custom) and send. Emails are sent from notify@remoteworkher.com on your behalf, with you on CC so replies come straight to your inbox.",
      },
      {
        q: "Can I export applicants to a spreadsheet?",
        a: "Yes — from the Applicant tracker, click ‘Export CSV’ at the top right. The export includes name, email, status, and application date.",
      },
    ],
  },
  {
    category: "Billing & payments",
    icon: CreditCard,
    items: [
      {
        q: "Which payment methods do you accept?",
        a: "All payments are processed by Paystack — Nigerian bank cards, USSD, bank transfer, and most international cards work. Prices are in Naira (₦) and include 7.5% VAT.",
      },
      {
        q: "I paid but my account didn’t update — what now?",
        a: "Give it 1–2 minutes for Paystack to confirm. If it still hasn’t updated, message us on WhatsApp with your Paystack reference (starts with ‘ref_’ or shown on the success page) and we’ll fix it within an hour.",
      },
      {
        q: "Do you offer invoicing or annual billing?",
        a: "Yes, for agencies and high-volume employers. Email recruiters@remoteworkher.com with your company details and we’ll set up invoicing.",
      },
      {
        q: "Can I get a refund?",
        a: "Job slots and featured-job purchases are non-refundable once consumed. If something went wrong (double charge, failed posting, etc.), reach out and we’ll sort it.",
      },
    ],
  },
  {
    category: "Account",
    icon: LifeBuoy,
    items: [
      {
        q: "How do I update my company page?",
        a: "Click ‘Company Page’ in the sidebar to edit your logo, name, description, website and social links. Changes are reflected on every job listing immediately.",
      },
      {
        q: "Can I add another teammate to my recruiter account?",
        a: "We’re rolling out multi-seat workspaces shortly. In the meantime, share login access or email us at recruiters@remoteworkher.com and we’ll add a second account linked to your company.",
      },
      {
        q: "How do I delete my account?",
        a: "Email recruiters@remoteworkher.com from the address on your account and we’ll delete it within 48 hours along with all associated jobs and applicant data.",
      },
    ],
  },
];

export default function RecruiterHelp() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!query.trim()) return FAQ_GROUPS;
    const q = query.toLowerCase();
    return FAQ_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((it) => it.q.toLowerCase().includes(q) || it.a.toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query]);

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <div className="text-center max-w-[680px] mx-auto">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary-tint border border-primary-border mb-3">
          <LifeBuoy className="w-6 h-6 text-primary" />
        </div>
        <h1 className="text-[32px] md:text-[40px] font-serif text-foreground leading-tight">
          Recruiter <em>Help Center</em>
        </h1>
        <p className="text-[14px] text-muted-foreground mt-2">
          Search the FAQs below or reach our team on WhatsApp or email — we usually reply within an hour.
        </p>
      </div>

      {/* Contact tiles */}
      <div className="mt-7 grid sm:grid-cols-2 gap-4">
        <a
          href={WHATSAPP_LINK}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-primary-tint border border-primary-border flex items-center justify-center shrink-0">
            <MessageCircle className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-foreground">Chat on WhatsApp</p>
            <p className="text-[12.5px] text-muted-foreground">{WHATSAPP_NUMBER} · usually replies in &lt; 1 hour</p>
          </div>
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Recruiter support request")}`}
          className="flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted transition-colors"
        >
          <div className="w-11 h-11 rounded-xl bg-primary-tint border border-primary-border flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-[14px] font-extrabold text-foreground">Email support</p>
            <p className="text-[12.5px] text-muted-foreground truncate">{SUPPORT_EMAIL}</p>
          </div>
        </a>
      </div>

      {/* Search */}
      <div className="mt-8 relative max-w-[560px] mx-auto">
        <Search className="w-4 h-4 text-muted-foreground absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search the FAQs…"
          className="w-full pl-11 pr-4 py-3 rounded-xl border border-border bg-card text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* FAQ groups */}
      <div className="mt-8 space-y-7">
        {filtered.length === 0 && (
          <p className="text-center text-[13px] text-muted-foreground">
            No answers matched. Try{" "}
            <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="text-primary font-semibold underline">
              WhatsApp
            </a>{" "}
            or{" "}
            <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary font-semibold underline">
              email
            </a>
            .
          </p>
        )}
        {filtered.map((g) => {
          const Icon = g.icon;
          return (
            <section key={g.category}>
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-lg bg-primary-tint border border-primary-border flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <h2 className="text-[18px] font-serif text-foreground">{g.category}</h2>
              </div>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border overflow-hidden">
                {g.items.map((it) => {
                  const id = `${g.category}-${it.q}`;
                  const isOpen = open === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setOpen(isOpen ? null : id)}
                      className="w-full text-left px-4 py-3.5 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-[13.5px] font-semibold text-foreground">{it.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground mt-1 shrink-0 transition-transform ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        />
                      </div>
                      {isOpen && (
                        <p className="mt-2 text-[13px] text-muted-foreground leading-relaxed">{it.a}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-10 text-center text-[12.5px] text-muted-foreground">
        Still stuck? Message us on{" "}
        <a href={WHATSAPP_LINK} target="_blank" rel="noreferrer" className="text-primary font-semibold underline">
          WhatsApp
        </a>{" "}
        or email{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="text-primary font-semibold underline">
          {SUPPORT_EMAIL}
        </a>
        .
      </div>
    </div>
  );
}
