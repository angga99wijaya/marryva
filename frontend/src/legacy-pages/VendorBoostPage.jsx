import React, { useEffect, useState } from "react";
import { Shell } from "@/components/Shell";
import { api } from "@/lib/api";
import { useApp } from "@/lib/store";
import { useNavigate } from "react-router-dom";
import { formatIDRFull } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Check, Zap, Crown, Sparkles } from "lucide-react";

const TierIcon = { featured: Zap, premium: Crown };

export default function VendorBoostPage() {
  const { user, bootstrapped } = useApp();
  const nav = useNavigate();
  const [plans, setPlans] = useState({});
  const [orders, setOrders] = useState([]);
  const [vendor, setVendor] = useState(null);

  const load = () => {
    api.get("/boost/plans").then((r) => setPlans(r.data));
    api.get("/boost/mine").then((r) => setOrders(r.data));
    api.get("/my/vendor").then((r) => setVendor(r.data));
  };
  useEffect(() => {
    if (!bootstrapped) return;
    if (!user) { nav("/signin"); return; }
    if (user.role !== "vendor" && user.role !== "admin") { nav("/"); return; }
    load();
  }, [user, nav, bootstrapped]);

  const purchase = () => {
    toast.info("Pembayaran Midtrans belum tersedia. Listing berbayar belum dapat dibeli.");
  };

  const currentTier = vendor?.tier || "free";

  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Vendor</div>
        <h1 className="nk-h1 mb-3">Boost Vendor Listing</h1>
        <p className="nk-lead max-w-2xl">Paket berbayar akan meningkatkan visibilitas vendor di direktori NikahKita. Pembelian belum tersedia sampai pembayaran Midtrans diaktifkan.</p>

        {vendor && (
          <div className="mt-6 border border-stone-200 bg-white rounded-sm p-4 flex items-center justify-between" data-testid="boost-current-tier">
            <div>
              <div className="nk-overline">Vendor saat ini</div>
              <div className="font-serif text-xl mt-1">{vendor.name}</div>
            </div>
            <div className="text-right">
              <div className="nk-overline">Tier aktif</div>
              <div className="font-mono text-sm uppercase tracking-wider mt-1">
                {currentTier === "premium" && <span className="px-2 py-1 bg-amber-700 text-amber-50 rounded-sm">Premium</span>}
                {currentTier === "featured" && <span className="px-2 py-1 bg-stone-900 text-stone-50 rounded-sm">Featured</span>}
                {currentTier === "free" && <span className="px-2 py-1 bg-stone-200 text-stone-700 rounded-sm">Free</span>}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mt-10">
          {/* FREE */}
          <div className="border border-stone-200 bg-white rounded-sm p-6">
            <div className="nk-overline">Free</div>
            <div className="font-serif text-3xl mt-2">Rp 0</div>
            <div className="text-xs text-stone-500">Selamanya</div>
            <ul className="mt-6 space-y-2 text-sm">
              <li className="flex gap-2"><Check className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />Listing di direktori</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />Lead inbox dasar</li>
              <li className="flex gap-2"><Check className="w-4 h-4 text-stone-400 shrink-0 mt-0.5" />Review publik</li>
            </ul>
            <Button disabled className="mt-6 w-full rounded-sm">Paket Saat Ini</Button>
          </div>

          {Object.entries(plans).map(([key, p]) => {
            const Icon = TierIcon[key] || Sparkles;
            const highlighted = key === "premium";
            return (
              <div key={key} className={`relative border rounded-sm p-6 ${highlighted ? "border-amber-700 bg-stone-900 text-stone-50" : "border-stone-200 bg-white"}`} data-testid={`boost-plan-${key}`}>
                {highlighted && <div className="absolute top-0 right-6 -translate-y-1/2 px-3 py-1 bg-amber-700 text-amber-50 text-[10px] font-mono uppercase tracking-widest rounded-sm">Paling Dipilih</div>}
                <div className={`nk-overline ${highlighted ? "!text-amber-300" : ""}`}>{p.name} <Icon className="w-3.5 h-3.5 inline ml-1" /></div>
                <div className="font-serif text-3xl mt-2">{formatIDRFull(p.price_idr)}</div>
                <div className={`text-xs ${highlighted ? "text-stone-400" : "text-stone-500"}`}>/ {p.duration_days} hari</div>
                <ul className="mt-6 space-y-2 text-sm">
                  {p.perks.map((perk, i) => (
                    <li key={i} className="flex gap-2"><Check className={`w-4 h-4 shrink-0 mt-0.5 ${highlighted ? "text-amber-400" : "text-emerald-700"}`} />{perk}</li>
                  ))}
                </ul>
                <Button onClick={purchase} data-testid={`boost-buy-${key}`} className={`mt-6 w-full rounded-sm ${highlighted ? "bg-amber-700 hover:bg-amber-800 text-amber-50" : "bg-stone-900 hover:bg-stone-800 text-stone-50"}`}>
                  Belum tersedia
                </Button>
              </div>
            );
          })}
        </div>

        <div className="mt-14 inline-flex items-center gap-2 text-xs font-mono text-stone-500 bg-stone-100 rounded-sm px-3 py-2" data-testid="midtrans-stub-note">
          <Sparkles className="w-3.5 h-3.5" />Pembayaran hanya akan aktif setelah webhook dan verifikasi transaksi Midtrans dikonfigurasi.
        </div>

        {/* ORDERS */}
        <div className="mt-14">
          <h2 className="nk-h3 mb-4">Riwayat Order</h2>
          {orders.length === 0 && <div className="text-sm text-stone-500">Belum ada order.</div>}
          <div className="space-y-2">
            {orders.map((o) => (
              <div key={o.id} className="border border-stone-200 rounded-sm p-4 flex items-center justify-between" data-testid={`boost-order-${o.id}`}>
                <div>
                  <div className="font-mono text-xs text-stone-500">{o.midtrans_order_id}</div>
                  <div className="text-sm font-medium capitalize">{o.tier} — {formatIDRFull(o.amount_idr)}</div>
                  <div className="text-xs text-stone-500 mt-1">{new Date(o.created_at).toLocaleString('id-ID')}</div>
                </div>
                <span className={`text-xs font-mono uppercase tracking-wider px-2 py-1 rounded-sm ${o.status === "paid" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{o.status}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </Shell>
  );
}
