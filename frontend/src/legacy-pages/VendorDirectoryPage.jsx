import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { VendorCard } from "@/components/VendorCard";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { CATEGORIES, CITIES, ADAT, PRICE_BANDS, CAPACITY_BANDS } from "@/lib/constants";
import { api } from "@/lib/api";

const Section = ({ title, children, tid }) => (
  <div className="border-t border-stone-200 pt-5 pb-6" data-testid={tid}>
    <div className="nk-overline mb-3">{title}</div>
    <div className="space-y-2">{children}</div>
  </div>
);

const Radio = ({ checked, onClick, label, tid }) => (
  <button data-testid={tid} onClick={onClick} className="w-full flex items-center gap-2 text-sm text-stone-700 hover:text-stone-900 text-left">
    <span className={`w-3.5 h-3.5 rounded-full border ${checked ? "border-stone-900 bg-stone-900" : "border-stone-400"}`} />
    {label}
  </button>
);

export default function VendorDirectoryPage({ venuesOnly = false }) {
  const [params, setParams] = useSearchParams();
  const { lang } = useApp();
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);

  const category = params.get("category") || (venuesOnly ? "Venue" : "");
  const city = params.get("city") || "";
  const adat = params.get("adat") || "";
  const price = params.get("price") || "any";
  const cap = params.get("cap") || "any";
  const sort = params.get("sort") || "recommended";

  const set = (k, v) => {
    const n = new URLSearchParams(params);
    if (!v || v === "any" || v === "all") n.delete(k); else n.set(k, v);
    setParams(n);
  };

  useEffect(() => {
    setLoading(true);
    const q = new URLSearchParams();
    if (category) q.set("category", category);
    if (city) q.set("city", city);
    if (adat) q.set("adat", adat);
    const band = PRICE_BANDS.find((p) => p.key === price);
    if (band && band.key !== "any") { q.set("min_price", band.min); q.set("max_price", band.max); }
    const cb = CAPACITY_BANDS.find((p) => p.key === cap);
    if (cb && cb.min) q.set("min_capacity", cb.min);
    if (sort) q.set("sort", sort);
    api.get(`/vendors?${q.toString()}`)
      .then((r) => setVendors(r.data))
      .finally(() => setLoading(false));
  }, [category, city, adat, price, cap, sort]);

  const reset = () => setParams(new URLSearchParams(venuesOnly ? { category: "Venue" } : {}));

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">{venuesOnly ? "Venue" : "Direktori Vendor"}</div>
        <h1 className="nk-h1 mb-3">{venuesOnly ? "Venue Pernikahan di Indonesia" : (category ? `${category}${city ? ` di ${city}` : ""}` : "Semua Vendor Pernikahan")}</h1>
        <p className="nk-lead max-w-2xl">Filter per kota, adat, kapasitas, dan rentang harga IDR.</p>

        <div className="mt-10 grid grid-cols-12 gap-6 lg:gap-10">
          {/* FILTERS */}
          <aside className="col-span-12 lg:col-span-3">
            <div className="flex items-center justify-between mb-2">
              <div className="font-serif text-xl">{t(lang, "filter.title")}</div>
              <button data-testid="filter-reset" onClick={reset} className="text-xs underline text-stone-600 hover:text-stone-900">{t(lang, "filter.reset")}</button>
            </div>

            {!venuesOnly && (
              <Section title={t(lang, "filter.category")} tid="filter-group-category">
                <Radio tid="filter-cat-all" checked={!category} onClick={() => set("category", "")} label={t(lang, "common.all_categories")} />
                {CATEGORIES.map((c) => (
                  <Radio key={c.key} tid={`filter-cat-${c.key.toLowerCase().replace(/\s+/g, '-')}`} checked={category === c.key} onClick={() => set("category", c.key)} label={lang === "id" ? c.label_id : c.label_en} />
                ))}
              </Section>
            )}

            <Section title={t(lang, "filter.city")} tid="filter-group-city">
              <Radio tid="filter-city-all" checked={!city} onClick={() => set("city", "")} label={t(lang, "common.all_cities")} />
              {CITIES.map((c) => (
                <Radio key={c} tid={`filter-city-${c.toLowerCase()}`} checked={city === c} onClick={() => set("city", c)} label={c} />
              ))}
            </Section>

            <Section title={t(lang, "filter.adat")} tid="filter-group-adat">
              <Radio tid="filter-adat-all" checked={!adat} onClick={() => set("adat", "")} label={t(lang, "common.all_adat")} />
              {ADAT.map((a) => (
                <Radio key={a.key} tid={`filter-adat-${a.key.toLowerCase()}`} checked={adat === a.key} onClick={() => set("adat", a.key)} label={lang === "id" ? a.label_id : a.label_en} />
              ))}
            </Section>

            <Section title={t(lang, "filter.price")} tid="filter-group-price">
              {PRICE_BANDS.map((p) => (
                <Radio key={p.key} tid={`filter-price-${p.key}`} checked={price === p.key} onClick={() => set("price", p.key)} label={p.label} />
              ))}
            </Section>

            {venuesOnly && (
              <Section title={t(lang, "filter.capacity")} tid="filter-group-capacity">
                {CAPACITY_BANDS.map((c) => (
                  <Radio key={c.key} tid={`filter-cap-${c.key}`} checked={cap === c.key} onClick={() => set("cap", c.key)} label={c.label} />
                ))}
              </Section>
            )}
          </aside>

          {/* RESULTS */}
          <div className="col-span-12 lg:col-span-9">
            <div className="flex items-center justify-between mb-6">
              <div className="text-sm text-stone-600"><span data-testid="results-count" className="font-medium text-stone-900">{vendors.length}</span> {t(lang, "filter.results")}</div>
              <select
                data-testid="results-sort"
                value={sort} onChange={(e) => set("sort", e.target.value)}
                className="border border-stone-300 rounded-sm px-3 py-2 text-sm bg-white">
                <option value="recommended">{t(lang, "filter.sort.rec")}</option>
                <option value="rating">{t(lang, "filter.sort.rating")}</option>
                <option value="price_asc">{t(lang, "filter.sort.pricea")}</option>
                <option value="price_desc">{t(lang, "filter.sort.priced")}</option>
              </select>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => <div key={i} className="aspect-[4/5] bg-stone-100 animate-pulse rounded-sm" />)}
              </div>
            ) : vendors.length === 0 ? (
              <div className="py-20 text-center text-stone-600">{t(lang, "common.empty")}</div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {vendors.map((v) => <VendorCard key={v.id} vendor={v} />)}
              </div>
            )}
          </div>
        </div>
      </section>
    </Shell>
  );
}
