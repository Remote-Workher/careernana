import { BookOpen, CheckCircle2, FileText, Users, MessageSquare, Award } from "lucide-react";

const sections = [
  {
    icon: FileText,
    title: "1. Write a job post that attracts the right women",
    points: [
      "Lead with impact, not buzzwords — describe what success looks like in the first 90 days.",
      "Be specific about must-haves vs nice-to-haves so candidates can self-qualify.",
      "Include salary range — posts with pay get 2x more qualified applicants.",
      "Mention flexibility, growth opportunities, and team culture.",
    ],
  },
  {
    icon: Users,
    title: "2. Review applicants fairly and quickly",
    points: [
      "Reply within 5 business days — silence kills your employer brand.",
      "Score against the role, not against each other. Use the same rubric for everyone.",
      "Look at projects and outcomes, not just titles or schools.",
      "Featured candidates on Girls In Careers are pre-vetted by our team.",
    ],
  },
  {
    icon: MessageSquare,
    title: "3. Run interviews that respect candidates' time",
    points: [
      "Aim for 2–3 rounds max. Anything more signals a slow, indecisive culture.",
      "Send the questions or case study brief in advance — you'll see real thinking, not improv.",
      "Always leave 10 minutes for the candidate's questions.",
      "Debrief within 24 hours so feedback stays fresh.",
    ],
  },
  {
    icon: Award,
    title: "4. Make an offer that actually closes",
    points: [
      "Call before you email — a personal offer lands better.",
      "Be ready to explain salary, benefits, growth path, and start date in one go.",
      "Give the candidate at least 3 business days to decide.",
      "Stay in touch between offer and start date so they don't drift.",
    ],
  },
];

export default function HiringGuide() {
  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-[1100px] mx-auto">
      <div className="flex items-center gap-2 text-[12px] text-muted-foreground mb-2">
        <BookOpen className="w-3.5 h-3.5" /> Resources
      </div>
      <h1 className="text-[28px] md:text-[34px] font-serif text-foreground leading-tight">
        <em>Hiring Guide</em>
      </h1>
      <p className="text-[14px] text-muted-foreground mt-2 max-w-[640px]">
        A practical playbook for hiring great women through Girls In Careers — from writing the job post to closing the offer.
      </p>

      <div className="mt-8 grid gap-5">
        {sections.map(({ icon: Icon, title, points }) => (
          <article key={title} className="bg-card border border-border rounded-2xl p-5 md:p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-9 h-9 rounded-xl bg-primary-tint text-primary grid place-items-center">
                <Icon className="w-4 h-4" />
              </div>
              <h2 className="text-[16px] md:text-[17px] font-semibold text-foreground">{title}</h2>
            </div>
            <ul className="space-y-2.5">
              {points.map((p) => (
                <li key={p} className="flex gap-2.5 text-[13.5px] text-foreground/80 leading-relaxed">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <div className="mt-8 bg-primary-tint border border-primary-border rounded-2xl p-5 text-center">
        <div className="text-[14px] font-semibold text-foreground">Need us to handle hiring for you?</div>
        <p className="text-[12.5px] text-muted-foreground mt-1">
          Use <span className="font-medium text-foreground">Hire for me</span> and our team will source, screen and shortlist candidates on your behalf.
        </p>
      </div>
    </div>
  );
}
