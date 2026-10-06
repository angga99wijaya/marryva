SET search_path TO "nikahkita", "public";

CREATE TABLE "user_profiles" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "auth_user_id" TEXT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'couple',
    "city" TEXT NOT NULL DEFAULT '',
    "wedding_date" TEXT NOT NULL DEFAULT '',
    "language" TEXT NOT NULL DEFAULT 'id',
    "password_reset_required" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "user_profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendors" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "price_min" INTEGER NOT NULL DEFAULT 0,
    "price_max" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendors_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "legacy_documents" (
    "id" TEXT NOT NULL,
    "collection" TEXT NOT NULL,
    "legacy_id" TEXT NOT NULL,
    "document" JSONB NOT NULL,
    "imported_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "legacy_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "user_profiles_email_key" ON "user_profiles"("email");
CREATE UNIQUE INDEX "user_profiles_auth_user_id_key" ON "user_profiles"("auth_user_id");
CREATE UNIQUE INDEX "vendors_slug_key" ON "vendors"("slug");
CREATE INDEX "vendors_city_category_approved_idx" ON "vendors"("city", "category", "approved");
CREATE UNIQUE INDEX "legacy_documents_collection_legacy_id_key" ON "legacy_documents"("collection", "legacy_id");
CREATE INDEX "legacy_documents_collection_idx" ON "legacy_documents"("collection");

CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA "public";
CREATE INDEX "vendors_name_trgm_idx" ON "vendors" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "vendors_search_fts_idx" ON "vendors" USING GIN (
    to_tsvector('simple', "name" || ' ' || "category" || ' ' || "city" || ' ' || "description")
);
