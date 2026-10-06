import type { Metadata } from "next";
import { cache, Suspense } from "react";
import { prisma } from "@/lib/prisma";
import LegacyApplication from "../legacy-application";

type RouteProps = {
  params: Promise<{ path?: string[] }>;
};

const getPublicVendor = cache((id: string) => prisma.vendor.findFirst({
  where: { id, approved: true },
  select: { data: true, tier: true, ratingAvg: true, name: true, category: true, city: true, description: true },
}));

async function getInitialVendor(path: string[] | undefined): Promise<Record<string, unknown> | null> {
  if (path?.length !== 2 || path[0] !== "vendors") return null;

  const vendor = await getPublicVendor(path[1]);
  if (!vendor) return null;

  const data = vendor.data && typeof vendor.data === "object" && !Array.isArray(vendor.data)
    ? vendor.data as Record<string, unknown>
    : {};

  return { ...data, rating_avg: vendor.ratingAvg, tier: vendor.tier, reviews: [] };
}

const pageTitles: Record<string, string> = {
  "": "Vendor Pernikahan & Wedding Planner",
  vendors: "Direktori Vendor Pernikahan",
  venues: "Venue Pernikahan",
  "real-weddings": "Inspirasi Real Wedding",
  destinations: "Destinasi Pernikahan",
  signin: "Masuk",
  signup: "Daftar",
};

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function descriptionText(value: string, fallback: string): string {
  const normalized = (value || fallback).replace(/\s+/g, " ").trim();
  return normalized.length > 160 ? `${normalized.slice(0, 157).trimEnd()}...` : normalized;
}

function detailMetadata(
  title: string,
  description: string,
  image?: string,
): Metadata {
  return {
    title,
    description,
    openGraph: {
      type: "article",
      title,
      description,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export async function generateMetadata({ params }: RouteProps): Promise<Metadata> {
  const { path = [] } = await params;
  const title = pageTitles[path[0] ?? ""] ?? "Rencanakan Pernikahan Impian";
  const canonical = `/${path.map((segment) => encodeURIComponent(segment)).join("/")}`;

  if (path.length === 2 && path[0] === "vendors") {
    const vendor = await getPublicVendor(path[1]);
    if (vendor) {
      const data = vendor.data && typeof vendor.data === "object" && !Array.isArray(vendor.data)
        ? vendor.data as Record<string, unknown>
        : {};
      const vendorTitle = [
        vendor.name,
        vendor.category && `Vendor ${vendor.category}`,
        vendor.city && `di ${vendor.city}`,
      ].filter(Boolean).join(" — ") || "Vendor Pernikahan";
      const vendorDescription = descriptionText(
        vendor.description,
        `Temukan ${vendor.name || "vendor pernikahan"}${vendor.category ? `, ${vendor.category.toLowerCase()}` : ""}${vendor.city ? ` di ${vendor.city}` : ""}. Lihat detail layanan dan hubungi melalui NikahKita.`,
      );
      const image = stringValue(data.cover_image);
      return {
        ...detailMetadata(vendorTitle, vendorDescription, image || undefined),
        alternates: { canonical },
        robots: { index: true, follow: true },
      };
    }
    return {
      title,
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  if (path.length === 2 && path[0] === "real-weddings") {
    const weddingRecord = await prisma.legacyDocument.findUnique({
      where: { collection_legacyId: { collection: "real_weddings", legacyId: path[1] } },
      select: { document: true },
    });
    const wedding = weddingRecord?.document && typeof weddingRecord.document === "object"
      && !Array.isArray(weddingRecord.document)
      ? weddingRecord.document as Record<string, unknown>
      : null;
    const coupleNames = stringValue(wedding?.couple_names);
    if (coupleNames) {
      const location = [stringValue(wedding?.adat), stringValue(wedding?.city)]
        .filter(Boolean)
        .join(" · ");
      const weddingTitle = location ? `${coupleNames} — ${location}` : coupleNames;
      const weddingDescription = descriptionText(
        stringValue(wedding?.story),
        `Kisah pernikahan ${coupleNames}${location ? ` di ${location}` : ""}. Temukan inspirasi real wedding dan vendor di NikahKita.`,
      );
      const image = stringValue(wedding?.cover_image);
      return {
        ...detailMetadata(weddingTitle, weddingDescription, image || undefined),
        alternates: { canonical },
        robots: { index: true, follow: true },
      };
    }
    return {
      title,
      alternates: { canonical },
      robots: { index: false, follow: false },
    };
  }

  const indexableRoutes = ["", "vendors", "venues", "real-weddings", "destinations"];
  const indexable = path.length <= 1 && indexableRoutes.includes(path[0] ?? "");

  return {
    title,
    alternates: { canonical },
    robots: { index: indexable, follow: indexable },
  };
}

export default async function Page({ params }: RouteProps) {
  const { path = [] } = await params;
  const initialVendor = await getInitialVendor(path);

  return (
    <Suspense>
      <LegacyApplication initialVendor={initialVendor} />
    </Suspense>
  );
}
