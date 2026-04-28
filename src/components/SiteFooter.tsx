import { useNavigate } from "react-router-dom";
import logo from "@/assets/logo.svg";

export default function SiteFooter() {
  const navigate = useNavigate();

  const sections = [
    {
      title: "Explore",
      links: [
        { label: "Jobs", route: "/jobs" },
        { label: "AI tools", route: "/tools" },
        { label: "Brag file", route: "/brag-file" },
        { label: "Applications", route: "/applications" },
      ],
    },
    {
      title: "Tools",
      links: [
        { label: "Resume Builder", route: "/tools/resume" },
        { label: "Cover Letter AI", route: "/tools/cover-letter" },
        { label: "Salary Analyzer", route: "/tools/salary" },
        { label: "Tax Calculator", route: "/tools/tax" },
      ],
    },
    {
      title: "Company",
      links: [
        { label: "About", route: "/" },
        { label: "Contact", route: "/" },
        { label: "Privacy", route: "/" },
        { label: "Terms", route: "/" },
      ],
    },
  ];

  return (
    <footer className="bg-card border-t border-border mt-12">
      <div className="max-w-7xl mx-auto px-5 md:px-8 py-10">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div className="col-span-2 md:col-span-1">
            <button onClick={() => navigate("/")} className="flex items-center mb-3">
              <img src={logo} alt="Remote Workher" className="h-6 w-auto" />
            </button>
            <p className="text-[12px] text-muted-foreground leading-relaxed max-w-[240px]">
              Land remote roles, track wins, and grow your career — built for women on the rise.
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
          <p className="text-[11.5px] text-muted-foreground">Made with ❤ for women on the rise.</p>
        </div>
      </div>
    </footer>
  );
}
