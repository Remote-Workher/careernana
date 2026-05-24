import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download, ExternalLink, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { usePlanTier } from "@/hooks/usePlanTier";
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
    window.open(url, "_blank", "noopener");
    toast.message("Opened in a new tab — tap and hold, then 'Save' to download.");
  }
}

function filenameFor(title: string, url: string) {
  const slug = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase().replace(/^-|-$/g, "") || "resource";
  const m = url.split("?")[0].match(/\.([a-z0-9]{2,5})$/i);
  return m ? `${slug}.${m[1].toLowerCase()}` : slug;
}

type UnlockRow = { id: string; resource_id: string; unlocked_at: string };
type ResourceMeta = {
  id: string;
  title: string;
  url?: string | null;
  file_url?: string | null;
  image_url?: string | null;
  format?: string | null;
};

export default function MyDownloadsSection() {
  const { loading: tierLoading, signedIn, tier, isPaidActive } = usePlanTier();
  const [loading, setLoading] = useState(true);
  const [unlocks, setUnlocks] = useState<UnlockRow[]>([]);
  const [resources, setResources] = useState<Record<string, ResourceMeta>>({});

  const isMember = isPaidActive && (tier === "premium" || tier === "standard");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Use cached session — avoids network round-trip from getUser()
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        if (!cancelled) setLoading(false);
        return;
      }

      const period = new Date();
      period.setDate(1);
      period.setHours(0, 0, 0, 0);

      // Single query: fetch unlocks + embedded resource metadata
      const { data: unlockRows } = await supabase
        .from("resource_unlocks" as any)
        .select("id, resource_id, unlocked_at, resources(id,title,url,file_url,image_url,format)")
        .eq("user_id", user.id)
        .eq("kind", "resource")
        .gte("unlocked_at", period.toISOString())
        .order("unlocked_at", { ascending: false });

      if (cancelled) return;
      const list = (unlockRows ?? []) as any[];
      setUnlocks(list.map((r) => ({ id: r.id, resource_id: r.resource_id, unlocked_at: r.unlocked_at })));
      const map: Record<string, ResourceMeta> = {};
      list.forEach((r) => { if (r.resources) map[r.resource_id] = r.resources as ResourceMeta; });
      setResources(map);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="mb-6 rounded-2xl border border-border bg-card p-4 sm:p-5 animate-pulse">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-xl bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 bg-muted rounded" />
            <div className="h-2.5 w-44 bg-muted rounded" />
          </div>
        </div>
        <div className="space-y-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-14 rounded-xl bg-muted/60" />
          ))}
        </div>
      </div>
    );
  }

  if (!signedIn && !tierLoading) return null;


  const seen = new Set<string>();
  const unique = unlocks.filter((u) => {
    if (seen.has(u.resource_id)) return false;
    seen.add(u.resource_id);
    return true;
  });

  return (
    <div className="mb-6 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary-tint text-primary flex items-center justify-center">
            <Download className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[13px] font-extrabold text-foreground">My downloads</p>
            <p className="text-[11px] text-muted-foreground">Re-download anytime — no slot used.</p>
          </div>
        </div>
        <Link
          to="/my-downloads"
          className="inline-flex items-center gap-1 text-[11.5px] font-bold text-primary hover:underline"
        >
          View all <ArrowRight className="w-3 h-3" />
        </Link>
      </div>

      {unique.length === 0 ? (
        <p className="text-[12px] text-muted-foreground py-4 text-center">
          Nothing downloaded yet this month. Browse below to get started.
        </p>
      ) : (
        <div className="space-y-2">
          {unique.slice(0, 4).map((u) => {
            const meta = resources[u.resource_id];
            const title = meta?.title || "Resource";
            const downloadUrl = meta?.file_url || meta?.url;
            return (
              <div key={u.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-border bg-background">
                <div className="w-10 h-10 rounded-lg bg-primary-tint shrink-0 overflow-hidden flex items-center justify-center">
                  {meta?.image_url ? (
                    <img src={meta.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <Download className="w-4 h-4 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-bold text-foreground truncate">{title}</p>
                  <p className="text-[10.5px] text-muted-foreground">
                    {new Date(u.unlocked_at).toLocaleDateString("en-GB", {
                      day: "numeric", month: "short",
                    })}
                    {meta?.format && <> · {meta.format}</>}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {meta && (
                    <Link
                      to={`/resources/${meta.id}`}
                      className="inline-flex items-center justify-center px-2 py-1.5 rounded-lg border border-border text-[11px] font-bold text-foreground hover:bg-muted"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  {downloadUrl && (
                    <button
                      type="button"
                      onClick={() => forceDownload(downloadUrl, filenameFor(title, downloadUrl))}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-[11px] font-bold hover:bg-primary-dark"
                    >
                      <Download className="w-3 h-3" /> Get
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
