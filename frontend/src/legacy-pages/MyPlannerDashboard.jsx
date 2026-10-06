import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shell } from "@/components/Shell";
import DestinationsCarousel from "@/components/DestinationsCarousel";
import { useApp } from "@/lib/store";
import { api } from "@/lib/api";
import { formatIDRFull } from "@/lib/constants";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  ClipboardList, Wallet, Users, Globe, Heart, Send, Sparkles, Calendar, ArrowRight,
  MapPin, Zap, TrendingUp, CheckCircle2, Star, Clock,
} from "lucide-react";

const daysBetween = (iso) => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d - new Date()) / (1000 * 60 * 60 * 24));
};

const Stat = ({ label, value, sub, tid, accent }) => (
  <div className={`border rounded-sm p-5 ${accent ? "border-stone-900 bg-stone-900 text-stone-50" : "border-stone-200 bg-white"}`} data-testid={tid}>
    <div className={`nk-overline ${accent ? "!text-stone-400" : ""}`}>{label}</div>
    <div className={`font-serif text-3xl mt-2 ${accent ? "" : "text-stone-900"}`}>{value}</div>
    {sub && <div className={`text-xs mt-1 ${accent ? "text-stone-400" : "text-stone-500"}`}>{sub}</div>}
  </div>
);

const Tile = ({ to, icon: Icon, title, desc, tid, kpi, kpiLabel }) => (
  <Link to={to} data-testid={tid} className="border border-stone-200 rounded-sm bg-white p-5 flex flex-col justify-between hover:border-stone-900 hover:shadow-[0_8px_24px_-10px_rgba(28,25,23,0.2)] transition-all group min-h-[160px]">
    <div className="flex items-start justify-between">
      <Icon className="w-5 h-5 text-amber-800" />
      {kpi != null && (
        <div className="text-right">
          <div className="font-serif text-xl text-stone-900">{kpi}</div>
          {kpiLabel && <div className="text-[10px] font-mono uppercase tracking-wider text-stone-500">{kpiLabel}</div>}
        </div>
      )}
    </div>
    <div>
      <div className="nk-h3 group-hover:text-amber-900 transition-colors">{title}</div>
      <div className="text-sm text-stone-600 mt-1">{desc}</div>
    </div>
  </Link>
);

export default function MyPlannerDashboard() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [checklist, setChecklist] = useState([]);
  const [budget, setBudget] = useState([]);
  const [guests, setGuests] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [registry, setRegistry] = useState(null);
  const [website, setWebsite] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!bootstrapped) return;
    if (!user) { nav("/signin"); return; }
    (async () => {
      try {
        const [c, b, g, f, r, w, v] = await Promise.all([
          api.get("/checklist"),
          api.get("/budget"),
          api.get("/guests"),
          api.get("/favorites"),
          api.get("/registry"),
          api.get("/website/mine"),
          api.get(`/vendors?city=${encodeURIComponent(user.city || "Jakarta")}&sort=rating&limit=4`),
        ]);
        setChecklist(c.data); setBudget(b.data); setGuests(g.data); setFavorites(f.data);
        setRegistry(r.data); setWebsite(w.data); setVendors(v.data);
      } finally { setLoading(false); }
    })();
  }, [user, nav, bootstrapped]);

  const metrics = useMemo(() => {
    const doneTasks = checklist.filter((x) => x.done).length;
    const totalTasks = checklist.length;
    const taskPct = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;
    const estBudget = budget.reduce((s, x) => s + (x.estimated_idr || 0), 0);
    const actBudget = budget.reduce((s, x) => s + (x.actual_idr || 0), 0);
    const budgetPct = estBudget ? Math.min(100, Math.round((actBudget / estBudget) * 100)) : 0;
    const guestResp = guests.filter((x) => x.rsvp_status !== "pending").length;
    const guestAttending = guests.filter((x) => x.rsvp_status === "attending").length;
    const guestPct = guests.length ? Math.round((guestResp / guests.length) * 100) : 0;
    return { doneTasks, totalTasks, taskPct, estBudget, actBudget, budgetPct, guestResp, guestAttending, guestPct };
  }, [checklist, budget, guests]);

  const nextTasks = useMemo(() => {
    const bucketOrder = ["12+months", "10months", "8months", "6months", "4months", "2months", "1month", "2weeks", "weekof", "dayof", "after"];
    return checklist.filter((x) => !x.done)
      .sort((a, b) => bucketOrder.indexOf(a.bucket) - bucketOrder.indexOf(b.bucket))
      .slice(0, 6);
  }, [checklist]);

  const daysLeft = daysBetween(user?.wedding_date);
  const weddingDateLabel = user?.wedding_date
    ? new Date(user.wedding_date).toLocaleDateString("id-ID", { weekday: "long", year: "numeric", month: "long", day: "numeric" })
    : "Belum diset";

  if (loading) return <Shell><div className="nk-container py-20 text-stone-500">Memuat My Planner...</div></Shell>;

  return (
    <Shell>
      {/* HERO */}
      <section className="border-b border-stone-200 bg-stone-50">
        <div className="nk-container py-14 lg:py-20 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-7">
            <div className="nk-overline mb-3">My Planner</div>
            <h1 className="nk-h1">
              Selamat datang, <span className="italic text-amber-800">{user.name.split(" ")[0]}</span>
            </h1>
            <p className="nk-lead mt-3 max-w-xl">
              Satu dashboard untuk melihat progress persiapan nikahmu. {daysLeft != null && daysLeft >= 0 ? (
                <>Tersisa <span className="font-medium text-stone-900">{daysLeft}</span> hari menuju hari-H.</>
              ) : daysLeft != null && daysLeft < 0 ? (
                <>Hari-H sudah lewat <span className="font-medium text-stone-900">{Math.abs(daysLeft)}</span> hari — selamat menempuh hidup baru!</>
              ) : (
                <>Set tanggal nikah di <Link to="/account/settings" className="underline">pengaturan</Link> untuk melihat countdown.</>
              )}
            </p>
          </div>
          <div className="lg:col-span-5">
            <div className="border border-stone-900 rounded-sm p-6 bg-white">
              <div className="flex items-center gap-2 nk-overline"><Calendar className="w-3.5 h-3.5" />Tanggal Pernikahan</div>
              <div className="font-serif text-2xl mt-2 text-stone-900">{weddingDateLabel}</div>
              {user.city && <div className="text-sm text-stone-600 mt-1 inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{user.city}</div>}
              {daysLeft != null && daysLeft >= 0 && (
                <div className="mt-4 flex items-baseline gap-3">
                  <div className="font-serif text-5xl text-amber-800" data-testid="dashboard-countdown">{daysLeft}</div>
                  <div className="text-sm text-stone-600">hari lagi</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* PROGRESS STATS */}
      <section className="nk-container pt-10">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ProgressCard
            tid="dashboard-stat-checklist"
            icon={ClipboardList}
            label="Checklist"
            pct={metrics.taskPct}
            primary={`${metrics.doneTasks} / ${metrics.totalTasks}`}
            sub={`${metrics.totalTasks - metrics.doneTasks} tugas tersisa`}
          />
          <ProgressCard
            tid="dashboard-stat-budget"
            icon={Wallet}
            label="Budget"
            pct={metrics.budgetPct}
            primary={formatIDRFull(metrics.actBudget)}
            sub={`dari estimasi ${formatIDRFull(metrics.estBudget)}`}
          />
          <ProgressCard
            tid="dashboard-stat-guests"
            icon={Users}
            label="Daftar Tamu"
            pct={metrics.guestPct}
            primary={`${metrics.guestResp} / ${guests.length || 0}`}
            sub={`${metrics.guestAttending} konfirmasi hadir`}
          />
        </div>
      </section>

      {/* MAIN GRID */}
      <section className="nk-container mt-10 grid grid-cols-12 gap-6 lg:gap-8">
        {/* LEFT — upcoming tasks */}
        <div className="col-span-12 lg:col-span-7">
          <div className="flex items-end justify-between mb-5">
            <div>
              <div className="nk-overline">Tugas Berikutnya</div>
              <h2 className="nk-h3 mt-1">Yang paling urgent</h2>
            </div>
            <Link to="/tools/checklist" data-testid="dashboard-checklist-link" className="nk-link-underline">Lihat semua<ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          <div className="space-y-2">
            {nextTasks.length === 0 && (
              <div className="border border-stone-200 bg-white rounded-sm p-6 text-sm text-stone-500 text-center">
                Semua tugas selesai 🎉 — mantap!
              </div>
            )}
            {nextTasks.map((t) => (
              <div key={t.id} data-testid={`dashboard-task-${t.id}`} className="border border-stone-200 bg-white rounded-sm p-4 flex items-center gap-3">
                <div className="w-9 h-9 rounded-sm bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-800 shrink-0">
                  <Clock className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm text-stone-900 truncate">{t.title}</div>
                  <div className="text-[11px] font-mono uppercase tracking-wider text-stone-500 mt-0.5">{t.bucket}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Vendor shortlist */}
          {favorites.length > 0 && (
            <div className="mt-10">
              <div className="flex items-end justify-between mb-5">
                <div>
                  <div className="nk-overline">Shortlist</div>
                  <h2 className="nk-h3 mt-1">Vendor tersimpan</h2>
                </div>
                <Link to="/favorites" className="nk-link-underline">Semua<ArrowRight className="w-3.5 h-3.5" /></Link>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {favorites.slice(0, 4).map((v) => (
                  <Link key={v.id} to={`/vendors/${v.id}`} data-testid={`dashboard-fav-${v.id}`} className="border border-stone-200 bg-white rounded-sm overflow-hidden flex gap-3 hover:border-stone-900 transition-colors">
                    <img src={v.cover_image} alt={v.name} loading="lazy" decoding="async" className="w-20 h-20 object-cover shrink-0" />
                    <div className="py-2 pr-3 min-w-0 flex-1">
                      <div className="nk-overline truncate">{v.category}</div>
                      <div className="font-serif text-sm truncate">{v.name}</div>
                      <div className="flex items-center gap-1 text-xs text-stone-600 mt-0.5"><Star className="w-3 h-3 fill-amber-500 stroke-amber-500" />{v.rating_avg} · {v.city}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — quick tiles */}
        <aside className="col-span-12 lg:col-span-5">
          <div className="nk-overline mb-3">Quick Tools</div>
          <div className="grid grid-cols-2 gap-3">
            <Tile to="/tools/website" tid="dashboard-tile-website" icon={Globe} title="Undangan Digital"
              desc={website?.published ? "Live & dapat dibagikan" : website ? "Draft tersimpan" : "Belum dibuat"}
              kpi={website?.published ? "LIVE" : website ? "DRAFT" : "—"}
              kpiLabel="status" />
            <Tile to="/tools/registry" tid="dashboard-tile-registry" icon={Heart} title="Amplop Digital"
              desc={registry?.enabled ? "Aktif menerima amplop" : "Belum diaktifkan"}
              kpi={registry?.contributions?.length ?? 0}
              kpiLabel="entri" />
            <Tile to="/tools/guests" tid="dashboard-tile-guests" icon={Users} title="Daftar Tamu"
              desc="Kelola RSVP & meal preference"
              kpi={guests.length}
              kpiLabel="tamu" />
            <Tile to="/tools/blast" tid="dashboard-tile-blast" icon={Send} title="WA Blast"
              desc="Kirim link ke semua tamu"
              kpi={guests.filter((g) => g.phone_wa).length}
              kpiLabel="punya WA" />
          </div>

          {/* AI nudge */}
          <div className="mt-6 border border-amber-700/40 bg-gradient-to-br from-amber-50 to-stone-50 rounded-sm p-5" data-testid="dashboard-ai-nudge">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-800" />
              <div className="nk-overline">AI Planner</div>
            </div>
            <div className="font-serif text-xl mt-2 text-stone-900">Segera hadir</div>
            <p className="text-sm text-stone-700 mt-1">AI Planner belum tersedia karena layanan AI belum dikonfigurasi.</p>
          </div>

          {/* Recommended vendors by city */}
          {vendors.length > 0 && (
            <div className="mt-6">
              <div className="flex items-end justify-between mb-3">
                <div className="nk-overline">Rekomendasi di {user.city || "kotamu"}</div>
                <Link to={`/vendors?city=${encodeURIComponent(user.city || "")}`} className="text-xs underline text-stone-600">Lihat</Link>
              </div>
              <div className="space-y-2">
                {vendors.slice(0, 3).map((v) => (
                  <Link key={v.id} to={`/vendors/${v.id}`} data-testid={`dashboard-rec-${v.id}`} className="flex items-center gap-3 border border-stone-200 bg-white rounded-sm overflow-hidden hover:border-stone-900 transition-colors">
                    <img src={v.cover_image} alt={v.name} loading="lazy" decoding="async" className="w-16 h-16 object-cover shrink-0" />
                    <div className="min-w-0 flex-1 pr-3">
                      <div className="text-xs text-stone-500 font-mono uppercase tracking-wider">{v.category}</div>
                      <div className="font-serif text-sm truncate">{v.name}</div>
                      <div className="text-xs text-stone-600 inline-flex items-center gap-1"><Star className="w-3 h-3 fill-amber-500 stroke-amber-500" />{v.rating_avg} · dari {formatIDRFull(v.price_min)}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </aside>
      </section>

      {/* DESTINATIONS */}
      <DestinationsCarousel />
    </Shell>
  );
}

function ProgressCard({ tid, icon: Icon, label, pct, primary, sub }) {
  return (
    <div className="border border-stone-200 bg-white rounded-sm p-5" data-testid={tid}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Icon className="w-4 h-4 text-amber-800" /><div className="nk-overline">{label}</div></div>
        <div className="text-xs font-mono text-stone-500">{pct}%</div>
      </div>
      <div className="font-serif text-2xl mt-2 text-stone-900 idr-amount">{primary}</div>
      <div className="text-xs text-stone-500 mt-0.5">{sub}</div>
      <Progress value={pct} className="mt-3 h-1.5" />
    </div>
  );
}
