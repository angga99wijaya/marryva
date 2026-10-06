import { createHash, randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { getAuthenticatedUser } from "@/lib/auth/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
type JsonObject = Record<string, unknown>;
type RouteContext = { params: Promise<{ path: string[] }> };

const json = (data: unknown, status = 200) => NextResponse.json(data, { status });
const now = () => new Date().toISOString();
const presets: Record<string, JsonObject[]> = {
  checklist: [
    ["12+months", "Set keseluruhan budget pernikahan"], ["12+months", "Pilih tanggal dan tipe adat"],
    ["12+months", "Booking venue utama"], ["10months", "Booking fotografer & videografer"],
    ["8months", "Booking katering"], ["8months", "Booking WO / Wedding Organizer"],
    ["6months", "Pilih MUA dan jadwalkan trial makeup"], ["6months", "Booking dekorasi & pelaminan"],
    ["4months", "Finalisasi busana (akad + resepsi)"], ["4months", "Design undangan digital"],
    ["2months", "Sebar undangan via WhatsApp"], ["2months", "Final tasting katering"],
    ["1month", "Technical meeting dengan WO"], ["2weeks", "Pelunasan DP vendor"],
    ["weekof", "Siraman & midodareni"], ["dayof", "Akad & resepsi"],
    ["after", "Thank you message ke tamu & vendor"],
  ].map(([bucket, title]) => ({ title, bucket, done: false, due_date: "", notes: "" })),
  budget: [
    ["Katering", 60_000_000], ["Venue / Gedung", 40_000_000], ["Dekorasi & Pelaminan", 25_000_000],
    ["MUA & Busana", 20_000_000], ["Dokumentasi (Foto + Video)", 20_000_000],
    ["Wedding Organizer", 10_000_000], ["Entertainment", 7_000_000],
    ["Undangan Digital & Souvenir", 5_000_000], ["Lain-lain", 3_000_000],
  ].map(([category, estimated_idr]) => ({
    category, estimated_idr, actual_idr: 0, paid: false, vendor_name: "", notes: "",
  })),
};

function asRecord(value: Prisma.JsonValue): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : {};
}

function vendorJson(value: Prisma.JsonValue): JsonObject {
  return asRecord(value);
}

function vendorWhere(query: URLSearchParams): Prisma.VendorWhereInput {
  const where: Prisma.VendorWhereInput = { approved: true };
  const category = query.get("category");
  const city = query.get("city");
  const adat = query.get("adat");
  const minPrice = Number(query.get("min_price") ?? 0);
  const maxPrice = Number(query.get("max_price") ?? Number.MAX_SAFE_INTEGER);
  const minCapacity = Number(query.get("min_capacity") ?? 0);
  if (category) where.category = category;
  if (city) where.city = city;
  if (Number.isFinite(minPrice) && minPrice > 0) where.priceMax = { gte: minPrice };
  if (Number.isFinite(maxPrice) && maxPrice < Number.MAX_SAFE_INTEGER) where.priceMin = { lte: maxPrice };
  if (minCapacity > 0 && Number.isFinite(minCapacity)) where.capacityMax = { gte: minCapacity };
  if (adat && adat !== "all") {
    where.data = { path: ["adat_tags"], array_contains: [adat] };
  }
  return where;
}

async function readCollection(collection: string, limit = 5000): Promise<JsonObject[]> {
  const docs = await prisma.legacyDocument.findMany({
    where: { collection },
    orderBy: { importedAt: "asc" },
    take: limit,
    select: { document: true },
  });
  return docs.map(({ document }) => asRecord(document));
}

function makeId() {
  return randomUUID();
}

async function saveDocument(
  collection: string,
  input: JsonObject,
  client: Prisma.TransactionClient | PrismaClient = prisma,
) {
  const record = { ...input, id: typeof input.id === "string" ? input.id : makeId() };
  await client.legacyDocument.upsert({
    where: { collection_legacyId: { collection, legacyId: record.id as string } },
    create: {
      id: makeId(),
      collection,
      legacyId: record.id as string,
      document: record as Prisma.InputJsonValue,
    },
    update: { document: record as Prisma.InputJsonValue },
  });
  return record;
}

async function findDocument(collection: string, id: string) {
  const doc = await prisma.legacyDocument.findUnique({
    where: { collection_legacyId: { collection, legacyId: id } },
    select: { document: true },
  });
  return doc ? asRecord(doc.document) : null;
}

async function removeDocument(collection: string, id: string) {
  await prisma.legacyDocument.deleteMany({ where: { collection, legacyId: id } });
}

function owned(record: JsonObject | null, userId: string) {
  return record?.user_id === userId;
}

async function requireUser() {
  return getAuthenticatedUser();
}

function publicWebsite(site: JsonObject | null) {
  if (!site) return null;
  const { user_id: _userId, password_hash: _passwordHash, password: _password, ...visible } = site;
  return visible;
}

async function createLegacyVendor(input: JsonObject, userId: string) {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 160) : "";
  const category = typeof input.category === "string" ? input.category.trim().slice(0, 80) : "";
  const city = typeof input.city === "string" ? input.city.trim().slice(0, 120) : "";
  if (!name || !category || !city) {
    return json({ detail: "Name, category, and city are required." }, 400);
  }

  const id = makeId();
  const slugBase = name.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 48) || "vendor";
  const doc = {
    ...input,
    id,
    slug: `${slugBase}-${id.slice(0, 6)}`,
    name,
    category,
    city,
    owner_user_id: userId,
    approved: false,
    verified: false,
    rating_avg: 0,
    review_count: 0,
    created_at: now(),
  };
  await prisma.$transaction(async (tx) => {
    await saveDocument("vendors", doc, tx);
    await tx.vendor.create({
      data: {
        id,
        slug: doc.slug,
        name,
        category,
        city,
        description: typeof input.description === "string" ? input.description : "",
        approved: false,
        priceMin: typeof input.price_min === "number" ? Math.max(0, Math.trunc(input.price_min)) : 0,
        priceMax: typeof input.price_max === "number" ? Math.max(0, Math.trunc(input.price_max)) : 0,
        capacityMax: typeof input.capacity_max === "number" ? Math.max(0, Math.trunc(input.capacity_max)) : 0,
        tierRank: input.tier === "premium" ? 0 : input.tier === "featured" ? 1 : 2,
        data: doc as Prisma.InputJsonValue,
      },
    });
  });
  return json(doc, 201);
}

async function handle(request: NextRequest, path: string[]) {
  const method = request.method;
  const route = path.join("/");
  const query = request.nextUrl.searchParams;

  if (method === "GET" && route === "") return json({ service: "NikahKita API", status: "ok" });
  if (route === "auth/login" || route === "auth/signup") {
    return json({ detail: "Use Supabase Auth through the application sign-in and sign-up pages." }, 410);
  }
  if (method === "GET" && route === "auth/me") {
    const authenticatedUser = await requireUser();
    return authenticatedUser
      ? json(authenticatedUser)
      : json({ detail: "Authentication required." }, 401);
  }

  if (method === "GET" && route === "vendors") {
    const search = query.get("search")?.trim();
    const requestedLimit = Number(query.get("limit") ?? 60);
    const limit = Number.isFinite(requestedLimit) ? Math.max(1, Math.min(Math.trunc(requestedLimit), 100)) : 60;
    const sort = query.get("sort") ?? "recommended";
    let where = vendorWhere(query);
    if (search) {
      const matched = await prisma.$queryRaw<Array<{ id: string }>>`
        SELECT "id"
        FROM "nikahkita"."vendors"
        WHERE "approved" = true
          AND (
            to_tsvector('simple', "name" || ' ' || "category" || ' ' || "city" || ' ' || "description")
              @@ plainto_tsquery('simple', ${search.slice(0, 120)})
            OR "name" % ${search.slice(0, 120)}
          )
      `;
      where = { AND: [where, { id: { in: matched.map((item) => item.id) } }] };
    }
    const orderBy: Prisma.VendorOrderByWithRelationInput[] = sort === "price_asc"
      ? [{ priceMin: "asc" }]
      : sort === "price_desc"
        ? [{ priceMin: "desc" }]
        : sort === "rating"
          ? [{ ratingAvg: "desc" }]
            : [{ tierRank: "asc" }, { ratingAvg: "desc" }];
    const vendors = await prisma.vendor.findMany({
      where,
      orderBy,
      take: limit,
      select: { data: true, tier: true, ratingAvg: true },
    });
    return json(vendors.map(({ data, tier, ratingAvg }) => ({
      ...vendorJson(data),
      tier,
      rating_avg: ratingAvg,
    })));
  }

  if (method === "GET" && route.startsWith("vendors/")) {
    const id = path[1];
    const indexed = await prisma.vendor.findUnique({ where: { id }, select: { data: true, ratingAvg: true, tier: true } });
    const vendor = indexed ? { ...vendorJson(indexed.data), rating_avg: indexed.ratingAvg, tier: indexed.tier } : await findDocument("vendors", id);
    if (!vendor) return json({ detail: "Vendor not found." }, 404);
    const reviews = (await readCollection("reviews"))
      .filter((review) => review.vendor_id === id)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? "")));
    return json({ ...vendor, reviews: reviews.slice(0, 100) });
  }

  if (method === "GET" && route === "real-weddings") {
    const adat = query.get("adat");
    const city = query.get("city");
    return json((await readCollection("real_weddings", 500))
      .filter((item) => !adat || adat === "all" || item.adat === adat)
      .filter((item) => !city || item.city === city));
  }
  if (method === "GET" && route.startsWith("real-weddings/")) {
    const wedding = await findDocument("real_weddings", path[1]);
    return wedding ? json(wedding) : json({ detail: "Not found." }, 404);
  }
  if (method === "GET" && route === "boost/plans") {
    return json({
      featured: { name: "Featured", price_idr: 499000, duration_days: 30, perks: ["Posisi lebih tinggi di direktori", "Badge Featured"] },
      premium: { name: "Premium", price_idr: 1499000, duration_days: 30, perks: ["Prioritas teratas", "Badge Premium", "Analytics listing"] },
    });
  }

  if (method === "POST" && route === "inquiries") {
    const body = await request.json() as JsonObject;
    if (
      typeof body.vendor_id !== "string"
      || typeof body.name !== "string" || !body.name.trim() || body.name.length > 120
      || typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email)
      || typeof body.phone !== "string" || !body.phone.trim() || body.phone.length > 32
      || typeof body.message !== "string" || !body.message.trim() || body.message.length > 2000
    ) {
      return json({ detail: "Vendor, name, email, phone, and message are required." }, 400);
    }
    if (!await prisma.vendor.findUnique({ where: { id: body.vendor_id }, select: { id: true } })) {
      return json({ detail: "Vendor not found." }, 404);
    }
    return json(await saveDocument("inquiries", { ...body, status: "new", created_at: now() }), 201);
  }
  if (method === "POST" && path[0] === "website" && path[1] === "public" && path[2] && path.length === 3) {
    const site = (await readCollection("websites")).find((item) => item.slug === path[2] && item.published === true);
    if (!site) return json({ detail: "Not found." }, 404);
    if (typeof site.password_hash === "string" && site.password_hash) {
      const input = await request.json() as JsonObject;
      if (typeof input.password !== "string" || !await bcrypt.compare(input.password, site.password_hash)) {
        return json({ detail: "Incorrect invitation password." }, 403);
      }
    }
    return json(publicWebsite(site));
  }
  if (method === "GET" && path[0] === "website" && path[1] === "public" && path[2]) {
    const site = (await readCollection("websites")).find((item) => item.slug === path[2] && item.published === true);
    if (!site) return json({ detail: "Not found." }, 404);
    if (typeof site.password_hash === "string" && site.password_hash) {
      return json({
        locked: true,
        slug: path[2],
        bride_name: site.bride_name,
        groom_name: site.groom_name,
      });
    }
    return json(publicWebsite(site));
  }
  if (method === "POST" && path[0] === "website" && path[1] === "public" && path[2] && path[3] === "rsvp") {
    const site = (await readCollection("websites")).find((item) => item.slug === path[2] && item.published === true);
    if (!site) return json({ detail: "Not found." }, 404);
    if (site.rsvp_enabled === false) return json({ detail: "RSVP disabled." }, 400);
    const input = await request.json() as JsonObject;
    if (
      typeof input.name !== "string" || !input.name.trim() || input.name.length > 120
      || typeof input.attending !== "boolean"
      || (input.phone_wa !== undefined && (typeof input.phone_wa !== "string" || input.phone_wa.length > 20))
      || (input.message !== undefined && (typeof input.message !== "string" || input.message.length > 600))
      || (input.guests !== undefined && (!Number.isInteger(input.guests) || Number(input.guests) < 1 || Number(input.guests) > 20))
    ) return json({ detail: "Invalid RSVP data." }, 400);
    if (typeof site.password_hash === "string" && site.password_hash) {
      if (typeof input.password !== "string" || !await bcrypt.compare(input.password, site.password_hash)) {
        return json({ detail: "Incorrect invitation password." }, 403);
      }
    }
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || "unknown";
    const bucketKey = createHash("sha256").update(`${path[2]}:${clientIp}`).digest("hex");
    await prisma.rsvpRateLimit.deleteMany({
      where: { windowStartedAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) } },
    });
    const [rate] = await prisma.$queryRaw<Array<{ count: number }>>`
      INSERT INTO "nikahkita"."rsvp_rate_limits" ("id", "window_started_at", "count")
      VALUES (${bucketKey}, CURRENT_TIMESTAMP, 1)
      ON CONFLICT ("id") DO UPDATE SET
        "count" = CASE
          WHEN "nikahkita"."rsvp_rate_limits"."window_started_at" <= CURRENT_TIMESTAMP - INTERVAL '1 minute' THEN 1
          ELSE "nikahkita"."rsvp_rate_limits"."count" + 1
        END,
        "window_started_at" = CASE
          WHEN "nikahkita"."rsvp_rate_limits"."window_started_at" <= CURRENT_TIMESTAMP - INTERVAL '1 minute' THEN CURRENT_TIMESTAMP
          ELSE "nikahkita"."rsvp_rate_limits"."window_started_at"
        END
      RETURNING "count"
    `;
    if (rate.count > 5) return json({ detail: "Terlalu banyak percobaan. Coba beberapa menit lagi." }, 429);

    const { password: _password, ...rsvpInput } = input;
    const rsvpDocument: JsonObject = {
      ...rsvpInput,
      id: makeId(),
      user_id: site.user_id,
      website_slug: path[2],
      created_at: now(),
    };
    const guests = (await readCollection("guests")).filter((guest) => guest.user_id === site.user_id);
    const existingGuest = guests.find((guest) =>
      typeof guest.name === "string"
      && guest.name.toLowerCase() === String(input.name).toLowerCase()
      && (!input.phone_wa || guest.phone_wa === input.phone_wa),
    );
    const status = input.attending ? "attending" : "declined";
    const guestDocument: JsonObject = existingGuest
      ? {
          ...existingGuest,
          rsvp_status: status,
          phone_wa: input.phone_wa || existingGuest.phone_wa || "",
          notes: typeof input.message === "string" ? input.message.slice(0, 300) : "",
        }
      : {
        name: input.name,
        user_id: site.user_id,
        side: "both",
        group: "RSVP via website",
        rsvp_status: status,
        phone_wa: input.phone_wa || "",
        meal_pref: "",
        notes: input.message || "",
        created_at: now(),
      };
    const rsvp = await prisma.$transaction(async (tx) => {
      await saveDocument("rsvps", rsvpDocument, tx);
      await saveDocument("guests", guestDocument, tx);
      return rsvpDocument;
    });
    return json({ ok: true, id: rsvp.id }, 201);
  }

  const user = await requireUser();
  if (!user) return json({ detail: "Authentication required." }, 401);

  if (method === "POST" && route === "vendors") {
    if (user.role !== "vendor" && user.role !== "admin") return json({ detail: "Vendor role required." }, 403);
    const input = await request.json() as JsonObject;
    return createLegacyVendor({ ...input, tier: "free" }, user.id);
  }
  if (method === "PUT" && route.startsWith("vendors/")) {
    const id = path[1];
    const vendor = await findDocument("vendors", id);
    if (!vendor) return json({ detail: "Vendor not found." }, 404);
    if (vendor.owner_user_id !== user.id && user.role !== "admin") return json({ detail: "Forbidden." }, 403);
    const patch = await request.json() as JsonObject;
    const updated: JsonObject = { ...vendor, ...patch, id };
    await prisma.$transaction(async (tx) => {
      await saveDocument("vendors", updated, tx);
      await tx.vendor.update({
        where: { id },
        data: {
          name: typeof updated.name === "string" ? updated.name : vendor.name as string,
          category: typeof updated.category === "string" ? updated.category : vendor.category as string,
          city: typeof updated.city === "string" ? updated.city : vendor.city as string,
          description: typeof updated.description === "string" ? updated.description : "",
          priceMin: typeof updated.price_min === "number" ? updated.price_min : 0,
          priceMax: typeof updated.price_max === "number" ? updated.price_max : 0,
          capacityMax: typeof updated.capacity_max === "number" ? updated.capacity_max : 0,
          ratingAvg: typeof updated.rating_avg === "number" ? updated.rating_avg : 0,
          tier: typeof updated.tier === "string" ? updated.tier : "free",
          tierRank: updated.tier === "premium" ? 0 : updated.tier === "featured" ? 1 : 2,
          data: updated as Prisma.InputJsonValue,
        },
      });
    });
    return json(updated);
  }
  if (method === "GET" && route === "my/vendor") {
    return json((await readCollection("vendors")).find((vendor) => vendor.owner_user_id === user.id) ?? null);
  }
  if (method === "GET" && route === "my/inquiries") {
    const vendor = (await readCollection("vendors")).find((item) => item.owner_user_id === user.id);
    if (!vendor) return json([]);
    return json((await readCollection("inquiries")).filter((item) => item.vendor_id === vendor.id)
      .sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))));
  }
  if (method === "POST" && route === "reviews") {
    const body = await request.json() as JsonObject;
    const vendor = typeof body.vendor_id === "string" ? await findDocument("vendors", body.vendor_id) : null;
    const rating = Number(body.rating);
    if (!vendor || !Number.isInteger(rating) || rating < 1 || rating > 5 || !body.title || !body.body) {
      return json({ detail: "Valid vendor, rating (1-5), title, and review body are required." }, 400);
    }
    const review = await saveDocument("reviews", {
      ...body, rating, user_id: user.id, user_name: user.name, created_at: now(),
    });
    const reviews = (await readCollection("reviews")).filter((item) => item.vendor_id === body.vendor_id);
    const ratingAvg = reviews.reduce((sum, item) => sum + Number(item.rating ?? 0), 0) / reviews.length;
    const updatedVendor: JsonObject = { ...vendor, rating_avg: Math.round(ratingAvg * 100) / 100, review_count: reviews.length };
    await prisma.$transaction(async (tx) => {
      await saveDocument("vendors", updatedVendor, tx);
      await tx.vendor.update({
        where: { id: String(body.vendor_id) },
        data: {
          ratingAvg: Number(updatedVendor.rating_avg),
          data: updatedVendor as Prisma.InputJsonValue,
        },
      });
    });
    return json(review, 201);
  }

  if (route === "favorites" && method === "GET") {
    const favorites = (await readCollection("favorites")).filter((item) => item.user_id === user.id);
    const ids = [...new Set(favorites.map((item) => item.vendor_id).filter((id): id is string => typeof id === "string"))];
    const vendors = await prisma.vendor.findMany({ where: { id: { in: ids } }, select: { data: true } });
    return json(vendors.map(({ data }) => vendorJson(data)));
  }
  if (route.startsWith("favorites/") && method === "POST") {
    const vendorId = path[1];
    const favorite = (await readCollection("favorites"))
      .find((item) => item.user_id === user.id && item.vendor_id === vendorId);
    if (favorite) {
      await removeDocument("favorites", String(favorite.id));
      return json({ favorited: false });
    }
    await saveDocument("favorites", { user_id: user.id, vendor_id: vendorId, created_at: now() });
    return json({ favorited: true });
  }

  const simpleCollections: Record<string, string> = {
    checklist: "checklist",
    budget: "budget",
    guests: "guests",
    "registry/contributions": "contributions",
    "website/rsvps": "rsvps",
    "ai/sessions": "ai_sessions",
    "boost/mine": "boost_orders",
  };
  if (method === "GET" && simpleCollections[route]) {
    const collection = simpleCollections[route];
    if (route === "boost/mine") {
      return json((await readCollection(collection)).filter((item) => item.user_id === user.id));
    }
    if (route === "ai/sessions") {
      return json((await readCollection(collection)).filter((item) => item.user_id === user.id)
        .sort((a, b) => String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""))));
    }
    const rows = (await readCollection(collection)).filter((item) => item.user_id === user.id);
    if (route === "checklist" && rows.length === 0) {
      return json(await Promise.all(presets.checklist.map((item) =>
        saveDocument(collection, { ...item, user_id: user.id, created_at: now() }),
      )));
    }
    if (route === "budget" && rows.length === 0) {
      return json(await Promise.all(presets.budget.map((item) =>
        saveDocument(collection, { ...item, user_id: user.id, created_at: now() }),
      )));
    }
    if (route === "registry/contributions") return json(rows.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))));
    if (route === "website/rsvps") return json(rows.sort((a, b) => String(b.created_at ?? "").localeCompare(String(a.created_at ?? ""))));
    return json(rows);
  }
  if (method === "GET" && route === "timeline") {
    return json((await readCollection("timelines")).find((item) => item.user_id === user.id) ?? null);
  }
  if (method === "POST" && simpleCollections[route] && route !== "registry/contributions") {
    const input = await request.json() as JsonObject;
    if (route === "boost/mine" || route === "timeline" || route === "website/rsvps" || route === "ai/sessions") {
      return json({ detail: "Method not allowed." }, 405);
    }
    if (route === "guests" && !input.name) return json({ detail: "Guest name is required." }, 400);
    if (route === "checklist" && !input.title) return json({ detail: "Task title is required." }, 400);
    if (route === "budget" && !input.category) return json({ detail: "Budget category is required." }, 400);
    return json(await saveDocument(simpleCollections[route], { ...input, user_id: user.id, created_at: now() }), 201);
  }
  if (method === "PUT" && route === "timeline") {
    const input = await request.json() as JsonObject;
    const existing = (await readCollection("timelines")).find((item) => item.user_id === user.id);
    return json(await saveDocument("timelines", { ...(existing ?? {}), ...input, user_id: user.id }));
  }
  for (const collection of ["checklist", "budget", "guests"]) {
    if (path[0] !== collection || path.length !== 2) continue;
    const record = await findDocument(collection, path[1]);
    if (!owned(record, user.id)) return json({ detail: "Not found." }, 404);
    if (method === "DELETE") {
      await removeDocument(collection, path[1]);
      return json({ ok: true });
    }
    if (method === "PUT") {
      return json(await saveDocument(collection, { ...record, ...await request.json() as JsonObject, id: path[1] }));
    }
  }

  if (route === "registry" && method === "GET") {
    let registry = (await readCollection("registry")).find((item) => item.user_id === user.id);
    if (!registry) {
      registry = await saveDocument("registry", {
        user_id: user.id, enabled: false,
        message: "Doa restu adalah hadiah terbaik. Jika ingin memberi tanda kasih, bisa melalui amplop digital di bawah.",
        qris_image_url: "", bank_accounts: [], thank_you_message: "Terima kasih atas doa dan amplop digitalnya.",
        created_at: now(),
      });
    }
    const contributions = (await readCollection("contributions")).filter((item) => item.user_id === user.id);
    return json({
      ...registry,
      contributions,
      total_idr: contributions.reduce((sum, item) => sum + Number(item.amount_idr ?? 0), 0),
    });
  }
  if (route === "registry" && method === "PUT") {
    const existing = (await readCollection("registry")).find((item) => item.user_id === user.id);
    return json(await saveDocument("registry", { ...(existing ?? {}), ...await request.json() as JsonObject, user_id: user.id }));
  }
  if (path[0] === "registry" && path[1] === "contributions" && path.length >= 3) {
    const contribution = await findDocument("contributions", path[2]);
    if (!owned(contribution, user.id)) return json({ detail: "Not found." }, 404);
    if (method === "DELETE") {
      await removeDocument("contributions", path[2]);
      return json({ ok: true });
    }
    if (method === "POST" && path[3] === "thanked") {
      await saveDocument("contributions", { ...contribution, thanked: true });
      return json({ ok: true });
    }
  }
  if (route === "registry/contributions" && method === "POST") {
    const input = await request.json() as JsonObject;
    const amount = Number(input.amount_idr);
    if (!input.name || !Number.isInteger(amount) || amount < 1000 || amount > 1_000_000_000 || !input.method) {
      return json({ detail: "Provide a name, valid amount, and payment method." }, 400);
    }
    return json(await saveDocument("contributions", {
      ...input, amount_idr: amount, user_id: user.id, thanked: false, created_at: now(),
    }), 201);
  }

  if (route === "website/mine" && method === "GET") {
    const site = (await readCollection("websites")).find((item) => item.user_id === user.id);
    return json(publicWebsite(site ?? null));
  }
  if (route === "website/mine" && method === "PUT") {
    const input = await request.json() as JsonObject;
    const existing = (await readCollection("websites")).find((item) => item.user_id === user.id);
    const bride = typeof input.bride_name === "string" ? input.bride_name.trim() : "";
    const groom = typeof input.groom_name === "string" ? input.groom_name.trim() : "";
    if (!bride || !groom) return json({ detail: "Bride and groom names are required." }, 400);
    let slug = typeof existing?.slug === "string" ? existing.slug : "";
    if (!slug) {
      const base = `${bride}-${groom}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || makeId().slice(0, 8);
      slug = base;
      let suffix = 1;
      while ((await readCollection("websites")).some((site) => site.slug === slug)) slug = `${base}-${++suffix}`;
    }
    const { password, ...publicInput } = input;
    const patch: JsonObject = { ...existing, ...publicInput, id: existing?.id ?? makeId(), slug, user_id: user.id };
    if (typeof password === "string" && password.length > 0) {
      patch.password_hash = await bcrypt.hash(password, 12);
      patch.has_password = true;
    } else if (existing?.password_hash) {
      patch.password_hash = existing.password_hash;
      patch.has_password = true;
    } else {
      patch.has_password = false;
    }
    return json(publicWebsite(await saveDocument("websites", patch)));
  }
  if (route === "blast/stats" && method === "GET") {
    const guests = (await readCollection("guests")).filter((item) => item.user_id === user.id);
    return json({
      total: guests.length,
      with_whatsapp: guests.filter((guest) => typeof guest.phone_wa === "string" && guest.phone_wa).length,
      sent: guests.filter((guest) => typeof guest.blast_sent_at === "string" && guest.blast_sent_at).length,
    });
  }
  if (route === "blast/render" && method === "POST") {
    const input = await request.json() as JsonObject;
    const template = typeof input.message === "string" ? input.message.slice(0, 4000) : "";
    const guests = (await readCollection("guests"))
      .filter((guest) => guest.user_id === user.id && typeof guest.phone_wa === "string" && guest.phone_wa);
    return json({
      guests: guests.map((guest) => {
        const message = template.replace(/\{nama\}/gi, String(guest.name ?? ""));
        const phone = String(guest.phone_wa).replace(/\D/g, "");
        return {
          guest_id: guest.id,
          name: guest.name,
          phone_wa: guest.phone_wa,
          message,
          wa_url: `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
          sent_at: guest.blast_sent_at ?? "",
        };
      }),
    });
  }
  if (route === "blast/mark-sent" && method === "POST") {
    const input = await request.json() as JsonObject;
    const id = typeof input.guest_id === "string" ? input.guest_id : "";
    const guest = await findDocument("guests", id);
    if (!owned(guest, user.id)) return json({ detail: "Guest not found." }, 404);
    await saveDocument("guests", { ...guest, blast_sent_at: now() });
    return json({ ok: true });
  }

  if (route === "boost/orders" && method === "POST") {
    return json({ detail: "Pembayaran Midtrans belum dikonfigurasi." }, 503);
  }
  if (route.startsWith("boost/orders/") && method === "POST") {
    return json({ detail: "Pembayaran hanya dapat dikonfirmasi melalui webhook Midtrans." }, 503);
  }
  if (route.startsWith("ai/") && method === "POST") {
    return json({ detail: "Layanan AI belum dikonfigurasi." }, 503);
  }
  if (route.startsWith("ai/") && method === "GET") {
    const collection = route.startsWith("ai/sessions/") ? "ai_sessions" : "ai_sessions";
    const rows = (await readCollection(collection)).filter((item) => item.user_id === user.id);
    if (path.length === 3) {
      const session = rows.find((item) => item.id === path[2]);
      if (!session) return json({ detail: "Session not found." }, 404);
      const messages = (await readCollection("ai_messages")).filter((item) => item.session_id === path[2]);
      return json({ ...session, messages });
    }
    return json(rows);
  }
  if (route === "admin/stats" && method === "GET") {
    if (user.role !== "admin") return json({ detail: "Admin only." }, 403);
    const [users, vendors, inquiries, reviews] = await Promise.all([
      prisma.userProfile.count(),
      prisma.vendor.findMany({ select: { approved: true } }),
      readCollection("inquiries"),
      readCollection("reviews"),
    ]);
    return json({
      users,
      vendors: vendors.filter((item) => item.approved).length,
      pending_vendors: vendors.filter((item) => !item.approved).length,
      inquiries: inquiries.length,
      reviews: reviews.length,
    });
  }
  if (route === "admin/pending-vendors" && method === "GET") {
    if (user.role !== "admin") return json({ detail: "Admin only." }, 403);
    const vendors = await prisma.vendor.findMany({ where: { approved: false }, take: 200, select: { data: true } });
    return json(vendors.map(({ data }) => vendorJson(data)));
  }
  if (path[0] === "admin" && path[1] === "approve-vendor" && method === "POST") {
    if (user.role !== "admin") return json({ detail: "Admin only." }, 403);
    const vendor = await findDocument("vendors", path[2]);
    if (!vendor) return json({ detail: "Vendor not found." }, 404);
    const updated: JsonObject = { ...vendor, approved: true, verified: true };
    await prisma.$transaction(async (tx) => {
      await saveDocument("vendors", updated, tx);
      await tx.vendor.update({
        where: { id: path[2] },
        data: { approved: true, data: updated as Prisma.InputJsonValue },
      });
    });
    return json({ ok: true });
  }

  return json({ detail: `API route ${method} /api/${route} is not implemented.` }, 404);
}

async function dispatch(request: NextRequest, context: RouteContext) {
  try {
    const { path } = await context.params;
    return await handle(request, path);
  } catch (error) {
    console.error(`API request failed: ${request.method} ${request.nextUrl.pathname}`, error);
    return json({ detail: "Internal server error." }, 500);
  }
}

export const GET = dispatch;
export const POST = dispatch;
export const PUT = dispatch;
export const DELETE = dispatch;
