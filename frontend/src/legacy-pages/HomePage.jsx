import React, { useState } from "react";
import Image from "next/image";
import { useNavigate } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { CATEGORIES, CITIES, ADAT } from "@/lib/constants";
import { VendorCard } from "@/components/VendorCard";
import DestinationsCarousel from "@/components/DestinationsCarousel";
import { api } from "@/lib/api";
import { ArrowRight, Search, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";
import { optimizeImageUrl, shouldBypassImageOptimization } from "@/lib/image-url";

const HERO = "https://images.unsplash.com/photo-1650377509488-724221735c19?crop=entropy&cs=srgb&fm=jpg&q=85";

const TOOL_IMAGES = {
  checklist: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?crop=entropy&cs=srgb&fm=jpg&q=85",
  budget: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?crop=entropy&cs=srgb&fm=jpg&q=85",
  guests: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?crop=entropy&cs=srgb&fm=jpg&q=85",
  website: "https://images.unsplash.com/photo-1607190074257-dd4b7af0309f?crop=entropy&cs=srgb&fm=jpg&q=85",
  registry: "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?crop=entropy&cs=srgb&fm=jpg&q=85",
  blast: "https://images.unsplash.com/photo-1611746872915-64382b5c76da?crop=entropy&cs=srgb&fm=jpg&q=85",
};

export default function HomePage() {
  const { lang } = useApp();
  const nav = useNavigate();
  const [cat, setCat] = useState("");
  const [city, setCity] = useState("Jakarta");
  const [vendors, setVendors] = useState([]);
  const [realW, setRealW] = useState([]);

  React.useEffect(() => {
    api.get("/vendors?limit=8&sort=recommended").then((r) => setVendors(r.data)).catch(() => {});
    api.get("/real-weddings").then((r) => setRealW(r.data.slice(0, 6))).catch(() => {});
  }, []);

  const submit = () => {
    const q = new URLSearchParams();
    if (cat) q.set("category", cat);
    if (city) q.set("city", city);
    nav(`/vendors?${q.toString()}`);
  };

  const tools = [
    { to: "/tools/checklist", key: "checklist", title: t(lang, "tool.checklist"), desc: t(lang, "tool.checklist_desc"), tid: "tool-card-checklist" },
    { to: "/tools/budget", key: "budget", title: t(lang, "tool.budget"), desc: t(lang, "tool.budget_desc"), tid: "tool-card-budget" },
    { to: "/tools/guests", key: "guests", title: t(lang, "tool.guests"), desc: t(lang, "tool.guests_desc"), tid: "tool-card-guests" },
    { to: "/tools/website", key: "website", title: t(lang, "tool.website"), desc: t(lang, "tool.website_desc"), tid: "tool-card-website" },
    { to: "/tools/registry", key: "registry", title: t(lang, "tool.registry"), desc: t(lang, "tool.registry_desc"), tid: "tool-card-registry" },
    { to: "/tools/blast", key: "blast", title: t(lang, "tool.blast"), desc: t(lang, "tool.blast_desc"), tid: "tool-card-blast" },
  ];

  return (
    <Shell>
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="nk-container pt-16 lg:pt-24 pb-16 lg:pb-24 grid lg:grid-cols-12 gap-10 lg:gap-16 items-end">
          <div className="lg:col-span-7 fade-up">
            <div className="nk-overline mb-6">{t(lang, "hero.overline")} · Edisi {new Date().getFullYear()}</div>
            <h1 className="nk-h1 mb-6">
              {t(lang, "hero.title").split(" ").map((w, i) => (
                <span key={i} className={i === 2 || i === 3 ? "italic text-amber-800" : ""}>{w} </span>
              ))}
            </h1>
            <p className="nk-lead max-w-xl">{t(lang, "hero.subtitle")}</p>

            <div className="mt-10 bg-white border border-stone-300 rounded-sm p-2 flex flex-col sm:flex-row gap-2 sm:gap-0 sm:items-stretch shadow-[0_20px_60px_-24px_rgba(28,25,23,0.25)]">
              <div className="flex-1 px-4 py-2 border-b sm:border-b-0 sm:border-r border-stone-200">
                <div className="nk-overline">{t(lang, "hero.search_cat")}</div>
                <select data-testid="hero-search-category-select" value={cat} onChange={(e) => setCat(e.target.value)} className="w-full mt-1 bg-transparent outline-none text-sm text-stone-900">
                  <option value="">{t(lang, "common.all_categories")}</option>
                  {CATEGORIES.map((c) => <option key={c.key} value={c.key}>{lang === "id" ? c.label_id : c.label_en}</option>)}
                </select>
              </div>
              <div className="flex-1 px-4 py-2 sm:border-r border-stone-200">
                <div className="nk-overline">{t(lang, "hero.search_city")}</div>
                <select data-testid="hero-search-city-select" value={city} onChange={(e) => setCity(e.target.value)} className="w-full mt-1 bg-transparent outline-none text-sm text-stone-900">
                  <option value="">{t(lang, "common.all_cities")}</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button data-testid="hero-search-submit-button" onClick={submit} className="nk-btn-primary rounded-sm shrink-0 !px-6">
                <Search className="w-4 h-4" />{t(lang, "hero.search_submit")}
              </button>
            </div>

            <div className="mt-10">
              <div className="nk-overline mb-3">{t(lang, "hero.explore_adat")}</div>
              <div className="flex flex-wrap gap-2">
                {ADAT.map((a) => (
                  <Link key={a.key} to={`/vendors?adat=${a.key}`} data-testid={`adat-chip-${a.key.toLowerCase()}`} className="nk-chip hover:bg-stone-900 hover:text-stone-50 hover:border-stone-900">
                    {lang === "id" ? a.label_id : a.label_en}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 relative fade-up-d2">
            <div className="relative aspect-[4/5] overflow-hidden rounded-sm border border-stone-200">
              <Image
                src={optimizeImageUrl(HERO, 1600, 75)}
                alt="Pasangan Indonesia"
                fill
                priority
                sizes="(min-width: 1024px) 42vw, 100vw"
                quality={75}
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <div className="absolute bottom-6 left-6 right-6 text-white">
                <div className="nk-overline !text-amber-200 mb-1">Featured Real Wedding</div>
                <div className="font-serif text-2xl italic">"Siti & Fajar — Minang di Jakarta"</div>
              </div>
            </div>
            <div className="absolute -bottom-8 -left-6 hidden lg:block bg-white border border-stone-200 rounded-sm p-5 w-56 shadow-[0_20px_50px_-20px_rgba(28,25,23,0.3)]">
              <div className="nk-overline mb-2">Trust</div>
              <div className="font-serif text-3xl text-stone-900">4.9<span className="text-stone-400">/5</span></div>
              <div className="text-xs text-stone-600 mt-1">rating rata-rata · 320+ vendor terverifikasi</div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIPE */}
      <section className="border-y border-stone-200 bg-stone-50">
        <div className="nk-container py-8 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { v: "320+", k: "trust.vendors" },
            { v: "1.800", k: "trust.weddings" },
            { v: "4.9", k: "trust.rating" },
            { v: "5 kota", k: "nav.vendors" },
          ].map((s, i) => (
            <div key={i} data-testid={`trust-stat-${i}`}>
              <div className="font-serif text-3xl text-stone-900">{s.v}</div>
              <div className="nk-overline mt-1">{t(lang, s.k)}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANNING TOOLS — moved above Featured, with images */}
      <section className="nk-section">
        <div className="nk-container">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <div className="nk-overline mb-2">#01</div>
              <h2 className="nk-h2">{t(lang, "section.tools")}</h2>
              <p className="nk-lead mt-2 max-w-xl">{t(lang, "section.tools_sub")}</p>
            </div>
            <Link to="/tools/dashboard" data-testid="section-tools-dashboard" className="nk-link-underline shrink-0 hidden sm:inline-flex">
              My Planner<ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {tools.map((tool) => (
              <Link key={tool.key} to={tool.to} data-testid={tool.tid} className="nk-card group block overflow-hidden">
                <div className="relative aspect-[16/10] overflow-hidden bg-stone-100">
                  <Image
                    src={optimizeImageUrl(TOOL_IMAGES[tool.key], 1000, 65)}
                    alt={tool.title}
                    fill
                    sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                    quality={65}
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
                  <div className="absolute top-3 left-3 nk-overline !text-amber-200">{tool.title}</div>
                  <div className="absolute bottom-3 right-3 w-9 h-9 rounded-full bg-white/95 flex items-center justify-center group-hover:bg-amber-700 group-hover:text-white transition-colors">
                    <ArrowUpRight className="w-4 h-4" />
                  </div>
                </div>
                <div className="p-5">
                  <div className="nk-h3">{tool.title}</div>
                  <p className="text-sm text-stone-600 mt-1">{tool.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED VENDORS */}
      <section className="nk-section bg-stone-50">
        <div className="nk-container">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <div className="nk-overline mb-2">#02</div>
              <h2 className="nk-h2">{t(lang, "section.featured")}</h2>
              <p className="nk-lead mt-2 max-w-xl">{t(lang, "section.featured_sub")}</p>
            </div>
            <Link to="/vendors" data-testid="section-featured-see-all" className="nk-link-underline shrink-0 hidden sm:inline-flex">
              Lihat semua<ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {vendors.slice(0, 8).map((v) => <VendorCard key={v.id} vendor={v} />)}
          </div>
        </div>
      </section>

      {/* DESTINATIONS */}
      <DestinationsCarousel />

      {/* REAL WEDDINGS */}
      <section className="nk-section bg-stone-50">
        <div className="nk-container">
          <div className="flex items-end justify-between gap-6 mb-10">
            <div>
              <div className="nk-overline mb-2">#04</div>
              <h2 className="nk-h2">{t(lang, "section.realweddings")}</h2>
              <p className="nk-lead mt-2 max-w-xl">{t(lang, "section.realweddings_sub")}</p>
            </div>
            <Link to="/real-weddings" data-testid="section-realweddings-see-all" className="nk-link-underline shrink-0 hidden sm:inline-flex">
              Semua cerita<ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-12 gap-4 lg:gap-6">
            {realW.slice(0, 5).map((w, i) => {
              const span = i === 0 ? "col-span-12 lg:col-span-8 aspect-[16/10]" : "col-span-6 lg:col-span-4 aspect-square";
              return (
                <Link key={w.id} to={`/real-weddings/${w.id}`} data-testid={`realwedding-card-${w.id}`} className={`${span} relative overflow-hidden rounded-sm group bg-stone-200`}>
                  <Image
                    src={optimizeImageUrl(w.cover_image, 1400, 65)}
                    alt={w.couple_names}
                    fill
                    sizes="(min-width: 1024px) 67vw, 100vw"
                    quality={65}
                    unoptimized={shouldBypassImageOptimization(w.cover_image)}
                    className="object-cover group-hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                  <div className="absolute bottom-4 left-5 right-5 text-white">
                    <div className="nk-overline !text-amber-200 mb-1">{w.adat} · {w.city}</div>
                    <div className="font-serif text-xl lg:text-2xl italic">{w.couple_names}</div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>
    </Shell>
  );
}
