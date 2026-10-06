import React, { useRef } from "react";
import Image from "next/image";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react";
import { useApp } from "@/lib/store";
import { DESTINATIONS } from "@/lib/destinations";

export default function DestinationsCarousel() {
  const { lang } = useApp();
  const scrollerRef = useRef(null);

  const scrollBy = (dir) => {
    const el = scrollerRef.current;
    if (!el) return;
    const card = el.querySelector("[data-dest-card]");
    const step = card ? card.getBoundingClientRect().width + 24 : 320;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  return (
    <section className="nk-section bg-[color:var(--canvas)]">
      <div className="nk-container">
        <div className="flex items-end justify-between gap-6 mb-10">
          <div>
            <div className="nk-overline mb-2">Plan Your Destination Wedding</div>
            <h2 className="nk-h2">{lang === "id" ? "Rencanakan destinasi wedding-mu" : "Plan your destination wedding"}</h2>
            <p className="nk-lead mt-2 max-w-xl">
              {lang === "id"
                ? "10 destinasi favorit untuk pernikahan di Indonesia — dari tebing Uluwatu sampai Pulau Samosir."
                : "10 handpicked spots across Indonesia — from Uluwatu cliffs to Samosir Island."}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2 shrink-0">
            <button data-testid="dest-carousel-prev" onClick={() => scrollBy(-1)} aria-label="Prev" className="w-10 h-10 rounded-full border border-stone-900 flex items-center justify-center hover:bg-stone-900 hover:text-stone-50 transition-colors">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button data-testid="dest-carousel-next" onClick={() => scrollBy(1)} aria-label="Next" className="w-10 h-10 rounded-full border border-stone-900 flex items-center justify-center hover:bg-stone-900 hover:text-stone-50 transition-colors">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div
          ref={scrollerRef}
          className="flex gap-6 overflow-x-auto snap-x snap-mandatory pb-4 scroll-smooth"
          style={{ scrollbarWidth: "thin" }}>
          {DESTINATIONS.map((d) => (
            <Link
              key={d.key}
              to={`/vendors?category=Venue&search=${encodeURIComponent(d.name.split(",")[0])}`}
              data-dest-card
              data-testid={`dest-card-${d.key}`}
              className="shrink-0 snap-start w-[260px] sm:w-[300px] group">
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-stone-200">
                <Image
                  src={d.image}
                  alt={d.name}
                  fill
                  sizes="(min-width: 640px) 300px, 260px"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              </div>
              <div className="pt-4">
                <div className="font-serif text-xl text-stone-900 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 mt-1.5 text-amber-700 shrink-0" />
                  <span>{d.name}</span>
                </div>
                <div className="text-sm text-stone-600 mt-1 ml-5">{d.tagline}</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
