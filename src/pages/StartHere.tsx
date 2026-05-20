import { useNavigate } from "react-router-dom";
import PageShell from "@/components/PageShell";
import { ArrowRight, Play } from "lucide-react";

export default function StartHere() {
  const navigate = useNavigate();

  return (
    <PageShell width="default" noPadding>
      <div className="pt-2 md:pt-4 pb-10">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <span className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
          <h1 className="text-[22px] md:text-[26px] font-semibold text-foreground tracking-[-0.3px]">
            Start Here
          </h1>
        </div>

        {/* Main article card */}
        <article className="bg-card border border-border rounded-2xl p-6 md:p-10 shadow-card">
          <h2 className="text-[24px] md:text-[34px] font-bold text-foreground leading-[1.15] tracking-[-0.4px] mb-5">
            Welcome to the Remote Workher Hub
          </h2>

          <p className="text-[15px] text-foreground font-semibold mb-3">
            We're so glad you're here! 🎉
          </p>

          <p className="text-[15px] text-foreground/85 leading-relaxed mb-4">
            You've just joined a space built for ambitious African women — people who are ready to
            build remote careers, land global roles, and grow on their own terms.
          </p>

          <p className="text-[15px] text-foreground font-semibold mb-6">
            To kick things off, here's a quick welcome from us 👇
          </p>

          {/* Video placeholder */}
          <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-gradient-to-br from-primary/90 to-secondary mb-8 group cursor-pointer">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-card/95 flex items-center justify-center shadow-strong group-hover:scale-105 transition-transform">
                <Play className="w-7 h-7 md:w-8 md:h-8 text-primary fill-primary ml-1" />
              </div>
              <p className="mt-4 text-[13px] font-semibold tracking-wide uppercase opacity-80">
                Welcome video coming soon
              </p>
            </div>
          </div>

          {/* What this platform is */}
          <h3 className="text-[18px] md:text-[20px] font-bold text-foreground mb-3 tracking-[-0.2px]">
            What Remote Workher is really about
          </h3>
          <p className="text-[15px] text-foreground/85 leading-relaxed mb-4">
            Remote Workher is an <strong>execution-first platform</strong>. We don't just teach you
            about careers — we help you <em>do the work</em>. Every tool, resource, and feature here
            is built to move you from where you are to where you want to be.
          </p>
          <p className="text-[15px] text-foreground/85 leading-relaxed mb-6">
            Whether you're switching careers, applying for your first remote role, or scaling into
            leadership, the Hub gives you the structure, AI tools, and community to get there faster.
          </p>

          {/* How to use it */}
          <h3 className="text-[18px] md:text-[20px] font-bold text-foreground mb-4 tracking-[-0.2px]">
            How to make the most of the Hub
          </h3>
          <ul className="space-y-3 mb-8">
            {[
              { title: "Build your profile", desc: "So everything else is tailored to you." },
              { title: "Log your wins", desc: "Your Brag File powers your resumes & interviews." },
              { title: "Use the AI tools", desc: "Paste a job, get everything you need to apply." },
              { title: "Show up in the community", desc: "Accountability is how you actually finish." },
            ].map((item, i) => (
              <li key={item.title} className="flex items-start gap-3">
                <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary-tint text-primary text-[12px] font-bold flex items-center justify-center border border-primary-border">
                  {i + 1}
                </span>
                <div>
                  <p className="text-[15px] font-semibold text-foreground leading-snug">{item.title}</p>
                  <p className="text-[14px] text-muted-foreground leading-relaxed">{item.desc}</p>
                </div>
              </li>
            ))}
          </ul>

          <p className="text-[15px] text-foreground/85 leading-relaxed mb-6 italic">
            Take your time. Explore. Ask questions. This is your space — make it work for you.
          </p>

          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 bg-primary hover:bg-primary-dark text-primary-foreground text-[14px] font-bold px-5 py-3 rounded-[12px] transition-colors shadow-button"
          >
            Go to my dashboard <ArrowRight className="w-4 h-4" />
          </button>
        </article>
      </div>
    </PageShell>
  );
}
