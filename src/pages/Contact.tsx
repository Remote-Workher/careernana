import { Link } from "react-router-dom";
import { Mail, MessageCircle, MapPin, Phone, Clock } from "lucide-react";
import { useSEO } from "@/components/SEO";
import SiteFooter from "@/components/SiteFooter";
import logo from "@/assets/logo.svg";

const SUPPORT_EMAIL = "hello@remoteworkher.com";
const RECRUITER_EMAIL = "recruiters@remoteworkher.com";
const WHATSAPP_NUMBER = "+234 907 126 6676";
const WHATSAPP_DIGITS = WHATSAPP_NUMBER.replace(/[^0-9]/g, "");
const WHATSAPP_LINK = `https://wa.me/${WHATSAPP_DIGITS}?text=${encodeURIComponent(
  "Hi Remote WorkHER! I'd like to get in touch.",
)}`;

export default function Contact() {
  useSEO({
    title: "Contact Remote WorkHER",
    description:
      "Get in touch with the Remote WorkHER team — WhatsApp, email or send us a message. We usually reply within an hour.",
  });

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-[58px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Remote Workher" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-2 md:gap-3">
            <Link to="/" className="hidden sm:inline text-[13px] text-muted-foreground hover:text-foreground px-2">
              Home
            </Link>
            <Link
              to="/payment"
              className="px-4 py-2 rounded-[9px] text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark transition-colors"
            >
              Join Remote WorkHER
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 md:px-8 pt-12 md:pt-20 pb-12">
        <div className="text-center mb-10">
          <p className="eyebrow mb-2">Contact us</p>
          <h1 className="headline text-[32px] md:text-[44px] text-foreground leading-[1.05]">
            Talk to a <em className="text-primary">real human.</em>
          </h1>
          <p className="text-[14px] md:text-[15px] text-muted-foreground mt-3 max-w-[520px] mx-auto">
            We usually reply within an hour during working hours. WhatsApp is fastest.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <a
            href={WHATSAPP_LINK}
            target="_blank"
            rel="noreferrer"
            className="group flex items-start gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-card transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-[#25D366]/15 text-[#25D366] flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-foreground">WhatsApp</p>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">Fastest — replies in minutes.</p>
              <p className="text-[12.5px] font-semibold text-primary mt-1.5 group-hover:underline">
                {WHATSAPP_NUMBER}
              </p>
            </div>
          </a>

          <a
            href={`tel:+${WHATSAPP_DIGITS}`}
            className="group flex items-start gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-card transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-foreground">Call us</p>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">Mon–Fri, 9am–6pm WAT.</p>
              <p className="text-[12.5px] font-semibold text-primary mt-1.5 group-hover:underline">
                {WHATSAPP_NUMBER}
              </p>
            </div>
          </a>

          <a
            href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("Hello Remote WorkHER")}`}
            className="group flex items-start gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-card transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-foreground">General support</p>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                Account, billing, or anything else.
              </p>
              <p className="text-[12.5px] font-semibold text-primary mt-1.5 group-hover:underline break-all">
                {SUPPORT_EMAIL}
              </p>
            </div>
          </a>

          <a
            href={`mailto:${RECRUITER_EMAIL}?subject=${encodeURIComponent("Hiring on Remote WorkHER")}`}
            className="group flex items-start gap-3 p-5 rounded-2xl border border-border bg-card hover:border-primary hover:shadow-card transition-all"
          >
            <div className="w-11 h-11 rounded-full bg-primary-tint text-primary flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-extrabold text-foreground">Recruiters & partners</p>
              <p className="text-[12.5px] text-muted-foreground mt-0.5">
                Hiring, sponsorships, partnerships.
              </p>
              <p className="text-[12.5px] font-semibold text-primary mt-1.5 group-hover:underline break-all">
                {RECRUITER_EMAIL}
              </p>
            </div>
          </a>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 md:p-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex items-start gap-3">
            <MapPin className="w-4 h-4 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-[12.5px] font-extrabold text-foreground uppercase tracking-wide">
                Based in
              </p>
              <p className="text-[13px] text-muted-foreground mt-0.5">Lagos, Nigeria · Hybrid team</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-primary mt-1 shrink-0" />
            <div>
              <p className="text-[12.5px] font-extrabold text-foreground uppercase tracking-wide">
                Hours
              </p>
              <p className="text-[13px] text-muted-foreground mt-0.5">
                Monday–Friday · 9:00am – 6:00pm WAT
              </p>
            </div>
          </div>
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
