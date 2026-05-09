import { Link } from "react-router-dom";
import { useSEO } from "@/components/SEO";
import logo from "@/assets/logo.svg";
import SiteFooter from "@/components/SiteFooter";
import founderImage from "@/assets/founder-adeife.jpg";
import { ArrowRight } from "lucide-react";

export default function About() {
  useSEO({
    title: "About Remote WorkHER — Our Story",
    description:
      "Remote WorkHER is a career growth ecosystem helping women land remote jobs, freelance, and build visibility online. Read our story.",
  });

  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
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

      {/* HERO */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-tint/60 to-background">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-24 grid md:grid-cols-12 gap-10 md:gap-14 items-center">
          <div className="md:col-span-7 order-2 md:order-1">
            <div className="inline-flex items-center gap-2 text-primary text-[11px] font-bold tracking-[2px] uppercase mb-6">
              <span className="h-px w-8 bg-primary" /> About Remote WorkHER
            </div>
            <h1 className="font-serif text-[40px] md:text-[64px] leading-[1.02] tracking-[-0.02em] mb-6">
              We didn't build Remote WorkHER from perfection.{" "}
              <span className="italic text-primary">We built it from experience.</span>
            </h1>
            <p className="text-[18px] md:text-[20px] leading-[1.55] text-muted-foreground max-w-xl">
              Remote WorkHER started from a simple reality: trying to figure out your career online
              can feel overwhelming, lonely, confusing, and exhausting.
            </p>
          </div>

          <div className="md:col-span-5 order-1 md:order-2">
            <div className="relative">
              <div className="absolute -inset-3 bg-primary/10 rounded-[28px] rotate-[-2deg]" aria-hidden />
              <img
                src={founderImage}
                alt="Adeife, founder of Remote WorkHER"
                className="relative w-full aspect-[4/5] object-cover rounded-[24px] shadow-[0_20px_60px_-20px_rgba(224,72,122,0.35)]"
                width={1024}
                height={1280}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ARTICLE */}
      <main className="max-w-[680px] mx-auto px-5 md:px-8 py-16 md:py-24">
        <Article>
          <p>
            For years, women have been told to apply to more jobs, learn more skills, keep trying,
            stay consistent. But nobody really teaches people how to position themselves online,
            how to become visible, how to create opportunities, freelance professionally, navigate
            the internet economy, or build careers strategically.
          </p>
          <Pull>And most importantly? Nobody gives people direction.</Pull>
          <p>That's why Remote WorkHER exists.</p>
        </Article>

        <SectionBreak />

        <h2 className="font-serif text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          Hi, I'm <span className="italic text-primary">Adeife</span> 👋🏽
        </h2>
        <p className="text-[15px] uppercase tracking-[2px] text-muted-foreground font-semibold mb-8">
          Founder of Remote WorkHER
        </p>
        <Article>
          <p>
            Before Remote WorkHER became a platform, it was honestly just me trying to figure
            things out online too.
          </p>
          <p>
            I know what it feels like to feel stuck. To feel confused about your career. To try
            different things online, want more opportunities, build while learning in public, fail
            publicly, rebuild again, and outgrow old versions of yourself.
          </p>
          <p>
            A lot of the things I teach today didn't come from theory. They came from experimenting,
            building, freelancing, creating content, networking, making mistakes, and figuring
            things out in real time.
          </p>
          <p>
            Over the years, I started sharing what I was learning — remote work opportunities,
            freelancing advice, career strategies, internet growth lessons, visibility frameworks,
            content systems, AI workflows, lessons from building online.
          </p>
          <p>
            And slowly, a community of women started growing around those conversations. Women who
            wanted better careers, remote opportunities, visibility, online income, growth,
            direction, and support.
          </p>
          <Pull>That community eventually became Remote WorkHER.</Pull>
        </Article>

        <SectionBreak />

        <h2 className="font-serif text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          The first version was <span className="italic">The Inner Circle.</span>
        </h2>
        <Article>
          <p>
            Before Remote WorkHER became what it is today, the first version of this vision was
            actually The Inner Circle. It was where a lot of this journey really began — one of the
            first spaces where women came together to learn, grow, ask questions, gain career
            support, explore remote opportunities, and build confidence online.
          </p>
          <p>
            And honestly? The Inner Circle taught us a lot. It taught us what women were truly
            struggling with, what people actually needed support with, where people got stuck, what
            worked, what didn't, and what needed to evolve.
          </p>
          <p>
            Like many growing platforms, we had to learn publicly, improve publicly, rebuild
            systems, listen to feedback, and evolve our vision. That journey shaped the platform
            into what it is today.
          </p>
          <p>
            We realized people did not just want another course library, motivational content, or
            random resources. People wanted implementation, guidance, visibility, accountability,
            strategic thinking, opportunities, support, and community.
          </p>
          <p>So we rebuilt Remote WorkHER around that.</p>
        </Article>

        <SectionBreak />

        <h2 className="font-serif text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          What Remote WorkHER is today.
        </h2>
        <Article>
          <p>
            Today, Remote WorkHER is an all-in-one career growth ecosystem helping women land
            remote jobs, become freelancers, and build their career brand online — through live
            implementation workshops, AI tools, guided plans, resources, challenges, courses,
            templates, expert-led sessions, and career support systems.
          </p>
          <p>
            We are building a platform where women do not just consume information. They implement,
            build, improve, grow, become visible, and create opportunities online.
          </p>
        </Article>

        <SectionBreak />

        <h2 className="font-serif text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          What makes us <span className="italic text-primary">different.</span>
        </h2>
        <Article>
          <p>
            We believe people do not just need more information. They need direction, systems,
            implementation, visibility, execution, support, and momentum.
          </p>
          <p>
            That's why our platform focuses heavily on practical workshops, implementation
            sessions, audits, guided plans, and real-world execution.
          </p>
          <p>
            We want women to leave Remote WorkHER with clearer positioning, stronger visibility,
            more confidence, practical systems, better opportunities, and real career growth.
          </p>
        </Article>

        <SectionBreak />

        <h2 className="font-serif text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          The vision.
        </h2>
        <Article>
          <Pull>
            To help more women access opportunities online and grow professionally in the digital
            economy.
          </Pull>
          <p>
            We want Remote WorkHER to become a trusted ecosystem — a practical growth platform, a
            space for visibility and opportunity, a place where women can build careers with
            support and direction.
          </p>
          <p>
            Not just another platform people sign up for and abandon. But a place that genuinely
            helps women move forward.
          </p>
        </Article>

        <SectionBreak />

        <h2 className="font-serif text-[32px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          This is still just the beginning.
        </h2>
        <Article>
          <p>
            Remote WorkHER is still growing. Still evolving. Still learning. But one thing remains
            constant: we care deeply about helping women grow online — and we're excited to keep
            building this journey with you. 💻✨
          </p>
          <p className="font-serif italic text-foreground text-[24px] md:text-[28px] leading-snug pt-2">
            Welcome to Remote WorkHER.
          </p>
          <p className="text-muted-foreground italic">
            A career growth ecosystem for women building careers, visibility, and opportunities
            online.
          </p>
        </Article>

        {/* CTA */}
        <div className="mt-20 md:mt-24 rounded-[28px] bg-foreground text-background p-8 md:p-12 text-center">
          <h3 className="font-serif text-[26px] md:text-[36px] leading-[1.1] mb-4">
            Build your career, with us.
          </h3>
          <p className="text-[15px] md:text-[16px] text-background/70 max-w-md mx-auto mb-7">
            Careers. Visibility. Opportunities. Built with you, for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/payment"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary-dark text-primary-foreground px-6 py-3 rounded-full text-[14px] font-semibold transition-colors"
            >
              Join Remote WorkHER <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 border border-background/20 hover:bg-background/10 text-background px-6 py-3 rounded-full text-[14px] font-semibold transition-colors"
            >
              Explore the platform
            </Link>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/* ---------- Editorial primitives ---------- */

function Article({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 text-[17px] md:text-[19px] leading-[1.75] text-foreground/85">
      {children}
    </div>
  );
}

function Pull({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="my-3 border-l-2 border-primary pl-5 font-serif italic text-[22px] md:text-[28px] leading-snug text-foreground">
      {children}
    </blockquote>
  );
}

function SectionBreak() {
  return (
    <div className="my-14 md:my-20 flex items-center justify-center gap-2" aria-hidden>
      <span className="h-1 w-1 rounded-full bg-primary/40" />
      <span className="h-1 w-1 rounded-full bg-primary/60" />
      <span className="h-1 w-1 rounded-full bg-primary/40" />
    </div>
  );
}
