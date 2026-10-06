import React, { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { VendorCard } from "@/components/VendorCard";
import { formatIDRFull } from "@/lib/constants";
import { CATEGORIES, CITIES, ADAT } from "@/lib/constants";

export function FavoritesPage() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  useEffect(() => { if (!bootstrapped) return; if (!user) { nav("/signin"); return; } api.get("/favorites").then((r) => setItems(r.data)); }, [user, nav, bootstrapped]);

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Akun</div>
        <h1 className="nk-h1 mb-5">Vendor Tersimpan</h1>
        {items.length === 0 ? (
          <div className="text-stone-600 py-10">Belum ada vendor yang kamu simpan.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10">
            {items.map((v) => <VendorCard key={v.id} vendor={v} />)}
          </div>
        )}
      </section>
    </Shell>
  );
}

export function VendorDashboardPage() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [inquiries, setInquiries] = useState([]);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!user) { nav("/signin"); return; }
    if (user.role !== "vendor" && user.role !== "admin") { nav("/"); return; }
    api.get("/my/vendor").then((r) => {
      setVendor(r.data);
      setForm(r.data || defaultVendor());
    });
    api.get("/my/inquiries").then((r) => setInquiries(r.data));
  }, [user, nav, bootstrapped]);

  const defaultVendor = () => ({
    name: "", category: "Fotografer", city: "Jakarta", description: "", phone: "", whatsapp: "",
    cover_image: "https://images.unsplash.com/photo-1519741497674-611481863552?crop=entropy&cs=srgb&fm=jpg&q=85",
    gallery: [], packages: [], adat_tags: [], indoor_outdoor: "both", capacity_min: 0, capacity_max: 0,
    price_min: 10_000_000, price_max: 50_000_000, tier: "free", subcategories: [],
  });

  const save = async (e) => {
    e.preventDefault();
    try {
      if (vendor) { const r = await api.put(`/vendors/${vendor.id}`, form); setVendor(r.data); toast.success("Profil diperbarui"); }
      else { const r = await api.post("/vendors", form); setVendor(r.data); toast.success("Vendor dibuat — menunggu approval admin"); }
    } catch { toast.error("Gagal menyimpan"); }
  };

  if (!form) return <Shell><div className="nk-container py-20">Memuat...</div></Shell>;

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Vendor Dashboard</div>
        <h1 className="nk-h1 mb-5">{vendor ? vendor.name : "Buat Profil Vendor"}</h1>

        {vendor && !vendor.approved && (
          <div className="border border-amber-300 bg-amber-50 rounded-sm p-4 mb-6 text-sm text-amber-900" data-testid="vendor-pending-banner">
            Profil masih menunggu persetujuan admin. Sudah bisa diedit, akan tampil di direktori setelah di-approve.
          </div>
        )}

        {vendor && vendor.approved && (
          <div className="mb-6 flex items-center justify-between border border-stone-200 bg-white rounded-sm p-4" data-testid="vendor-boost-banner">
            <div>
              <div className="nk-overline">Boost Vendor</div>
              <div className="text-sm text-stone-700 mt-1">Tier saat ini: <span className="font-mono uppercase">{vendor.tier}</span>. Upgrade untuk Featured/Premium.</div>
            </div>
            <Button asChild className="rounded-sm bg-amber-700 hover:bg-amber-800 text-amber-50" data-testid="vendor-boost-cta">
              <a href="/vendor/boost">Lihat paket Boost →</a>
            </Button>
          </div>
        )}

        <div className="grid grid-cols-12 gap-8">
          <form onSubmit={save} className="col-span-12 lg:col-span-7 space-y-4">
            <div><Label>Nama vendor</Label><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="vendor-form-name" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Kategori</Label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full border border-stone-300 rounded-sm h-10 px-3 bg-white text-sm" data-testid="vendor-form-category">
                  {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{c.label_id}</option>)}
                </select>
              </div>
              <div><Label>Kota</Label>
                <select value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full border border-stone-300 rounded-sm h-10 px-3 bg-white text-sm">
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div><Label>Deskripsi</Label><Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} data-testid="vendor-form-desc" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Telepon</Label><Input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="vendor-form-phone" /></div>
              <div><Label>WhatsApp (628...)</Label><Input required value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} data-testid="vendor-form-whatsapp" /></div>
            </div>
            <div><Label>Cover image URL</Label><Input value={form.cover_image} onChange={(e) => setForm({ ...form, cover_image: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Harga min (IDR)</Label><Input type="number" value={form.price_min} onChange={(e) => setForm({ ...form, price_min: parseInt(e.target.value || 0) })} data-testid="vendor-form-price-min" /></div>
              <div><Label>Harga max (IDR)</Label><Input type="number" value={form.price_max} onChange={(e) => setForm({ ...form, price_max: parseInt(e.target.value || 0) })} /></div>
            </div>
            <div>
              <Label>Adat tags</Label>
              <div className="flex flex-wrap gap-2 mt-2">
                {ADAT.map((a) => {
                  const on = form.adat_tags.includes(a.key);
                  return (
                    <button type="button" key={a.key} onClick={() => setForm({ ...form, adat_tags: on ? form.adat_tags.filter((x) => x !== a.key) : [...form.adat_tags, a.key] })}
                      data-testid={`vendor-form-adat-${a.key.toLowerCase()}`}
                      className={`nk-chip ${on ? "nk-chip-active" : ""}`}>{a.label_id}</button>
                  );
                })}
              </div>
            </div>
            <Button type="submit" className="rounded-sm bg-stone-900 hover:bg-stone-800" data-testid="vendor-form-save">{vendor ? "Simpan Perubahan" : "Buat Vendor"}</Button>
          </form>

          <aside className="col-span-12 lg:col-span-5">
            <div className="border border-stone-200 rounded-sm bg-white p-5">
              <div className="nk-overline mb-3">Lead Inbox ({inquiries.length})</div>
              <div className="space-y-3 max-h-[560px] overflow-auto">
                {inquiries.length === 0 && <div className="text-sm text-stone-500">Belum ada permintaan masuk.</div>}
                {inquiries.map((i) => (
                  <div key={i.id} className="border border-stone-200 rounded-sm p-3" data-testid={`inquiry-item-${i.id}`}>
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm">{i.name}</div>
                      <div className="text-[11px] text-stone-500 font-mono">{new Date(i.created_at).toLocaleDateString('id-ID')}</div>
                    </div>
                    <div className="text-xs text-stone-600 mt-1">{i.email} · WA {i.phone}</div>
                    <div className="text-xs text-stone-600 mt-1">{i.event_date || "-"} · {i.guest_count || "-"} tamu</div>
                    {i.message && <div className="text-sm mt-2 text-stone-800">{i.message}</div>}
                    <a href={`https://wa.me/${i.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs text-emerald-700 underline">Reply via WhatsApp →</a>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>
    </Shell>
  );
}

export function AdminPage() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [stats, setStats] = useState(null);
  const [pending, setPending] = useState([]);

  const load = () => {
    api.get("/admin/stats").then((r) => setStats(r.data));
    api.get("/admin/pending-vendors").then((r) => setPending(r.data));
  };

  useEffect(() => {
    if (!bootstrapped) return;
    if (!user) { nav("/signin"); return; }
    if (user.role !== "admin") { nav("/"); return; }
    load();
  }, [user, nav, bootstrapped]);

  const approve = async (id) => {
    await api.post(`/admin/approve-vendor/${id}`);
    toast.success("Vendor di-approve");
    load();
  };

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Admin</div>
        <h1 className="nk-h1 mb-5">Panel Administrator</h1>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
            {[["Users", stats.users], ["Vendors", stats.vendors], ["Pending", stats.pending_vendors], ["Inquiries", stats.inquiries], ["Reviews", stats.reviews]].map(([k, v]) => (
              <div key={k} className="border border-stone-200 rounded-sm p-4 bg-white"><div className="nk-overline">{k}</div><div className="font-serif text-2xl mt-1">{v}</div></div>
            ))}
          </div>
        )}

        <div className="mt-10">
          <h2 className="nk-h3 mb-4">Pending Vendor Approvals</h2>
          {pending.length === 0 && <div className="text-sm text-stone-500">Tidak ada vendor menunggu approval.</div>}
          <div className="space-y-3">
            {pending.map((v) => (
              <div key={v.id} className="border border-stone-200 rounded-sm p-4 flex items-center justify-between" data-testid={`admin-pending-${v.id}`}>
                <div>
                  <div className="font-medium">{v.name}</div>
                  <div className="text-xs text-stone-600">{v.category} · {v.city} · {formatIDRFull(v.price_min)}+</div>
                </div>
                <Button onClick={() => approve(v.id)} data-testid={`admin-approve-${v.id}`} className="rounded-sm bg-emerald-600 hover:bg-emerald-700">Approve</Button>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}
