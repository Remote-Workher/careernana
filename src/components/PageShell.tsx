import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageShellProps {
  children: ReactNode;
  className?: string;
  /** Constrain page content width. Defaults to "wide" (max-w-[1200px]). */
  width?: "narrow" | "default" | "wide" | "full";
  /** Remove inner padding (DashboardLayout already provides outer padding). */
  noPadding?: boolean;
}

const WIDTH_MAP: Record<NonNullable<PageShellProps["width"]>, string> = {
  narrow: "max-w-[720px]",
  default: "max-w-[960px]",
  wide: "max-w-[1200px]",
  full: "max-w-none",
};

/**
 * Shared dashboard page wrapper. Provides consistent horizontal centering,
 * max content width, and top alignment so every page lines up the same way
 * under the top nav.
 *
 * DashboardLayout already supplies outer padding (p-4 md:p-6 lg:p-8). PageShell
 * only handles the content max-width + a small negative top offset so the first
 * heading sits closer to the top of the viewport (matches the homepage feel).
 */
export default function PageShell({
  children,
  className,
  width = "wide",
  noPadding = false,
}: PageShellProps) {
  return (
    <div
      className={cn(
        "w-full mx-auto animate-fade-in",
        WIDTH_MAP[width],
        !noPadding && "-mt-1 sm:-mt-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
