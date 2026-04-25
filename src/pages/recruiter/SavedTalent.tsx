import { talentPool, avatarUrl } from "@/data/recruiter";
import { MapPin, MessageCircle, BookmarkCheck } from "lucide-react";

const saved = talentPool.slice(0, 3);

export default function SavedTalent() {
  return (
    <div className="max-w-[1000px] mx-auto">
      <h1 className="text-[28px] md:text-[32px] font-serif text-foreground">Saved <em>Talent</em></h1>
      <p className="text-[13.5px] text-muted-foreground">Candidates you've shortlisted for future roles.</p>

      <div className="mt-5 bg-card border border-border rounded-2xl overflow-hidden">
        {saved.map((t, i) => (
          <div key={t.id} className={`p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3 md:gap-4 ${i > 0 ? "border-t border-border" : ""}`}>
            <img src={avatarUrl(t.avatarSeed)} alt={t.name} className="w-11 h-11 rounded-full bg-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-foreground truncate">{t.name}</div>
              <div className="text-[11.5px] text-muted-foreground truncate">{t.role} · <MapPin className="inline w-3 h-3" /> {t.location}</div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {t.skills.slice(0, 3).map((s) => <span key={s} className="px-2 py-0.5 rounded-full bg-muted text-[10.5px] font-medium">{s}</span>)}
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg border border-border text-[12px] font-semibold hover:bg-muted inline-flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5" /> Message
              </button>
              <button className="px-3 py-2 rounded-lg bg-primary-tint text-primary text-[12px] font-semibold hover:bg-primary/10 inline-flex items-center gap-1.5">
                <BookmarkCheck className="w-3.5 h-3.5" /> Saved
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
