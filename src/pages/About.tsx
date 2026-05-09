import { Link } from "react-router-dom";
import { useSEO } from "@/components/SEO";
import logo from "@/assets/logo.svg";
import SiteFooter from "@/components/SiteFooter";
import founderImage from "@/assets/founder-adeife.jpg";
import { ArrowRight, Sparkles } from "lucide-react";

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

      {/* HERO — editorial founder split */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary-tint/60 to-background">
        <div className="max-w-6xl mx-auto px-5 md:px-8 py-14 md:py-24 grid md:grid-cols-12 gap-10 md:gap-14 items-center">
          <div className="md:col-span-7 order-2 md:order-1">
            <div className="inline-flex items-center gap-2 text-primary text-[11px] font-bold tracking-[2px] uppercase mb-6">
              <span className="h-px w-8 bg-primary" /> Our Story
            </div>
            <h1 className="font-serif text-[40px] md:text-[64px] leading-[1.02] tracking-[-0.02em] mb-6">
              This is <span className="italic text-primary">Remote WorkHER.</span>
            </h1>
            <p className="text-[18px] md:text-[20px] leading-[1.55] text-muted-foreground max-w-xl">
              We didn't build it from perfection. We built it from experience —
              from years of figuring out, online and alone, what nobody was teaching women about their careers.
            </p>
            <div className="mt-8 flex items-center gap-4 text-[13px] text-muted-foreground">
              <div className="h-px w-10 bg-border" />
              <span>A letter from our founder</span>
            </div>
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

      {/* ARTICLE BODY */}
      <main className="max-w-[680px] mx-auto px-5 md:px-8 py-16 md:py-24">
        {/* Intro */}
        <Article>
          <p>
            Remote WorkHER started from a simple reality: trying to figure out your career online can feel
            overwhelming, lonely, confusing, and exhausting.
          </p>
          <p>
            For years, women have been told to apply to more jobs, learn more skills, keep trying, stay
            consistent. But nobody really teaches us how to <em>position</em> ourselves online, how to
            <em> become visible</em>, how to <em>monetise</em> what we already know — or how to grow without
            burning out.
          </p>
          <Pull>And most importantly? Nobody gives us direction.</Pull>
          <p>That's why Remote WorkHER exists.</p>
        </Article>

        <Divider />

        {/* Founder section */}
        <Eyebrow>Founder</Eyebrow>
        <h2 className="font-serif text-[30px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          Hi, I'm <span className="italic text-primary">Adeife.</span>
        </h2>
        <Article>
          <p>
            I built Remote WorkHER because I lived through the exact problem it solves. I've spent years
            learning how to position myself online, build trust through visibility, navigate remote work,
            create offers that actually sell, and grow audiences from scratch — quietly, consistently, often
            without a roadmap.
          </p>
          <p>
            Along the way I noticed something: brilliant women were doing the work but still felt invisible,
            stuck, unsure of where to start. Not because they weren't capable — but because nobody had ever
            shown them how online careers really work.
          </p>
          <p>
            So I started building the platform I wished I had when I began.
          </p>
        </Article>

        <Divider />

        {/* Origin */}
        <Eyebrow>Where it began</Eyebrow>
        <h2 className="font-serif text-[30px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          The first version was <span className="italic">The Inner Circle.</span>
        </h2>
        <Article>
          <p>
            A small, focused community where women could learn the practical side of building online —
            visibility, positioning, freelancing, remote work, brand building. It grew faster than I expected,
            and quickly the lessons piled up.
          </p>
          <p>
            Women didn't just want another course library or motivational content. They wanted something
            built differently — a place that would actually walk with them: a clear plan, real direction, and
            tools that helped them <em>do</em> the work instead of just learning about it.
          </p>
          <p>
            That's what Remote WorkHER became.
          </p>
        </Article>

        <Divider />

        {/* Today */}
        <Eyebrow>Today</Eyebrow>
        <h2 className="font-serif text-[30px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          A career growth ecosystem for women building online.
        </h2>
        <Article>
          <p>
            Remote WorkHER helps women land remote jobs, become freelancers, and build a career brand that
            opens doors — without burnout, without confusion, and without doing it alone.
          </p>
          <p>
            We pair execution-first tools — a 90-day plan, AI career coach, brag file, application tracker,
            resume and LinkedIn studios — with real human community, so progress actually happens.
          </p>
        </Article>

        <Divider />

        {/* Belief */}
        <Eyebrow>What we believe</Eyebrow>
        <h2 className="font-serif text-[30px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          Information isn't the problem. <span className="italic text-primary">Direction is.</span>
        </h2>
        <Article>
          <p>
            The internet is full of advice. What women need is a clear next step, in the right order, with
            someone in their corner. That's the standard we hold ourselves to — not another platform people
            sign up for and abandon, but a place that genuinely helps them move forward.
          </p>
        </Article>

        <Divider />

        {/* Closing */}
        <Eyebrow>Still beginning</Eyebrow>
        <h2 className="font-serif text-[30px] md:text-[44px] leading-[1.1] tracking-[-0.01em] mb-6">
          This is still just the beginning.
        </h2>
        <Article>
          <p>
            Remote WorkHER is still growing. Still evolving. Still learning. But one thing remains constant:
            we care deeply about helping women grow online — and we're excited to keep building this with you.
          </p>
          <p className="font-serif italic text-foreground text-[22px] md:text-[26px] leading-snug pt-2">
            Welcome to Remote WorkHER.
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

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5 text-primary text-[11px] font-bold tracking-[2px] uppercase">
      <span className="h-px w-8 bg-primary" />
      {children}
    </div>
  );
}

function Article({ children }: { children: React.ReactNode }) {
  return (
    <div className="space-y-5 text-[17px] md:text-[18px] leading-[1.7] text-foreground/85">
      {children}
    </div>
  );
}

function Pull({ children }: { children: React.ReactNode }) {
  return (
    <blockquote className="my-3 border-l-2 border-primary pl-5 font-serif italic text-[22px] md:text-[26px] leading-snug text-foreground">
      {children}
    </blockquote>
  );
}

function Divider() {
  return (
    <div className="my-14 md:my-20 flex items-center justify-center gap-2" aria-hidden>
      <span className="h-1 w-1 rounded-full bg-primary/40" />
      <span className="h-1 w-1 rounded-full bg-primary/60" />
      <span className="h-1 w-1 rounded-full bg-primary/40" />
    </div>
  );
}
