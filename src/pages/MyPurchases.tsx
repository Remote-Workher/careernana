import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShoppingBag, Download, ExternalLink, Loader2, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type Purchase = {
  id: string;
  product_id: string;
  product_title: string | null;
  amount_naira: number;
  currency: string;
  status: string;
  created_at: string;
};

type ResourceMeta = {
  id: string;
  title: string;
  url?: string | null;
  thumbnail_url?: string | null;
  format?: string | null;
};

export default function MyPurchases() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [resources, setResources] = useState<Record<string, ResourceMeta>>({});

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSignedIn(false);
        setLoading(false);
        return;
      }
      setSignedIn(true);

      const { data: rows } = await supabase
        .from("product_purchases")
        .select("id,product_id,product_title,amount_naira,currency,status,created_at,kind")
        .eq("user_id", user.id)
        .eq("kind", "resource")
        .eq("status", "paid")
        .order("created_at", { ascending: false });

      const list = (rows ?? []) as Purchase[];
      setPurchases(list);

      const ids = [...new Set(list.map((p) => p.product_id))];
      if (ids.length > 0) {
        const { data: resRows } = await supabase
          .from("resources")
          .select("id,title,url,thumbnail_url,format")
          .in("id", ids);
        const map: Record<string, ResourceMeta> = {};
        (resRows ?? []).forEach((r: any) => {
          map[r.id] = r as ResourceMeta;
        });
        setResources(map);
      }

      setLoading(false);
    })();
  }, []);

  const handleDownload = (p: Purchase) => {
    const meta = resources[p.product_id];
    if (meta?.url) {
      window.open(meta.url, "_blank", "noopener");
      return;
    }
    const title = p.product_title || meta?.title || "resource";
    const blob = new Blob(
      [`${title}\n\nThanks for your purchase. Your file will be available here once uploaded by the team.`],
      { type: "text/plain" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    toast.success("Download started");
  };

  if (loading) {
    return (
      <div className="py-24 flex justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  if (!signedIn) {
    return (
      <div className="max-w-xl mx-auto py-16 text-center">
        <p className="text-[15px] font-bold text-foreground mb-2">Sign in to view your purchases</p>
        <p className="text-[13px] text-muted-foreground mb-5">
          Your downloads live here, tied to your account.
        </p>
        <button
          onClick={() => navigate("/login?next=/my-purchases")}
          className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-[12.5px] font-bold px-4 py-2.5 rounded-full hover:bg-primary-dark transition-colors"
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
          My <em>purchases</em>
        </h1>
        <p className="text-[13px] text-muted-foreground mt-2 max-w-[520px]">
          Every resource you've bought lives here — download anytime.
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card/50 px-6 py-14 text-center">
          <div className="w-14 h-14 rounded-2xl bg-primary-tint flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <h3 className="text-[18px] font-serif text-foreground tracking-[-0.01em]">
            No purchases <em>yet</em>
          </h3>
          <p className="text-[12.5px] text-muted-foreground mt-1.5 max-w-sm mx-auto leading-relaxed">
            When you buy a resource, it'll show up here for you to download anytime.
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
          {purchases.map((p) => {
            const meta = resources[p.product_id];
            const title = p.product_title || meta?.title || "Resource";
            return (
              <div
                key={p.id}
                className="hub-card hub-card-hover flex items-center gap-4 p-4"
              >
                <div className="w-14 h-14 rounded-xl bg-primary-tint shrink-0 overflow-hidden flex items-center justify-center">
                  {meta?.thumbnail_url ? (
                    <img src={meta.thumbnail_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ShoppingBag className="w-6 h-6 text-primary" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-bold text-foreground truncate">{title}</p>
                  <p className="text-[11.5px] text-muted-foreground mt-0.5">
                    Bought {new Date(p.created_at).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    · ₦{p.amount_naira.toLocaleString()}
                    {meta?.format ? ` · ${meta.format}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {meta && (
                    <Link
                      to={`/resources/${meta.id}`}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-[12px] font-bold text-foreground hover:bg-muted transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" /> View
                    </Link>
                  )}
                  <button
                    onClick={() => handleDownload(p)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-[12px] font-bold hover:bg-primary-dark transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
