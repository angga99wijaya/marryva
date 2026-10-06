# NikahKita

NikahKita is migrating to a single Next.js App Router application with TypeScript, Tailwind CSS, shadcn/ui, PostgreSQL, Prisma, and Supabase Auth.

## Development

```sh
cd frontend
cp .env.example .env
yarn install
yarn db:generate
yarn dev
```

The Next.js application runs at `http://localhost:3000`. Existing screens use a small App Router compatibility layer, and supported API endpoints now run as Next.js route handlers against PostgreSQL.

## Target services

- **Web and API:** Next.js App Router, deployed together on Vercel.
- Public vendor and real-wedding detail URLs are included in the runtime sitemap; sign-in, sign-up, and non-public detail URLs are marked `noindex`.
- **Database and auth:** Supabase PostgreSQL and Supabase Auth; Prisma is the application ORM. NikahKita application tables are isolated in the `nikahkita` schema; existing application tables and rows in `public` are preserved. Prisma keeps its migration ledger in the connection's default `public` schema.
- **Images:** Next Image optimization supports Cloudinary, Cloudflare R2, and the current Unsplash seed images, with AVIF/WebP output and lazy loading.
- **Search:** PostgreSQL full-text search plus `pg_trgm` is available through `src/lib/vendor-search.ts`.
- **Vendor contact:** WhatsApp deep links remain the lead path; no internal chat service is required.
- **Payments and email:** Midtrans and Resend are the planned Indonesia-focused adapters. They are not enabled until their server-side credentials and webhook flows are configured.
- **Maps:** Vendor and invitation addresses link to OpenStreetMap search without a paid map API. Embedded Leaflet maps and geocoding are not enabled.

## Environment

Copy `frontend/.env.example` to `frontend/.env`, then set the Supabase project URL, its publishable key (preferred; `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) or legacy anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`), and the PostgreSQL `DATABASE_URL` before running the app or migrations. If legacy JWT keys have been disabled, create and use a Supabase publishable key for the browser and server-side user-session clients. Keep Secret API keys, database URLs, and MongoDB credentials server-side; never use a `NEXT_PUBLIC_` prefix for secrets. `.env` is git-ignored.

## Preserving MongoDB data

The source database is never changed by the importer. The first run is a dry-run:

```sh
cd frontend
yarn db:import-mongo:dry-run
```

The dry-run only needs the source `MONGODB_URI` and `MONGODB_DATABASE`. It fails if MongoDB returns no collections, which helps catch an incorrect source database before import. Prisma stores NikahKita models in the dedicated `nikahkita` schema; the existing `public` schema is preserved. After reviewing collection counts and applying the Prisma migration to the intended PostgreSQL database, add `DATABASE_URL` and run the import explicitly:

```sh
yarn db:migrate
yarn db:import-mongo
```

The importer is additive and repeatable: it writes legacy records into `legacy_documents`, imports the searchable vendor fields and user profiles, and skips records already present in PostgreSQL. It does not delete or update MongoDB records or overwrite existing PostgreSQL rows. Legacy users' bcrypt password hashes are not copied; their profiles are marked `password_reset_required` and must be provisioned in Supabase Auth with password-reset/invitation emails before login is switched over. The first successful Supabase login links the existing profile by verified email.

After import, configure and test Supabase Auth SMTP/email delivery, set `NEXT_PUBLIC_SITE_URL` to the intended production origin, and configure `/auth/callback` in Supabase's allowed redirect URLs. First run `yarn db:invite-legacy-users:dry-run` to count pending invitations, linkable migrated accounts, and account conflicts without sending email or changing data. Only after reviewing that report, set `SUPABASE_SECRET_KEY` (preferred) or the still-active legacy `SUPABASE_SERVICE_ROLE_KEY` in a trusted server-side environment and run `yarn db:invite-legacy-users` to send invitation/password-reset links. Never expose a Supabase Secret API key to the browser or commit it. The script is resumable and duplicate-safe: it records the Auth user ID after each successful invitation, reconciles accounts it created if a database write was interrupted, and leaves the reset-required flag set until the user chooses a new password. Existing unrelated Supabase accounts that conflict with an invitation are reported for manual reconciliation rather than silently skipped.

Keep MongoDB read-only and available until record counts, representative records, vendor search, authentication resets, and application behavior have been verified. Do not cut over production traffic based on a successful import command alone.

## Migration status

Login, signup, password recovery, profiles, vendor listings, planning lists, registry, websites/RSVP, WhatsApp lead flows, and admin vendor approval now use the Next.js API and PostgreSQL document compatibility store. The migration includes a repair for the existing Supabase Auth profile trigger so it writes only columns present in the existing `public.profiles` table; its duplicate-safe companion trigger remains in place. The AI Planner clearly reports that it is unavailable; AI chat and Midtrans payment execution remain disabled until provider credentials, authorization checks, and payment webhooks are configured. Email delivery uses Supabase Auth's configured email provider for account recovery/invitations; operational email campaigns are not enabled. Vendor images remain served from their current URLs and eligible configured hosts are optimized by Next Image; configure a Cloudinary or R2 image domain before migrating assets.

Before production cutover, configure the Supabase project and PostgreSQL connection, apply Prisma migrations to the confirmed target, run the MongoDB dry-run and reviewed additive import, verify record counts and legacy-account invitations, then test authentication and public RSVP against that target. Payment, operational email, embedded maps/geocoding, and any external AI provider require separate production configuration and verification.

## Vercel deployment and cutover

Deploy the Next.js application from the `frontend` directory (set it as the Vercel project Root Directory). Vercel should detect Next.js automatically; run the production build with `yarn build`. Configure these runtime variables in Vercel's Production environment: `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or the legacy anon key while still enabled). Add the same public configuration to Preview if preview deployments must exercise Supabase-backed pages and APIs. Do not add Supabase Secret API keys, MongoDB credentials, or other service-role secrets to the browser-facing environment; the migration/import and account-provisioning scripts are one-off trusted operations.

Before assigning `nikahkita.id`, verify a Vercel preview deployment end to end: the home page, `/api/vendors?limit=1`, `/sitemap.xml`, `/auth/callback`, Supabase sign-in/recovery redirects, and public RSVP. Add the exact production callback URL (`https://nikahkita.id/auth/callback`) to Supabase Auth's allowed redirect URLs and configure the production Site URL. Keep the existing site available until those checks pass and a rollback path is ready.

As of 2026-10-05, `https://nikahkita.id` still serves the legacy WordPress site; the new Next.js callback and vendor API are not yet live on that domain. Local production-build smoke tests do not constitute a production cutover. DNS/domain assignment and Vercel project access are required to complete that step.
