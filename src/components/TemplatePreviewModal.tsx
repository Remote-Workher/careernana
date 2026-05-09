import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Sparkles, X, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PreviewTemplate {
  id: string;
  title: string;
  description: string;
  tags: string[];
  uses: string;
  thumbnail: string;
  badge?: "ATS" | "Pro" | "New";
}

export default function TemplatePreviewModal({
  template,
  open,
  onClose,
  onUseTemplate,
}: {
  template: PreviewTemplate | null;
  open: boolean;
  onClose: () => void;
  onUseTemplate: (t: PreviewTemplate) => void;
}) {
  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-5xl p-0 gap-0 overflow-hidden bg-card">
        <DialogTitle className="sr-only">{template.title} preview</DialogTitle>

        <div className="grid grid-cols-1 md:grid-cols-5 max-h-[88vh]">
          {/* Preview canvas */}
          <div className="md:col-span-3 bg-muted/40 p-6 md:p-10 flex items-center justify-center border-b md:border-b-0 md:border-r border-border overflow-auto">
            <div className="relative w-full max-w-[480px] aspect-[1/1.3] rounded-xl shadow-card overflow-hidden bg-card">
              <img
                src={template.thumbnail}
                alt={`${template.title} full preview`}
                className="w-full h-full object-cover"
              />
              {template.badge && (
                <span
                  className={cn(
                    "absolute top-3 right-3 pill text-[10px] shadow-sm",
                    template.badge === "ATS" && "bg-success/90 text-success-foreground",
                    template.badge === "Pro" && "bg-secondary text-secondary-foreground",
                    template.badge === "New" && "bg-primary text-primary-foreground",
                  )}
                >
                  {template.badge}
                </span>
              )}
            </div>
          </div>

          {/* Details panel */}
          <div className="md:col-span-2 flex flex-col">
            <div className="flex items-start justify-between p-5 border-b border-border">
              <div className="min-w-0">
                <p className="eyebrow mb-1.5">Template preview</p>
                <h2 className="text-[20px] font-serif text-foreground leading-tight tracking-[-0.01em]">
                  {template.title}
                </h2>
                <p className="text-[11.5px] text-muted-foreground font-mono mt-1">
                  {template.uses}
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Close preview"
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 flex-1 overflow-y-auto space-y-5">
              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-1.5">
                  About this template
                </p>
                <p className="text-[13px] text-foreground/85 leading-relaxed">
                  {template.description}
                </p>
              </div>

              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
                  Best for
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {template.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center text-[10.5px] font-bold px-2 py-0.5 rounded-full border border-border bg-background text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground mb-2">
                  What you get
                </p>
                <ul className="space-y-1.5 text-[12.5px] text-foreground/85">
                  <li className="flex items-start gap-2">
                    <FileText className="w-3.5 h-3.5 text-primary mt-0.5 shrink-0" />
                    Editable Word (.docx) and PDF version
                  </li>
                  <li className="flex items-start gap-2">
                    <Sparkles className="w-3.5 h-3.5 text-secondary mt-0.5 shrink-0" />
                    Pre-filled sample copy you can swap in
                  </li>
                  <li className="flex items-start gap-2">
                    <Download className="w-3.5 h-3.5 text-success mt-0.5 shrink-0" />
                    Saved to your Recently Used for quick access
                  </li>
                </ul>
              </div>
            </div>

            <div className="p-5 border-t border-border space-y-2 bg-muted/20">
              <Button
                onClick={() => onUseTemplate(template)}
                className="w-full h-10 text-[13px] font-bold rounded-xl gradient-primary text-primary-foreground"
              >
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Use this template
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Counts as 1 of your 5 monthly resources (Premium).
              </p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
