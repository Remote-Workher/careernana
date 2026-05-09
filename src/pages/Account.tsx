import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { openUpgradeModal } from "@/lib/upgrade-modal";
import { openCoinsModal } from "@/lib/coins-modal";
import { supabase } from "@/integrations/supabase/client";
import { performLogout } from "@/lib/logout";
import { fetchTrackedApplications } from "@/lib/tracked-applications";
import { toast } from "sonner";
import {
  ArrowRight, Check, Coins, CreditCard, LogOut, ShieldCheck,
  Sparkles, User as UserIcon, Calendar, Receipt, Loader2, Download,
  Briefcase, Trophy, ExternalLink, Camera,
} from "lucide-react";
import jsPDF from "jspdf";
import VettedTalentCard from "@/components/VettedTalentCard";
import { useSEO } from "@/components/SEO";


type PlanTier = "free" | "standard" | "premium";

type ProfileRow = {
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  plan_tier: PlanTier;
  paid_until: string | null;
  tokens_remaining: number | null;
};

type PaymentRow = {
  id: string;
  source: "membership" | "product";
  amount_naira: number;
  currency: string;
  plan_tier: PlanTier | null;
  period: string | null;
  paid_until: string | null;
  status: string;
  created_at: string;
  paystack_reference: string | null;
  purpose: string;
  metadata: any;
};

type ApplicationRow = {
  id: string;
  job_title: string;
  company: string;
  status: string;
  applied_date: string | null;
  created_at: string;
  location: string | null;
};

type BragRow = {
  id: string;
  title: string | null;
  raw_text: string;
  polished_text: string | null;
  category: string;
  company: string | null;
  strength_score: number | null;
  created_at: string;
};

const PLAN_LABEL: Record<PlanTier, string> = {
  free: "Free",
  standard: "Standard",
  premium: "Premium",
};

const PLAN_BADGE: Record<PlanTier, string> = {
  free: "bg-muted text-foreground/70 border-border",
  standard: "bg-primary-tint text-primary border-primary/30",
  premium: "bg-foreground text-background border-foreground",
};

export default function Account() {
  useSEO({ title: "My Account" });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string>("");
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [applications, setApplications] = useState<ApplicationRow[]>([]);
  const [brags, setBrags] = useState<BragRow[]>([]);
  const [signingOut, setSigningOut] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const handleAvatarUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Photo must be under 5MB");
      return;
    }
    setUploadingAvatar(true);
    try {
      // Always pull a fresh user id from the active session so the
      // storage policy (auth.uid() = foldername[1]) sees the right value.
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id || userId;
      if (!uid) {
        toast.error("Please sign in again to upload a photo");
        return;
      }
      const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
      const path = `${uid}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, cacheControl: "3600", contentType: file.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = pub.publicUrl;
      const { error: dbErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("user_id", uid);
      if (dbErr) throw dbErr;
      setProfile((p) => (p ? { ...p, avatar_url: url } : p));
      toast.success("Profile photo updated");
    } catch (e: any) {
      toast.error(e.message || "Could not upload photo");
    } finally {
      setUploadingAvatar(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        navigate("/login", { replace: true });
        return;
      }
      setEmail(user.email ?? "");
      setUserId(user.id);

      const [{ data: prof }, { data: pays }, { data: prods }, apps, { data: bragData }] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, avatar_url, plan_tier, paid_until, tokens_remaining")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("talent_payments")
          .select("id, amount_naira, currency, plan_tier, period, paid_until, status, created_at, paystack_reference, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("product_purchases")
          .select("id, kind, product_title, amount_naira, currency, status, created_at, paystack_reference, metadata")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        fetchTrackedApplications(user.id, 5),
        supabase
          .from("brag_entries")
          .select("id, title, raw_text, polished_text, category, company, strength_score, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      if (cancelled) return;
      setProfile(prof as ProfileRow | null);
      const memberships: PaymentRow[] = (pays ?? []).map((p: any) => ({
        id: p.id,
        source: "membership",
        amount_naira: p.amount_naira,
        currency: p.currency,
        plan_tier: p.plan_tier,
        period: p.period,
        paid_until: p.paid_until,
        status: p.status,
        created_at: p.created_at,
        paystack_reference: p.paystack_reference,
        purpose: `${PLAN_LABEL[p.plan_tier as PlanTier] ?? p.plan_tier} membership · ${p.period}`,
        metadata: p.metadata,
      }));
      const products: PaymentRow[] = (prods ?? []).map((p: any) => ({
        id: p.id,
        source: "product",
        amount_naira: p.amount_naira,
        currency: p.currency,
        plan_tier: null,
        period: null,
        paid_until: null,
        status: p.status,
        created_at: p.created_at,
        paystack_reference: p.paystack_reference,
        purpose: `${p.kind === "course" ? "Course" : "Resource"}${p.product_title ? ` · ${p.product_title}` : ""}`,
        metadata: p.metadata,
      }));
      const merged = [...memberships, ...products].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setPayments(merged);
      setApplications((apps ?? []) as ApplicationRow[]);
      setBrags((bragData ?? []) as BragRow[]);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const handleSignOut = async () => {
    setSigningOut(true);
    toast.success("Signed out");
    await performLogout();
  };

  const downloadReceipt = (p: PaymentRow) => {
    try {
      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 48;
      let y = margin;

      // Brand header
      doc.setFillColor(224, 72, 122); // Primary pink
      doc.rect(0, 0, pageWidth, 8, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(26, 26, 26);
      y += 32;
      doc.text("Remote Workher", margin, y);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(113, 113, 113);
      y += 14;
      doc.text("Payment receipt", margin, y);

      // Receipt meta block (right aligned)
      doc.setFontSize(9);
      const issued = new Date(p.created_at).toLocaleDateString("en-NG", {
        day: "numeric", month: "short", year: "numeric",
      });
      doc.text(`Receipt #: ${p.id.slice(0, 8).toUpperCase()}`, pageWidth - margin, margin + 32, { align: "right" });
      doc.text(`Issued: ${issued}`, pageWidth - margin, margin + 46, { align: "right" });
      doc.text(`Status: ${p.status.toUpperCase()}`, pageWidth - margin, margin + 60, { align: "right" });

      // Billed to
      y += 36;
      doc.setDrawColor(235, 230, 226);
      doc.line(margin, y, pageWidth - margin, y);
      y += 24;

      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(113, 113, 113);
      doc.text("BILLED TO", margin, y);
      y += 14;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 26);
      doc.text(profile?.full_name || "Member", margin, y);
      y += 14;
      doc.setTextColor(113, 113, 113);
      doc.setFontSize(10);
      doc.text(email || "—", margin, y);

      // Line item table
      y += 36;
      doc.setDrawColor(235, 230, 226);
      doc.setFillColor(248, 245, 242);
      doc.rect(margin, y, pageWidth - margin * 2, 28, "F");
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(113, 113, 113);
      doc.text("DESCRIPTION", margin + 12, y + 18);
      doc.text("PERIOD", margin + 260, y + 18);
      doc.text("AMOUNT", pageWidth - margin - 12, y + 18, { align: "right" });
      y += 28;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 26);
      const rowH = 36;
      const planName = p.metadata?.plan_name || p.purpose;
      const paidUntil = p.paid_until
        ? new Date(p.paid_until).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })
        : "One-time";
      doc.text(planName, margin + 12, y + 22);
      doc.setFontSize(9);
      doc.setTextColor(113, 113, 113);
      doc.text(p.paid_until ? `Access through ${paidUntil}` : "One-time purchase", margin + 12, y + 34);
      doc.setFontSize(11);
      doc.setTextColor(26, 26, 26);
      doc.text(p.period ?? "—", margin + 260, y + 22);
      doc.text(
        `${p.currency === "NGN" || !p.currency ? "NGN " : p.currency + " "}${p.amount_naira.toLocaleString()}`,
        pageWidth - margin - 12, y + 22, { align: "right" }
      );
      y += rowH + 16;

      doc.setDrawColor(235, 230, 226);
      doc.line(margin, y, pageWidth - margin, y);
      y += 22;

      // Total
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(113, 113, 113);
      doc.text("TOTAL PAID", margin, y);
      doc.setFontSize(16);
      doc.setTextColor(26, 26, 26);
      doc.text(
        `NGN ${p.amount_naira.toLocaleString()}`,
        pageWidth - margin, y + 4, { align: "right" }
      );

      // Credit applied (if present)
      const credit = Number(p.metadata?.credit_applied ?? 0);
      if (credit > 0) {
        y += 22;
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(113, 113, 113);
        doc.text(
          `Includes credit applied: NGN ${credit.toLocaleString()}`,
          pageWidth - margin, y, { align: "right" }
        );
      }

      // Footer
      const footerY = doc.internal.pageSize.getHeight() - margin;
      doc.setDrawColor(235, 230, 226);
      doc.line(margin, footerY - 32, pageWidth - margin, footerY - 32);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(113, 113, 113);
      doc.text(
        "Thank you for being a member of Remote Workher — keep building, sis. 💪🏾",
        margin, footerY - 14
      );
      doc.text("This receipt was generated automatically and is valid without a signature.", margin, footerY);

      const filename = `RemoteWorkher-Receipt-${issued.replace(/\s+/g, "-")}-${p.id.slice(0, 6)}.pdf`;
      doc.save(filename);
      toast.success("Receipt downloaded");
    } catch (e) {
      console.error("Failed to generate receipt", e);
      toast.error("Could not generate receipt. Please try again.");
    }
  };

  const planTier: PlanTier = profile?.plan_tier ?? "free";
  const isActive =
    planTier !== "free" &&
    !!profile?.paid_until &&
    new Date(profile.paid_until) > new Date();
  const renewalDate = profile?.paid_until
    ? new Date(profile.paid_until).toLocaleDateString("en-NG", {
        day: "numeric", month: "short", year: "numeric",
      })
    : null;

  if (loading) {
    return (
      <div className="w-full flex items-center justify-center py-24 text-muted-foreground">
        <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading your account...
      </div>
    );
  }

  return (
    <div className="w-full animate-fade-in">
      {/* Header */}
      <div className="mb-6">
        <p className="eyebrow">My account</p>
        <h1 className="headline text-[26px] sm:text-[32px] text-foreground mt-1">
          Profile, plan & billing
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">
          Manage your Remote Workher membership, see your coin balance, and review past payments.
        </p>
      </div>

      {/* Profile card */}
      <section className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-card">
        <div className="flex items-start gap-4">
          <label className="relative shrink-0 cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-primary-tint border border-primary/20 flex items-center justify-center text-primary text-[20px] font-extrabold overflow-hidden">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <>{profile?.full_name?.[0]?.toUpperCase() || email[0]?.toUpperCase() || <UserIcon className="w-6 h-6" />}</>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary border-2 border-card flex items-center justify-center shadow-sm">
              {uploadingAvatar ? (
                <Loader2 className="w-3 h-3 text-white animate-spin" />
              ) : (
                <Camera className="w-3 h-3 text-white" />
              )}
            </div>
            <input
              type="file"
              accept="image/png,image/jpeg,image/jpg,image/webp"
              className="hidden"
              disabled={uploadingAvatar}
              onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
            />
          </label>
          <div className="min-w-0 flex-1">
            <p className="text-[16px] font-extrabold text-foreground truncate">
              {profile?.full_name || "Your profile"}
            </p>
            <p className="text-[12.5px] text-muted-foreground truncate">{email}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <label className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary hover:underline cursor-pointer">
                {uploadingAvatar ? "Uploading…" : "Change photo"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  className="hidden"
                  disabled={uploadingAvatar}
                  onChange={(e) => e.target.files?.[0] && handleAvatarUpload(e.target.files[0])}
                />
              </label>
              <button
                onClick={() => navigate("/profile/setup")}
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-primary hover:underline"
              >
                Edit profile <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      <VettedTalentCard />
      <section className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-card">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p className="eyebrow">Membership</p>
            <h2 className="text-[18px] font-extrabold text-foreground mt-0.5">
              {PLAN_LABEL[planTier]} plan
            </h2>
          </div>
          <span className={`pill text-[11px] border ${PLAN_BADGE[planTier]}`}>
            {isActive ? "Active" : planTier === "free" ? "No membership" : "Expired"}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="rounded-xl border border-border bg-background/40 p-3.5">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground mb-1.5">
              <Calendar className="w-3.5 h-3.5" /> Renews
            </div>
            <p className="text-[13.5px] font-bold text-foreground">
              {renewalDate ?? "—"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3.5">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground mb-1.5">
              <Coins className="w-3.5 h-3.5" /> AI coins
            </div>
            <p className="text-[13.5px] font-bold text-foreground">
              {profile?.tokens_remaining ?? 0} <span className="text-muted-foreground font-normal text-[11.5px]">remaining</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/40 p-3.5">
            <div className="flex items-center gap-1.5 text-[10.5px] uppercase tracking-[0.12em] font-semibold text-muted-foreground mb-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Status
            </div>
            <p className="text-[13.5px] font-bold text-foreground">
              {isActive ? "All access" : "Limited"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
          {planTier === "free" || !isActive ? (
            <button
              onClick={() => openUpgradeModal()}
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
            >
              <Sparkles className="w-4 h-4" /> Choose a plan
            </button>
          ) : planTier === "standard" ? (
            <>
              <button
                onClick={() => openUpgradeModal({ planId: "pro" })}
                className="inline-flex items-center gap-2 bg-foreground text-background text-[13px] font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
              >
                <ArrowRight className="w-4 h-4" /> Upgrade to Premium
              </button>
              <button
                onClick={() => openUpgradeModal({ planId: "starter", heading: "Renew Standard" })}
                className="inline-flex items-center gap-2 bg-card border border-border text-foreground text-[13px] font-bold px-4 py-2.5 rounded-full hover:border-primary transition-colors"
              >
                Renew / extend
              </button>
            </>
          ) : (
            <button
              onClick={() => openUpgradeModal({ planId: "pro", heading: "Renew Premium" })}
              className="inline-flex items-center gap-2 bg-card border border-border text-foreground text-[13px] font-bold px-4 py-2.5 rounded-full hover:border-primary transition-colors"
            >
              <ArrowRight className="w-4 h-4" /> Renew Premium
            </button>
          )}
          <button
            onClick={() => navigate("/payment")}
            className="inline-flex items-center gap-2 text-[13px] font-bold text-muted-foreground hover:text-foreground px-3 py-2.5"
          >
            See all plans
          </button>
        </div>
      </section>

      {/* AI Coins card */}
      <section id="coins" className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-card scroll-mt-24">
        <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
          <div>
            <p className="eyebrow">AI Coins</p>
            <h2 className="text-[18px] font-extrabold text-foreground mt-0.5">Your coin balance</h2>
            <p className="text-[12.5px] text-muted-foreground mt-1">
              Coins power your AI tools — resume, cover letter, interview prep & more.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-3 py-2 rounded-full bg-primary-tint border border-primary/20">
            <Coins className="w-4 h-4 text-primary" />
            <span className="text-[15px] font-extrabold text-primary tabular-nums">
              {profile?.tokens_remaining ?? 0}
            </span>
            <span className="text-[11px] font-semibold text-primary/80">coins</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <button
            onClick={() => openCoinsModal()}
            className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[13px] font-bold px-4 py-2.5 rounded-full hover:opacity-90 transition-opacity"
          >
            <Sparkles className="w-4 h-4" /> Buy more coins
          </button>
          <button
            onClick={() => navigate("/tools")}
            className="inline-flex items-center gap-2 text-[13px] font-bold text-muted-foreground hover:text-foreground px-3 py-2.5"
          >
            See AI tools
          </button>
        </div>
      </section>

      {/* Payment history */}
      <section className="bg-card border border-border rounded-2xl p-5 mb-5 shadow-card">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            <h2 className="text-[15px] font-extrabold text-foreground">Payment history</h2>
          </div>
          <span className="text-[11.5px] text-muted-foreground font-mono">
            {payments.length} {payments.length === 1 ? "receipt" : "receipts"}
          </span>
        </div>

        {payments.length === 0 ? (
          <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-background/30">
            <CreditCard className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
            <p className="text-[13px] font-bold text-foreground mb-1">No payments yet</p>
            <p className="text-[12px] text-muted-foreground">
              When you subscribe, your receipts will appear here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {payments.map((p) => {
              const isSuccess = ["paid", "success", "succeeded"].includes((p.status || "").toLowerCase());
              const isFailed = ["failed", "error", "cancelled", "canceled"].includes((p.status || "").toLowerCase());
              const statusClass = isSuccess
                ? "bg-success/10 text-success border-success/30"
                : isFailed
                ? "bg-destructive/10 text-destructive border-destructive/30"
                : "bg-muted text-muted-foreground border-border";
              return (
                <div key={p.id} className="py-3.5 flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-[13.5px] font-bold text-foreground">{p.purpose}</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5">
                      {new Date(p.created_at).toLocaleDateString("en-NG", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                      {p.paid_until && (
                        <> · paid until {new Date(p.paid_until).toLocaleDateString("en-NG", {
                          day: "numeric", month: "short", year: "numeric",
                        })}</>
                      )}
                    </p>
                    {p.paystack_reference && (
                      <p className="text-[10.5px] text-muted-foreground/80 mt-0.5 font-mono break-all">
                        Ref: {p.paystack_reference}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-[13.5px] font-extrabold text-foreground">
                      ₦{p.amount_naira.toLocaleString()}
                    </span>
                    <span className={`pill text-[10.5px] inline-flex items-center gap-1 border ${statusClass}`}>
                      {isSuccess && <Check className="w-3 h-3" />} {p.status}
                    </span>
                    {isSuccess && (
                      <button
                        onClick={() => downloadReceipt(p)}
                        aria-label="Download receipt as PDF"
                        title="Download receipt"
                        className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-primary border border-primary/30 hover:bg-primary-tint px-2.5 py-1.5 rounded-full transition-colors"
                      >
                        <Download className="w-3 h-3" /> PDF
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Recent activity: Applications + Wins side-by-side on wide screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {/* Recent applications */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />
              <h2 className="text-[15px] font-extrabold text-foreground">Recent applications</h2>
            </div>
            <button
              onClick={() => navigate("/applications")}
              className="text-[11.5px] font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {applications.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-background/30">
              <Briefcase className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-[13px] font-bold text-foreground mb-1">No applications yet</p>
              <button
                onClick={() => navigate("/jobs")}
                className="text-[12px] text-primary font-bold hover:underline"
              >
                Browse jobs →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {applications.map((a) => (
                <button
                  key={a.id}
                  onClick={() => navigate("/applications")}
                  className="w-full text-left py-3 flex items-center justify-between gap-3 hover:bg-background/40 -mx-2 px-2 rounded-lg transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-bold text-foreground truncate">{a.job_title}</p>
                    <p className="text-[11.5px] text-muted-foreground truncate">
                      {a.company}{a.location ? ` · ${a.location}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="pill text-[10.5px] capitalize bg-primary-tint text-primary border border-primary/30">
                      {a.status}
                    </span>
                    <ExternalLink className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </section>

        {/* Recent wins */}
        <section className="bg-card border border-border rounded-2xl p-5 shadow-card">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" />
              <h2 className="text-[15px] font-extrabold text-foreground">Recent wins</h2>
            </div>
            <button
              onClick={() => navigate("/brag-file")}
              className="text-[11.5px] font-bold text-primary hover:underline inline-flex items-center gap-1"
            >
              View all <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {brags.length === 0 ? (
            <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-background/30">
              <Trophy className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-[13px] font-bold text-foreground mb-1">No wins logged yet</p>
              <button
                onClick={() => navigate("/brag-file")}
                className="text-[12px] text-primary font-bold hover:underline"
              >
                Log your first win →
              </button>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {brags.map((b) => {
                const text = b.polished_text || b.raw_text;
                return (
                  <button
                    key={b.id}
                    onClick={() => navigate("/brag-file")}
                    className="w-full text-left py-3 hover:bg-background/40 -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="pill text-[10.5px] capitalize bg-primary-tint text-primary border border-primary/30">
                        {b.category}
                      </span>
                      {b.strength_score != null && b.strength_score > 0 && (
                        <span className="text-[10.5px] font-bold text-success">💪 {b.strength_score}</span>
                      )}
                    </div>
                    {b.company && (
                      <p className="text-[11px] text-muted-foreground mb-0.5">{b.company}</p>
                    )}
                    <p className="text-[12.5px] text-foreground line-clamp-2 leading-relaxed">
                      {text}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Sign out */}
      <section className="bg-card border border-border rounded-2xl p-5 shadow-card">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[13.5px] font-bold text-foreground">Sign out</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">
              You'll be returned to the homepage.
            </p>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-2 bg-card border border-border text-foreground text-[12.5px] font-bold px-3.5 py-2 rounded-full hover:border-destructive hover:text-destructive transition-colors disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <LogOut className="w-3.5 h-3.5" />}
            Sign out
          </button>
        </div>
      </section>
    </div>
  );
}
