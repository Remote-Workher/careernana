import { useEffect, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { subscribeCoinsModal } from "@/lib/coins-modal";

const COIN_PACKAGES = [
  { key: "20", name: "Starter", coins: 20, naira: 1000 },
  { key: "40", name: "Plus", coins: 40, naira: 2000 },
  { key: "100", name: "Pro", coins: 100, naira: 5000, popular: true },
  { key: "200", name: "Power", coins: 200, naira: 10000, best: true },
];

export default function CoinsModal() {
  const [open, setOpen] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState("100");
  const [buyingPkg, setBuyingPkg] = useState<string | null>(null);

  useEffect(() => subscribeCoinsModal(() => setOpen(true)), []);

  if (!open) return null;

  const handleBuy = async (pkgKey: string) => {
    try {
      setBuyingPkg(pkgKey);
      const { data, error } = await supabase.functions.invoke("paystack-checkout", {
        body: {
          purpose: "buy_coins",
          package: pkgKey,
          callback_origin: window.location.origin,
        },
      });
      if (error) throw error;
      if (data?.authorization_url) {
        window.location.href = data.authorization_url;
      } else {
        toast.error("Could not start checkout");
      }
    } catch (e: any) {
      toast.error(e.message || "Checkout failed");
    } finally {
      setBuyingPkg(null);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="bg-card border border-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[440px] p-6 sm:p-7 shadow-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <h3 className="text-[20px] font-extrabold text-foreground">Purchase AI Coins</h3>
          <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-snug max-w-[320px] mx-auto">
            Choose a coin package to continue using AI career tools. Payment powered by Paystack.
          </p>
        </div>

        <div className="space-y-2.5 mb-5">
          {COIN_PACKAGES.map((pkg) => {
            const selected = selectedPkg === pkg.key;
            return (
              <button
                key={pkg.key}
                onClick={() => setSelectedPkg(pkg.key)}
                className={`w-full flex items-center justify-between px-4 py-3.5 rounded-2xl border-[1.5px] transition-all text-left ${
                  selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[15px] font-extrabold text-foreground">{pkg.name}</span>
                    <span className="text-[10.5px] font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                      {pkg.coins} coins
                    </span>
                  </div>
                  <div className="text-[11.5px] text-muted-foreground">
                    ₦{(pkg.naira / pkg.coins).toFixed(0)}/coin
                  </div>
                </div>
                <div className="text-[17px] font-extrabold text-foreground tabular-nums">
                  ₦{pkg.naira.toLocaleString()}
                </div>
              </button>
            );
          })}
        </div>

        <button
          disabled={buyingPkg !== null}
          onClick={() => handleBuy(selectedPkg)}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-[14px] font-bold hover:bg-primary-dark transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {buyingPkg ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Loading…</>
          ) : (
            "Pay with Paystack"
          )}
        </button>
        <p className="text-[11.5px] text-muted-foreground text-center mt-3">
          Coins never expire and rollover monthly
        </p>
      </div>
    </div>
  );
}
