import { ReactNode } from "react";
import { Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { openUpgradeModal } from "@/lib/upgrade-modal";
import { cn } from "@/lib/utils";

interface PaywallBlurProps {
  isPaid: boolean;
  /** "blur" = blur entire children with centered CTA. "fade" = show top, gradient-mask + CTA over bottom half. */
  mode?: "blur" | "fade";
  heading?: string;
  subtext?: string;
  ctaLabel?: string;
  /** Reveal this much of the top (only for "fade" mode). Default 40%. */
  revealTop?: number;
  className?: string;
  children: ReactNode;
}

export default function PaywallBlur({
  isPaid,
  mode = "blur",
  heading = "Your result is ready",
  subtext = "Join Remote Workher to unlock the full result, download it, and edit it anytime.",
  ctaLabel = "Unlock with Remote Workher",
  revealTop = 40,
  className,
  children,
}: PaywallBlurProps) {
  if (isPaid) return <>{children}</>;

  const handleUnlock = () => openUpgradeModal({ heading, subtext });

  if (mode === "fade") {
    return (
      <div className={cn("relative", className)}>
        {children}
        {/* Gradient fade starting at revealTop% */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-b from-transparent via-background/85 to-background"
          style={{ top: `${revealTop}%` }}
        />
        {/* Soft blur on the lower portion */}
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 backdrop-blur-[3px]"
          style={{ top: `${revealTop + 15}%` }}
        />
        <div
          className="absolute inset-x-0 flex justify-center px-4"
          style={{ top: `${revealTop + 8}%` }}
        >
          <UnlockCard heading={heading} subtext={subtext} ctaLabel={ctaLabel} onClick={handleUnlock} />
        </div>
      </div>
    );
  }

  // blur mode — cap height so blurred preview doesn't dominate; CTA pinned over preview
  return (
    <div className={cn("relative", className)}>
      <div className="relative max-h-[420px] sm:max-h-[520px] overflow-hidden rounded-2xl">
        <div className="filter blur-md select-none pointer-events-none" aria-hidden>
          {children}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-background" />
      </div>
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center px-4">
        <UnlockCard heading={heading} subtext={subtext} ctaLabel={ctaLabel} onClick={handleUnlock} />
      </div>
    </div>
  );
}


function UnlockCard({
  heading,
  subtext,
  ctaLabel,
  onClick,
}: {
  heading: string;
  subtext: string;
  ctaLabel: string;
  onClick: () => void;
}) {
  return (
    <div className="max-w-md w-full rounded-2xl border border-border bg-card shadow-xl p-6 sm:p-7 text-center backdrop-blur-sm">
      <div className="mx-auto w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center mb-3">
        <Lock className="w-5 h-5 text-primary" />
      </div>
      <h3 className="font-serif text-[22px] sm:text-[26px] leading-tight mb-2">{heading}</h3>
      <p className="text-[13.5px] text-muted-foreground leading-relaxed mb-5">{subtext}</p>
      <Button onClick={onClick} className="w-full" size="lg">
        <Sparkles className="w-4 h-4 mr-1.5" />
        {ctaLabel}
      </Button>
      <p className="text-[11px] text-muted-foreground mt-3">From ₦6,500/month · cancel anytime</p>
    </div>
  );
}
