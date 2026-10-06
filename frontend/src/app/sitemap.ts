import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const publicRoutes = [
  "",
  "/vendors",
  "/venues",
  "/real-weddings",
  "/destinations",
];

const maxUrlCount = 50_000;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nikahkita.id";
  const detailCapacity = maxUrlCount - publicRoutes.length;
  const details = await prisma.$queryRaw<Array<{
    kind: "vendor" | "wedding";
    id: string;
    lastModified: Date;
  }>>`
    SELECT "kind", "id", "lastModified"
    FROM (
      SELECT
        'vendor'::text AS "kind",
        "id" AS "id",
        "created_at" AS "lastModified"
      FROM "nikahkita"."vendors"
      WHERE "approved" = true
      UNION ALL
      SELECT
        'wedding'::text AS "kind",
        "legacy_id" AS "id",
        "imported_at" AS "lastModified"
      FROM "nikahkita"."legacy_documents"
      WHERE "collection" = 'real_weddings'
    ) AS public_details
    ORDER BY "kind", "id"
    LIMIT ${detailCapacity + 1}
  `;

  if (details.length > detailCapacity) {
    throw new Error("Sitemap reached the 50,000 URL limit; split it into multiple sitemaps.");
  }

  const staticEntries = publicRoutes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    changeFrequency: route === "" ? "daily" as const : "weekly" as const,
    priority: route === "" ? 1 : 0.7,
  }));

  const detailEntries = details.map((detail) => ({
    url: new URL(
      `/${detail.kind === "vendor" ? "vendors" : "real-weddings"}/${encodeURIComponent(detail.id)}`,
      siteUrl,
    ).toString(),
    lastModified: detail.lastModified,
    changeFrequency: detail.kind === "vendor" ? "weekly" as const : "monthly" as const,
    priority: detail.kind === "vendor" ? 0.6 : 0.5,
  }));

  return [...staticEntries, ...detailEntries];
}
