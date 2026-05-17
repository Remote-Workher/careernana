import { ShieldCheck } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface VettedBadgeProps {
  size?: "sm" | "md";
  className?: string;
  /** Optional label override. Defaults to "Vetted". */
  label?: string;
}

/**
 * Small clickable badge shown next to a talent's name once their profile has
 * been vetted by the Remote Workher team. Tap/click reveals an explanation.
 */
export default function VettedBadge({ size = "sm", label = "Vetted", className = "" }: VettedBadgeProps) {
  const isSm = size === "sm";
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          aria-label="What does Vetted mean?"
          className={`inline-flex items-center gap-1 rounded-full border border-success/40 bg-success/10 text-success font-bold leading-none hover:bg-success/15 transition-colors ${
            isSm ? "px-1.5 py-0.5 text-[10px]" : "px-2 py-1 text-[11px]"
          } ${className}`}
        >
          <ShieldCheck className={isSm ? "w-3 h-3" : "w-3.5 h-3.5"} />
          {label}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        align="start"
        className="w-72 text-[12.5px] leading-relaxed p-3.5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 mb-1.5 font-extrabold text-foreground">
          <ShieldCheck className="w-4 h-4 text-success" /> Vetted by Remote Workher
        </div>
        <p className="text-muted-foreground">
          This talent has been reviewed and approved by the Remote Workher team.
          We've verified her identity, work experience, portfolio, and
          remote-readiness so you can hire with confidence.
        </p>
      </PopoverContent>
    </Popover>
  );
}
