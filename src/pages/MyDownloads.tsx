import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Download, ExternalLink, Loader2, ArrowLeft, CheckCircle2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlanTier } from "@/hooks/usePlanTier";
import MyPurchases from "@/pages/MyPurchases";
import { useSEO } from "@/components/SEO";
import { toast } from "sonner";

async function forceDownload(url: string, filename: string) {
  try {
    const res = await fetch(url, { mode: "cors" });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    toast.success("Download started");
  } catch {
    // Fallback — open in new tab so user can long-press / use browser menu to save
    window.open(url, "_blank", "noopener");
    toast.message("Opened in a new tab — tap and hold, then 'Save' to download.");
  }
}

function filenameFor(title: string, url: string) {
  const slug = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "") || "resource";
  const m = url.split("?")[0].match(/\.([a-z0-9]{2,5})$/i);
  return m ? `${slug}.${m[1].toLowerCase()}` : slug;
}


type UnlockRow = {
  id: string;
  resource_id: string;
  unlocked_at: string;
};

type ResourceMeta = {
  id: string;
  title: string;
  url?: string | null;
  file_url?: string | null;
  image_url?: string | null;
  format?: string | null;
};

export default function MyDownloads() {
  useSEO({ title: "My Downloads" });
  const navigate = useNavigate();
  const { loading: tierLoading, signedIn, tier, isPaidActive } = usePlanTier();
  const [loading, setLoading] = useState(true);
  const [unlocks, setUnlocks] = useState<UnlockRow[]>([]);
  const [resources, setResources] = useState<Record<string, ResourceMeta>>({});
  const [monthCount, setMonthCount] = useState(0);

  const isPremium = tier === "premium" && isPaidActive;
  const isStandard = tier === "standard" && isPaidActive;
  const isMember = isPremium || isStandard;
  const monthlyLimit = isPremium ? 5 : 2;

  useEffect(() => {
    if (tierLoading) return;
    if (!signedIn || !isMember) {
      setLoading(false);
      return;
    }
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const period = new Date();
      period.setDate(1);
      period.setHours(0, 0, 0, 0);

      const { data: unlockRows } = await supabase
        .from("resource_unlocks" as any)
        .select("id, resource_id, unlocked_at")
        .eq("user_id", user.id)
        .eq("kind", "resource")
        .gte("unlocked_at", period.toISOString())
        .order("unlocked_at", { ascending: false });

      const list = (unlockRows ?? []) as unknown as UnlockRow[];
      setUnlocks(list);
      setMonthCount(list.length);

      const ids = [...new Set(list.map((u) => u.resource_id))];
      if (ids.length > 0) {
        const { data: resRows } = await supabase
          .from("resources")
          .select("id,title,url,file_url,image_url,format")
          .in("id", ids);
        const map: Record<string, ResourceMeta> = {};
        (resRows ?? []).forEach((r: any) => {
          map[r.id] = r as ResourceMeta;
        });
        setResources(map);
      }

      setLoading(false);
    })();
  }, [tierLoading, signedIn, isMember]);

  if (!tierLoading && signedIn && !isMember) {
    return <MyPurchases />;
  }

  if (tierLoading || loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-[15px] font-bold text-foreground mb-2">Sign in to view your library</p>
        <button
          onClick={() => navigate("/login?next=/my-purchases")}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[12.5px] font-bold px-4 py-2.5 rounded-full hover:bg-primary-dark transition-colors mt-3"
        >
          Sign in
        </button>
      </div>
    );
  }

  return (
    <div className="font-sans w-full animate-fade-in">
      <div className="mb-6">
        <Link
          to="/resources"
          className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-muted-foreground hover:text-foreground mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Browse resources
        </Link>
        <p className="eyebrow mb-2">Your library</p>
        <h1 className="headline text-[28px] md:text-[32px] text-foreground leading-[1.1]">
          My <em>downloads</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-[520px]">
          Every resource you've unlocked this month — re-download anytime, no extra slot used.
        </p>

        <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-primary-tint px-3 py-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11.5px] font-bold text-primary">
            {monthCount}/{monthlyLimit} resources used this month
          </span>
        </div>
      </div>

      {unlocks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
            <Download className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-[18px] font-serif text-foreground tracking-[-0.01em]">
            Nothing downloaded <em>yet this month</em>
          </h3>
          <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
            You get 3 free downloads per month as a Premium member. Pick one to get started.
          </p>
          <Link
            to="/resources"
            className="inline-flex items-center gap-2 mt-5 bg-primary text-primary-foreground text-[12.5px] font-bold px-4 py-2.5 rounded-full hover:bg-primary-dark transition-colors"
          >
            Browse resources
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {unlocks.map((u, idx) => {
            const meta = resources[u.resource_id];
            const title = meta?.title || "Resource";
            const downloadUrl = meta?.file_url || meta?.url;
            const firstIdx = unlocks.findIndex((x) => x.resource_id === u.resource_id);
            const isReDownload = firstIdx !== idx;
            return (
              <div key={u.id} className="hub-card hub-card-hover flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4">
                <div className="flex items-start gap-3 sm:contents">
                  <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-primary-tint shrink-0 overflow-hidden flex items-center justify-center">
                    {meta?.image_url ? (
                      <img src={meta.image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Download className="w-5 h-5 sm:w-6 sm:h-6 text-primary" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold text-foreground break-words sm:truncate">{title}</p>
                    <p className="text-[11.5px] text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                      <span>
                        {new Date(u.unlocked_at).toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                      {meta?.format && <span>· {meta.format}</span>}
                      {isReDownload && (
                        <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-success bg-success/10 px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="w-3 h-3" /> Already unlocked
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:shrink-0 w-full sm:w-auto">
                  {meta && (
                    <Link
                      to={`/resources/${meta.id}`}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg border border-border text-[12px] font-bold text-foreground hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </Link>
                  )}
                  {downloadUrl && (
                    <button
                      type="button"
                      onClick={() => forceDownload(downloadUrl, filenameFor(title, downloadUrl))}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary-dark transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
