SET search_path TO "nikahkita", "public";

ALTER TABLE "vendors"
    ADD COLUMN IF NOT EXISTS "capacity_max" INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "rating_avg" DOUBLE PRECISION NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS "tier" TEXT NOT NULL DEFAULT 'free',
    ADD COLUMN IF NOT EXISTS "tier_rank" INTEGER NOT NULL DEFAULT 2,
    ADD COLUMN IF NOT EXISTS "data" JSONB NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS "vendors_approved_tier_rank_rating_avg_idx"
    ON "vendors" ("approved", "tier_rank", "rating_avg" DESC);

CREATE TABLE IF NOT EXISTS "rsvp_rate_limits" (
    "id" TEXT NOT NULL,
    "window_started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "count" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "rsvp_rate_limits_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "rsvp_rate_limits_window_started_at_idx"
    ON "rsvp_rate_limits" ("window_started_at");
