import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Shell } from "@/components/Shell";
import { api, API } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Trash2, Copy, ExternalLink, Lock, Heart, Calendar, MapPin } from "lucide-react";
import { formatIDRFull } from "@/lib/constants";

const TEMPLATES = [
  { key: "jawa", name: "Jawa Klasik", accent: "#8B2E2A", bg: "#F5EDE4", font: "font-serif", preview: "https://images.unsplash.com/photo-1623991614441-2b124385eb63?crop=entropy&cs=srgb&fm=jpg&q=85" },
  { key: "sunda", name: "Sunda Siger", accent: "#1F6E3D", bg: "#F0F3EB", font: "font-serif", preview: "https://images.unsplash.com/photo-1650377509428-11e7fe8614a9?crop=entropy&cs=srgb&fm=jpg&q=85" },
  { key: "bali", name: "Bali Payas", accent: "#B4531C", bg: "#F7EDE1", font: "font-serif", preview: "https://images.unsplash.com/photo-1724855946379-451f59d45df6?crop=entropy&cs=srgb&fm=jpg&q=85" },
  { key: "minang", name: "Minang Suntiang", accent: "#9C1A28", bg: "#FBF3E8", font: "font-serif", preview: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?crop=entropy&cs=srgb&fm=jpg&q=85" },
  { key: "batak", name: "Batak Ulos", accent: "#5A3A1E", bg: "#F3EADA", font: "font-serif", preview: "https://images.unsplash.com/photo-1627818243473-acb731041bd5?crop=entropy&cs=srgb&fm=jpg&q=85" },
  { key: "chinese", name: "Chinese Teapai", accent: "#B01B2E", bg: "#FFF4E6", font: "font-serif", preview: "https://images.unsplash.com/photo-1719512037487-78e399b58a53?crop=entropy&cs=srgb&fm=jpg&q=85" },
  { key: "modern", name: "Modern Minimalis", accent: "#1C1917", bg: "#FAF8F5", font: "font-serif", preview: "https://images.unsplash.com/photo-1738225734899-30852be7e396?crop=entropy&cs=srgb&fm=jpg&q=85" },
];

const emptyEvent = () => ({ title: "Akad", date: "", time: "", venue: "", address: "" });

export function WebsiteBuilderPage() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!user) { nav("/signin"); return; }
    api.get("/website/mine").then((r) => {
      const s = r.data;
      setSite(s ? { ...s, password: "" } : {
        template: "modern", bride_name: "", groom_name: "", bride_parents: "", groom_parents: "",
        wedding_date: "", cover_image: "https://images.unsplash.com/photo-1650377509488-724221735c19?crop=entropy&cs=srgb&fm=jpg&q=85",
        story: "", events: [{ ...emptyEvent(), title: "Akad" }, { ...emptyEvent(), title: "Resepsi" }], gallery: [],
        rsvp_enabled: true, registry_enabled: true, password: "", has_password: false, published: false,
      });
      setLoading(false);
    });
  }, [user, nav, bootstrapped]);

  if (loading || !site) return <Shell><div className="nk-container py-20">Memuat...</div></Shell>;

  const update = (patch) => setSite({ ...site, ...patch });
  const save = async () => {
    const body = {
      template: site.template, bride_name: site.bride_name, groom_name: site.groom_name,
      bride_parents: site.bride_parents, groom_parents: site.groom_parents,
      wedding_date: site.wedding_date, cover_image: site.cover_image, story: site.story,
      events: site.events, gallery: site.gallery.filter(Boolean),
      rsvp_enabled: site.rsvp_enabled, registry_enabled: site.registry_enabled,
      password: site.password || "", published: site.published,
    };
    const r = await api.put("/website/mine", body);
    setSite({ ...r.data, password: "" });
    toast.success("Undangan disimpan");
  };
  const publish = async () => { update({ published: true }); setTimeout(save, 100); };

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nikahkita.id";
  const publicUrl = site.slug ? new URL(`/u/${site.slug}`, siteUrl).toString() : "";
  const copyUrl = () => { navigator.clipboard.writeText(publicUrl); toast.success("Link disalin"); };

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Alat Perencanaan</div>
        <h1 className="nk-h1 mb-3">Undangan Digital Builder</h1>
        <p className="nk-lead max-w-2xl">Pilih template adat, isi detail, publish, lalu bagikan link ke tamu via WhatsApp. RSVP otomatis sync ke daftar tamu.</p>

        {site.slug && site.published && (
          <div className="mt-6 border border-emerald-300 bg-emerald-50 rounded-sm p-4 flex items-center justify-between" data-testid="website-published-banner">
            <div>
              <div className="nk-overline !text-emerald-800">Live</div>
              <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm font-mono text-emerald-900 underline inline-flex items-center gap-1 mt-1">{publicUrl}<ExternalLink className="w-3.5 h-3.5" /></a>
            </div>
            <Button onClick={copyUrl} variant="outline" className="rounded-sm" data-testid="website-copy-url"><Copy className="w-4 h-4 mr-1" />Copy</Button>
          </div>
        )}

        <div className="mt-10">
          <div className="nk-overline mb-3">1. Pilih Template Adat</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {TEMPLATES.map((t) => (
              <button key={t.key} onClick={() => update({ template: t.key })}
                data-testid={`template-${t.key}`}
                className={`relative rounded-sm overflow-hidden border-2 transition-all ${site.template === t.key ? "border-stone-900 ring-2 ring-amber-700/40" : "border-stone-200 hover:border-stone-400"}`}>
                <div className="relative aspect-[3/4] overflow-hidden">
                  <Image
                    src={t.preview}
                    alt={t.name}
                    fill
                    sizes="(min-width: 1024px) 14vw, (min-width: 640px) 30vw, 50vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-2 text-xs font-medium text-left">{t.name}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-12 gap-8 mt-10">
          {/* FORM */}
          <div className="col-span-12 lg:col-span-7 space-y-5">
            <div className="nk-overline">2. Detail Pengantin</div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Nama Pengantin Wanita</Label><Input value={site.bride_name} onChange={(e) => update({ bride_name: e.target.value })} data-testid="website-bride-name" /></div>
              <div><Label>Nama Pengantin Pria</Label><Input value={site.groom_name} onChange={(e) => update({ groom_name: e.target.value })} data-testid="website-groom-name" /></div>
              <div><Label>Orang tua wanita</Label><Input value={site.bride_parents} onChange={(e) => update({ bride_parents: e.target.value })} placeholder="Putri dari Bpk X & Ibu Y" /></div>
              <div><Label>Orang tua pria</Label><Input value={site.groom_parents} onChange={(e) => update({ groom_parents: e.target.value })} placeholder="Putra dari Bpk A & Ibu B" /></div>
              <div><Label>Tanggal pernikahan</Label><Input type="date" value={site.wedding_date} onChange={(e) => update({ wedding_date: e.target.value })} data-testid="website-wedding-date" /></div>
              <div><Label>Cover image URL</Label><Input value={site.cover_image} onChange={(e) => update({ cover_image: e.target.value })} /></div>
            </div>

            <div>
              <Label>Kisah Cinta</Label>
              <Textarea rows={4} value={site.story} onChange={(e) => update({ story: e.target.value })} placeholder="Kami bertemu pertama kali..." data-testid="website-story" />
            </div>

            <div>
              <div className="nk-overline mt-6 mb-2">3. Jadwal Acara</div>
              {site.events.map((ev, i) => (
                <div key={i} className="border border-stone-200 bg-white rounded-sm p-4 mb-2 grid grid-cols-12 gap-2" data-testid={`website-event-${i}`}>
                  <Input className="col-span-3" placeholder="Judul (Akad/Resepsi)" value={ev.title} onChange={(e) => { const next = [...site.events]; next[i] = { ...ev, title: e.target.value }; update({ events: next }); }} />
                  <Input className="col-span-3" type="date" value={ev.date} onChange={(e) => { const next = [...site.events]; next[i] = { ...ev, date: e.target.value }; update({ events: next }); }} />
                  <Input className="col-span-2" type="time" value={ev.time} onChange={(e) => { const next = [...site.events]; next[i] = { ...ev, time: e.target.value }; update({ events: next }); }} />
                  <Input className="col-span-3" placeholder="Venue" value={ev.venue} onChange={(e) => { const next = [...site.events]; next[i] = { ...ev, venue: e.target.value }; update({ events: next }); }} />
                  <button onClick={() => update({ events: site.events.filter((_, idx) => idx !== i) })} className="col-span-1 text-stone-400 hover:text-rose-600"><Trash2 className="w-4 h-4" /></button>
                  <Input className="col-span-12" placeholder="Alamat lengkap" value={ev.address} onChange={(e) => { const next = [...site.events]; next[i] = { ...ev, address: e.target.value }; update({ events: next }); }} />
                </div>
              ))}
              <Button type="button" variant="outline" onClick={() => update({ events: [...site.events, emptyEvent()] })} className="rounded-sm" data-testid="website-add-event"><Plus className="w-3.5 h-3.5 mr-1" />Tambah acara</Button>
            </div>

            <div>
              <div className="nk-overline mt-6 mb-2">4. Galeri (URL image per baris)</div>
              <Textarea rows={4} value={site.gallery.join("\n")} onChange={(e) => update({ gallery: e.target.value.split("\n") })} placeholder="https://... (satu URL per baris)" />
            </div>

            <div className="border border-stone-200 bg-white rounded-sm p-4 space-y-3">
              <div className="nk-overline">5. Pengaturan</div>
              <div className="flex items-center justify-between"><div><div className="font-medium">RSVP aktif</div><div className="text-xs text-stone-600">Tamu bisa konfirmasi lewat website</div></div><Switch checked={site.rsvp_enabled} onCheckedChange={(v) => update({ rsvp_enabled: v })} data-testid="website-rsvp-switch" /></div>
              <div className="flex items-center justify-between"><div><div className="font-medium">Amplop digital aktif</div><div className="text-xs text-stone-600">Tampilkan QRIS & rekening</div></div><Switch checked={site.registry_enabled} onCheckedChange={(v) => update({ registry_enabled: v })} /></div>
              <div>
                <Label>Password (opsional)</Label>
                <Input type="password" value={site.password} onChange={(e) => update({ password: e.target.value })} placeholder={site.has_password ? "••••• (sudah diset — isi untuk ganti)" : "Kosongkan untuk tanpa password"} data-testid="website-password" />
                {site.has_password && !site.password && <div className="text-[11px] text-stone-500 mt-1">Password sudah tersimpan (hashed). Isi field untuk mengganti.</div>}
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button onClick={save} className="rounded-sm bg-stone-900 hover:bg-stone-800" data-testid="website-save">Simpan Draft</Button>
              <Button onClick={publish} className="rounded-sm bg-emerald-600 hover:bg-emerald-700" data-testid="website-publish">Publish</Button>
              {site.slug && <Link to={`/u/${site.slug}`} target="_blank" className="text-sm underline inline-flex items-center gap-1 py-2">Preview<ExternalLink className="w-3.5 h-3.5" /></Link>}
            </div>
          </div>

          {/* LIVE PREVIEW */}
          <div className="col-span-12 lg:col-span-5">
            <div className="lg:sticky lg:top-24">
              <div className="nk-overline mb-3">Preview</div>
              <WeddingSitePreview site={site} />
            </div>
          </div>
        </div>
      </section>
    </Shell>
  );
}

function WeddingSitePreview({ site }) {
  const tpl = TEMPLATES.find((t) => t.key === site.template) || TEMPLATES[0];
  return (
    <div className="border border-stone-200 rounded-sm overflow-hidden" style={{ background: tpl.bg }}>
      <div className="relative aspect-[3/4]">
        {site.cover_image && <img src={site.cover_image} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 text-white">
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] mb-2" style={{ color: tpl.accent }}>The Wedding of</div>
          <div className={`${tpl.font} italic text-3xl leading-tight`}>{site.bride_name || "Nama Wanita"} <span className="opacity-80">&</span> {site.groom_name || "Nama Pria"}</div>
          {site.wedding_date && <div className="text-sm mt-2">{new Date(site.wedding_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>}
        </div>
      </div>
      <div className="p-5 space-y-4" style={{ color: "#1C1917" }}>
        <div className="text-center">
          <div className="font-mono text-[10px] uppercase tracking-widest mb-1" style={{ color: tpl.accent }}>Acara</div>
          {site.events.filter((e) => e.title).slice(0, 2).map((e, i) => (
            <div key={i} className="py-2 border-t first:border-t-0 border-stone-300/50">
              <div className={`${tpl.font} text-xl`}>{e.title}</div>
              {(e.date || e.time) && <div className="text-xs">{e.date}{e.time ? ` · ${e.time}` : ""}</div>}
              {e.venue && <div className="text-xs">{e.venue}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PublicWeddingSite() {
  const { slug } = useParams();
  const [data, setData] = useState(null);
  const [password, setPassword] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [rsvp, setRsvp] = useState({ name: "", attending: true, phone_wa: "", message: "", guests: 1 });
  const [rsvpSent, setRsvpSent] = useState(false);

  useEffect(() => {
    const request = password
      ? api.post(`/website/public/${slug}`, { password })
      : api.get(`/website/public/${slug}`);
    request.then((r) => setData(r.data)).catch(() => setData({ error: true }));
  }, [slug, password]);

  if (!data) return <div className="min-h-screen flex items-center justify-center">Memuat...</div>;
  if (data.error) return <div className="min-h-screen flex items-center justify-center p-6 text-center"><div><div className="font-serif text-3xl mb-2">Undangan tidak ditemukan</div><div className="text-stone-600">Link mungkin salah atau undangan belum di-publish.</div></div></div>;

  if (data.locked) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-stone-50">
        <form onSubmit={(e) => { e.preventDefault(); setPassword(passwordInput); }} className="max-w-sm w-full bg-white border border-stone-200 rounded-sm p-8 text-center">
          <Lock className="w-8 h-8 mx-auto text-amber-800 mb-3" />
          <div className="font-serif text-2xl mb-1">{data.bride_name} & {data.groom_name}</div>
          <div className="text-sm text-stone-600 mb-5">Undangan ini terkunci. Masukkan password dari pengantin.</div>
          <Input value={passwordInput} onChange={(e) => setPasswordInput(e.target.value)} placeholder="Password" data-testid="public-password-input" />
          <Button type="submit" className="w-full mt-3 rounded-sm bg-stone-900 hover:bg-stone-800" data-testid="public-password-submit">Buka</Button>
        </form>
      </div>
    );
  }

  const tpl = TEMPLATES.find((t) => t.key === data.template) || TEMPLATES[6];
  const submitRsvp = async (e) => {
    e.preventDefault();
    try {
      await api.post(`/website/public/${slug}/rsvp`, { ...rsvp, password });
      setRsvpSent(true);
      toast.success("RSVP terkirim. Terima kasih!");
    } catch (err) { toast.error("Gagal mengirim RSVP"); }
  };

  return (
    <div style={{ background: tpl.bg }} className="min-h-screen">
      {/* COVER */}
      <section className="relative min-h-screen flex items-end">
        <img src={data.cover_image} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
        <div className="relative z-10 max-w-3xl mx-auto px-6 pb-16 text-center text-white w-full">
          <div className="font-mono text-xs uppercase tracking-[0.4em] mb-3" style={{ color: "#f4d1a3" }}>The Wedding of</div>
          <h1 className={`${tpl.font} italic text-5xl sm:text-6xl lg:text-7xl leading-[1.05]`}>{data.bride_name}<br /><span className="opacity-80 text-4xl">&</span><br />{data.groom_name}</h1>
          {data.wedding_date && <div className="mt-6 text-lg">{new Date(data.wedding_date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>}
        </div>
      </section>

      {/* INTRO */}
      {(data.bride_parents || data.groom_parents) && (
        <section className="max-w-2xl mx-auto px-6 py-20 text-center" style={{ color: "#1C1917" }}>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] mb-3" style={{ color: tpl.accent }}>Dengan Memohon Rahmat Tuhan YME</div>
          <p className={`${tpl.font} text-xl leading-relaxed`}>Kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri acara pernikahan</p>
          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-10">
            <div>
              <div className={`${tpl.font} italic text-3xl`}>{data.bride_name}</div>
              <div className="text-sm mt-2 text-stone-600">{data.bride_parents}</div>
            </div>
            <div>
              <div className={`${tpl.font} italic text-3xl`}>{data.groom_name}</div>
              <div className="text-sm mt-2 text-stone-600">{data.groom_parents}</div>
            </div>
          </div>
        </section>
      )}

      {/* STORY */}
      {data.story && (
        <section className="max-w-2xl mx-auto px-6 py-16 text-center" style={{ color: "#1C1917" }}>
          <div className="font-mono text-[11px] uppercase tracking-[0.3em] mb-3" style={{ color: tpl.accent }}>Kisah Kami</div>
          <p className="text-base leading-relaxed whitespace-pre-wrap">{data.story}</p>
        </section>
      )}

      {/* EVENTS */}
      <section className="max-w-3xl mx-auto px-6 py-16" style={{ color: "#1C1917" }}>
        <div className="text-center font-mono text-[11px] uppercase tracking-[0.3em] mb-6" style={{ color: tpl.accent }}>Jadwal Acara</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {data.events?.filter((e) => e.title).map((e, i) => (
            <div key={i} className="border border-stone-900/15 rounded-sm p-6 text-center bg-white/50">
              <div className={`${tpl.font} italic text-3xl`} style={{ color: tpl.accent }}>{e.title}</div>
              <div className="mt-3 flex items-center justify-center gap-1 text-sm"><Calendar className="w-3.5 h-3.5" />{e.date} {e.time && `· ${e.time}`}</div>
              {e.venue && <div className="mt-2 font-medium">{e.venue}</div>}
              {e.address && (
                <div className="text-xs text-stone-600 mt-1 flex flex-col items-center gap-1">
                  <span className="inline-flex items-start gap-1"><MapPin className="w-3 h-3 mt-0.5 shrink-0" />{e.address}</span>
                  <a
                    href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${e.address}, Indonesia`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline underline-offset-2 hover:text-stone-900">
                    Lihat peta
                  </a>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* GALLERY */}
      {data.gallery?.length > 0 && (
        <section className="max-w-5xl mx-auto px-6 py-16">
          <div className="text-center font-mono text-[11px] uppercase tracking-[0.3em] mb-6" style={{ color: tpl.accent }}>Galeri</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {data.gallery.map((g, i) => (
              <div key={i} className="aspect-square overflow-hidden rounded-sm"><img src={g} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" /></div>
            ))}
          </div>
        </section>
      )}

      {/* RSVP */}
      {data.rsvp_enabled && (
        <section className="max-w-xl mx-auto px-6 py-16" style={{ color: "#1C1917" }}>
          <div className="text-center font-mono text-[11px] uppercase tracking-[0.3em] mb-3" style={{ color: tpl.accent }}>RSVP</div>
          <div className={`${tpl.font} italic text-3xl text-center mb-6`}>Konfirmasi Kehadiran</div>
          {rsvpSent ? (
            <div className="text-center p-6 border border-emerald-300 bg-emerald-50 rounded-sm" data-testid="public-rsvp-success">
              <Heart className="w-6 h-6 text-emerald-700 mx-auto mb-2" />
              <div className="font-medium">Terima kasih!</div>
              <div className="text-sm text-stone-700 mt-1">RSVP kamu sudah masuk ke daftar pengantin.</div>
            </div>
          ) : (
            <form onSubmit={submitRsvp} className="bg-white border border-stone-200 rounded-sm p-5 space-y-3">
              <div><Label className="text-xs">Nama lengkap</Label><Input required value={rsvp.name} onChange={(e) => setRsvp({ ...rsvp, name: e.target.value })} data-testid="public-rsvp-name" /></div>
              <div><Label className="text-xs">WhatsApp</Label><Input value={rsvp.phone_wa} onChange={(e) => setRsvp({ ...rsvp, phone_wa: e.target.value })} data-testid="public-rsvp-phone" /></div>
              <div><Label className="text-xs">Jumlah tamu</Label><Input type="number" min="1" max="20" value={rsvp.guests} onChange={(e) => setRsvp({ ...rsvp, guests: parseInt(e.target.value || 1) })} /></div>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setRsvp({ ...rsvp, attending: true })} className={`py-2.5 rounded-sm text-sm font-medium transition-colors ${rsvp.attending ? "bg-emerald-600 text-white" : "bg-stone-100 text-stone-700"}`} data-testid="public-rsvp-attend">Hadir</button>
                <button type="button" onClick={() => setRsvp({ ...rsvp, attending: false })} className={`py-2.5 rounded-sm text-sm font-medium transition-colors ${!rsvp.attending ? "bg-rose-600 text-white" : "bg-stone-100 text-stone-700"}`} data-testid="public-rsvp-decline">Berhalangan</button>
              </div>
              <div><Label className="text-xs">Pesan untuk pengantin</Label><Textarea rows={3} value={rsvp.message} onChange={(e) => setRsvp({ ...rsvp, message: e.target.value })} /></div>
              <Button type="submit" className="w-full rounded-sm bg-stone-900 hover:bg-stone-800" data-testid="public-rsvp-submit">Kirim RSVP</Button>
            </form>
          )}
        </section>
      )}

      <footer className="text-center py-10 text-xs text-stone-600">Made with <Heart className="inline w-3 h-3 fill-rose-500 stroke-rose-500" /> on NikahKita</footer>
    </div>
  );
}
