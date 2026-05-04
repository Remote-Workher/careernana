import { useState } from "react";
import { Mail, MessageCircle, ChevronDown, LifeBuoy } from "lucide-react";

const SUPPORT_EMAIL = "hello@remoteworkher.com";
const WHATSAPP_NUMBER = "+2348000000000"; // TODO: replace with real number
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_NUMBER.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
  "Hi Remote Workher! I need help with my account.",
)}`;

const FAQS: { q: string; a: string }[] = [
  {
    q: "What is Remote Workher?",
    a: "Remote Workher is an execution-first platform helping Nigerian and African women land remote roles — through AI tools, real jobs, weekly challenges, live sessions and a community of doers.",
  },
  {
    q: "How much does membership cost?",
    a: "Standard is ₦5,000/month and Premium is ₦20,000/month. You can cancel anytime. Premium unlocks the full course library, weekly challenges, more AI coins and priority support.",
  },
  {
    q: "What are AI Coins and how do I get more?",
    a: "Coins power your AI tools (resume, cover letter, interview prep). Members get a monthly allocation. You can top up anytime from Profile → Buy more coins, or from the AI Tools page.",
  },
  {
    q: "How do I cancel my membership?",
    a: "Go to Profile → Membership → Manage. Your access stays active until the end of the current billing period.",
  },
  {
    q: "I paid but my account isn't upgraded — what now?",
    a: "Give it 1–2 minutes for Paystack to confirm. If it still hasn't updated, message us on WhatsApp with your payment reference and we'll fix it within an hour.",
  },
  {
    q: "Are the jobs on the platform real?",
    a: "Yes. Every role is posted by a verified recruiter or sourced from trusted remote-friendly companies. We don't list scams or pyramid schemes.",
  },
  {
    q: "Can I get a refund?",
    a: "If something's not working as promised, message us within 7 days of your payment and we'll make it right.",
  },
];

export default function HelpCenter() {
  const [openIdx, setOpenIdx] = useState<number | null>(0);

  return (
    <div className="font-sans max-w-[820px] mx-auto">
      <div className="mb-6">
        <p className="eyebrow mb-2">Support</p>
        <h1 className="headline text-[28px] md:text-[36px] text-foreground leading-[1.1]">
          How can we <em>help?</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-[520px]">
          Find quick answers below, or reach our team on WhatsApp or email — we usually reply within an hour.
        </p>
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
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center gap-2 mb-4">
          <LifeBuoy className="w-4 h-4 text-primary" />
          <h2 className="text-[16px] font-extrabold text-foreground">Frequently asked</h2>
        </div>

        <div className="divide-y divide-border">
          {FAQS.map((f, i) => {
            const open = openIdx === i;
            return (
              <div key={i} className="py-3">
                <button
                  onClick={() => setOpenIdx(open ? null : i)}
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
