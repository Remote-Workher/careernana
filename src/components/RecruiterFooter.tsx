import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";

export default function RecruiterFooter() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Hire",
      links: [
        { label: "Post a Job", route: "/recruiter?post=1" },
        { label: "Hire for Me", route: "/recruiter?service=hire-for-me" },
        { label: "Partner With Us", route: "/recruiter?service=partner" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", route: "/" },
        { label: "Contact", route: "/" },
        { label: "Privacy", route: "/privacy" },
        { label: "Terms", route: "/terms" },
      ],
    },
  ];

  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <button onClick={() => navigate("/recruiter")} className="flex items-center mb-3">
              <img src={logo} alt="Remote Workher" className="h-6 w-auto" />
            </button>
            <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[240px]">
              Hire vetted, ambitious women across Africa — fast.
            </p>
          </div>
          {sections.map((s) => (
            <div key={s.title}>
              <div className="text-[11px] font-bold text-foreground tracking-[0.6px] uppercase mb-3">{s.title}</div>
              <ul className="space-y-2">
                {s.links.map((l) => (
                  <li key={l.label}>
                    <button
                      onClick={() => navigate(l.route)}
                      className="text-[12.5px] text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="pt-6 border-t border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-[11.5px] text-muted-foreground">
            © {new Date().getFullYear()} Remote Workher. All rights reserved.
          </p>
          <p className="text-[11.5px] text-muted-foreground">Built for teams hiring women on the rise.</p>
        </div>
      </div>
    </footer>
  );
}
