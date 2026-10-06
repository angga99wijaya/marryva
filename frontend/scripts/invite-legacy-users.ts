import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { Prisma, PrismaClient } from "@prisma/client";
import { getPrismaDatasourceUrl } from "../src/lib/prisma-datasource-url";

dotenv.config({ path: ".env.local" });
dotenv.config();

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Set ${name} before provisioning legacy users.`);
  return value;
}

function requiredSupabaseAuthAdminKey() {
  const value = process.env.SUPABASE_AUTH_ADMIN_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) {
    throw new Error(
      "Set SUPABASE_AUTH_ADMIN_KEY to a valid Auth Admin service-role JWT "
      + "before provisioning legacy users.",
    );
  }
  if (value.startsWith("sb_secret_")) {
    throw new Error(
      "Supabase Secret API keys are not accepted by the Auth Admin API. "
      + "Use an active Auth Admin service-role JWT.",
    );
  }
  return value;
}

function isTransientDatabaseError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return /Can't reach database server|Server has closed the connection/.test(error.message);
  }
  return error instanceof Prisma.PrismaClientKnownRequestError
    && ["P1001", "P1002", "P1017"].includes(error.code);
}

async function withDatabaseRetry<T>(
  prisma: PrismaClient,
  operation: () => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (!isTransientDatabaseError(error) || attempt === 3) throw error;
      await prisma.$disconnect();
      await new Promise((resolve) => setTimeout(resolve, 1_000 * (attempt + 1)));
    }
  }
  throw new Error("Database retry loop ended unexpectedly.");
}

async function main() {
  const args = process.argv.slice(2);
  const unknownArgs = args.filter((arg) => arg !== "--dry-run");
  if (unknownArgs.length > 0) {
    throw new Error(`Unknown argument(s): ${unknownArgs.join(", ")}`);
  }
  const dryRun = args.includes("--dry-run");
  const supabase = createClient(
    required("NEXT_PUBLIC_SUPABASE_URL"),
    requiredSupabaseAuthAdminKey(),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const siteUrl = required("NEXT_PUBLIC_SITE_URL");
  const redirect = new URL("/auth/callback", siteUrl);
  redirect.searchParams.set("next", "/signin?reset=complete");
  const prisma = new PrismaClient({
    datasources: { db: { url: getPrismaDatasourceUrl() } },
  });
  let invited = 0;
  let linked = 0;

  try {
    const authUsersByEmail = new Map<string, { id: string; userMetadata: Record<string, unknown> }>();
    for (let page = 1; ; page += 1) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) {
        throw new Error(
          `Supabase Auth user listing failed (status: ${error.status ?? "unknown"}, `
          + `code: ${error.code ?? "unknown"}).`,
        );
      }
      for (const user of data.users) {
        if (user.email) {
          authUsersByEmail.set(user.email.toLowerCase(), {
            id: user.id,
            userMetadata: user.user_metadata,
          });
        }
      }
      if (data.users.length < 1000) break;
    }

    if (dryRun) {
      const profiles = await withDatabaseRetry(prisma, () => prisma.userProfile.findMany({
        where: { passwordResetRequired: true, authUserId: null },
        orderBy: { createdAt: "asc" },
        select: { id: true, email: true },
      }));
      let wouldInvite = 0;
      let wouldLink = 0;
      let conflicts = 0;

      for (const profile of profiles) {
        const existingUser = authUsersByEmail.get(profile.email.toLowerCase());
        if (!existingUser) {
          wouldInvite += 1;
        } else if (existingUser.userMetadata.migrated_from_legacy === true) {
          wouldLink += 1;
        } else {
          conflicts += 1;
        }
      }

      console.info(
        `Dry run: ${profiles.length} pending profile(s), ${wouldInvite} invitation(s) ready, `
        + `${wouldLink} migrated account(s) can be linked, ${conflicts} conflict(s). No changes made.`,
      );
      if (conflicts > 0) {
        throw new Error(`${conflicts} account conflict(s) require manual reconciliation before provisioning.`);
      }
      return;
    }

    while (true) {
      const profiles = await withDatabaseRetry(prisma, () => prisma.userProfile.findMany({
        where: { passwordResetRequired: true, authUserId: null },
        orderBy: { createdAt: "asc" },
        take: 50,
        select: { id: true, email: true, name: true, role: true, city: true },
      }));
      if (profiles.length === 0) break;

      for (const profile of profiles) {
        const existingUser = authUsersByEmail.get(profile.email.toLowerCase());
        if (existingUser) {
          if (existingUser.userMetadata.migrated_from_legacy !== true) {
            throw new Error(`A non-migrated Supabase account conflicts with legacy profile ${profile.id}.`);
          }
          await withDatabaseRetry(prisma, () => prisma.userProfile.update({
            where: { id: profile.id },
            data: { authUserId: existingUser.id },
          }));
          linked += 1;
          console.info(`Linked existing migrated Auth account for legacy profile ${profile.id}.`);
          continue;
        }

        const { data, error } = await supabase.auth.admin.inviteUserByEmail(profile.email, {
          data: {
            name: profile.name,
            full_name: profile.name,
            role: profile.role,
            city: profile.city,
            migrated_from_legacy: true,
          },
          redirectTo: redirect.toString(),
        });
        if (error) {
          throw new Error(
            `Supabase invite failed for legacy profile ${profile.id} `
            + `(status: ${error.status ?? "unknown"}, code: ${error.code ?? "unknown"}, `
            + `message: ${error.message.split(profile.email).join("[redacted email]")}).`,
          );
        }
        if (!data.user) throw new Error(`Supabase returned no invited user for profile ${profile.id}.`);

        authUsersByEmail.set(profile.email.toLowerCase(), {
          id: data.user.id,
          userMetadata: data.user.user_metadata,
        });
        await withDatabaseRetry(prisma, () => prisma.userProfile.update({
          where: { id: profile.id },
          data: { authUserId: data.user.id },
        }));
        invited += 1;
        console.info(`Invitation sent for legacy profile ${profile.id}.`);
      }
    }

    console.info(
      `Provisioned ${invited} new and linked ${linked} existing legacy account(s). `
      + "Password reset remains required until each user completes setup.",
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Legacy account provisioning failed.", error);
  process.exitCode = 1;
});
