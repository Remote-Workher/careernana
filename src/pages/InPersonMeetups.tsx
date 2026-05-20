import { MapPin, CalendarClock } from "lucide-react";
import { Link } from "react-router-dom";
import { useSEO } from "@/components/SEO";

export default function InPersonMeetups() {
  useSEO({ title: "In-Person Meetups" });
  return (
    <div className="font-sans py-10 sm:py-16 flex justify-center">
      <div className="max-w-xl w-full text-center px-6 py-10 sm:py-14">
        <div className="w-14 h-14 rounded-2xl bg-primary-tint mx-auto flex items-center justify-center mb-5">
          <MapPin className="w-6 h-6 text-primary" />
        </div>

        <p className="eyebrow mb-2">In-Person Meetups</p>
        <h1 className="headline text-[28px] sm:text-[32px] text-foreground leading-[1.1] mb-3">
          Meet your tribe&nbsp;<em>IRL</em>
        </h1>
        <p className="text-[13.5px] text-muted-foreground max-w-md mx-auto leading-relaxed">
          We're planning in-person meetups across Lagos, Abuja, and beyond — so you can network,
          learn, and grow with other Remote Workher women face-to-face. First dates dropping soon.
        </p>

        <div className="mt-6 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-muted text-[12px] font-semibold text-foreground">
          <CalendarClock className="w-3.5 h-3.5 text-primary" />
          Coming soon
        </div>

        <div className="mt-7">
          <Link
            to="/"
            className="inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-[13px] font-bold hover:bg-primary-dark transition-colors"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
