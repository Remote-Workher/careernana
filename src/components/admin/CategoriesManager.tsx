import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type Cat = { id: string; name: string; slug: string; position: number; is_active: boolean };

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export default function CategoriesManager() {
  const { toast } = useToast();
  const [rows, setRows] = useState<Cat[]>([]);
  const [refresh, setRefresh] = useState(0);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<Cat> | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase.from("class_categories" as any) as any)
        .select("*").order("position", { ascending: true });
      setRows(data || []);
    })();
  }, [refresh]);

  const openNew = () => { setEditing({ name: "", slug: "", position: rows.length + 1, is_active: true }); setOpen(true); };
  const openEdit = (r: Cat) => { setEditing({ ...r }); setOpen(true); };

  const save = async () => {
    if (!editing?.name?.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    const payload: any = {
      name: editing.name.trim(),
      slug: (editing.slug?.trim() || slugify(editing.name)),
      position: editing.position ?? 0,
      is_active: editing.is_active ?? true,
    };
    let error;
    if ((editing as any).id) {
      ({ error } = await (supabase.from("class_categories" as any) as any).update(payload).eq("id", (editing as any).id));
    } else {
      ({ error } = await (supabase.from("class_categories" as any) as any).insert(payload));
    }
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Saved" }); setOpen(false); setEditing(null); setRefresh(r => r + 1); }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    const { error } = await (supabase.from("class_categories" as any) as any).delete().eq("id", id);
    if (error) toast({ title: "Delete failed", description: error.message, variant: "destructive" });
    else { toast({ title: "Deleted" }); setRefresh(r => r + 1); }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold">Class Categories</h2>
        <Button size="sm" onClick={openNew}><Plus className="w-4 h-4 mr-1" /> New</Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground border-b">
            <tr>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Slug</th>
              <th className="py-2 pr-4">Position</th>
              <th className="py-2 pr-4">Active</th>
              <th className="py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.id} className="border-b last:border-0">
                <td className="py-2 pr-4 font-medium">{r.name}</td>
                <td className="py-2 pr-4 text-muted-foreground">{r.slug}</td>
                <td className="py-2 pr-4">{r.position}</td>
                <td className="py-2 pr-4">{r.is_active ? "Yes" : "No"}</td>
                <td className="py-2 flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openEdit(r)}><Pencil className="w-4 h-4" /></Button>
                  <Button variant="ghost" size="sm" onClick={() => remove(r.id)}><Trash2 className="w-4 h-4" /></Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="text-center py-6 text-sm text-muted-foreground">No categories yet — click New.</div>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{(editing as any)?.id ? "Edit" : "New"} category</DialogTitle></DialogHeader>
          {editing && (
            <div className="space-y-3">
              <div>
                <Label>Name</Label>
                <Input value={editing.name ?? ""} onChange={e => setEditing({ ...editing, name: e.target.value, slug: (editing as any).id ? editing.slug : slugify(e.target.value) })} />
              </div>
              <div>
                <Label>Slug</Label>
                <Input value={editing.slug ?? ""} onChange={e => setEditing({ ...editing, slug: e.target.value })} />
              </div>
              <div>
                <Label>Position</Label>
                <Input type="number" value={editing.position ?? 0} onChange={e => setEditing({ ...editing, position: Number(e.target.value) })} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Switch checked={!!editing.is_active} onCheckedChange={v => setEditing({ ...editing, is_active: v })} /> Active
              </label>
            </div>
          )}
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={save}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
