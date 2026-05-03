import { Users, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";

export default function Accountability() {
  return (
    <div className="font-sans py-10 sm:py-16 flex justify-center">
      <div className="hub-card max-w-xl w-full text-center px-6 py-10 sm:py-14">
        <div className="w-14 h-14 rounded-2xl bg-primary-tint mx-auto flex items-center justify-center mb-5">
          <Users className="w-6 h-6 text-primary" />
        </div>

        <p className="eyebrow mb-2">Accountability</p>
        <h1 className="headline text-[28px] sm:text-[32px] text-foreground leading-[1.1] mb-3">
          Coming <em>June 2026</em>
        </h1>
        <p className="text-[13.5px] text-muted-foreground max-w-md mx-auto leading-relaxed">
          We're rebuilding accountability partnerships from the ground up. Get
          matched with a partner, set weekly goals, and ship together — launching
          in June.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-muted text-[12px] font-semibold text-foreground">
          <CalendarClock className="w-3.5 h-3.5 text-primary" />
          Launching June 2026
        </div>

        <div className="mt-7">
          <Link
            to="/dashboard"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
