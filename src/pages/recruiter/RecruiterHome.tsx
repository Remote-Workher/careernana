import { useNavigate } from "react-router-dom";
import { Briefcase, Users, ClipboardList, Search as SearchIcon, Rocket, Bookmark, ShieldCheck, Globe, CalendarCheck, ArrowRight, MoreHorizontal } from "lucide-react";
import { recruiterJobs, recentApplicants, avatarUrl, formatPostedDate } from "@/data/recruiter";

const quickActions = [
  { icon: Briefcase, name: "Post a Job", desc: "Reach 100K+ remote job seekers", route: "/recruiter/post-job" },
  { icon: Users, name: "Browse Talent", desc: "Find pre-vetted talent in our database", route: "/recruiter/talent" },
  { icon: ClipboardList, name: "View Applicants", desc: "Review applications in one place", route: "/recruiter/applicants" },
  { icon: SearchIcon, name: "Talent Search", desc: "Use filters to find the right match", route: "/recruiter/talent" },
  { icon: Rocket, name: "Upgrade Plan", desc: "Get more features & better reach", route: "/recruiter/pricing" },
];

export default function RecruiterHome() {
  const navigate = useNavigate();
  const featured = recentApplicants.slice(0, 3);

  return (
    <div className="max-w-[1280px] mx-auto space-y-6">
      {/* HERO */}
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-6 items-center">
        <div>
          <h1 className="text-[40px] md:text-[52px] leading-[1.05] font-serif text-foreground tracking-tight">
            Hire Top <em>Remote Talent.</em>
            <br />
            Build Amazing Teams.
          </h1>
          <p className="mt-4 text-[15px] text-muted-foreground max-w-[460px] leading-relaxed">
            Post jobs, discover pre-vetted talent and hire the best from anywhere in the world.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button
              onClick={() => navigate("/recruiter/post-job")}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground text-[14px] font-semibold hover:bg-primary-dark transition-colors"
            >
              Post a Job
            </button>
            <button
              onClick={() => navigate("/recruiter/talent")}
              className="px-6 py-3 rounded-xl border-[1.5px] border-primary text-primary text-[14px] font-semibold hover:bg-primary-tint transition-colors"
            >
              Browse Talent
            </button>
          </div>
        </div>

        {/* Hero illustration: candidate cards centered on a soft circle */}
        <div className="relative h-[300px] hidden lg:flex items-center justify-center">
          <div className="absolute inset-0 flex items-center justify-end">
            <div className="w-[340px] h-[300px] rounded-full bg-primary-tint/70" />
          </div>
          <div className="absolute right-6 top-1/2 -translate-y-1/2 w-[55%] h-[60%] opacity-30 pointer-events-none">
            <div className="grid grid-cols-8 gap-2 w-full h-full">
              {Array.from({ length: 56 }).map((_, i) => (
                <span key={i} className="block w-1.5 h-1.5 rounded-full bg-primary/50" />
              ))}
            </div>
          </div>
          <div className="relative w-[88%] max-w-[440px] bg-card border border-border rounded-2xl shadow-card p-4 space-y-3">
            {featured.map((a) => (
              <div key={a.id} className="flex items-center gap-3">
                <img src={avatarUrl(a.avatarSeed)} alt={a.name} className="w-10 h-10 rounded-full bg-muted" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-foreground truncate">{a.name}</div>
                  <div className="text-[11.5px] text-muted-foreground truncate">{a.role}</div>
                </div>
                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-success/10 text-success">{a.matchScore}% Match</span>
                <Bookmark className="w-4 h-4 text-muted-foreground" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <section className="bg-card border border-border rounded-2xl p-5">
        <div className="text-[15px] font-semibold text-foreground mb-4">Quick Actions</div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {quickActions.map((a) => {
            const Icon = a.icon;
            return (
              <button
                key={a.name}
                onClick={() => navigate(a.route)}
                className="text-left border border-border rounded-xl p-3.5 hover:border-primary hover:bg-primary-tint/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-primary-tint flex items-center justify-center mb-3">
                  <Icon className="w-[18px] h-[18px] text-primary" />
                </div>
                <div className="text-[13px] font-semibold text-foreground">{a.name}</div>
                <div className="text-[11.5px] text-muted-foreground leading-tight mt-0.5">{a.desc}</div>
              </button>
            );
          })}
        </div>
      </section>

      {/* ACTIVE JOBS + RECENT APPLICANTS */}
      <section className="grid lg:grid-cols-[1.3fr_1fr] gap-5">
        {/* Active Jobs Overview */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold text-foreground">Active Jobs Overview</div>
            <button onClick={() => navigate("/recruiter/jobs")} className="text-[12.5px] font-semibold text-primary inline-flex items-center gap-1 hover:underline">
              View all jobs <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-left text-[13px] min-w-[520px]">
              <thead>
                <tr className="text-[11.5px] uppercase tracking-wider text-muted-foreground border-b border-border">
                  <th className="py-2.5 font-medium">Job Title</th>
                  <th className="py-2.5 font-medium text-center">Applications</th>
                  <th className="py-2.5 font-medium text-center">Shortlisted</th>
                  <th className="py-2.5 font-medium text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {recruiterJobs.map((j) => (
                  <tr key={j.id} className="border-b border-border/60 last:border-0">
                    <td className="py-3">
                      <div className="font-semibold text-foreground">{j.title}</div>
                      <div className="text-[11.5px] text-muted-foreground">Posted on {formatPostedDate(j.postedDate)}</div>
                    </td>
                    <td className="py-3 text-center font-medium text-foreground">{j.applications}</td>
                    <td className="py-3 text-center font-medium text-foreground">{j.shortlisted}</td>
                    <td className="py-3 text-right">
                      <span className="inline-flex px-2.5 py-1 rounded-full bg-success/10 text-success text-[11px] font-bold capitalize">{j.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Applicants */}
        <div className="bg-card border border-border rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="text-[15px] font-semibold text-foreground">Recent Applicants</div>
            <button onClick={() => navigate("/recruiter/applicants")} className="text-[12.5px] font-semibold text-primary inline-flex items-center gap-1 hover:underline">
              View all applicants <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2.5">
            {recentApplicants.slice(0, 4).map((a) => (
              <button
                key={a.id}
                onClick={() => navigate("/recruiter/applicants")}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted transition-colors text-left"
              >
                <img src={avatarUrl(a.avatarSeed)} alt={a.name} className="w-10 h-10 rounded-full bg-muted shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-foreground truncate">{a.name}</div>
                  <div className="text-[11.5px] text-muted-foreground truncate">{a.role}</div>
                </div>
                <div className="hidden sm:block text-[11.5px] text-muted-foreground shrink-0">Applied {a.appliedAgo}</div>
                <span className="text-[11px] font-bold px-2 py-1 rounded-full bg-success/10 text-success shrink-0">{a.matchScore}% Match</span>
                <button className="p-1 rounded hover:bg-muted-foreground/10" onClick={(e) => e.stopPropagation()}>
                  <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                </button>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* CTA BANNER */}
      <section className="bg-primary-tint border border-primary-border rounded-2xl p-5 md:p-6 flex flex-col md:flex-row items-start md:items-center gap-4 md:gap-6">
        <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shrink-0 border border-primary-border">
          <Rocket className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[16px] font-semibold text-foreground">Ready to build your dream team?</div>
          <div className="text-[12.5px] text-muted-foreground">Join thousands of companies hiring top remote talent on Remote WorkHER.</div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => navigate("/recruiter/post-job")}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-[13px] font-semibold hover:bg-primary-dark transition-colors"
          >
            Post a Job Now
          </button>
          <button
            onClick={() => navigate("/recruiter/pricing")}
            className="px-5 py-2.5 rounded-xl border-[1.5px] border-primary text-primary text-[13px] font-semibold hover:bg-card transition-colors"
          >
            View Pricing Plans
          </button>
        </div>
      </section>
    </div>
  );
}
