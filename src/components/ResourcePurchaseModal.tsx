// In-page resource checkout modal. Replaces the full-page /checkout flow
// for resources so users can buy without leaving the resources area.
//
// This mirrors the existing Checkout.tsx ProductCheckout logic (collect
// name + email if not signed in, insert a `product_purchases` row, then
// unlock locally) — just rendered as a Paystack-styled modal popup.

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, Loader2, ShieldCheck, Lock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  resource: {
    id: string;
    title: string;
    price: number; // naira
  };
  defaultEmail?: string;
  defaultName?: string;
  signedIn: boolean;
  onPurchased: () => void;
}

function randomPassword() {
  const arr = new Uint8Array(18);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(36)).join("") + "Aa1!";
}

export default function ResourcePurchaseModal({
  open,
  onClose,
  resource,
  defaultEmail,
  defaultName,
  signedIn,
  onPurchased,
}: Props) {
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [fullName, setFullName] = useState(defaultName ?? "");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  if (!open) return null;

  const subtotal = resource.price;
  const vat = Math.round(subtotal * 0.075);
  const total = subtotal + vat;

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signedIn && (!fullName.trim() || !email.trim())) {
      toast.error("Please enter your name and email.");
      return;
    }
    setPaying(true);
    try {
      const { data: authData } = await supabase.auth.getUser();
      let userId = authData.user?.id;
      if (!userId) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: randomPassword(),
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) {
          toast.error(
            error.message.includes("registered")
              ? "An account with that email exists. Please log in instead."
              : error.message,
          );
          setPaying(false);
          return;
        }
        userId = data.user?.id;
      }
      if (!userId) {
        toast.error("Could not create account.");
        setPaying(false);
        return;
      }

      await supabase.from("product_purchases").insert({
        user_id: userId,
        kind: "resource",
        product_id: resource.id,
        product_title: resource.title,
        amount_naira: total,
        currency: "NGN",
        status: "paid",
        metadata: { base_price: subtotal, vat },
      } as any);

      toast.success(`"${resource.title}" unlocked! 🎉`);
      onPurchased();
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Something went wrong.");
    } finally {
      setPaying(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
    >
      <form
        onSubmit={handlePay}
        className="bg-card border border-border rounded-t-3xl sm:rounded-3xl w-full sm:max-w-[440px] p-6 sm:p-7 shadow-2xl relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center mb-5">
          <div className="w-11 h-11 rounded-2xl bg-primary-tint text-primary mx-auto mb-3 flex items-center justify-center">
            <Lock className="w-5 h-5" />
          </div>
          <h3 className="text-[20px] font-extrabold text-foreground">Unlock this resource</h3>
          <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-snug max-w-[320px] mx-auto">
            {resource.title}
          </p>
        </div>

        {!signedIn && (
          <div className="space-y-2.5 mb-4">
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Full name"
              className="w-full px-4 py-3 text-[14px] rounded-xl border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
              className="w-full px-4 py-3 text-[14px] rounded-xl border border-border bg-background text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        )}

        <div className="rounded-2xl border border-border p-4 mb-4 bg-muted/30 text-[12.5px] space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span className="text-foreground font-semibold tabular-nums">₦{subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">VAT (7.5%)</span>
            <span className="text-foreground font-semibold tabular-nums">₦{vat.toLocaleString()}</span>
          </div>
          <div className="border-t border-border pt-2 mt-2 flex items-center justify-between">
            <span className="font-extrabold text-foreground">Total</span>
            <span className="text-[16px] font-extrabold text-foreground tabular-nums">₦{total.toLocaleString()}</span>
          </div>
        </div>

        <button
          type="submit"
          disabled={paying}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground text-[14px] font-bold hover:bg-primary-dark transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
        >
          {paying ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
          ) : (
            <>Pay ₦{total.toLocaleString()} with Paystack</>
          )}
        </button>
        <p className="text-[11px] text-muted-foreground text-center mt-3 inline-flex items-center gap-1.5 justify-center w-full">
          <ShieldCheck className="w-3.5 h-3.5" /> Secure payment · instant unlock
        </p>
      </form>
    </div>
  );
}
