# NikahKita web application

This package uses Next.js App Router as the development and production entry point. Existing route components are reused during the migration; supported APIs run as Next.js route handlers.

See the repository [README](../README.md) for setup, target service choices, environment variables, and the safe MongoDB-to-PostgreSQL import procedure. Set the Supabase URL and anon key and PostgreSQL `DATABASE_URL` from your Supabase project before starting the app or applying migrations. Put local values in `.env` so Next.js, Prisma, and the import script can all read them; `.env.example` is safe to commit.
