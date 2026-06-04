import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { ResumeData } from "./ResumePreview";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  data: ResumeData;
  onSave: (next: ResumeData) => void;
}

const linesToArr = (s: string) => s.split("\n").map((l) => l.trim()).filter(Boolean);
const arrToLines = (a?: string[]) => (a || []).join("\n");

export default function ResumeEditDialog({ open, onOpenChange, data, onSave }: Props) {
  const [draft, setDraft] = useState<ResumeData>(data);

  useEffect(() => { if (open) setDraft(data); }, [open, data]);

  const upd = (patch: Partial<ResumeData>) => setDraft((d) => ({ ...d, ...patch }));

  const updExp = (i: number, patch: Partial<ResumeData["experience"][number]>) =>
    setDraft((d) => ({ ...d, experience: d.experience.map((e, idx) => idx === i ? { ...e, ...patch } : e) }));

  const handleSave = () => { onSave(draft); onOpenChange(false); };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit your resume</DialogTitle>
          <p className="text-xs text-muted-foreground">
            Tweak any AI-generated text. One bullet per line.
          </p>
        </DialogHeader>

        <div className="space-y-5 py-2">
          {/* Header */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Full name</Label>
              <Input value={draft.name || ""} onChange={(e) => upd({ name: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Job title</Label>
              <Input value={draft.jobTitle || ""} onChange={(e) => upd({ jobTitle: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">City</Label>
              <Input value={draft.city || ""} onChange={(e) => upd({ city: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Phone</Label>
              <Input value={draft.phone || ""} onChange={(e) => upd({ phone: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">Email</Label>
              <Input value={draft.email || ""} onChange={(e) => upd({ email: e.target.value })} />
            </div>
            <div>
              <Label className="text-xs">LinkedIn</Label>
              <Input value={draft.linkedin || ""} onChange={(e) => upd({ linkedin: e.target.value })} />
            </div>
          </div>

          {/* Summary */}
          <div>
            <Label className="text-xs">Professional summary</Label>
            <Textarea rows={4} value={draft.summary || ""} onChange={(e) => upd({ summary: e.target.value })} />
          </div>

          {draft.executiveProfile !== undefined && (
            <div>
              <Label className="text-xs">Executive profile</Label>
              <Textarea rows={4} value={draft.executiveProfile || ""} onChange={(e) => upd({ executiveProfile: e.target.value })} />
            </div>
          )}

          {/* Key achievements */}
          <div>
            <Label className="text-xs">Key achievements (one per line)</Label>
            <Textarea rows={4}
              value={arrToLines(draft.keyAchievements?.length ? draft.keyAchievements : draft.achievements)}
              onChange={(e) => upd({ keyAchievements: linesToArr(e.target.value), achievements: linesToArr(e.target.value) })} />
          </div>

          {/* Experience */}
          <div className="space-y-3">
            <Label className="text-xs font-bold uppercase tracking-wide">Work experience</Label>
            {(draft.experience || []).map((e, i) => (
              <div key={i} className="rounded-lg border border-border p-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Input placeholder="Title" value={e.title || ""} onChange={(ev) => updExp(i, { title: ev.target.value })} />
                  <Input placeholder="Company" value={e.company || ""} onChange={(ev) => updExp(i, { company: ev.target.value })} />
                  <Input placeholder="Location" value={e.location || ""} onChange={(ev) => updExp(i, { location: ev.target.value })} />
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="Start" value={e.startDate || ""} onChange={(ev) => updExp(i, { startDate: ev.target.value })} />
                    <Input placeholder="End" value={e.endDate || ""} onChange={(ev) => updExp(i, { endDate: ev.target.value })} />
                  </div>
                </div>
                <Textarea rows={4} placeholder="Bullets (one per line)"
                  value={arrToLines(e.bullets)}
                  onChange={(ev) => updExp(i, { bullets: linesToArr(ev.target.value) })} />
              </div>
            ))}
          </div>

          {/* Skills */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Technical skills (one per line)</Label>
              <Textarea rows={4} value={arrToLines(draft.technicalSkills)} onChange={(e) => upd({ technicalSkills: linesToArr(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Soft skills (one per line)</Label>
              <Textarea rows={4} value={arrToLines(draft.softSkills)} onChange={(e) => upd({ softSkills: linesToArr(e.target.value) })} />
            </div>
          </div>

          {/* Core competencies (professional template) */}
          {draft.coreCompetencies && (
            <div>
              <Label className="text-xs">Core competencies (one per line)</Label>
              <Textarea rows={4} value={arrToLines(draft.coreCompetencies)} onChange={(e) => upd({ coreCompetencies: linesToArr(e.target.value) })} />
            </div>
          )}

          {/* Tools */}
          {draft.tools && (
            <div>
              <Label className="text-xs">Tools & technologies (one per line)</Label>
              <Textarea rows={3} value={arrToLines(draft.tools)} onChange={(e) => upd({ tools: linesToArr(e.target.value) })} />
            </div>
          )}

          {/* Awards */}
          {draft.awards && (
            <div>
              <Label className="text-xs">Awards (one per line)</Label>
              <Textarea rows={3} value={arrToLines(draft.awards)} onChange={(e) => upd({ awards: linesToArr(e.target.value) })} />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} className="gradient-primary text-primary-foreground">Save changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
