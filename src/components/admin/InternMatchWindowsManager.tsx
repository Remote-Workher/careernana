import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Loader2, CalendarDays, CheckCircle2, XCircle, Clock } from "lucide-react";

type Window = {
  id: string;
  cohort_name: string;
  opens_at: string;
  closes_at: string;
  is_active: boolean;
  notes: string | null;
  created_at: string;
};

type Counts = Record<string, number>;

const inputCls =
  "w-full px-3 py-2 rounded-lg border border-border bg-background text-[13px] focus:outline-none focus:ring-2 focus:ring-primary/30";

function toLocal(dt: string) {
  // ISO -> yyyy-MM-ddTHH:mm for <input type="datetime-local">
  const d = new Date(dt);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function InternMatchWindowsManager() {
  const [rows, setRows] = useState<Window[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Window | "new" | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("intern_match_windows")
      .select("*")
      .order("opens_at", { ascending: false });
    if (error) toast.error(error.message);
    setRows((data as any) ?? []);
    if (data && data.length) {
      const { data: apps } = await supabase
        .from("intern_match_applications")
        .select("cohort_id")
        .in("cohort_id", data.map((d: any) => d.id));
      const c: Counts = {};
      (apps ?? []).forEach((a: any) => { if (a.cohort_id) c[a.cohort_id] = (c[a.cohort_id] || 0) + 1; });
      setCounts(c);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (w: Window) => {
    if (!confirm(`Delete "${w.cohort_name}"? Existing founder applications will be detached (kept).`)) return;
    const { error } = await supabase.from("intern_match_windows").delete().eq("id", w.id);
    if (error) return toast.error(error.message);
    toast.success("Window deleted");
    load();
  };

  const toggleActive = async (w: Window) => {
    const { error } = await supabase
      .from("intern_match_windows")
      .update({ is_active: !w.is_active })
      .eq("id", w.id);
    if (error) return toast.error(error.message);
    toast.success(w.is_active ? "Window closed" : "Window reopened");
    load();
  };

  return (
    <div className="space-y-4 max-w-[1100px]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-serif text-[22px] text-foreground">Intern Match Windows</h2>
          <p className="text-[12.5px] text-muted-foreground mt-0.5">
            Quarterly cohorts that gate when founders can submit Intern Match briefs. Only active windows accept new applications.
          </p>
        </div>
        <button
          onClick={() => setEditing("new")}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary-dark"
        >
          <Plus className="w-3.5 h-3.5" /> New window
        </button>
      </div>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground text-sm">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
          <CalendarDays className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
          <p className="text-[13px] text-muted-foreground">No windows yet. Create your first quarterly cohort.</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-muted/40 text-left text-[11.5px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Cohort</th>
                <th className="px-4 py-2.5 font-semibold">Opens</th>
                <th className="px-4 py-2.5 font-semibold">Closes</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Briefs</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((w) => {
                const now = new Date();
                const open = new Date(w.opens_at);
                const close = new Date(w.closes_at);
                const phase = !w.is_active ? "closed" : now < open ? "upcoming" : now > close ? "expired" : "open";
                return (
                  <tr key={w.id} className="border-t border-border/60">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-foreground">{w.cohort_name}</div>
                      {w.notes && <div className="text-[11.5px] text-muted-foreground mt-0.5 line-clamp-1">{w.notes}</div>}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{open.toLocaleDateString()} {open.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-3 text-muted-foreground">{close.toLocaleDateString()} {close.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</td>
                    <td className="px-4 py-3"><PhasePill phase={phase} /></td>
                    <td className="px-4 py-3 text-muted-foreground">{counts[w.id] ?? 0}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          onClick={() => toggleActive(w)}
                          className="px-2.5 py-1.5 rounded-lg text-[11.5px] font-semibold border border-border hover:bg-muted"
                          title={w.is_active ? "Close window" : "Reopen window"}
                        >
                          {w.is_active ? "Close" : "Reopen"}
                        </button>
                        <button onClick={() => setEditing(w)} className="p-1.5 rounded-lg hover:bg-muted" title="Edit">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => remove(w)} className="p-1.5 rounded-lg hover:bg-muted text-rose-600" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <WindowEditor
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
        />
      )}
    </div>
  );
}

function PhasePill({ phase }: { phase: string }) {
  const map: Record<string, { label: string; cls: string; Icon: any }> = {
    open: { label: "Open", cls: "bg-emerald-100 text-emerald-700", Icon: CheckCircle2 },
    upcoming: { label: "Upcoming", cls: "bg-blue-100 text-blue-700", Icon: Clock },
    expired: { label: "Expired", cls: "bg-amber-100 text-amber-700", Icon: Clock },
    closed: { label: "Closed", cls: "bg-muted text-muted-foreground", Icon: XCircle },
  };
  const m = map[phase] ?? map.closed;
  const I = m.Icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${m.cls}`}>
      <I className="w-3 h-3" /> {m.label}
    </span>
  );
}

function WindowEditor({ row, onClose, onSaved }: { row: Window | null; onClose: () => void; onSaved: () => void }) {
  const isNew = !row;
  const [cohort, setCohort] = useState(row?.cohort_name ?? "");
  const [opens, setOpens] = useState(row ? toLocal(row.opens_at) : "");
  const [closes, setCloses] = useState(row ? toLocal(row.closes_at) : "");
  const [active, setActive] = useState(row?.is_active ?? true);
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!cohort.trim()) return toast.error("Cohort name is required");
    if (!opens || !closes) return toast.error("Set both open and close dates");
    if (new Date(opens) >= new Date(closes)) return toast.error("Close date must be after open date");
    setSaving(true);
    const payload = {
      cohort_name: cohort.trim(),
      opens_at: new Date(opens).toISOString(),
      closes_at: new Date(closes).toISOString(),
      is_active: active,
      notes: notes.trim() || null,
    };
    const { error } = isNew
      ? await supabase.from("intern_match_windows").insert(payload)
      : await supabase.from("intern_match_windows").update(payload).eq("id", row!.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(isNew ? "Window created" : "Window updated");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="bg-card border border-border rounded-2xl p-5 md:p-6 w-full max-w-[560px] max-h-[90vh] overflow-auto">
        <h3 className="font-serif text-[20px] text-foreground">{isNew ? "New Intern Match window" : "Edit window"}</h3>
        <p className="text-[12.5px] text-muted-foreground mt-0.5">Founders can only submit Intern Match briefs when an active window is currently open.</p>

        <div className="mt-4 space-y-3">
          <label className="block">
            <span className="text-[12px] font-semibold text-foreground">Cohort name</span>
            <input value={cohort} onChange={(e) => setCohort(e.target.value)} placeholder="Q1 2026 Cohort" className={`${inputCls} mt-1`} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-semibold text-foreground">Opens at</span>
              <input type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} className={`${inputCls} mt-1`} />
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold text-foreground">Closes at</span>
              <input type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} className={`${inputCls} mt-1`} />
            </label>
          </div>
          <label className="block">
            <span className="text-[12px] font-semibold text-foreground">Notes (internal)</span>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Optional — context, intake limits, partner notes…" className={`${inputCls} mt-1`} />
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
            <span className="text-[12.5px] text-foreground">Active (founders can submit briefs while this window is open)</span>
          </label>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-xl border border-border text-[12.5px] font-semibold hover:bg-muted">Cancel</button>
          <button onClick={save} disabled={saving} className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-[12.5px] font-semibold hover:bg-primary-dark disabled:opacity-60">
            {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {isNew ? "Create window" : "Save changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
