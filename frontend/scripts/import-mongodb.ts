import dotenv from "dotenv";
import { createHash, randomUUID } from "node:crypto";
import { MongoClient, ObjectId } from "mongodb";
import { Prisma, PrismaClient } from "@prisma/client";

dotenv.config({ path: ".env.local" });
dotenv.config();

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const apply = process.argv.includes("--apply");
const mongoUri = process.env.MONGODB_URI;
const mongoDatabase = process.env.MONGODB_DATABASE;

if (apply && !process.env.DATABASE_URL) {
  throw new Error("Set DATABASE_URL before applying the import.");
}

function requiredEnvironmentValue(value: string | undefined, name: string): string {
  if (!value) throw new Error(`Set ${name} before running the import.`);
  return value;
}

function toPlainJson(value: unknown): JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value.toISOString();
  if (value instanceof ObjectId) return value.toHexString();
  if (Array.isArray(value)) return value.map(toPlainJson);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, toPlainJson(nested)]));
  }
  return value === undefined ? null : String(value);
}

function toPlainJsonObject(document: Record<string, unknown>): Prisma.InputJsonObject {
  return Object.fromEntries(
    Object.entries(document).map(([key, value]) => [key, toPlainJson(value)]),
  ) as Prisma.InputJsonObject;
}

function getLegacyId(document: Record<string, unknown>): string {
  const id = document.id;
  if (typeof id === "string" && id.length > 0) return id;
  if (document._id instanceof ObjectId) return document._id.toHexString();
  return createHash("sha256").update(JSON.stringify(document)).digest("hex");
}

async function main() {
  const mongo = new MongoClient(requiredEnvironmentValue(mongoUri, "MONGODB_URI"));
  const prisma = apply ? new PrismaClient() : undefined;

  try {
    await mongo.connect();
    if (prisma) await prisma.$connect();
    const source = mongo.db(requiredEnvironmentValue(mongoDatabase, "MONGODB_DATABASE"));
    const collections = await source.listCollections({}, { nameOnly: true }).toArray();
    if (collections.length === 0) {
      throw new Error(
        "MongoDB returned no collections for MONGODB_DATABASE. Verify the source database before importing.",
      );
    }
    let totalDocuments = 0;
    let importedDocuments = 0;
    let importedProfiles = 0;
    let importedVendors = 0;

    for (const { name } of collections) {
      const collection = source.collection<Record<string, unknown>>(name);
      let collectionCount = 0;
      let batch: Prisma.LegacyDocumentCreateManyInput[] = [];
      let vendorBatch: Prisma.VendorCreateManyInput[] = [];

      for await (const sourceDocument of collection.find({})) {
        const document = { ...sourceDocument };
        if (name === "users") delete document.password_hash;
        const legacyId = getLegacyId(sourceDocument);
        if (typeof document.id !== "string" || !document.id) document.id = legacyId;
        collectionCount += 1;
        totalDocuments += 1;

        if (!prisma) continue;

        batch.push({
          id: randomUUID(),
          collection: name,
          legacyId,
          document: toPlainJsonObject(document),
        });

        if (name === "users") {
          const userId = typeof sourceDocument.id === "string" ? sourceDocument.id : legacyId;
          const email = typeof sourceDocument.email === "string" ? sourceDocument.email.toLowerCase() : "";
          if (email) {
            await prisma.userProfile.createMany({
              data: [{
                id: userId,
                email,
                name: typeof sourceDocument.name === "string" ? sourceDocument.name : email,
                role: typeof sourceDocument.role === "string" ? sourceDocument.role : "couple",
                city: typeof sourceDocument.city === "string" ? sourceDocument.city : "",
                weddingDate: typeof sourceDocument.wedding_date === "string" ? sourceDocument.wedding_date : "",
                language: typeof sourceDocument.language === "string" ? sourceDocument.language : "id",
                passwordResetRequired: true,
              }],
              skipDuplicates: true,
            });
            importedProfiles += 1;
          }
        }

        if (name === "vendors") {
          const vendorName = typeof sourceDocument.name === "string" ? sourceDocument.name : "";
          const vendorSlug = typeof sourceDocument.slug === "string" ? sourceDocument.slug : legacyId;
          if (vendorName) {
            vendorBatch.push({
              id: legacyId,
              slug: vendorSlug,
              name: vendorName,
              category: typeof sourceDocument.category === "string" ? sourceDocument.category : "Lainnya",
              city: typeof sourceDocument.city === "string" ? sourceDocument.city : "",
              description: typeof sourceDocument.description === "string" ? sourceDocument.description : "",
              approved: sourceDocument.approved === true,
              priceMin: typeof sourceDocument.price_min === "number" ? sourceDocument.price_min : 0,
              priceMax: typeof sourceDocument.price_max === "number" ? sourceDocument.price_max : 0,
              capacityMax: typeof sourceDocument.capacity_max === "number" ? sourceDocument.capacity_max : 0,
              ratingAvg: typeof sourceDocument.rating_avg === "number" ? sourceDocument.rating_avg : 0,
              tier: typeof sourceDocument.tier === "string" ? sourceDocument.tier : "free",
              tierRank: sourceDocument.tier === "premium" ? 0 : sourceDocument.tier === "featured" ? 1 : 2,
              data: toPlainJsonObject(document),
            });
          }
        }

        if (batch.length === 250) {
          const result = await prisma.legacyDocument.createMany({ data: batch, skipDuplicates: true });
          importedDocuments += result.count;
          batch = [];
        }
        if (vendorBatch.length === 250) {
          const result = await prisma.vendor.createMany({ data: vendorBatch, skipDuplicates: true });
          importedVendors += result.count;
          for (const vendor of vendorBatch) {
            await prisma.vendor.updateMany({
              where: { id: vendor.id, data: {} },
              data: {
                data: vendor.data,
                capacityMax: vendor.capacityMax,
                ratingAvg: vendor.ratingAvg,
                tier: vendor.tier,
                tierRank: vendor.tierRank,
              },
            });
          }
          vendorBatch = [];
        }
      }

      if (prisma && batch.length > 0) {
        const result = await prisma.legacyDocument.createMany({ data: batch, skipDuplicates: true });
        importedDocuments += result.count;
      }
      if (prisma && vendorBatch.length > 0) {
        const result = await prisma.vendor.createMany({ data: vendorBatch, skipDuplicates: true });
        importedVendors += result.count;
        for (const vendor of vendorBatch) {
          await prisma.vendor.updateMany({
            where: { id: vendor.id, data: {} },
            data: {
              data: vendor.data,
              capacityMax: vendor.capacityMax,
              ratingAvg: vendor.ratingAvg,
              tier: vendor.tier,
              tierRank: vendor.tierRank,
            },
          });
        }
      }

      console.info(`${apply ? "Read" : "Would import"} ${collectionCount} document(s) from "${name}".`);
    }

    console.info(
      apply
        ? `Import complete: ${importedDocuments} legacy document(s) and ${importedVendors} vendor(s) inserted; ${importedProfiles} user profile(s) checked. Existing target rows were not overwritten.`
        : `Dry run complete: found ${totalDocuments} document(s) in ${collections.length} collection(s). No data was written. Run with --apply to import.`,
    );
  } finally {
    await Promise.all([mongo.close(), prisma?.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  console.error("MongoDB import failed.", error);
  process.exitCode = 1;
});
