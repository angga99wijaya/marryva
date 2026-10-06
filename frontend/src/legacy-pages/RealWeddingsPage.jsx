import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { ADAT } from "@/lib/constants";
import { useSearchParams } from "react-router-dom";

export function RealWeddingsPage() {
  const [params, setParams] = useSearchParams();
  const adat = params.get("adat") || "";
  const [items, setItems] = useState([]);

  useEffect(() => {
    api.get(`/real-weddings${adat ? `?adat=${adat}` : ""}`).then((r) => setItems(r.data));
  }, [adat]);

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Real Wedding</div>
        <h1 className="nk-h1 mb-4">Cerita Pernikahan Nyata</h1>
        <p className="nk-lead max-w-2xl mb-10">Inspirasi dari pasangan Indonesia — lengkap dengan credit vendor yang bisa langsung kamu hubungi.</p>

        <div className="flex flex-wrap gap-2 mb-10">
          <button data-testid="rw-filter-all" onClick={() => setParams({})} className={`nk-chip ${!adat ? "nk-chip-active" : ""}`}>Semua Adat</button>
          {ADAT.map((a) => (
            <button key={a.key} data-testid={`rw-filter-${a.key.toLowerCase()}`} onClick={() => setParams({ adat: a.key })} className={`nk-chip ${adat === a.key ? "nk-chip-active" : ""}`}>{a.label_id}</button>
          ))}
        </div>

        <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
          {items.map((w) => (
            <Link key={w.id} to={`/real-weddings/${w.id}`} data-testid={`rw-card-${w.id}`} className="group block break-inside-avoid relative overflow-hidden rounded-sm">
              <img src={w.cover_image} alt={w.couple_names} loading="lazy" decoding="async" className="w-full group-hover:scale-105 transition-transform duration-700" />
              <div className="absolute inset-x-0 bottom-0 p-5 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
                <div className="nk-overline !text-amber-200 mb-1">{w.adat} · {w.city} · {w.guest_count} tamu</div>
                <div className="font-serif text-white italic text-2xl">{w.couple_names}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}

export function RealWeddingDetail() {
  const { id } = useParams();
  const [w, setW] = useState(null);
  useEffect(() => { api.get(`/real-weddings/${id}`).then((r) => setW(r.data)); }, [id]);
  if (!w) return <Shell><div className="nk-container py-20">Memuat...</div></Shell>;
  return (
    <Shell>
      <section className="nk-container pt-10">
        <div className="nk-overline mb-3">{w.adat} · {w.city}</div>
        <h1 className="nk-h1 mb-5 italic">{w.couple_names}</h1>
        <p className="nk-lead max-w-3xl">{w.story}</p>
      </section>
      <section className="nk-container mt-10 grid grid-cols-12 gap-4">
        {w.gallery?.map((img, i) => (
          <div key={i} className={`${i % 5 === 0 ? "col-span-12 lg:col-span-8" : "col-span-6 lg:col-span-4"} aspect-[4/3] overflow-hidden rounded-sm`}>
            <img src={img} alt="" className="w-full h-full object-cover" loading="lazy" decoding="async" />
          </div>
        ))}
      </section>
      {w.vendor_credits?.length > 0 && (
        <section className="nk-container mt-16">
          <h2 className="nk-h2 mb-6">Vendor Credits</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {w.vendor_credits.map((c, i) => (
              <Link key={i} to={`/vendors/${c.vendor_id}`} data-testid={`rw-credit-${i}`} className="border border-stone-200 rounded-sm p-5 hover:border-stone-900 transition-colors">
                <div className="nk-overline mb-1">{c.category}</div>
                <div className="font-serif text-xl">{c.name}</div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </Shell>
  );
}
