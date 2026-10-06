import React, { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { formatIDRFull } from "@/lib/constants";
import { Plus, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

const BUCKETS = [
  { key: "12+months", label: "12+ bulan" },
  { key: "10months", label: "10 bulan" },
  { key: "8months", label: "8 bulan" },
  { key: "6months", label: "6 bulan" },
  { key: "4months", label: "4 bulan" },
  { key: "2months", label: "2 bulan" },
  { key: "1month", label: "1 bulan" },
  { key: "2weeks", label: "2 minggu" },
  { key: "weekof", label: "Minggu H" },
  { key: "dayof", label: "Hari H" },
  { key: "after", label: "Setelah" },
];

function requireAuth(user, nav, bootstrapped) {
  if (!bootstrapped) return false;
  if (!user) { nav("/signin"); return false; }
  return true;
}

export function ChecklistPage() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [newTitle, setNewTitle] = useState("");
  const [newBucket, setNewBucket] = useState("6months");

  useEffect(() => { if (!requireAuth(user, nav, bootstrapped)) return; api.get("/checklist").then((r) => setItems(r.data)); }, [user, nav, bootstrapped]);

  const toggle = async (it) => {
    const next = { ...it, done: !it.done };
    setItems(items.map((x) => x.id === it.id ? next : x));
    await api.put(`/checklist/${it.id}`, next);
  };
  const del = async (it) => { setItems(items.filter((x) => x.id !== it.id)); await api.delete(`/checklist/${it.id}`); };
  const add = async (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const r = await api.post("/checklist", { title: newTitle, bucket: newBucket, done: false });
    setItems([...items, r.data]); setNewTitle("");
  };

  const done = items.filter((x) => x.done).length;
  const total = items.length || 1;
  const pct = Math.round((done / total) * 100);

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Alat Perencanaan</div>
        <h1 className="nk-h1 mb-5">Checklist Pernikahan</h1>
        <div className="max-w-md">
          <div className="flex justify-between text-sm mb-2"><span className="text-stone-600">Progress</span><span data-testid="checklist-progress-pct" className="font-medium">{done} / {items.length} ({pct}%)</span></div>
          <Progress value={pct} className="h-2" />
        </div>

        <form onSubmit={add} className="mt-10 flex flex-col sm:flex-row gap-3 max-w-2xl">
          <Input placeholder="Tambah tugas baru..." value={newTitle} onChange={(e) => setNewTitle(e.target.value)} data-testid="checklist-new-title" />
          <select value={newBucket} onChange={(e) => setNewBucket(e.target.value)} className="border border-stone-300 rounded-sm px-3 py-2 bg-white text-sm" data-testid="checklist-new-bucket">
            {BUCKETS.map((b) => <option key={b.key} value={b.key}>{b.label}</option>)}
          </select>
          <Button type="submit" data-testid="checklist-add" className="rounded-sm bg-stone-900 hover:bg-stone-800"><Plus className="w-4 h-4 mr-1" />Tambah</Button>
        </form>

        <div className="mt-12 space-y-10">
          {BUCKETS.map((b) => {
            const bItems = items.filter((x) => x.bucket === b.key);
            if (bItems.length === 0) return null;
            return (
              <div key={b.key}>
                <div className="flex items-baseline gap-4 mb-4">
                  <div className="nk-overline">{b.label}</div>
                  <div className="h-px bg-stone-200 flex-1" />
                  <div className="text-xs text-stone-500">{bItems.filter((x) => x.done).length}/{bItems.length}</div>
                </div>
                <ul className="space-y-2">
                  {bItems.map((it) => (
                    <li key={it.id} data-testid={`checklist-item-${it.id}`} className="flex items-center justify-between gap-4 border border-stone-200 rounded-sm px-4 py-3 bg-white">
                      <button onClick={() => toggle(it)} data-testid={`checklist-toggle-${it.id}`} className={`w-5 h-5 shrink-0 rounded-sm border flex items-center justify-center ${it.done ? "bg-stone-900 border-stone-900" : "border-stone-400"}`}>
                        {it.done && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                      <span className={`flex-1 text-sm ${it.done ? "line-through text-stone-400" : "text-stone-800"}`}>{it.title}</span>
                      <button onClick={() => del(it)} data-testid={`checklist-delete-${it.id}`} className="text-stone-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </Shell>
  );
}

export function BudgetPage() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => { if (!requireAuth(user, nav, bootstrapped)) return; api.get("/budget").then((r) => setItems(r.data)); }, [user, nav, bootstrapped]);

  const update = async (it, patch) => {
    const next = { ...it, ...patch };
    setItems(items.map((x) => x.id === it.id ? next : x));
    await api.put(`/budget/${it.id}`, next);
  };
  const del = async (it) => { setItems(items.filter((x) => x.id !== it.id)); await api.delete(`/budget/${it.id}`); };
  const add = async () => {
    const r = await api.post("/budget", { category: "Baru", estimated_idr: 0, actual_idr: 0, paid: false });
    setItems([...items, r.data]);
  };

  const totalEst = items.reduce((s, x) => s + (x.estimated_idr || 0), 0);
  const totalAct = items.reduce((s, x) => s + (x.actual_idr || 0), 0);
  const remaining = totalEst - totalAct;

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Alat Perencanaan</div>
        <h1 className="nk-h1 mb-5">Budget Pernikahan (IDR)</h1>

        <div className="grid sm:grid-cols-3 gap-4 mt-8">
          <div className="border border-stone-200 bg-white rounded-sm p-5"><div className="nk-overline">Total Estimasi</div><div data-testid="budget-total-est" className="idr-amount font-serif text-2xl mt-1">{formatIDRFull(totalEst)}</div></div>
          <div className="border border-stone-200 bg-white rounded-sm p-5"><div className="nk-overline">Terpakai (Actual)</div><div data-testid="budget-total-act" className="idr-amount font-serif text-2xl mt-1 text-amber-800">{formatIDRFull(totalAct)}</div></div>
          <div className="border border-stone-900 bg-stone-900 text-stone-50 rounded-sm p-5"><div className="nk-overline !text-stone-400">Sisa</div><div data-testid="budget-remaining" className="idr-amount font-serif text-2xl mt-1">{formatIDRFull(remaining)}</div></div>
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-stone-500 border-b border-stone-200">
                <th className="py-3 font-mono text-xs uppercase tracking-wider">Kategori</th>
                <th className="py-3 font-mono text-xs uppercase tracking-wider">Estimasi</th>
                <th className="py-3 font-mono text-xs uppercase tracking-wider">Actual</th>
                <th className="py-3 font-mono text-xs uppercase tracking-wider">Vendor</th>
                <th className="py-3 font-mono text-xs uppercase tracking-wider">Paid</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} data-testid={`budget-row-${it.id}`} className="border-b border-stone-100">
                  <td className="py-3 pr-3"><Input value={it.category} onChange={(e) => update(it, { category: e.target.value })} className="h-9" data-testid={`budget-cat-${it.id}`} /></td>
                  <td className="py-3 pr-3"><Input type="number" value={it.estimated_idr} onChange={(e) => update(it, { estimated_idr: parseInt(e.target.value || 0) })} className="h-9 w-36" data-testid={`budget-est-${it.id}`} /></td>
                  <td className="py-3 pr-3"><Input type="number" value={it.actual_idr} onChange={(e) => update(it, { actual_idr: parseInt(e.target.value || 0) })} className="h-9 w-36" data-testid={`budget-act-${it.id}`} /></td>
                  <td className="py-3 pr-3"><Input value={it.vendor_name || ""} onChange={(e) => update(it, { vendor_name: e.target.value })} className="h-9" data-testid={`budget-vendor-${it.id}`} /></td>
                  <td className="py-3 pr-3"><input type="checkbox" checked={!!it.paid} onChange={(e) => update(it, { paid: e.target.checked })} data-testid={`budget-paid-${it.id}`} /></td>
                  <td className="py-3"><button onClick={() => del(it)} data-testid={`budget-del-${it.id}`} className="text-stone-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Button onClick={add} className="mt-6 rounded-sm bg-stone-900 hover:bg-stone-800" data-testid="budget-add"><Plus className="w-4 h-4 mr-1" />Tambah kategori</Button>
      </section>
    </Shell>
  );
}

export function GuestListPage() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");

  useEffect(() => { if (!requireAuth(user, nav, bootstrapped)) return; api.get("/guests").then((r) => setItems(r.data)); }, [user, nav, bootstrapped]);

  const update = async (it, patch) => {
    const next = { ...it, ...patch };
    setItems(items.map((x) => x.id === it.id ? next : x));
    await api.put(`/guests/${it.id}`, next);
  };
  const del = async (it) => { setItems(items.filter((x) => x.id !== it.id)); await api.delete(`/guests/${it.id}`); };
  const add = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    const r = await api.post("/guests", { name, side: "both", rsvp_status: "pending", phone_wa: "" });
    setItems([...items, r.data]); setName("");
  };

  const stats = {
    total: items.length,
    attending: items.filter((x) => x.rsvp_status === "attending").length,
    declined: items.filter((x) => x.rsvp_status === "declined").length,
    pending: items.filter((x) => x.rsvp_status === "pending").length,
  };

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Alat Perencanaan</div>
        <h1 className="nk-h1 mb-5">Daftar Tamu</h1>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          {[["Total", stats.total, "guest-stat-total"], ["Hadir", stats.attending, "guest-stat-attending"], ["Tidak hadir", stats.declined, "guest-stat-declined"], ["Pending", stats.pending, "guest-stat-pending"]].map(([k, v, tid], i) => (
            <div key={i} className="border border-stone-200 rounded-sm p-4"><div className="nk-overline">{k}</div><div data-testid={tid} className="font-serif text-2xl mt-1">{v}</div></div>
          ))}
        </div>

        <form onSubmit={add} className="mt-8 flex gap-3 max-w-xl">
          <Input placeholder="Nama tamu baru..." value={name} onChange={(e) => setName(e.target.value)} data-testid="guest-new-name" />
          <Button type="submit" className="rounded-sm bg-stone-900 hover:bg-stone-800" data-testid="guest-add"><Plus className="w-4 h-4 mr-1" />Tambah</Button>
        </form>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="text-left text-stone-500 border-b border-stone-200">
              <th className="py-3 font-mono text-xs uppercase tracking-wider">Nama</th>
              <th className="py-3 font-mono text-xs uppercase tracking-wider">Pihak</th>
              <th className="py-3 font-mono text-xs uppercase tracking-wider">WhatsApp</th>
              <th className="py-3 font-mono text-xs uppercase tracking-wider">RSVP</th>
              <th />
            </tr></thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} data-testid={`guest-row-${it.id}`} className="border-b border-stone-100">
                  <td className="py-3 pr-3"><Input value={it.name} onChange={(e) => update(it, { name: e.target.value })} className="h-9" /></td>
                  <td className="py-3 pr-3">
                    <select value={it.side} onChange={(e) => update(it, { side: e.target.value })} className="h-9 border border-stone-300 rounded-sm px-2 bg-white">
                      <option value="groom">Pria</option><option value="bride">Wanita</option><option value="both">Bersama</option>
                    </select>
                  </td>
                  <td className="py-3 pr-3"><Input value={it.phone_wa || ""} onChange={(e) => update(it, { phone_wa: e.target.value })} className="h-9 w-40" /></td>
                  <td className="py-3 pr-3">
                    <select value={it.rsvp_status} onChange={(e) => update(it, { rsvp_status: e.target.value })} className="h-9 border border-stone-300 rounded-sm px-2 bg-white" data-testid={`guest-rsvp-${it.id}`}>
                      <option value="pending">Pending</option><option value="attending">Hadir</option><option value="declined">Tidak hadir</option>
                    </select>
                  </td>
                  <td className="py-3"><button onClick={() => del(it)} className="text-stone-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Shell>
  );
}
