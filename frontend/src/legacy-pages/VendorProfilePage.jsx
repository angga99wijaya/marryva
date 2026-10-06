import React, { useEffect, useState } from "react";
import Image from "next/image";
import { useParams } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { formatIDR, formatIDRFull, waLink } from "@/lib/constants";
import { useApp } from "@/lib/store";
import { Heart, Star, MapPin, Users, Clock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

/** @param {{ initialVendor?: Record<string, unknown> | null }} props */
export default function VendorProfilePage({ initialVendor = null }) {
  const { id } = useParams();
  const { user } = useApp();
  const [v, setV] = useState(initialVendor);
  const [loadError, setLoadError] = useState(false);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [activeImg, setActiveImg] = useState(0);
  const [form, setForm] = useState({ name: "", email: "", phone: "", event_date: "", guest_count: 500, message: "" });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let active = true;
    api.get(`/vendors/${id}`)
      .then((r) => {
        if (active) {
          setV(r.data);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (active && !initialVendor) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, [id, initialVendor, loadAttempt]);

  useEffect(() => {
    if (user && v) setForm((f) => ({ ...f, name: user.name, email: user.email }));
  }, [user, v]);

  if (!v) {
    return (
      <Shell>
        <div className="nk-container py-20 text-center text-stone-500" role={loadError ? "alert" : "status"}>
          {loadError ? (
            <>
              <p>Informasi vendor belum dapat dimuat.</p>
              <button
                type="button"
                onClick={() => {
                  setLoadError(false);
                  setLoadAttempt((attempt) => attempt + 1);
                }}
                className="mt-3 underline underline-offset-2">
                Coba lagi
              </button>
            </>
          ) : "Memuat informasi vendor..."}
        </div>
      </Shell>
    );
  }

  const submitInquiry = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post("/inquiries", { ...form, vendor_id: v.id });
      toast.success("Permintaan terkirim! Vendor akan menghubungi Anda via WhatsApp/email.");
      setForm((f) => ({ ...f, message: "" }));
    } catch { toast.error("Gagal mengirim"); }
    setSubmitting(false);
  };

  const openWA = () => {
    const msg = `Halo ${v.name}, saya menemukan Anda via NikahKita.
Tanggal acara: ${form.event_date || "-"}
Jumlah tamu: ${form.guest_count || "-"}
Mohon info paket dan ketersediaan ya. Terima kasih.`;
    window.open(waLink(v.whatsapp, msg), "_blank");
  };

  return (
    <Shell>
      {/* HERO GALLERY */}
      <section className="nk-container pt-8">
        <div className="grid grid-cols-12 gap-3">
          <div className="relative col-span-12 lg:col-span-8 aspect-[16/10] overflow-hidden rounded-sm bg-stone-200">
            <Image
              data-testid="vendor-hero-image"
              src={v.gallery?.[activeImg] || v.cover_image}
              alt={v.name}
              fill
              priority
              sizes="(min-width: 1024px) 60vw, 100vw"
              className="object-cover"
            />
          </div>
          <div className="col-span-12 lg:col-span-4 grid grid-cols-4 lg:grid-cols-2 gap-3">
            {(v.gallery || []).slice(0, 4).map((img, i) => (
              <button
                key={i} data-testid={`vendor-gallery-thumb-${i}`}
                onClick={() => setActiveImg(i)}
                className={`relative aspect-square overflow-hidden rounded-sm border-2 ${activeImg === i ? "border-stone-900" : "border-transparent"}`}>
                <Image src={img} alt="" fill sizes="(min-width: 1024px) 20vw, 25vw" className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* TITLE */}
        <div className="mt-8 grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-8">
            <div className="nk-overline mb-2">{v.category}</div>
            <h1 className="nk-h1 mb-3">{v.name}</h1>
            <div className="flex flex-wrap items-center gap-5 text-sm text-stone-700">
              <span className="inline-flex items-center gap-1.5"><Star className="w-4 h-4 fill-amber-500 stroke-amber-500" /><span className="font-medium text-stone-900">{v.rating_avg}</span>({v.review_count} ulasan)</span>
              <span className="inline-flex items-center gap-1.5"><MapPin className="w-4 h-4" />{v.city}</span>
              {v.capacity_max > 0 && <span className="inline-flex items-center gap-1.5"><Users className="w-4 h-4" />{v.capacity_min}–{v.capacity_max.toLocaleString('id-ID')} pax</span>}
              {v.verified && <span className="inline-flex items-center gap-1.5 text-emerald-700"><ShieldCheck className="w-4 h-4" />Verified</span>}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {v.adat_tags?.map((a) => <span key={a} className="nk-chip">{a}</span>)}
            </div>

            {/* TABS */}
            <Tabs defaultValue="about" className="mt-10">
              <TabsList className="bg-transparent border-b border-stone-200 rounded-none h-auto p-0 w-full justify-start gap-6">
                {["about", "packages", "reviews", "map"].map((k) => (
                  <TabsTrigger key={k} value={k} data-testid={`vendor-tab-${k}`}
                    className="rounded-none bg-transparent border-b-2 border-transparent data-[state=active]:border-stone-900 data-[state=active]:bg-transparent data-[state=active]:shadow-none px-0 pb-3 capitalize font-sans">
                    {k === "about" ? "Tentang" : k === "packages" ? "Paket & Harga" : k === "reviews" ? "Ulasan" : "Lokasi"}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="about" className="pt-6 space-y-5 text-stone-700">
                <p className="leading-relaxed">{v.description}</p>
                <div className="grid sm:grid-cols-3 gap-4 pt-4">
                  <div className="border border-stone-200 rounded-sm p-4">
                    <div className="nk-overline mb-1">Alamat</div>
                    <div className="text-sm">{v.address}</div>
                    {v.address && (
                      <a
                        href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${v.address}, ${v.city}, Indonesia`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm underline underline-offset-2 mt-2 inline-block">
                        Lihat peta
                      </a>
                    )}
                  </div>
                  <div className="border border-stone-200 rounded-sm p-4"><div className="nk-overline mb-1">Indoor/Outdoor</div><div className="text-sm capitalize">{v.indoor_outdoor}</div></div>
                  <div className="border border-stone-200 rounded-sm p-4"><div className="nk-overline mb-1">Response time</div><div className="text-sm inline-flex items-center gap-1"><Clock className="w-3.5 h-3.5" />Dalam 2 jam</div></div>
                </div>
              </TabsContent>

              <TabsContent value="packages" className="pt-6">
                <div className="grid md:grid-cols-3 gap-4">
                  {v.packages?.map((p) => (
                    <div key={p.id} data-testid={`package-${p.id}`} className="border border-stone-200 rounded-sm p-5 flex flex-col">
                      <div className="font-serif text-xl">{p.name}</div>
                      <div className="idr-amount mt-2 text-2xl font-medium text-stone-900">{formatIDR(p.price_idr)}</div>
                      <div className="text-xs text-stone-500 mb-4">DP {p.dp_percent}% · pelunasan H-14</div>
                      <ul className="space-y-2 text-sm text-stone-700 flex-1">
                        {p.inclusions.map((inc, i) => <li key={i} className="flex gap-2"><CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />{inc}</li>)}
                      </ul>
                      <Button onClick={openWA} className="mt-4 bg-emerald-600 hover:bg-emerald-700 rounded-sm" data-testid={`package-wa-${p.id}`}>Tanya via WhatsApp</Button>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="reviews" className="pt-6 space-y-4">
                {v.reviews?.length === 0 && <div className="text-stone-500 text-sm">Belum ada ulasan.</div>}
                {v.reviews?.map((r) => (
                  <div key={r.id} className="border-b border-stone-200 pb-4" data-testid={`review-${r.id}`}>
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-stone-200 flex items-center justify-center text-sm font-medium">{r.user_name?.[0]}</div>
                      <div>
                        <div className="text-sm font-medium text-stone-900">{r.user_name}</div>
                        <div className="flex items-center gap-1 text-amber-500">{[...Array(r.rating)].map((_, i) => <Star key={i} className="w-3.5 h-3.5 fill-amber-500 stroke-amber-500" />)}</div>
                      </div>
                    </div>
                    <div className="mt-2 font-medium text-stone-900">{r.title}</div>
                    <p className="text-sm text-stone-700 mt-1">{r.body}</p>
                  </div>
                ))}
              </TabsContent>

              <TabsContent value="map" className="pt-6">
                <div className="aspect-[16/9] bg-stone-100 border border-stone-200 rounded-sm flex flex-col items-center justify-center text-stone-600 text-sm p-6 text-center">
                  <MapPin className="w-5 h-5 mb-2" />
                  <div>{v.address || v.city}</div>
                  {(v.address || v.city) && (
                    <a
                      href={`https://www.openstreetmap.org/search?query=${encodeURIComponent(`${v.address ? `${v.address}, ` : ""}${v.city}, Indonesia`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline underline-offset-2 mt-3">
                      Buka di OpenStreetMap
                    </a>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* STICKY LEAD CARD */}
          <aside className="lg:col-span-4">
            <div className="lg:sticky lg:top-24 border border-stone-900 rounded-sm bg-white p-6">
              <div className="nk-overline mb-1">Mulai dari</div>
              <div className="idr-amount text-3xl font-serif font-medium text-stone-900">{formatIDR(v.price_min)}</div>
              <div className="text-xs text-stone-500">hingga {formatIDR(v.price_max)}</div>

              <Button onClick={openWA} data-testid="vendor-sticky-wa-cta" className="mt-5 w-full bg-emerald-600 hover:bg-emerald-700 rounded-sm">
                Chat via WhatsApp
              </Button>

              <div className="mt-5 pt-5 border-t border-stone-200">
                <div className="nk-overline mb-3">Atau kirim permintaan</div>
                <form onSubmit={submitInquiry} className="space-y-3">
                  <div><Label htmlFor="iname" className="text-xs">Nama</Label><Input id="iname" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="inquiry-name" /></div>
                  <div><Label htmlFor="iemail" className="text-xs">Email</Label><Input id="iemail" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="inquiry-email" /></div>
                  <div><Label htmlFor="iphone" className="text-xs">WhatsApp</Label><Input id="iphone" required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="inquiry-phone" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><Label className="text-xs">Tanggal</Label><Input type="date" value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} data-testid="inquiry-date" /></div>
                    <div><Label className="text-xs">Jumlah tamu</Label><Input type="number" value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: parseInt(e.target.value || 0) })} data-testid="inquiry-guests" /></div>
                  </div>
                  <div><Label className="text-xs">Pesan</Label><Textarea rows={3} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} data-testid="inquiry-message" /></div>
                  <Button type="submit" disabled={submitting} data-testid="inquiry-submit" className="w-full rounded-sm bg-stone-900 hover:bg-stone-800">
                    {submitting ? "Mengirim..." : "Minta Penawaran"}
                  </Button>
                </form>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </Shell>
  );
}
