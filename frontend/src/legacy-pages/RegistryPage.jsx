import React, { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { formatIDRFull } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Check, Heart } from "lucide-react";

const BANKS = ["BCA", "Mandiri", "BRI", "BNI", "CIMB", "Permata", "Other"];

export default function RegistryPage() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [reg, setReg] = useState(null);
  const [newContrib, setNewContrib] = useState({ name: "", amount_idr: 0, method: "BCA", note: "" });

  useEffect(() => {
    if (!bootstrapped) return;
    if (!user) { nav("/signin"); return; }
    api.get("/registry").then((r) => setReg(r.data));
  }, [user, nav, bootstrapped]);

  if (!reg) return <Shell><div className="nk-container py-20">Memuat...</div></Shell>;

  const update = (patch) => setReg({ ...reg, ...patch });
  const saveSettings = async () => {
    const body = {
      enabled: reg.enabled, message: reg.message, qris_image_url: reg.qris_image_url,
      bank_accounts: reg.bank_accounts, thank_you_message: reg.thank_you_message,
    };
    await api.put("/registry", body);
    const r = await api.get("/registry");
    setReg(r.data);
    toast.success("Pengaturan disimpan");
  };
  const addBank = () => update({ bank_accounts: [...reg.bank_accounts, { bank: "BCA", account_number: "", account_holder: "" }] });
  const updateBank = (i, patch) => {
    const next = reg.bank_accounts.map((b, idx) => idx === i ? { ...b, ...patch } : b);
    update({ bank_accounts: next });
  };
  const removeBank = (i) => update({ bank_accounts: reg.bank_accounts.filter((_, idx) => idx !== i) });

  const addContrib = async (e) => {
    e.preventDefault();
    if (!newContrib.name || !newContrib.amount_idr) return;
    const r = await api.post("/registry/contributions", newContrib);
    setReg({ ...reg, contributions: [r.data, ...reg.contributions], total_idr: reg.total_idr + r.data.amount_idr });
    setNewContrib({ name: "", amount_idr: 0, method: "BCA", note: "" });
    toast.success("Amplop dicatat");
  };
  const toggleThanked = async (c) => {
    await api.post(`/registry/contributions/${c.id}/thanked`);
    setReg({ ...reg, contributions: reg.contributions.map((x) => x.id === c.id ? { ...x, thanked: true } : x) });
  };
  const delContrib = async (c) => {
    await api.delete(`/registry/contributions/${c.id}`);
    setReg({ ...reg, contributions: reg.contributions.filter((x) => x.id !== c.id), total_idr: reg.total_idr - c.amount_idr });
  };

  const stats = {
    total: reg.contributions.length,
    thanked: reg.contributions.filter((c) => c.thanked).length,
  };

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Alat Perencanaan</div>
        <h1 className="nk-h1 mb-5">Amplop Digital</h1>
        <p className="nk-lead max-w-2xl">Terima amplop digital via QRIS atau transfer bank. Catat kontribusi, pantau total, dan tandai ucapan terima kasih.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10">
          <div className="border border-stone-200 rounded-sm p-4 bg-white"><div className="nk-overline">Total Diterima</div><div data-testid="registry-total" className="idr-amount font-serif text-2xl mt-1 text-amber-800">{formatIDRFull(reg.total_idr)}</div></div>
          <div className="border border-stone-200 rounded-sm p-4 bg-white"><div className="nk-overline">Entri</div><div className="font-serif text-2xl mt-1">{stats.total}</div></div>
          <div className="border border-stone-200 rounded-sm p-4 bg-white"><div className="nk-overline">Sudah Diterima Kasih</div><div className="font-serif text-2xl mt-1 text-emerald-700">{stats.thanked}</div></div>
          <div className="border border-stone-900 bg-stone-900 text-stone-50 rounded-sm p-4"><div className="nk-overline !text-stone-400">Status</div><div className="font-serif text-xl mt-1">{reg.enabled ? "Aktif" : "Non-aktif"}</div></div>
        </div>

        <div className="grid grid-cols-12 gap-8 mt-10">
          {/* SETTINGS */}
          <div className="col-span-12 lg:col-span-6">
            <h2 className="nk-h3 mb-4">Pengaturan Amplop</h2>
            <div className="space-y-4 border border-stone-200 bg-white rounded-sm p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">Aktifkan amplop digital</div>
                  <div className="text-xs text-stone-600">Tampilkan di undangan digital publik</div>
                </div>
                <Switch checked={reg.enabled} onCheckedChange={(v) => update({ enabled: v })} data-testid="registry-enabled-switch" />
              </div>

              <div>
                <Label>Pesan sambutan</Label>
                <Textarea rows={3} value={reg.message} onChange={(e) => update({ message: e.target.value })} data-testid="registry-message" />
              </div>

              <div>
                <Label>QRIS image URL (opsional)</Label>
                <Input value={reg.qris_image_url} onChange={(e) => update({ qris_image_url: e.target.value })} placeholder="https://..." data-testid="registry-qris-url" />
                {reg.qris_image_url && (
                  <div className="mt-3 p-4 border border-stone-200 rounded-sm bg-stone-50 flex justify-center">
                    <img src={reg.qris_image_url} alt="QRIS" loading="lazy" decoding="async" className="w-48 h-48 object-contain" />
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Rekening Bank</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addBank} data-testid="registry-add-bank" className="rounded-sm">
                    <Plus className="w-3.5 h-3.5 mr-1" />Tambah
                  </Button>
                </div>
                <div className="space-y-2">
                  {reg.bank_accounts.map((b, i) => (
                    <div key={i} className="grid grid-cols-12 gap-2 items-center" data-testid={`registry-bank-${i}`}>
                      <select value={b.bank} onChange={(e) => updateBank(i, { bank: e.target.value })} className="col-span-3 h-10 border border-stone-300 rounded-sm px-2 bg-white text-sm">
                        {BANKS.map((bk) => <option key={bk}>{bk}</option>)}
                      </select>
                      <Input className="col-span-4" placeholder="No. rekening" value={b.account_number} onChange={(e) => updateBank(i, { account_number: e.target.value })} />
                      <Input className="col-span-4" placeholder="A/n" value={b.account_holder} onChange={(e) => updateBank(i, { account_holder: e.target.value })} />
                      <button onClick={() => removeBank(i)} className="col-span-1 text-stone-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <Label>Pesan terima kasih</Label>
                <Textarea rows={2} value={reg.thank_you_message} onChange={(e) => update({ thank_you_message: e.target.value })} />
              </div>

              <Button onClick={saveSettings} data-testid="registry-save" className="rounded-sm bg-stone-900 hover:bg-stone-800">Simpan Pengaturan</Button>
            </div>
          </div>

          {/* INBOX */}
          <div className="col-span-12 lg:col-span-6">
            <h2 className="nk-h3 mb-4">Catatan Amplop Masuk</h2>
            <form onSubmit={addContrib} className="border border-stone-200 bg-white rounded-sm p-4 mb-4 grid grid-cols-12 gap-2">
              <Input className="col-span-5" placeholder="Nama pemberi" value={newContrib.name} onChange={(e) => setNewContrib({ ...newContrib, name: e.target.value })} data-testid="contrib-name" />
              <Input className="col-span-3" type="number" placeholder="Nominal" value={newContrib.amount_idr || ""} onChange={(e) => setNewContrib({ ...newContrib, amount_idr: parseInt(e.target.value || 0) })} data-testid="contrib-amount" />
              <select className="col-span-2 border border-stone-300 rounded-sm px-2 bg-white text-sm" value={newContrib.method} onChange={(e) => setNewContrib({ ...newContrib, method: e.target.value })}>
                {["QRIS", ...BANKS].map((m) => <option key={m}>{m}</option>)}
              </select>
              <Button type="submit" className="col-span-2 rounded-sm bg-stone-900 hover:bg-stone-800" data-testid="contrib-add"><Plus className="w-4 h-4" /></Button>
            </form>

            <div className="space-y-2 max-h-[600px] overflow-auto">
              {reg.contributions.length === 0 && <div className="text-sm text-stone-500 py-6 text-center">Belum ada amplop yang dicatat.</div>}
              {reg.contributions.map((c) => (
                <div key={c.id} className="border border-stone-200 rounded-sm p-3 bg-white flex items-center justify-between" data-testid={`contrib-row-${c.id}`}>
                  <div>
                    <div className="font-medium text-sm">{c.name}</div>
                    <div className="text-xs text-stone-600">{c.method} · <span className="idr-amount font-medium text-stone-900">{formatIDRFull(c.amount_idr)}</span></div>
                    {c.note && <div className="text-xs text-stone-500 mt-1">"{c.note}"</div>}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => toggleThanked(c)} disabled={c.thanked} className={`text-xs px-3 py-1.5 rounded-sm border ${c.thanked ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-stone-300 hover:border-stone-900"}`} data-testid={`contrib-thanked-${c.id}`}>
                      {c.thanked ? <><Check className="w-3 h-3 inline mr-1" />Terima kasih</> : "Tandai TK"}
                    </button>
                    <button onClick={() => delContrib(c)} className="text-stone-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
