import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Download, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSEO } from "@/components/SEO";

type CheckIn = {
  id: string;
  user_id: string | null;
  full_name: string | null;
  email: string | null;
  phone: string;
  best_time: string;
  note: string | null;
  created_at: string;
};

function toCsv(rows: CheckIn[]): string {
  const headers = ["created_at", "full_name", "email", "phone", "best_time", "note", "user_id"];
  const escape = (v: any) => {
    if (v === null || v === undefined) return "";
    const s = String(v).replace(/"/g, '""');
    return /[",\n]/.test(s) ? `"${s}"` : s;
  };
  const lines = [headers.join(",")];
  for (const r of rows) {
    lines.push(headers.map((h) => escape((r as any)[h])).join(","));
  }
  return lines.join("\n");
}

function download(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminCheckIns() {
  useSEO({ title: "Member check-ins — Admin", description: "Adeife's check-in submissions." });
  const [rows, setRows] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportingMembers, setExportingMembers] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("member_checkins")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) setError(error.message);
      else setRows((data ?? []) as CheckIn[]);
      setLoading(false);
    })();
  }, []);

  const exportCheckins = () => {
    download(`member-checkins-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows));
  };

  const exportMembers = async () => {
    setExportingMembers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, email, phone, plan_tier, plan_key, paid_until, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const headers = ["created_at", "full_name", "email", "phone", "plan_tier", "plan_key", "paid_until", "user_id"];
      const esc = (v: any) => {
        if (v === null || v === undefined) return "";
        const s = String(v).replace(/"/g, '""');
        return /[",\n]/.test(s) ? `"${s}"` : s;
      };
      const lines = [headers.join(",")];
      for (const r of data ?? []) {
        lines.push(headers.map((h) => esc((r as any)[h])).join(","));
      }
      download(`members-${new Date().toISOString().slice(0, 10)}.csv`, lines.join("\n"));
    } catch (e: any) {
      alert(e?.message ?? "Failed to export members");
    } finally {
      setExportingMembers(false);
    }
  };

  return (
    <div className="min-h-screen bg-background font-sans">
      <header className="border-b border-border bg-card sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-5 md:px-8 h-[58px] flex items-center justify-between">
          <Link to="/admin" className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4" /> Admin
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={exportMembers}
              disabled={exportingMembers}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold border border-border bg-card hover:bg-muted/40 disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" /> {exportingMembers ? "Exporting…" : "Export members CSV"}
            </button>
            <button
              onClick={exportCheckins}
              disabled={!rows.length}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12.5px] font-semibold text-primary-foreground bg-primary hover:bg-primary-dark disabled:opacity-60"
            >
              <Download className="w-3.5 h-3.5" /> Export check-ins CSV
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-5 md:px-8 py-8">
        <h1 className="font-serif text-3xl text-foreground mb-1">Member check-ins</h1>
        <p className="text-[13px] text-muted-foreground mb-6">
          Submissions from <code>/check-in</code> — {rows.length} total.
        </p>

        {loading ? (
          <p className="text-[13px] text-muted-foreground">Loading…</p>
        ) : error ? (
          <p className="text-[13px] text-destructive">{error}</p>
        ) : rows.length === 0 ? (
          <div className="border border-dashed border-border rounded-2xl p-10 text-center text-muted-foreground text-[13px]">
            No check-ins yet.
          </div>
        ) : (
          <div className="border border-border rounded-2xl overflow-hidden bg-card">
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead className="bg-muted/40 text-[11.5px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="text-left px-4 py-2.5 font-semibold">When</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Name</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Email</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Phone</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Best time</th>
                    <th className="text-left px-4 py-2.5 font-semibold">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border align-top">
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {new Date(r.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-foreground font-medium">{r.full_name || "—"}</td>
                      <td className="px-4 py-3 text-foreground">{r.email || "—"}</td>
                      <td className="px-4 py-3 text-foreground whitespace-nowrap">
                        <a
                          href={`tel:${r.phone.replace(/\s/g, "")}`}
                          className="inline-flex items-center gap-1 text-primary hover:underline"
                        >
                          <Phone className="w-3 h-3" /> {r.phone}
                        </a>
                      </td>
                      <td className="px-4 py-3 text-foreground">{r.best_time}</td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs">{r.note || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
