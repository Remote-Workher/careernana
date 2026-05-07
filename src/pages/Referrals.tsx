import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Copy, Check, Gift, Coins, Users, Sparkles, Share2 } from "lucide-react";

type Referral = {
  id: string;
  plan_tier: "standard" | "premium";
  coins_awarded: number;
  paid_amount_naira: number;
  created_at: string;
};

export default function Referrals() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const [{ data: prof }, { data: refs }] = await Promise.all([
        supabase.from("profiles").select("referral_code").eq("user_id", user.id).maybeSingle(),
        supabase.from("referrals" as any).select("id, plan_tier, coins_awarded, paid_amount_naira, created_at")
          .eq("referrer_user_id", user.id).order("created_at", { ascending: false }),
      ]);
      setCode((prof as any)?.referral_code ?? null);
      setReferrals((refs as any) ?? []);
      setLoading(false);
    })();
  }, [navigate]);

  // Always use the public domain for shared referral links — never the
  // preview/sandbox URL the user might be browsing on.
  const PUBLIC_DOMAIN = "https://remoteworkher.com";
  const link = code ? `${PUBLIC_DOMAIN}/?ref=${code}` : "";

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success("Link copied");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Couldn't copy — try selecting and copying manually.");
    }
  };

  const share = async () => {
    if (!link) return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join Remote Workher",
          text: "Land your first remote role with Remote Workher — use my code to get started.",
          url: link,
        });
      } catch {}
    } else {
      copy();
    }
  };

  const totalCoins = referrals.reduce((s, r) => s + r.coins_awarded, 0);

  return (
    <div className="w-full animate-fade-in">
      <div className="mb-6">
        <p className="eyebrow mb-2">Refer & earn</p>
        <h1 className="headline text-[28px] md:text-[36px] text-foreground leading-[1.1]">
          Share Remote Workher, <em>earn AI coins</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-[560px]">
          Every friend who joins with your code earns you bonus coins. Standard signup → <strong>50 coins</strong>. Premium signup → <strong>200 coins</strong>.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Users className="w-4 h-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Friends joined</p>
          </div>
          <p className="text-[26px] font-extrabold text-foreground tabular-nums">{referrals.length}</p>
        </div>
        <div className="bg-card border border-border rounded-2xl p-4 shadow-card">
          <div className="flex items-center gap-2 mb-1">
            <Coins className="w-4 h-4 text-primary" />
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Coins earned</p>
          </div>
          <p className="text-[26px] font-extrabold text-foreground tabular-nums">{totalCoins}</p>
        </div>
      </div>

      {/* Code card */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card mb-5">
        <div className="flex items-center gap-2 mb-3">
          <Gift className="w-4 h-4 text-primary" />
          <h2 className="text-[15px] font-extrabold text-foreground">Your referral link</h2>
        </div>
        {loading ? (
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        ) : !code ? (
          <p className="text-[13px] text-muted-foreground">Generating your code…</p>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <code className="px-3 py-2 rounded-lg bg-muted text-foreground text-[14px] font-bold tracking-wider">{code}</code>
              <span className="text-[11.5px] text-muted-foreground">your unique code</span>
            </div>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-muted/50 border border-border mb-3">
              <span className="flex-1 text-[12.5px] text-foreground truncate font-mono">{link}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button onClick={copy} className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground text-[13px] font-bold px-4 py-2.5 rounded-full hover:bg-primary-dark transition-colors">
                {copied ? <><Check className="w-4 h-4" /> Copied</> : <><Copy className="w-4 h-4" /> Copy link</>}
              </button>
              <button onClick={share} className="inline-flex items-center gap-1.5 bg-card border border-border text-foreground text-[13px] font-bold px-4 py-2.5 rounded-full hover:border-primary transition-colors">
                <Share2 className="w-4 h-4" /> Share
              </button>
            </div>
          </>
        )}
      </div>

      {/* How it works */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card mb-5">
        <h2 className="text-[15px] font-extrabold text-foreground mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-primary" /> How it works
        </h2>
        <ol className="space-y-2.5 text-[13px] text-foreground">
          <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-primary-tint text-primary font-bold text-[12px] flex items-center justify-center shrink-0">1</span> Share your link with friends starting their remote career.</li>
          <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-primary-tint text-primary font-bold text-[12px] flex items-center justify-center shrink-0">2</span> They sign up using your link and pay for membership.</li>
          <li className="flex gap-3"><span className="w-6 h-6 rounded-full bg-primary-tint text-primary font-bold text-[12px] flex items-center justify-center shrink-0">3</span> You instantly earn <strong>50 coins</strong> for Standard (₦5k) or <strong>200 coins</strong> for Premium (₦20k).</li>
        </ol>
      </div>

      {/* History */}
      <div className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <h2 className="text-[15px] font-extrabold text-foreground mb-3">Referral history</h2>
        {referrals.length === 0 ? (
          <div className="text-center py-6 text-[12.5px] text-muted-foreground">
            No referrals yet. Share your link to start earning.
          </div>
        ) : (
          <div className="divide-y divide-border">
            {referrals.map(r => (
              <div key={r.id} className="py-3 flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-[13.5px] font-bold text-foreground capitalize">{r.plan_tier} referral</p>
                  <p className="text-[11.5px] text-muted-foreground">
                    {new Date(r.created_at).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-primary-tint text-primary text-[12px] font-bold">
                  <Coins className="w-3.5 h-3.5" /> +{r.coins_awarded}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
