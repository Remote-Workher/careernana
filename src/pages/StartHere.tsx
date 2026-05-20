import { useNavigate } from "react-router-dom";
import { Play, ArrowRight } from "lucide-react";
import { useSEO } from "@/components/SEO";

const steps = [
  { title: "Complete your profile", route: "/profile/setup" },
  { title: "Build your plan", route: "/plan" },
  { title: "Use the AI tools to update your resume, CV, LinkedIn", route: "/tools" },
  { title: "Join the next live session", route: "/live-sessions" },
  { title: "Ask for feedback on your work", route: "/brag-file" },
];

export default function StartHere() {
  useSEO({ title: "Start Here" });
  const navigate = useNavigate();

  return (
    <div className="font-sans py-6 sm:py-10 px-4 sm:px-6 w-full max-w-[1200px] mx-auto">
      <p className="eyebrow mb-2">Welcome</p>
      <h1 className="headline text-[28px] sm:text-[36px] text-foreground leading-[1.1] mb-3">
        Welcome to the <em>Remote Workher</em> Hub
      </h1>
      <p className="text-[14px] sm:text-[15px] text-muted-foreground leading-relaxed mb-8 max-w-xl">
        We're so glad you're here. This is your space to build a remote career on your own terms —
        with the tools, jobs, and community to get you there faster.
      </p>

      {/* Video */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-br from-primary/90 to-secondary mb-10 group cursor-pointer">
        <div className="absolute inset-0 flex flex-col items-center justify-center text-primary-foreground">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-card/95 flex items-center justify-center shadow-strong group-hover:scale-105 transition-transform">
            <Play className="w-7 h-7 sm:w-8 sm:h-8 text-primary fill-primary ml-1" />
          </div>
          <p className="mt-4 text-[12px] font-semibold tracking-wide uppercase opacity-80">
            Welcome video coming soon
          </p>
        </div>
      </div>

      {/* Steps */}
      <h2 className="headline text-[22px] sm:text-[26px] text-foreground leading-[1.15] mb-5">
        How to make the most of your time here
      </h2>

      <ul className="space-y-2.5 mb-8">
        {steps.map((step, i) => (
          <li key={step.title}>
            <button
              onClick={() => navigate(step.route)}
              className="w-full flex items-center gap-3 p-4 rounded-xl bg-card border border-border hover:border-primary-border hover:bg-primary-tint/40 transition-colors text-left group"
            >
              <span className="shrink-0 w-7 h-7 rounded-full bg-primary-tint text-primary text-[12px] font-bold flex items-center justify-center border border-primary-border">
                {i + 1}
              </span>
              <span className="flex-1 text-[14px] sm:text-[15px] font-medium text-foreground">
                {step.title}
              </span>
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
            </button>
          </li>
        ))}
      </ul>

      <p className="text-[13.5px] text-muted-foreground leading-relaxed">
        Take your time, explore, and remember — this platform is about <em>doing</em>, not just
        learning. Every step you take here moves you closer to the career you want.
      </p>
    </div>
  );
}
