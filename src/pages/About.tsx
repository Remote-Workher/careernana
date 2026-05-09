import { Link } from "react-router-dom";
import { useSEO } from "@/components/SEO";
import logo from "@/assets/logo.svg";
import SiteFooter from "@/components/SiteFooter";

export default function About() {
  useSEO({
    title: "About Remote WorkHER — Our Story",
    description:
      "Remote WorkHER is a career growth ecosystem helping women land remote jobs, freelance, and build visibility online. Read our story.",
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-40">
        <div className="max-w-4xl mx-auto px-5 md:px-8 h-[58px] flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="Remote Workher" className="h-7 w-auto" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/" className="text-[13px] text-muted-foreground hover:text-foreground">Home</Link>
            <Link
              to="/payment"
              className="px-4 py-2 rounded-[9px] text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark transition-colors"
            >
              Join Remote WorkHER
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-5 md:px-8 py-12 md:py-20">
        {/* Hero */}
        <div className="mb-12 md:mb-16">
          <p className="text-[12px] tracking-[2px] uppercase text-primary font-semibold mb-3">About Remote WorkHER</p>
          <h1 className="font-serif text-4xl md:text-5xl leading-[1.1] text-foreground mb-5">
            We didn't build Remote WorkHER from perfection.<br />
            <span className="italic text-primary">We built it from experience.</span>
          </h1>
          <p className="text-[16px] md:text-[17px] leading-relaxed text-muted-foreground">
            Remote WorkHER started from a simple reality: trying to figure out your career online can feel
            overwhelming, lonely, confusing, and exhausting.
          </p>
        </div>

        <Section>
          <p>For years, women have been told:</p>
          <Bullets items={["apply to more jobs", "learn more skills", "keep trying", "stay consistent"]} />
          <p>But nobody really teaches people how to:</p>
          <Bullets
            items={[
              "position themselves online",
              "become visible",
              "create opportunities",
              "freelance professionally",
              "navigate the internet economy",
              "build careers strategically",
            ]}
          />
          <p>And most importantly? Nobody gives people direction.</p>
          <p className="font-semibold text-foreground">That's why Remote WorkHER exists.</p>
        </Section>

        <Section heading="Hi, I'm Adeife 👋🏽">
          <p className="text-[15px] text-muted-foreground -mt-2 mb-4">Founder of Remote WorkHER.</p>
          <p>
            Before Remote WorkHER became a platform, it was honestly just me trying to figure things out
            online too.
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
          <p>A lot of the things I teach today didn't come from theory. They came from:</p>
          <Bullets
            items={[
              "experimenting",
              "building",
              "freelancing",
              "creating content",
              "networking",
              "making mistakes",
              "figuring things out in real time",
            ]}
          />
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
            items={["better careers", "remote opportunities", "visibility", "online income", "growth", "direction", "support"]}
          />
          <p>That community eventually became Remote WorkHER.</p>
        </Section>

        <Section heading="The first version was The Inner Circle">
          <p>
            Before Remote WorkHER became what it is today, the first version of this vision was actually
            <strong> The Inner Circle</strong>.
          </p>
          <p>The Inner Circle was where a lot of this journey really began.</p>
          <p>It was one of the first spaces where women came together to:</p>
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
          <p>And honestly? The Inner Circle taught us a lot.</p>
          <p>It taught us:</p>
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
          <p>And honestly? That journey shaped the platform into what it is today.</p>
          <p>We realized people did not just want:</p>
          <Bullets items={["another course library", "motivational content", "random resources"]} />
          <p>People wanted:</p>
          <Bullets
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
          <p>So we rebuilt Remote WorkHER around that.</p>
        </Section>

        <Section heading="What Remote WorkHER is today">
          <p>
            Today, Remote WorkHER is an all-in-one career growth ecosystem helping women:
          </p>
          <Bullets items={["land remote jobs", "become freelancers", "build their career brand online"]} />
          <p>through:</p>
          <Bullets
            items={[
              "live implementation workshops",
              "AI tools",
              "guided plans",
              "resources",
              "challenges",
              "courses",
              "templates",
              "expert-led sessions",
              "career support systems",
            ]}
          />
          <p>We are building a platform where women do not just consume information.</p>
          <p>They:</p>
          <Bullets items={["implement", "build", "improve", "grow", "become visible", "create opportunities online"]} />
        </Section>

        <Section heading="What makes Remote WorkHER different">
          <p>We believe people do not just need more information.</p>
          <p>They need:</p>
          <Bullets
            items={["direction", "systems", "implementation", "visibility", "execution", "support", "momentum"]}
          />
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
        </Section>

        <Section heading="The vision">
          <p className="text-[17px] md:text-[19px] font-serif italic text-foreground">
            To help more women access opportunities online and grow professionally in the digital economy.
          </p>
          <p>We want Remote WorkHER to become:</p>
          <Bullets
            items={[
              "a trusted ecosystem",
              "a practical growth platform",
              "a space for visibility and opportunity",
              "a place where women can build careers with support and direction",
            ]}
          />
          <p>Not just another platform people sign up for and abandon.</p>
          <p>But a place that genuinely helps women move forward.</p>
        </Section>

        <Section heading="This is still just the beginning">
          <p>Remote WorkHER is still growing. Still evolving. Still learning.</p>
          <p>But one thing remains constant:</p>
          <p className="font-semibold text-foreground">We care deeply about helping women grow online.</p>
          <p>And we're excited to keep building this journey with you 💻✨</p>
        </Section>

        {/* Closing CTA */}
        <div className="mt-14 md:mt-20 rounded-2xl bg-primary-tint border border-primary-border p-8 md:p-10 text-center">
          <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-3">Welcome to Remote WorkHER</h2>
          <p className="text-[15px] text-muted-foreground max-w-xl mx-auto mb-6">
            A career growth ecosystem for women building careers, visibility, and opportunities online.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/payment"
              className="px-6 py-3 rounded-[10px] text-[14px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark transition-colors"
            >
              Join Remote WorkHER
            </Link>
            <Link
              to="/"
              className="px-6 py-3 rounded-[10px] text-[14px] font-semibold text-foreground bg-card border border-border hover:bg-muted transition-colors"
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

function Section({ heading, children }: { heading?: string; children: React.ReactNode }) {
  return (
    <section className="mb-10 md:mb-14">
      {heading && (
        <h2 className="font-serif text-2xl md:text-3xl text-foreground mb-5">{heading}</h2>
      )}
      <div className="space-y-4 text-[15px] md:text-[16px] leading-relaxed text-foreground/85">
        {children}
      </div>
    </section>
  );
}

function Bullets({ items }: { items: string[] }) {
  return (
    <ul className="space-y-1.5 pl-1">
      {items.map((it) => (
        <li key={it} className="flex gap-2.5">
          <span className="text-primary mt-1.5 w-1.5 h-1.5 rounded-full bg-primary shrink-0" aria-hidden />
          <span>{it}</span>
        </li>
      ))}
    </ul>
  );
}
