import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useSEO } from "@/components/SEO";
import { PRICING_COPY } from "@/lib/pricing";
import { ArrowRight, Check } from "lucide-react";
import logo from "@/assets/logo.svg";
import winnerTestimonial from "@/assets/winner-testimonial.jpg";
import winnerInterviewWin from "@/assets/winner-interview-win.jpg";

export default function Join() {
  const navigate = useNavigate();
  useSEO({
    title: "Read this before you join Remote WorkHER",
    description:
      "If you've been trying to grow your career but all you get is crickets, this is for you. Get structure, direction, and opportunities — for ₦6,500.",
  });

  const goCheckout = () => navigate("/checkout?plan=trial");

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Slim top bar */}
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur border-b border-border">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <img src={logo} alt="Remote WorkHER" className="h-7" />
          <Button size="sm" onClick={goCheckout} className="rounded-full">
            Join now <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 md:px-6 py-10 md:py-16 space-y-14 leading-relaxed">
        {/* HERO */}
        <section className="space-y-6">
          <span className="inline-block text-xs font-semibold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
            Read this first
          </span>
          <h1 className="font-serif text-4xl md:text-5xl font-bold tracking-tight leading-[1.1]">
            Very important: Read this before you join Remote WorkHER
          </h1>
          <div className="space-y-4 text-base md:text-lg text-foreground/85">
            <p>Let me be honest with you.</p>
            <p>
              If you've been trying to get a job and grow your career but all you get is crickets, you're not alone.
            </p>
            <p>Competition is fierce and honestly? You're trying to figure everything out alone.</p>
            <p className="font-semibold text-foreground">You've probably:</p>
            <ol className="space-y-2 pl-5 list-decimal marker:text-primary marker:font-semibold">
              <li>Jumped between LinkedIn, YouTube and random job boards</li>
              <li>Bought courses and still felt confused</li>
              <li>Applied to jobs you're not even sure are real</li>
              <li>Used the same resume to apply for every job</li>
            </ol>
            <p>
              The truth is — you don't have a skill problem. You have a{" "}
              <span className="font-semibold text-primary">direction problem</span>.
            </p>
            <p>
              And if you continue like this, you'll probably still be confused 6 months from now (we're not cursing you o 😭).
            </p>
          </div>
        </section>

        {/* LET'S FACE IT */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">😩 Let's face it…</h2>
          <div className="space-y-4 text-base md:text-lg text-foreground/85">
            <p>How long do you wanna keep moving from platform to platform just so you can land a job?</p>
            <p>How long do you wanna keep buying "how to get a remote job" courses without actual results?</p>
            <p>Or applying with "Dear Ma" and hoping for the best 😭</p>
            <p className="font-semibold text-foreground">And you know the worst part?</p>
            <p>
              People with less skills than you are getting interviews because they have direction and you're just there.
            </p>
            <p>
              I mean look at Winner, she landed a job interview in less than a week because she had direction with Remote WorkHER.
            </p>
            <p className="font-semibold text-foreground">See proof now:</p>
          </div>

          {/* Testimonial screenshot — Winner's interview win */}
          <figure className="bg-card border border-border rounded-2xl p-3 md:p-4 shadow-sm">
            <img
              src={winnerTestimonial}
              alt="Screenshot of Winner sharing her interview win after using Remote WorkHER"
              className="w-full h-auto rounded-xl"
              loading="lazy"
            />
          </figure>

          <div className="space-y-4 text-base md:text-lg text-foreground/85">
            <p>You never even get one interview, somebody already landed one in less than a week.</p>
          </div>

          <figure className="bg-card border border-border rounded-2xl p-3 md:p-4 shadow-sm">
            <img
              src={winnerInterviewWin}
              alt="Screenshot of Winner's interview win with Remote WorkHER"
              className="w-full h-auto rounded-xl"
              loading="lazy"
            />
          </figure>

          <div className="space-y-4 text-base md:text-lg text-foreground/85">
            <p className="font-semibold">It's not wow.</p>
            <p className="font-semibold text-primary">It's structure.</p>
            <p>So let us help you fix this once and for all.</p>
          </div>

          <CTAButton onClick={goCheckout} />
        </section>

        {/* INTRO */}
        <section className="space-y-4">
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
            Introducing: Remote WorkHER
          </h2>
          <p className="text-base md:text-lg text-foreground/85">
            Thousands of women are already using Remote WorkHER to grow their careers online with more direction,
            structure and opportunities.
          </p>
          <p className="text-base md:text-lg font-semibold">Now it's your turn.</p>
        </section>

        {/* WHAT YOU GET */}
        <section className="space-y-6">
          <h3 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
            What You'll Get Inside Remote WorkHER
          </h3>

          <div className="space-y-4">
            <BenefitCard
              title="A Curated Job Board"
              points={[
                "No fake jobs or random \"DM for details\"",
                "We vet and curate every job before it gets posted",
                "Stop wasting time applying blindly",
              ]}
            />
            <BenefitCard
              title="Courses To Help You Grow"
              points={[
                "Learn how to position yourself for remote jobs and opportunities",
                "Understand exactly what skills to focus on",
                "Stop learning randomly with no result",
              ]}
            />
            <BenefitCard
              title="AI Career Tools"
              points={[
                "Build your resume faster",
                "Optimize your LinkedIn",
                "Write better cover letters",
                "Track your applications properly",
                "Stop doing everything manually",
              ]}
            />
            <BenefitCard
              title="Resources & Templates"
              points={[
                "Resume templates",
                "LinkedIn resources",
                "Career guides",
                "Swipe files and frameworks",
                "Stop starting from scratch every time",
              ]}
            />
            <BenefitCard
              title="Challenges To Help You Grow"
              points={["Stay accountable", "Stop procrastinating", "Actually implement what you learn"]}
            />
            <BenefitCard
              title="Live Career Clinics & Workshops"
              points={[
                "Get your CV reviewed",
                "Fix your LinkedIn profile",
                "Audit your applications",
                "Ask career questions live",
              ]}
            />
            <BenefitCard
              title="Internship & Opportunity Matching"
              points={[
                "Get matched to internships and opportunities based on your skills and interests",
                "Stop applying blindly everywhere",
              ]}
            />
          </div>
        </section>

        {/* 90 DAY PLANNER */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
            You also get a 90-Day Career Planner after joining
          </h2>
          <p className="text-base text-foreground/85">
            As soon as you join, you'll get access to our exclusive 90-day planner to help you:
          </p>
          <ul className="space-y-2">
            {[
              "Know exactly what to focus on for your career",
              "Stop jumping from thing to thing with no results",
              "Build your LinkedIn, CV and portfolio with direction",
              "Apply for jobs strategically instead of randomly",
              "Track your applications and progress",
              "Stay accountable and consistent",
              "Finally feel like your career is actually moving somewhere",
            ].map((t) => (
              <li key={t} className="flex gap-2 text-foreground/85">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <p className="text-foreground/85 pt-2">Because honestly?</p>
          <p className="font-semibold">Most people are not lazy.</p>
          <p className="font-semibold text-primary">They just don't have direction.</p>
          <CTAButton onClick={goCheckout} />
        </section>

        {/* TESTIMONIALS */}
        <section className="space-y-6">
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">
            💬 Hear from women inside Remote WorkHER
          </h2>
          <div className="space-y-4">
            <Testimonial
              quote="Before Remote WorkHER, I was honestly confused. Now I actually know what I'm doing and how to position myself."
              name="[NAME]"
              role="Virtual Assistant"
            />
            <Testimonial
              quote="This platform gave me structure. I stopped applying randomly and started applying strategically."
              name="[NAME]"
              role="Customer Support"
            />
            <Testimonial
              quote="I finally stopped feeling overwhelmed because everything I needed was in one place."
              name="[NAME]"
              role="Social Media Manager"
            />
          </div>
          <CTAButton onClick={goCheckout} />
        </section>

        {/* WHO IT'S FOR */}
        <section className="space-y-4">
          <h2 className="font-serif text-2xl md:text-3xl font-bold tracking-tight">This platform is for you if:</h2>
          <ul className="space-y-2">
            {[
              "You're tired of trying to figure everything out alone",
              "You want a remote job or internship",
              "You're tired of feeling stuck and confused",
              "You want direction and structure",
              "You want access to opportunities",
              "You're serious about growing your career online",
            ].map((t) => (
              <li key={t} className="flex gap-2 text-foreground/85">
                <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* PRICE */}
        <section className="bg-primary text-primary-foreground rounded-2xl p-6 md:p-10 space-y-5 text-center">
          <h2 className="font-serif text-3xl md:text-4xl font-bold tracking-tight">
            The price: {PRICING_COPY.monthlyPrice}
          </h2>
          <p className="text-sm opacity-90">/ month · cancel anytime</p>
          <ul className="text-left max-w-md mx-auto space-y-2">
            {[
              "Access to the full platform",
              "Curated job opportunities",
              "Courses & career resources",
              "AI career tools",
              "Templates & resources",
              "Live workshops",
              "Internship opportunities",
              "90-day career planner",
            ].map((t) => (
              <li key={t} className="flex gap-2">
                <Check className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
          <Button
            size="lg"
            onClick={goCheckout}
            className="bg-background text-foreground hover:bg-background/90 rounded-full px-8 h-12 text-base font-semibold"
          >
            Join Remote WorkHER <ArrowRight className="w-5 h-5 ml-1" />
          </Button>
          <p className="text-sm opacity-90">Buy now so you don't miss out.</p>
        </section>

        {/* CLOSING */}
        <section className="text-center space-y-4 pb-10">
          <p className="text-lg text-foreground/85">At some point, you need more than motivation.</p>
          <p className="text-xl font-serif font-bold text-primary">You need structure.</p>
          <div className="pt-2">
            <CTAButton onClick={goCheckout} />
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Remote WorkHER · <a href="/terms" className="hover:underline">Terms</a> ·{" "}
        <a href="/privacy" className="hover:underline">Privacy</a>
      </footer>
    </div>
  );
}

function BenefitCard({ title, points }: { title: string; points: string[] }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center gap-2 mb-3">
        <Check className="w-5 h-5 text-success" />
        <h4 className="font-semibold text-base md:text-lg">{title}</h4>
      </div>
      <ul className="space-y-1.5 pl-7 text-foreground/85 text-sm md:text-base">
        {points.map((p) => (
          <li key={p} className="relative before:content-['–'] before:absolute before:-left-4 before:text-muted-foreground">
            {p}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Testimonial({ quote, name, role }: { quote: string; name: string; role: string }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 md:p-6">
      <p className="text-foreground/90 italic">"{quote}"</p>
      <p className="mt-3 text-sm font-semibold">
        — {name}, <span className="font-normal text-muted-foreground">{role}</span>
      </p>
    </div>
  );
}

function CTAButton({ onClick }: { onClick: () => void }) {
  return (
    <div className="pt-2">
      <Button
        size="lg"
        onClick={onClick}
        className="rounded-full px-8 h-12 text-base font-semibold w-full sm:w-auto"
      >
        Join Remote WorkHER <ArrowRight className="w-5 h-5 ml-1" />
      </Button>
    </div>
  );
}
