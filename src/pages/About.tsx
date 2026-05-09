import { Link } from "react-router-dom";
import { useSEO } from "@/components/SEO";
import logo from "@/assets/logo.svg";
import SiteFooter from "@/components/SiteFooter";
import { ArrowRight, Sparkles, Target, Users, TrendingUp, Heart, Compass } from "lucide-react";

export default function About() {
  useSEO({
    title: "About Remote WorkHER — Our Story",
    description:
      "Remote WorkHER is a career growth ecosystem helping women land remote jobs, freelance, and build visibility online. Read our story.",
  });

  return (
    <div className="min-h-screen bg-background font-sans">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-40">
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
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-tint via-background to-background" />
        <div className="absolute -top-24 -right-24 w-[420px] h-[420px] rounded-full bg-primary/15 blur-3xl" />
        <div className="absolute -bottom-32 -left-24 w-[380px] h-[380px] rounded-full bg-primary/10 blur-3xl" />

        <div className="relative max-w-5xl mx-auto px-5 md:px-8 py-16 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-card border border-primary-border text-primary text-[11.5px] font-bold tracking-[1.5px] uppercase mb-7">
            <Sparkles className="w-3.5 h-3.5" /> Our Story
          </div>
          <h1 className="font-serif text-[40px] md:text-[68px] leading-[1.02] text-foreground tracking-[-0.02em] mb-6">
            This is <span className="italic text-primary">Remote WorkHER.</span>
          </h1>
          <p className="font-serif text-[22px] md:text-[30px] text-foreground/70 italic mb-8">
            We built it from <span className="text-primary not-italic font-semibold">experience.</span>
          </p>
          <p className="text-[16px] md:text-[18px] leading-relaxed text-muted-foreground max-w-2xl mx-auto">
            Remote WorkHER started from a simple reality: trying to figure out your career online can feel
            overwhelming, lonely, confusing, and exhausting.
          </p>
        </div>
      </section>

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-16 md:py-24">
        {/* What women are told vs what they need */}
        <Section eyebrow="The gap">
          <h2 className="font-serif text-[28px] md:text-[40px] leading-[1.15] text-foreground mb-8">
            For years, women have been told to do <span className="italic text-primary">more</span> — but
            never shown <span className="italic text-primary">how</span>.
          </h2>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5 mb-8">
            <Card tone="muted" title="What we're told">
              <ChipList items={["apply to more jobs", "learn more skills", "keep trying", "stay consistent"]} />
            </Card>
            <Card tone="primary" title="What no one teaches">
              <ChipList
                items={[
                  "position yourself online",
                  "become visible",
                  "create opportunities",
                  "freelance professionally",
                  "navigate the internet economy",
                  "build careers strategically",
                ]}
              />
            </Card>
          </div>

          <PullQuote>And most importantly? Nobody gives people direction.</PullQuote>

          <p className="text-[17px] md:text-[19px] font-serif text-foreground mt-8">
            That's why <span className="text-primary font-semibold not-italic">Remote WorkHER</span> exists.
          </p>
        </Section>

        {/* Founder */}
        <Section eyebrow="Founder">
          <div className="rounded-3xl bg-gradient-to-br from-primary-tint to-card border border-primary-border p-7 md:p-10 mb-10">
            <div className="flex items-start gap-5 mb-6">
              <div className="shrink-0 w-16 h-16 md:w-20 md:h-20 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-serif text-2xl md:text-3xl shadow-md">
                A
              </div>
              <div>
                <p className="text-[12px] uppercase tracking-[1.5px] text-primary font-bold mb-1">
                  Hi, I'm Adeife 👋🏽
                </p>
                <h2 className="font-serif text-[24px] md:text-[32px] text-foreground leading-tight">
                  Founder of Remote WorkHER
                </h2>
              </div>
            </div>
            <Prose>
              <p>
                Before Remote WorkHER became a platform, it was honestly just me trying to figure things
                out online too.
              </p>
              <p>I know what it feels like to:</p>
              <Bullets
                items={[
                  "feel stuck",
                  "feel confused about your career",
                  "try different things online",
                  "want more opportunities",
                  "build while learning in public",
                  "fail publicly",
                  "rebuild again",
                  "outgrow old versions of yourself",
                ]}
              />
            </Prose>
          </div>

          <Prose>
            <p>
              A lot of the things I teach today didn't come from theory. They came from:
            </p>
          </Prose>
          <div className="flex flex-wrap gap-2 my-5">
            {[
              "experimenting",
              "building",
              "freelancing",
              "creating content",
              "networking",
              "making mistakes",
              "figuring things out in real time",
            ].map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full bg-muted border border-border text-[13px] text-foreground"
              >
                {t}
              </span>
            ))}
          </div>

          <Prose>
            <p>Over the years, I started sharing:</p>
            <Bullets
              items={[
                "remote work opportunities",
                "freelancing advice",
                "career strategies",
                "internet growth lessons",
                "visibility frameworks",
                "content systems",
                "AI workflows",
                "lessons from building online",
              ]}
            />
            <p>And slowly, a community of women started growing around those conversations.</p>
            <p>Women who wanted:</p>
            <Bullets
              items={[
                "better careers",
                "remote opportunities",
                "visibility",
                "online income",
                "growth",
                "direction",
                "support",
              ]}
            />
            <p className="text-foreground font-medium">That community eventually became Remote WorkHER.</p>
          </Prose>
        </Section>

        {/* Inner Circle */}
        <Section eyebrow="Where it began">
          <h2 className="font-serif text-[28px] md:text-[40px] leading-[1.15] text-foreground mb-6">
            The first version was <span className="italic text-primary">The Inner Circle</span>.
          </h2>
          <Prose>
            <p>
              Before Remote WorkHER became what it is today, the first version of this vision was The Inner
              Circle — one of the first spaces where women came together to:
            </p>
            <Bullets
              items={[
                "learn",
                "grow",
                "ask questions",
                "gain career support",
                "explore remote opportunities",
                "build confidence online",
              ]}
            />
            <p>And honestly? The Inner Circle taught us a lot. It taught us:</p>
            <Bullets
              items={[
                "what women were truly struggling with",
                "what people actually needed support with",
                "where people got stuck",
                "what worked",
                "what didn't work",
                "what needed to evolve",
              ]}
            />
            <p>Like many growing platforms, we had to:</p>
            <Bullets
              items={[
                "learn publicly",
                "improve publicly",
                "rebuild systems",
                "listen to feedback",
                "evolve our vision",
              ]}
            />
            <p>That journey shaped the platform into what it is today.</p>
          </Prose>

          <div className="grid md:grid-cols-2 gap-4 md:gap-5 mt-8">
            <Card tone="muted" title="People didn't just want">
              <Bullets compact items={["another course library", "motivational content", "random resources"]} />
            </Card>
            <Card tone="primary" title="They wanted">
              <Bullets
                compact
                items={[
                  "implementation",
                  "guidance",
                  "visibility",
                  "accountability",
                  "strategic thinking",
                  "opportunities",
                  "support",
                  "community",
                ]}
              />
            </Card>
          </div>

          <p className="text-foreground font-medium mt-8 text-[16px]">
            So we rebuilt Remote WorkHER around that.
          </p>
        </Section>

        {/* What we are today */}
        <Section eyebrow="Today">
          <h2 className="font-serif text-[28px] md:text-[40px] leading-[1.15] text-foreground mb-6">
            An all-in-one career growth ecosystem for women.
          </h2>
          <Prose>
            <p>Remote WorkHER helps women:</p>
          </Prose>

          <div className="grid sm:grid-cols-3 gap-4 my-6">
            <MissionTile icon={TrendingUp} label="Land remote jobs" />
            <MissionTile icon={Sparkles} label="Become freelancers" />
            <MissionTile icon={Users} label="Build their career brand online" />
          </div>

          <Prose>
            <p>through:</p>
          </Prose>
          <div className="flex flex-wrap gap-2 my-5">
            {[
              "live implementation workshops",
              "AI tools",
              "guided plans",
              "resources",
              "challenges",
              "courses",
              "templates",
              "expert-led sessions",
              "career support systems",
            ].map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 rounded-full bg-primary-tint text-primary border border-primary-border text-[13px] font-medium"
              >
                {t}
              </span>
            ))}
          </div>

          <PullQuote>
            We are building a platform where women do not just consume information — they implement, build,
            improve, grow, become visible, and create opportunities online.
          </PullQuote>
        </Section>

        {/* What makes us different */}
        <Section eyebrow="What makes us different">
          <h2 className="font-serif text-[28px] md:text-[40px] leading-[1.15] text-foreground mb-8">
            Information isn't the problem. <span className="italic text-primary">Direction is.</span>
          </h2>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Compass, label: "Direction" },
              { icon: Target, label: "Systems" },
              { icon: Sparkles, label: "Implementation" },
              { icon: Users, label: "Visibility" },
              { icon: TrendingUp, label: "Execution" },
              { icon: Heart, label: "Support" },
            ].map((it) => (
              <div
                key={it.label}
                className="rounded-2xl bg-card border border-border p-5 flex items-center gap-3 hover:border-primary/40 transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-tint text-primary flex items-center justify-center">
                  <it.icon className="w-5 h-5" />
                </div>
                <span className="text-[15px] font-semibold text-foreground">{it.label}</span>
              </div>
            ))}
          </div>

          <Prose>
            <p>That's why our platform focuses heavily on:</p>
            <Bullets
              items={[
                "practical workshops",
                "implementation sessions",
                "audits",
                "guided plans",
                "real-world execution",
              ]}
            />
            <p>We want women to leave Remote WorkHER with:</p>
            <Bullets
              items={[
                "clearer positioning",
                "stronger visibility",
                "more confidence",
                "practical systems",
                "better opportunities",
                "real career growth",
              ]}
            />
          </Prose>
        </Section>

        {/* Vision */}
        <Section eyebrow="The vision">
          <div className="rounded-3xl bg-foreground text-background p-8 md:p-12 relative overflow-hidden">
            <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/30 blur-3xl" />
            <p className="relative font-serif text-[26px] md:text-[36px] leading-[1.25] italic">
              "To help more women access opportunities online and grow professionally in the digital
              economy."
            </p>
          </div>

          <Prose className="mt-8">
            <p>We want Remote WorkHER to become:</p>
            <Bullets
              items={[
                "a trusted ecosystem",
                "a practical growth platform",
                "a space for visibility and opportunity",
                "a place where women can build careers with support and direction",
              ]}
            />
            <p>
              Not just another platform people sign up for and abandon — but a place that genuinely helps
              women move forward.
            </p>
          </Prose>
        </Section>

        {/* Beginning */}
        <Section eyebrow="Still building">
          <h2 className="font-serif text-[28px] md:text-[40px] leading-[1.15] text-foreground mb-5">
            This is still just the <span className="italic text-primary">beginning.</span>
          </h2>
          <Prose>
            <p>Remote WorkHER is still growing. Still evolving. Still learning.</p>
            <p>But one thing remains constant:</p>
            <p className="text-foreground font-semibold text-[17px]">
              We care deeply about helping women grow online.
            </p>
            <p>And we're excited to keep building this journey with you 💻✨</p>
          </Prose>
        </Section>

        {/* CTA */}
        <div className="mt-16 md:mt-20 rounded-3xl bg-gradient-to-br from-primary to-primary-dark text-primary-foreground p-8 md:p-14 text-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-72 h-72 rounded-full bg-white/10 blur-3xl" />
          <div className="relative">
            <p className="text-[12px] uppercase tracking-[2px] font-bold opacity-80 mb-4">
              Welcome to Remote WorkHER
            </p>
            <h2 className="font-serif text-[30px] md:text-[44px] leading-[1.1] mb-4">
              A career growth ecosystem for women building online.
            </h2>
            <p className="text-[15px] md:text-[17px] opacity-90 max-w-xl mx-auto mb-8">
              Careers. Visibility. Opportunities. Built with you, for you.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/payment"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-[10px] text-[14px] font-semibold text-primary bg-card hover:bg-card/90 transition-colors"
              >
                Join Remote WorkHER <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                to="/"
                className="px-6 py-3 rounded-[10px] text-[14px] font-semibold text-primary-foreground border border-primary-foreground/40 hover:bg-primary-foreground/10 transition-colors"
              >
                Explore the platform
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}

/* ---------- helpers ---------- */

function Section({ eyebrow, children }: { eyebrow?: string; children: React.ReactNode }) {
  return (
    <section className="mb-16 md:mb-24">
      {eyebrow && (
        <div className="flex items-center gap-3 mb-5">
          <span className="h-px w-8 bg-primary" />
          <span className="text-[11px] font-bold tracking-[2px] uppercase text-primary">{eyebrow}</span>
        </div>
      )}
      {children}
    </section>
  );
}

function Prose({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`space-y-4 text-[16px] md:text-[17px] leading-[1.75] text-foreground/85 ${className}`}>
      {children}
    </div>
  );
}

function Bullets({ items, compact = false }: { items: string[]; compact?: boolean }) {
  return (
    <ul className={`grid ${compact ? "" : "sm:grid-cols-2"} gap-x-6 gap-y-2 mt-2`}>
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2.5">
          <span className="mt-[10px] w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function ChipList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5">
      {items.map((it) => (
        <li key={it} className="flex items-start gap-2.5 text-[15px] leading-relaxed">
          <span className="mt-[9px] w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}

function Card({
  title,
  tone,
  children,
}: {
  title: string;
  tone: "muted" | "primary";
  children: React.ReactNode;
}) {
  const isPrimary = tone === "primary";
  return (
    <div
      className={`rounded-2xl p-6 md:p-7 border ${
        isPrimary ? "bg-primary-tint border-primary-border" : "bg-card border-border"
      }`}
    >
      <div
        className={`text-[11px] uppercase tracking-[1.5px] font-bold mb-4 ${
          isPrimary ? "text-primary" : "text-muted-foreground"
        }`}
      >
        {title}
      </div>
      {children}
    </div>
  );
}

function PullQuote({ children }: { children: React.ReactNode }) {
  return (
    <div className="my-8 border-l-4 border-primary pl-6 py-2">
      <p className="font-serif text-[22px] md:text-[28px] leading-[1.3] text-foreground italic">
        {children}
      </p>
    </div>
  );
}

function MissionTile({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <div className="rounded-2xl bg-card border border-border p-5 text-center hover:border-primary/40 transition-colors">
      <div className="w-11 h-11 mx-auto mb-3 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-[14px] font-semibold text-foreground">{label}</div>
    </div>
  );
}
