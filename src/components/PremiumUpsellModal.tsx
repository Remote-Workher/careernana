import { Crown, X, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { openUpgradeModal } from "@/lib/upgrade-modal";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Continue to checkout for the single item the user wanted to buy. */
  onContinueWithPurchase: () => void;
  itemTitle: string;
  itemPrice: number;
  kind: "resource" | "course";
};

/**
 * Shown when a non-Premium user is about to buy a single resource/course.
 * Offers them to upgrade to Premium (free unlimited access) instead of
 * paying once for this single item.
 */
export default function PremiumUpsellModal({
  open,
  onClose,
  onContinueWithPurchase,
  itemTitle,
  itemPrice,
  kind,
}: Props) {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-background/60 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md rounded-2xl bg-card border border-border shadow-xl overflow-hidden">
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute top-3 right-3 w-8 h-8 rounded-full bg-muted hover:bg-muted/80 flex items-center justify-center text-muted-foreground"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-6 sm:p-7">
          <div className="w-11 h-11 rounded-2xl bg-primary-tint flex items-center justify-center mb-4">
            <Crown className="w-5 h-5 text-primary" />
          </div>
          <h2 className="font-serif text-[22px] leading-[1.2] text-foreground tracking-tight">
            {kind === "course" ? (
              <>Courses are a <em>Premium</em> perk</>
            ) : (
              <>Get this <em>free</em> with Premium</>
            )}
          </h2>
          <p className="text-[13px] text-muted-foreground mt-2 leading-relaxed">
            {kind === "course" ? (
              <>
                <span className="font-bold text-foreground">"{itemTitle}"</span> — and every other course — is included with Remote Workher Premium.
              </>
            ) : (
              <>
                Instead of paying ₦{itemPrice.toLocaleString()} for{" "}
                <span className="font-bold text-foreground">"{itemTitle}"</span>,
                join Remote Workher Premium and download every resource every month.
              </>
            )}
          </p>

          <ul className="mt-4 space-y-2.5">
            {[
              "Unlimited courses",
              "3 resources every month",
              "100 AI coins for resume, cover letter & more",
              "Cancel anytime",
            ].map((line) => (
              <li
                key={line}
                className="flex items-start gap-2.5 text-[13px] text-foreground/90"
              >
                <span className="mt-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground inline-flex items-center justify-center shrink-0">
                  <Check className="w-2.5 h-2.5" strokeWidth={3} />
                </span>
                <span>{line}</span>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex flex-col gap-2.5">
            <button
              onClick={() => navigate("/payment")}
              className="w-full py-3 rounded-xl gradient-primary text-primary-foreground text-[13px] font-extrabold inline-flex items-center justify-center gap-2"
            >
              <Crown className="w-4 h-4" /> Join Premium · ₦20,000/mo
            </button>
            {kind === "resource" && (
              <button
                onClick={onContinueWithPurchase}
                className="w-full py-3 rounded-xl border border-border bg-background text-[13px] font-bold text-foreground hover:bg-muted transition-colors"
              >
                No thanks, just buy this for ₦{itemPrice.toLocaleString()}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
