import { cn } from "@/lib/utils";

export interface SourceOption {
  id: string;
  icon: string;
  label: string;
  tag?: string;
  description: string;
}

interface SourceSelectorProps {
  label: string;
  options: SourceOption[];
  selected: string;
  onSelect: (id: string) => void;
}

export default function SourceSelector({ label, options, selected, onSelect }: SourceSelectorProps) {
  return (
    <div>
      <p className="text-[13px] font-semibold text-foreground mb-3">{label}</p>
      <div className="space-y-2">
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => onSelect(opt.id)}
            className={cn(
              "w-full flex items-center gap-3 p-3 rounded-[9px] border text-left transition-all",
              selected === opt.id
                ? "bg-[#FDF1F5] border-[#E0487A] border-[1.5px]"
                : "bg-card border-[#EBE6E2] hover:border-[#F7CDD9]"
            )}
          >
            <span className="text-[20px] shrink-0">{opt.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-bold text-foreground">{opt.label}</span>
                {opt.tag && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-primary-foreground" style={{ background: "linear-gradient(135deg, #E0487A, #c73868)" }}>
                    {opt.tag}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-0.5">{opt.description}</p>
            </div>
            <div className={cn(
              "w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center",
              selected === opt.id ? "border-[#E0487A]" : "border-[#EBE6E2]"
            )}>
              {selected === opt.id && (
                <div className="w-2.5 h-2.5 rounded-full bg-[#E0487A]" />
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
