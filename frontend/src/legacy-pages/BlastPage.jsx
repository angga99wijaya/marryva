import React, { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Send, Check, ExternalLink, MessageCircle } from "lucide-react";

const DEFAULT_TEMPLATE = `Halo {nama}, 👋

Kami ingin mengundang Anda ke pernikahan kami.
Mohon berkenan konfirmasi kehadiran melalui tautan undangan digital berikut:

{link}

Terima kasih atas doa dan restunya 🤍`;

export default function BlastPage() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [guests, setGuests] = useState([]);
  const [stats, setStats] = useState({ total: 0, with_whatsapp: 0, sent: 0 });
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [siteSlug, setSiteSlug] = useState("");

  const load = async () => {
    const [renderR, statsR, siteR] = await Promise.all([
      api.post("/blast/render", { message: resolveMessage(template) }),
      api.get("/blast/stats"),
      api.get("/website/mine"),
    ]);
    setGuests(renderR.data.guests);
    setStats(statsR.data);
    setSiteSlug(siteR.data?.slug || "");
  };

  useEffect(() => {
    if (!bootstrapped) return;
    if (!user) { nav("/signin"); return; }
    load();
  }, [user, nav, bootstrapped]);

  const link = siteSlug ? `${window.location.origin}/u/${siteSlug}` : "https://nikahkita.id/undangan";

  function resolveMessage(tpl) {
    return (tpl || "").replace(/\{link\}/g, link);
  }

  const refreshPreview = () => {
    api.post("/blast/render", { message: resolveMessage(template) }).then((r) => setGuests(r.data.guests));
  };

  const openWA = async (g) => {
    const w = window.open(g.wa_url, "_blank");
    if (w) {
      // mark sent immediately (user has intent)
      await api.post("/blast/mark-sent", { guest_id: g.guest_id });
      setGuests(guests.map((x) => x.guest_id === g.guest_id ? { ...x, sent_at: new Date().toISOString() } : x));
      setStats({ ...stats, sent: stats.sent + (g.sent_at ? 0 : 1) });
    }
  };

  const openAllSequential = async () => {
    toast.info("Membuka WhatsApp satu per satu...");
    for (const g of guests) {
      if (g.sent_at) continue;
      await openWA(g);
      await new Promise((r) => setTimeout(r, 300));
    }
  };

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Alat Perencanaan</div>
        <h1 className="nk-h1 mb-3">WhatsApp Blast Undangan</h1>
        <p className="nk-lead max-w-2xl">Kirim undangan ke semua tamu dengan link personal, lewat deeplink `wa.me`. Status terkirim tercatat otomatis.</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-10">
          <div className="border border-stone-200 bg-white rounded-sm p-4"><div className="nk-overline">Total Tamu</div><div data-testid="blast-stat-total" className="font-serif text-2xl mt-1">{stats.total}</div></div>
          <div className="border border-stone-200 bg-white rounded-sm p-4"><div className="nk-overline">Punya WA</div><div data-testid="blast-stat-with-wa" className="font-serif text-2xl mt-1">{stats.with_whatsapp}</div></div>
          <div className="border border-stone-200 bg-white rounded-sm p-4"><div className="nk-overline">Terkirim</div><div data-testid="blast-stat-sent" className="font-serif text-2xl mt-1 text-emerald-700">{stats.sent}</div></div>
          <div className="border border-stone-900 bg-stone-900 text-stone-50 rounded-sm p-4"><div className="nk-overline !text-stone-400">Progress</div><div className="font-serif text-2xl mt-1">{stats.with_whatsapp ? Math.round((stats.sent / stats.with_whatsapp) * 100) : 0}%</div></div>
        </div>

        <div className="grid grid-cols-12 gap-8 mt-10">
          <div className="col-span-12 lg:col-span-5">
            <h2 className="nk-h3 mb-3">Template Pesan</h2>
            <div className="text-xs text-stone-500 mb-2">Variabel: <code className="font-mono bg-stone-100 px-1">{"{nama}"}</code>, <code className="font-mono bg-stone-100 px-1">{"{link}"}</code></div>
            <Textarea rows={10} value={template} onChange={(e) => setTemplate(e.target.value)} data-testid="blast-template" className="font-mono text-xs" />
            <Button onClick={refreshPreview} variant="outline" className="mt-3 rounded-sm" data-testid="blast-preview">Refresh Preview</Button>
            {!siteSlug && (
              <div className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-sm p-3">
                Buat & publish undangan digital dulu di <code className="font-mono">/tools/website</code> agar `{"{link}"}` otomatis terisi URL undangan.
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-7">
            <div className="flex items-center justify-between mb-3">
              <h2 className="nk-h3">Preview per Tamu</h2>
              <Button onClick={openAllSequential} disabled={guests.length === 0} className="rounded-sm bg-emerald-600 hover:bg-emerald-700" data-testid="blast-send-all">
                <Send className="w-4 h-4 mr-1.5" />Kirim ke Semua ({guests.length})
              </Button>
            </div>
            {guests.length === 0 && (
              <div className="border border-stone-200 bg-white rounded-sm p-6 text-sm text-stone-500 text-center">
                Belum ada tamu dengan nomor WhatsApp. Tambahkan di <code className="font-mono">/tools/guests</code> dulu.
              </div>
            )}
            <div className="space-y-2 max-h-[640px] overflow-auto">
              {guests.map((g) => (
                <div key={g.guest_id} className="border border-stone-200 bg-white rounded-sm p-4" data-testid={`blast-guest-${g.guest_id}`}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium text-sm">{g.name}</div>
                      <div className="text-xs text-stone-500 font-mono">+{g.phone_wa}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {g.sent_at && <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><Check className="w-3.5 h-3.5" />Terkirim</span>}
                      <Button onClick={() => openWA(g)} size="sm" className={`rounded-sm ${g.sent_at ? "bg-stone-200 text-stone-700 hover:bg-stone-300" : "bg-emerald-600 hover:bg-emerald-700 text-white"}`} data-testid={`blast-send-${g.guest_id}`}>
                        <MessageCircle className="w-3.5 h-3.5 mr-1" />{g.sent_at ? "Kirim lagi" : "Kirim"}
                        <ExternalLink className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                  <pre className="mt-3 text-xs text-stone-700 bg-stone-50 border border-stone-200 rounded-sm p-3 whitespace-pre-wrap font-sans">{g.message}</pre>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}
