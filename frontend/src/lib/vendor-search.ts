import { prisma } from "@/lib/prisma";

export type VendorSearchResult = {
  id: string;
  slug: string;
  name: string;
  category: string;
  city: string;
  description: string;
  rank: number;
};

export async function searchVendors(query: string, limit = 30): Promise<VendorSearchResult[]> {
  const normalizedQuery = query.trim().slice(0, 120);
  if (!normalizedQuery) return [];

  const boundedLimit = Math.min(Math.max(Math.trunc(limit), 1), 100);
  return prisma.$queryRaw<VendorSearchResult[]>`
    SELECT
      "id",
      "slug",
      "name",
      "category",
      "city",
      "description",
      ts_rank(
        to_tsvector('simple', "name" || ' ' || "category" || ' ' || "city" || ' ' || "description"),
        plainto_tsquery('simple', ${normalizedQuery})
      ) AS "rank"
    FROM "nikahkita"."vendors"
    WHERE "approved" = true
      AND (
        to_tsvector('simple', "name" || ' ' || "category" || ' ' || "city" || ' ' || "description")
          @@ plainto_tsquery('simple', ${normalizedQuery})
        OR "name" % ${normalizedQuery}
      )
    ORDER BY "rank" DESC, similarity("name", ${normalizedQuery}) DESC
    LIMIT ${boundedLimit}
  `;
}
