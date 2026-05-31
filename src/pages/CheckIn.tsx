import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CheckCircle2, Heart } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/components/SEO";
import SiteFooter from "@/components/SiteFooter";
import PhoneInput from "@/components/PhoneInput";
import logo from "@/assets/logo.svg";

const TIME_OPTIONS = [
  "Weekday mornings (9am – 12pm)",
  "Weekday afternoons (12pm – 4pm)",
  "Weekday evenings (4pm – 7pm)",
  "Weekends",
  "Anytime — just call me",
];

const schema = z.object({
  full_name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.string().trim().email("Please enter a valid email").max(255),
  phone: z.string().trim().min(7, "Please enter a valid phone number").max(40),
  best_time: z.string().min(1, "Pick a time that works for you"),
  note: z.string().trim().max(500).optional().or(z.literal("")),
});

export default function CheckIn() {
  useSEO({
    title: "Let's chat — Remote Workher",
    description:
      "Adeife would love a quick call to hear how your Remote Workher experience is going. Drop your number and the best time to reach you.",
  });

  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [bestTime, setBestTime] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return;
      if (!email) setEmail(u.email ?? "");
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", u.id)
        .maybeSingle();
      if (profile?.full_name && !fullName) setFullName(profile.full_name);
      if (profile?.phone && !phone) setPhone(profile.phone);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const parsed = schema.safeParse({ full_name: fullName, email, phone, best_time: bestTime, note });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Please check your details");
      return;
    }
    setSubmitting(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const { error: insertErr } = await supabase.from("member_checkins").insert({
        user_id: userData.user?.id ?? null,
        full_name: parsed.data.full_name,
        email: parsed.data.email.toLowerCase(),
        phone: parsed.data.phone,
        best_time: parsed.data.best_time,
        note: parsed.data.note || null,
      });
      if (insertErr) throw insertErr;
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans flex flex-col">
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-5 md:px-8 h-[58px] flex items-center justify-between">
          <Link to="/" className="flex items-end gap-2 h-7">
            <img src={logo} alt="Remote Workher" className="h-7 w-auto" />
          </Link>
          <Link to="/" className="text-[13px] text-muted-foreground hover:text-foreground">
            Home
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-5 md:px-8 py-10 md:py-16">
        {done ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-primary-tint text-primary mb-5">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
              Thank you — we've got it.
            </h1>
            <p className="text-[15px] text-muted-foreground max-w-md mx-auto leading-relaxed">
              Adeife will reach out at the time you picked. If anything changes, just reply to the email she sent you.
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-8 px-5 py-2.5 rounded-[9px] text-[13px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark transition-colors"
            >
              Back to Remote Workher
            </button>
          </div>
        ) : (
          <>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-tint text-primary text-[11px] font-bold tracking-[1.2px] uppercase border border-primary-border mb-5">
              <Heart className="w-3 h-3 fill-current" /> A note from Adeife
            </div>
            <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-4 leading-tight">
              I'd love to hear how it's going.
            </h1>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-8">
              Hey 👋 — Adeife here, founder of Remote Workher. I want to personally check in,
              hear what's working, what's not, and how we can actually help you land the role.
              Drop your number and the best time to call, and I'll reach out.
            </p>

            <form onSubmit={handleSubmit} className="space-y-5 bg-card border border-border rounded-2xl p-5 md:p-7">
              <div>
                <label className="block text-[12.5px] font-semibold text-foreground mb-1.5">Your name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={120}
                  placeholder="Adunni Okafor"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-foreground mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  placeholder="you@email.com"
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:outline-none focus:border-primary"
                  required
                />
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-foreground mb-1.5">Phone number</label>
                <PhoneInput value={phone} onChange={setPhone} />
                <p className="text-[11.5px] text-muted-foreground mt-1.5">
                  WhatsApp works too — we'll only use this to call you about your experience.
                </p>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-foreground mb-1.5">Best time to call</label>
                <div className="grid gap-1.5">
                  {TIME_OPTIONS.map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer text-[13px] transition-colors ${
                        bestTime === opt
                          ? "border-primary bg-primary-tint/40 text-foreground"
                          : "border-border bg-background hover:bg-muted/40 text-foreground"
                      }`}
                    >
                      <input
                        type="radio"
                        name="best_time"
                        value={opt}
                        checked={bestTime === opt}
                        onChange={() => setBestTime(opt)}
                        className="accent-primary"
                      />
                      <span>{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-foreground mb-1.5">
                  Anything you want Adeife to know? <span className="text-muted-foreground font-normal">(optional)</span>
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={500}
                  rows={3}
                  placeholder="Stuck on something? Loving something? Tell me."
                  className="w-full px-3 py-2.5 text-[13px] rounded-lg border border-border bg-background focus:outline-none focus:border-primary resize-none"
                />
              </div>

              {error && (
                <p className="text-[12.5px] text-destructive bg-destructive/10 border border-destructive/30 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full px-5 py-3 rounded-[10px] text-[14px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark transition-colors disabled:opacity-60"
              >
                {submitting ? "Sending…" : "Send my details to Adeife"}
              </button>
            </form>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
