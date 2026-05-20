import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Play, X } from "lucide-react";
import { PRICING_COPY } from "@/lib/pricing";
import winnerTestimonial from "@/assets/winner-testimonial.jpg";
import testimonialZainab from "@/assets/testimonial-zainab.png";
import testimonialGrace from "@/assets/testimonial-grace.png";
import testimonialDmMicrosoft from "@/assets/testimonial-dm-microsoft.jpg";
import testimonialDmUpwork from "@/assets/testimonial-dm-upwork.jpg";

/**
 * Guest-only landing/sales sections rendered below the hero on the home page.
 * Logged-in users never see this — they get the dashboard widgets instead.
 */
export default function GuestLanding() {
  const navigate = useNavigate();
  const goJoin = () => navigate("/payment");

  return (
    <div className="bg-background">
      {/* VSL VIDEO */}
      <section className="px-4 sm:px-6 md:px-10 py-8 md:py-12 bg-white border-b border-[#ebe6e2]">
        <div className="max-w-3xl mx-auto">
          <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-gradient-to-br from-[#6B3FA0] via-[#9d3a8e] to-[#E0487A] shadow-strong group cursor-pointer">
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-white/95 flex items-center justify-center shadow-strong group-hover:scale-105 transition-transform">
                <Play className="w-7 h-7 md:w-8 md:h-8 text-primary fill-primary ml-1" />
              </div>
              <p className="mt-4 text-[12px] md:text-[13px] font-semibold tracking-wide uppercase opacity-90">
                Watch: Why Remote Workher exists
              </p>
            </div>
          </div>
          <div className="text-center mt-6">
            <button
              onClick={goJoin}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-br from-[#c73868] to-[#E0487A] text-white rounded-[12px] text-[14px] font-bold shadow-[0_4px_14px_rgba(224,72,122,0.35)] hover:shadow-[0_6px_20px_rgba(224,72,122,0.45)] transition-shadow"
            >
              Join Remote Workher <ArrowRight className="w-4 h-4" />
            </button>
            <p className="text-[12px] text-muted-foreground mt-2">
              Starting at {PRICING_COPY.monthlyPrice} · cancel anytime
            </p>
          </div>
        </div>
      </section>

      {/* THE PROBLEM */}
      <section className="px-4 sm:px-6 md:px-10 py-10 md:py-14 bg-[#F8F4F2] border-b border-[#ebe6e2]">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow mb-2 text-center">Let's face it</p>
          <h2 className="headline text-[26px] md:text-[36px] text-foreground leading-[1.1] mb-6 text-center">
            You don't have a skill problem.<br />You have a <em>direction problem</em>.
          </h2>
          <div className="space-y-3.5 text-[14.5px] md:text-[15px] text-foreground/85 leading-relaxed max-w-2xl mx-auto">
            <p>
              You've been trying to get a remote job or grow your career — but all you get is crickets.
              Competition is fierce and you're trying to figure everything out alone.
            </p>
            <p className="font-semibold text-foreground">You've probably:</p>
            <ul className="space-y-2.5">
              {[
                "Jumped between LinkedIn, YouTube and random job boards",
                "Bought courses and still felt confused",
                "Applied to jobs you're not even sure are real",
                "Used the same resume for every single role",
              ].map((t) => (
                <li key={t} className="flex gap-3 items-start">
                  <X className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <span>{t}</span>
                </li>
              ))}
            </ul>
            <p className="pt-2">
              People with less skills than you are getting interviews because they have{" "}
              <span className="font-semibold text-primary">structure</span> — and you're just there.
            </p>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="px-4 sm:px-6 md:px-10 py-10 md:py-14 bg-white border-b border-[#ebe6e2]">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow mb-2 text-center">Real wins</p>
          <h2 className="headline text-[24px] md:text-[32px] text-foreground leading-[1.1] mb-6 text-center">
            Women inside Remote Workher are <em>landing jobs</em>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {[
              { src: winnerTestimonial, alt: "Winner landed an interview in less than a week" },
              { src: testimonialDmMicrosoft, alt: "Member landed a remote role and travelled to Microsoft Ignite" },
              { src: testimonialDmUpwork, alt: "Member landed her first Upwork offer over $2000/month" },
              { src: testimonialZainab, alt: "Zainab on how the 90-day roadmap gave her direction" },
            ].map((t) => (
              <figure key={t.src} className="bg-card border border-border rounded-xl p-2.5 shadow-sm">
                <img src={t.src} alt={t.alt} className="w-full h-auto rounded-lg" loading="lazy" />
              </figure>
            ))}
          </div>
          <div className="text-center">
            <button
              onClick={goJoin}
              className="inline-flex items-center gap-2 px-7 py-3.5 bg-gradient-to-br from-[#c73868] to-[#E0487A] text-white rounded-[12px] text-[14px] font-bold shadow-[0_4px_14px_rgba(224,72,122,0.35)]"
            >
              Join Remote Workher <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section className="px-4 sm:px-6 md:px-10 py-10 md:py-14 bg-[#F8F4F2] border-b border-[#ebe6e2]">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow mb-2 text-center">What's inside</p>
          <h2 className="headline text-[24px] md:text-[32px] text-foreground leading-[1.1] mb-8 text-center">
            Everything you need to <em>get hired</em>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {[
              { title: "Curated remote job board", desc: "We vet every job. No fakes, no 'DM for details'." },
              { title: "AI career tools", desc: "Resume, cover letters, LinkedIn, cold pitches — built in minutes." },
              { title: "90-day career planner", desc: "Know exactly what to focus on, week by week." },
              { title: "Live workshops & clinics", desc: "Get your CV reviewed and ask career questions live." },
              { title: "Courses & resources", desc: "Templates, frameworks, guides — stop starting from scratch." },
              { title: "Internship matching", desc: "Get matched to opportunities based on your skills." },
            ].map((b) => (
              <div key={b.title} className="bg-white border border-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1.5">
                  <Check className="w-4 h-4 text-success" />
                  <h4 className="font-semibold text-[14px]">{b.title}</h4>
                </div>
                <p className="text-[13px] text-muted-foreground leading-relaxed pl-6">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHO IT'S FOR */}
      <section className="px-4 sm:px-6 md:px-10 py-10 md:py-14 bg-white border-b border-[#ebe6e2]">
        <div className="max-w-2xl mx-auto">
          <p className="eyebrow mb-2 text-center">Is this for you?</p>
          <h2 className="headline text-[24px] md:text-[32px] text-foreground leading-[1.1] mb-6 text-center">
            Remote Workher is for you if…
          </h2>
          <ul className="space-y-2.5 text-[14.5px] text-foreground/85">
            {[
              "You're tired of figuring everything out alone",
              "You want a remote job or internship",
              "You're tired of feeling stuck and confused",
              "You want direction and structure",
              "You're serious about growing your career online",
            ].map((t) => (
              <li key={t} className="flex gap-3 items-start">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-4 sm:px-6 md:px-10 py-12 md:py-16 bg-gradient-to-br from-[#c73868] to-[#E0487A] text-white">
        <div className="max-w-2xl mx-auto text-center space-y-5">
          <h2 className="headline text-[26px] md:text-[36px] leading-[1.1] text-white">
            At some point, you need more than motivation.<br />You need <em className="text-white/90">structure</em>.
          </h2>
          <p className="text-[14px] md:text-[15px] text-white/85 leading-relaxed">
            Join thousands of African women using Remote Workher to land jobs, switch careers, and grow online — with direction.
          </p>
          <div>
            <button
              onClick={goJoin}
              className="inline-flex items-center gap-2 px-8 py-4 bg-white text-primary rounded-[12px] text-[15px] font-bold hover:bg-white/95 transition-colors"
            >
              Join Remote Workher <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-[12.5px] text-white/80 mt-3">
              From {PRICING_COPY.monthlyPrice} · cancel anytime
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
