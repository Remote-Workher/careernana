import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Download,
  Lock,
  CheckCircle2,
  FileText,
  Sparkles,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { requireSignedIn } from "@/lib/require-signed-in";
import { consumeQuota, usePlanTier, type QuotaResult } from "@/hooks/usePlanTier";
import TierPaywall from "@/components/TierPaywall";
import PremiumUpsellModal from "@/components/PremiumUpsellModal";
import thumbResumeModern from "@/assets/template-resume-modern.jpg";
import thumbResumeProfessional from "@/assets/template-resume-professional.jpg";
import thumbResumeCreative from "@/assets/template-resume-creative.jpg";
import thumbCoverLetter from "@/assets/template-cover-letter.jpg";
import thumbScript from "@/assets/template-script.jpg";
import thumbChecklist from "@/assets/template-checklist.jpg";
import thumbToolkit from "@/assets/template-toolkit.jpg";

type Resource = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  type: string | null;
  format: string | null;
  url: string | null;
  file_url: string | null;
  image_url: string | null;
  price: number | null;
  duration: string | null;
  is_featured: boolean;
};

const FALLBACK_THUMB: Record<string, string> = {
  resume: thumbResumeModern,
  cv: thumbResumeModern,
  cover: thumbCoverLetter,
  script: thumbScript,
  checklist: thumbChecklist,
  toolkit: thumbToolkit,
  guide: thumbResumeProfessional,
  salary: thumbResumeCreative,
};

function pickThumb(r: Resource) {
  if (r.image_url) return r.image_url;
  const c = (r.category || r.type || "").toLowerCase();
  for (const key of Object.keys(FALLBACK_THUMB)) {
    if (c.includes(key)) return FALLBACK_THUMB[key];
  }
  return thumbResumeModern;
}

export default function ResourceDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { signedIn, isPaidActive, tier } = usePlanTier();
  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [paywall, setPaywall] = useState<QuotaResult | null>(null);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("resources")
        .select("*")
        .eq("id", id)
        .eq("is_published", true)
        .maybeSingle();
      setResource((data as Resource) ?? null);
      setLoading(false);
    })();
  }, [id]);

  const downloadUrl = useMemo(
    () => resource?.file_url || resource?.url || null,
    [resource],
  );

  const triggerFileDownload = () => {
    if (!resource) return;
    if (downloadUrl) {
      window.open(downloadUrl, "_blank", "noopener");
      return;
    }
    // Placeholder fallback — same behaviour as Resources page until files are uploaded.
    const safe = resource.title.replace(/[^a-z0-9]+/gi, "-").toLowerCase();
    const blob = new Blob(
      [
        `${resource.title}\n${"=".repeat(resource.title.length)}\n\n` +
          `${resource.description ?? ""}\n\nReplace this content with your details and export as PDF when done.\n`,
      ],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const [showUpsell, setShowUpsell] = useState(false);

  const handleDownload = async () => {
    if (!resource) return;
    const isPaidResource = (resource.price ?? 0) > 0;

    // Premium members: free download.
    if (isPaidActive) {
      setDownloading(true);
      const result = await consumeQuota("resource");
      setDownloading(false);
      if (!result.allowed) {
        setPaywall(result);
        return;
      }
      toast.success(`Unlocked "${resource.title}" — ${result.used}/${result.limit} this month`);
      triggerFileDownload();
      return;
    }

    // Paid resource for non-Premium → show upsell modal first.
    if (isPaidResource) {
      setShowUpsell(true);
      return;
    }

    // Free resource but no membership: prompt sign-in / membership.
    if (!signedIn) {
      const user = await requireSignedIn(navigate, {
        heading: `Unlock "${resource.title}"`,
        subtext: "Join Remote Workher from ₦5,000/month to download every template, guide and toolkit.",
        bullets: [
          "Download this resource the moment you join",
          "Plus every other template, script & checklist",
          "Career guides + Naija salary data",
          "AI tools, job board & community",
        ],
        ctaLabel: "Join & download",
      });
      if (!user) return;
    }
    setPaywall({ allowed: false, reason: "no_membership", tier: tier ?? "free" } as QuotaResult);
  };

  const proceedToBuy = () => {
    if (!resource) return;
    setShowUpsell(false);
    navigate(`/checkout?mode=product&kind=resource&id=${resource.id}`);
  };


  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!resource) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-[15px] font-bold text-foreground mb-2">Resource not found</p>
        <p className="text-[13px] text-muted-foreground mb-5">
          It may have been removed or unpublished.
        </p>
        <Link
          to="/resources"
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[12.5px] font-bold px-4 py-2.5 rounded-full hover:bg-primary-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to resources
        </Link>
      </div>
    );
  }

  const thumb = pickThumb(resource);
  const tags = [resource.type, resource.format, resource.category].filter(Boolean) as string[];
  const isPaidResource = (resource.price ?? 0) > 0;
  const canDownloadFree = isPaidActive; // Premium: free
  const ctaLabel = canDownloadFree
    ? "Download now"
    : isPaidResource
      ? `Buy for ₦${(resource.price ?? 0).toLocaleString()}`
      : !signedIn
        ? "Join to download"
        : "Unlock with membership";

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <button
        onClick={() => navigate("/resources")}
        className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> All resources
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
        {/* Preview */}
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="aspect-[4/3] bg-muted/40 overflow-hidden border-b border-border">
            <img
              src={thumb}
              alt={`${resource.title} preview`}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="p-5">
            <p className="text-[11.5px] font-bold uppercase tracking-[0.12em] text-primary mb-2">
              About this resource
            </p>
            <p className="text-[14px] text-foreground/85 leading-relaxed whitespace-pre-line">
              {resource.description || "A polished, ready-to-use resource from the Remote Workher library."}
            </p>
          </div>
        </div>

        {/* Details + CTA */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6">
            {resource.is_featured && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-primary bg-primary-tint px-2.5 py-1 rounded-full mb-3">
                <Sparkles className="w-3 h-3" /> Featured
              </span>
            )}
            <h1 className="font-serif text-[24px] sm:text-[28px] leading-[1.15] font-semibold text-foreground tracking-tight mb-2">
              {resource.title}
            </h1>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10.5px] font-bold uppercase tracking-wide text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {isPaidResource && !canDownloadFree && (
              <div className="rounded-xl bg-primary-tint/60 border border-primary-border p-3 mb-4">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-1">Price</p>
                <p className="text-[22px] font-extrabold text-foreground leading-none">
                  ₦{(resource.price ?? 0).toLocaleString()}
                </p>
                <p className="text-[11.5px] text-muted-foreground mt-1.5">
                  Or download free with Remote Workher Premium.
                </p>
              </div>
            )}

            <ul className="space-y-2.5 mb-5">
              <li className="flex items-start gap-2 text-[13px] text-foreground/85">
                <FileText className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  {resource.format
                    ? `${resource.format} format — ready to edit`
                    : "Editable template — open and personalise in minutes"}
                </span>
              </li>
              <li className="flex items-start gap-2 text-[13px] text-foreground/85">
                <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                <span>Used by Remote Workher members landing real roles</span>
              </li>
              <li className="flex items-start gap-2 text-[13px] text-foreground/85">
                <Download className="w-4 h-4 text-foreground/70 shrink-0 mt-0.5" />
                <span>Instant download after unlock</span>
              </li>
            </ul>

            <Button
              onClick={handleDownload}
              disabled={downloading}
              className="w-full h-12 rounded-xl gradient-primary text-primary-foreground text-[14px] font-bold disabled:opacity-60"
            >
              {downloading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : canDownloadFree ? (
                <span className="inline-flex items-center gap-2">
                  <Download className="w-4 h-4" /> {ctaLabel}
                </span>
              ) : (
                <span className="inline-flex items-center gap-2">
                  <Lock className="w-4 h-4" /> {ctaLabel}
                </span>
              )}
            </Button>

            {!canDownloadFree && (
              <p className="text-[11.5px] text-muted-foreground text-center mt-3 leading-snug">
                {isPaidResource
                  ? "Premium members download every resource for free."
                  : signedIn
                    ? `You're on the ${tier} plan — upgrade to download templates.`
                    : "Membership starts at ₦5,000/month. Cancel anytime."}
              </p>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <p className="text-[12px] font-bold tracking-[0.12em] uppercase text-muted-foreground mb-3">
              What's inside
            </p>
            <p className="text-[12.5px] text-foreground/80 leading-relaxed">
              Hand-picked by the Remote Workher team. Built for the African job market — clear, ATS-friendly, and easy to make your own.
            </p>
          </div>
        </aside>
      </div>

      <TierPaywall open={!!paywall} onClose={() => setPaywall(null)} result={paywall} kind="resource" />
      <PremiumUpsellModal
        open={showUpsell}
        onClose={() => setShowUpsell(false)}
        onContinueWithPurchase={proceedToBuy}
        itemTitle={resource?.title ?? ""}
        itemPrice={resource?.price ?? 0}
        kind="resource"
      />
    </div>
  );
}
