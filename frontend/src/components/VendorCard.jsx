import React from "react";
import Image from "next/image";
import { Link } from "react-router-dom";
import { Heart, Star, MapPin, Users, Zap } from "lucide-react";
import { formatIDR, waLink } from "@/lib/constants";
import { useApp } from "@/lib/store";
import { t } from "@/lib/i18n";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { optimizeImageUrl } from "@/lib/image-url";

export const VendorCard = ({ vendor, onFavoriteToggle }) => {
  const { lang, user } = useApp();
  const [saved, setSaved] = React.useState(false);

  const toggleFav = async (e) => {
    e.preventDefault(); e.stopPropagation();
    if (!user) { toast.info("Masuk dulu untuk menyimpan vendor"); return; }
    try {
      const r = await api.post(`/favorites/${vendor.id}`);
      setSaved(r.data.favorited);
      onFavoriteToggle && onFavoriteToggle(vendor.id, r.data.favorited);
      toast.success(r.data.favorited ? "Disimpan" : "Dihapus dari favorit");
    } catch { toast.error("Gagal"); }
  };

  const openWA = (e) => {
    e.preventDefault(); e.stopPropagation();
    const msg = `Halo ${vendor.name}, saya menemukan Anda via NikahKita dan tertarik untuk konsultasi.`;
    window.open(waLink(vendor.whatsapp, msg), "_blank");
  };

  return (
    <Link to={`/vendors/${vendor.id}`} data-testid={`vendor-card-${vendor.id}`} className="nk-card group block">
      <div className="relative aspect-[4/3] overflow-hidden bg-stone-100">
        <Image
          src={optimizeImageUrl(vendor.cover_image, 1200, 65)}
          alt={vendor.name}
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          quality={65}
          loading="lazy"
          className="object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute top-3 left-3 flex gap-1.5">
          {vendor.tier === "premium" && (
            <span className="px-2 py-0.5 bg-amber-700 text-amber-50 text-[10px] font-mono uppercase tracking-wider rounded-sm">Premium</span>
          )}
          {vendor.tier === "featured" && (
            <span className="px-2 py-0.5 bg-stone-900 text-stone-50 text-[10px] font-mono uppercase tracking-wider rounded-sm">Featured</span>
          )}
          {vendor.verified && (
            <span className="px-2 py-0.5 bg-emerald-700/90 text-emerald-50 text-[10px] font-mono uppercase tracking-wider rounded-sm">Verified</span>
          )}
        </div>
        <button
          onClick={toggleFav}
          data-testid={`vendor-fav-${vendor.id}`}
          className="absolute top-3 right-3 w-9 h-9 rounded-full bg-white/90 backdrop-blur flex items-center justify-center hover:bg-white transition-colors"
          aria-label={t(lang, "cta.save")}>
          <Heart className={`w-4 h-4 ${saved ? "fill-rose-600 stroke-rose-600" : "stroke-stone-700"}`} />
        </button>
      </div>
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="nk-overline mb-1 truncate">{vendor.category}</div>
            <h3 className="nk-h3 truncate">{vendor.name}</h3>
          </div>
          <div className="flex items-center gap-1 text-sm text-stone-800 shrink-0 mt-1">
            <Star className="w-4 h-4 fill-amber-500 stroke-amber-500" />
            <span className="font-medium">{vendor.rating_avg?.toFixed?.(1) || vendor.rating_avg}</span>
            <span className="text-xs text-stone-500">({vendor.review_count})</span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-3 text-xs text-stone-600">
          <span className="inline-flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{vendor.city}</span>
          {vendor.capacity_max > 0 && (
            <span className="inline-flex items-center gap-1"><Users className="w-3.5 h-3.5" />{vendor.capacity_max.toLocaleString('id-ID')} pax</span>
          )}
          <span className="inline-flex items-center gap-1 text-emerald-700"><Zap className="w-3.5 h-3.5" />{t(lang, "vendor.response")}</span>
        </div>
        {vendor.adat_tags?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {vendor.adat_tags.slice(0, 3).map((a) => (
              <span key={a} className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 bg-stone-100 text-stone-700 rounded-sm">{a}</span>
            ))}
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-stone-200 flex items-end justify-between gap-3">
          <div>
            <div className="text-[11px] text-stone-500 font-mono uppercase tracking-wider">{t(lang, "vendor.start_from")}</div>
            <div className="idr-amount text-lg font-medium text-stone-900">{formatIDR(vendor.price_min)}</div>
          </div>
          <button onClick={openWA} data-testid={`vendor-wa-${vendor.id}`} className="nk-btn-wa !px-3 !py-2 text-xs">
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.48A11.78 11.78 0 0 0 12.06 0C5.5 0 .18 5.32.18 11.88c0 2.1.55 4.14 1.6 5.95L0 24l6.33-1.66a11.8 11.8 0 0 0 5.73 1.46h.01c6.56 0 11.88-5.32 11.88-11.88a11.78 11.78 0 0 0-3.43-8.44zM12.07 21.8h-.01a9.9 9.9 0 0 1-5.04-1.38l-.36-.21-3.75.98 1-3.65-.24-.37a9.86 9.86 0 0 1-1.52-5.3c0-5.46 4.44-9.9 9.9-9.9a9.86 9.86 0 0 1 9.9 9.9c0 5.46-4.44 9.9-9.88 9.93zm5.42-7.4c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.95 1.17c-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.47.13-.62.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.5-.5-.67-.5l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.05 1.02-1.05 2.5s1.07 2.9 1.22 3.1c.15.2 2.1 3.2 5.08 4.48.7.3 1.26.48 1.7.62.72.23 1.37.2 1.88.12.57-.08 1.76-.72 2.02-1.42.25-.7.25-1.3.17-1.42-.08-.13-.27-.2-.57-.35z"/></svg>
            WhatsApp
          </button>
        </div>
      </div>
    </Link>
  );
};
