import { useEffect, useRef, useState } from "react";
import { Download, Linkedin, Share2, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  challengeTitle: string;
  category?: string;
  completedAt?: Date;
  /** When true, show as a live preview that updates as tasks are submitted. */
  preview?: boolean;
  submittedCount?: number;
  totalTasks?: number;
}

/**
 * Renders a shareable completion badge as an SVG that the user can
 * download as a PNG and post on LinkedIn / Instagram / X.
 */
export default function ChallengeBadge({ challengeTitle, category, completedAt, preview = false, submittedCount = 0, totalTasks = 0 }: Props) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [name, setName] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", user.id)
        .maybeSingle();
      setName((data?.full_name as string) || (user.email?.split("@")[0] ?? "Member"));
    })();
  }, []);

  const dateStr = (completedAt ?? new Date()).toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });

  const downloadPng = async () => {
    const svg = svgRef.current;
    if (!svg) return;
    const xml = new XMLSerializer().serializeToString(svg);
    const svg64 = btoa(unescape(encodeURIComponent(xml)));
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = `data:image/svg+xml;base64,${svg64}`;
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; });
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = 1200 * scale;
    canvas.height = 1200 * scale;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0, 1200, 1200);
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `${challengeTitle.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-badge.png`;
    a.click();
    toast.success("Badge downloaded — share it on LinkedIn 🎉");
  };

  const shareLinkedIn = () => {
    const text = encodeURIComponent(
      `I just completed the "${challengeTitle}" challenge on Remote Workher 🎉 Doing, not just learning. #RemoteWorkher`
    );
    window.open(
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent("https://careernana.lovable.app")}&summary=${text}`,
      "_blank",
      "noopener"
    );
  };

  const pct = totalTasks > 0 ? Math.round((submittedCount / totalTasks) * 100) : 0;

  return (
    <div className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 via-card to-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="w-4 h-4 text-primary" />
        <p className="text-[12px] font-extrabold uppercase tracking-wider text-primary">
          {preview ? "Badge Preview" : "Challenge Complete"}
        </p>
      </div>
      <h3 className="text-[18px] sm:text-[20px] font-serif text-foreground tracking-[-0.01em] leading-tight">
        {preview ? "Here's how your badge will look" : "Your completion badge is ready"}
      </h3>
      <p className="text-[12.5px] text-muted-foreground mt-1.5 leading-relaxed">
        {preview
          ? `Submit all ${totalTasks} tasks to unlock the download. ${submittedCount}/${totalTasks} done (${pct}%).`
          : "Download the badge below and share your win on LinkedIn, Instagram, or X — it shows up beautifully in feeds."}
      </p>
      {preview && totalTasks > 0 && (
        <div className="mt-3 h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      )}

      <div className="mt-4 rounded-xl overflow-hidden border border-border bg-background">
        <div className="aspect-square w-full max-w-[360px] mx-auto">
          <svg
            ref={svgRef}
            viewBox="0 0 1200 1200"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full block"
          >
            <defs>
              <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#F0EBE8" />
                <stop offset="100%" stopColor="#FBE4EC" />
              </linearGradient>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#E0487A" />
                <stop offset="100%" stopColor="#B8345F" />
              </linearGradient>
            </defs>
            <rect width="1200" height="1200" fill="url(#bg)" />
            <rect x="40" y="40" width="1120" height="1120" rx="48" fill="#FFFFFF" />

            {/* Top brand */}
            <text x="600" y="150" textAnchor="middle" fontFamily="DM Sans, sans-serif"
              fontSize="28" fontWeight="700" letterSpacing="6" fill="#1A1A1A">
              REMOTE WORKHER
            </text>
            <line x1="500" y1="180" x2="700" y2="180" stroke="#E0487A" strokeWidth="3" />

            {/* Medallion */}
            <circle cx="600" cy="430" r="180" fill="url(#ring)" />
            <circle cx="600" cy="430" r="148" fill="#FFFFFF" />
            <text x="600" y="420" textAnchor="middle" fontFamily="EB Garamond, serif"
              fontSize="56" fontStyle="italic" fill="#E0487A">
              Completed
            </text>
            <text x="600" y="480" textAnchor="middle" fontFamily="DM Sans, sans-serif"
              fontSize="22" fontWeight="700" letterSpacing="4" fill="#1A1A1A">
              {category?.toUpperCase() ?? "CHALLENGE"}
            </text>

            {/* Title */}
            <foreignObject x="120" y="660" width="960" height="180">
              <div
                {...({ xmlns: "http://www.w3.org/1999/xhtml" } as any)}
                style={{
                  fontFamily: "EB Garamond, serif",
                  fontSize: "56px",
                  lineHeight: 1.15,
                  textAlign: "center",
                  color: "#1A1A1A",
                  letterSpacing: "-0.01em",
                  fontWeight: 500,
                }}
              >
                {challengeTitle}
              </div>
            </foreignObject>

            {/* Awarded to */}
            <text x="600" y="900" textAnchor="middle" fontFamily="DM Sans, sans-serif"
              fontSize="20" fontWeight="600" letterSpacing="3" fill="#666666">
              AWARDED TO
            </text>
            <text x="600" y="960" textAnchor="middle" fontFamily="EB Garamond, serif"
              fontSize="48" fill="#1A1A1A">
              {name || "Member"}
            </text>

            {/* Footer */}
            <line x1="380" y1="1030" x2="820" y2="1030" stroke="#E0E0E0" strokeWidth="2" />
            <text x="600" y="1080" textAnchor="middle" fontFamily="DM Sans, sans-serif"
              fontSize="22" fontWeight="600" fill="#1A1A1A">
              {dateStr}
            </text>
            <text x="600" y="1115" textAnchor="middle" fontFamily="DM Sans, sans-serif"
              fontSize="16" fill="#666666">
              remoteworkher.com
            </text>
            {preview && (
              <g opacity="0.18">
                <text x="600" y="640" textAnchor="middle" fontFamily="DM Sans, sans-serif"
                  fontSize="120" fontWeight="800" letterSpacing="12" fill="#1A1A1A"
                  transform="rotate(-22 600 640)">
                  PREVIEW
                </text>
              </g>
            )}
          </svg>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <Button
          onClick={downloadPng}
          disabled={preview}
          className="h-11 rounded-xl font-bold"
        >
          <Download className="w-4 h-4 mr-2" />
          {preview ? "Locked — finish all tasks" : "Download PNG"}
        </Button>
        <Button
          onClick={shareLinkedIn}
          disabled={preview}
          variant="outline"
          className="h-11 rounded-xl font-bold"
        >
          <Linkedin className="w-4 h-4 mr-2" /> Share on LinkedIn
        </Button>
      </div>
    </div>
  );
}
