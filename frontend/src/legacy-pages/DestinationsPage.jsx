import React from "react";
import Image from "next/image";
import { Link } from "react-router-dom";
import { Shell } from "@/components/Shell";
import { DESTINATIONS } from "@/lib/destinations";
import { MapPin, ArrowUpRight } from "lucide-react";

export default function DestinationsPage() {
  return (
    <Shell>
      <section className="nk-container pt-10 pb-16">
        <div className="nk-overline mb-3">Destinasi</div>
        <h1 className="nk-h1 mb-4">Plan Your Destination Wedding</h1>
        <p className="nk-lead max-w-2xl mb-10">10 destinasi favorit untuk pernikahan di Indonesia. Klik destinasi untuk melihat venue yang tersedia di sana.</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {DESTINATIONS.map((d) => (
            <Link
              key={d.key}
              to={`/vendors?category=Venue&search=${encodeURIComponent(d.name.split(",")[0])}`}
              data-testid={`destpage-card-${d.key}`}
              className="group block">
              <div className="relative aspect-[4/5] overflow-hidden rounded-sm bg-stone-200">
                <Image
                  src={d.image}
                  alt={d.name}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                  className="object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center group-hover:bg-amber-700 group-hover:text-white transition-colors">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
              </div>
              <div className="pt-4">
                <div className="font-serif text-2xl text-stone-900 flex items-start gap-1.5">
                  <MapPin className="w-4 h-4 mt-2 text-amber-700 shrink-0" />
                  <span>{d.name}</span>
                </div>
                <div className="text-sm text-stone-600 mt-1 ml-5">{d.tagline}</div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </Shell>
  );
}
