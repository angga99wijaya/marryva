import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";

export type AuthenticatedUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  city: string;
  wedding_date: string;
  language: string;
};

export async function getAuthenticatedUser(): Promise<AuthenticatedUser | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user?.id || !data.user.email) return null;

  const authUserId = data.user.id;
  const email = data.user.email.toLowerCase();
  if (!email) return null;

  let profile = await prisma.userProfile.findUnique({ where: { authUserId } });
  if (!profile) {
    const legacyProfile = await prisma.userProfile.findUnique({ where: { email } });
    if (legacyProfile) {
      profile = await prisma.userProfile.update({
        where: { id: legacyProfile.id },
        data: { authUserId, passwordResetRequired: false },
      });
    } else {
      const metadata = data.user.user_metadata ?? {};
      const role = metadata.role === "vendor" ? "vendor" : "couple";
      profile = await prisma.userProfile.create({
        data: {
          id: authUserId,
          authUserId,
          email,
          name: typeof metadata.name === "string" ? metadata.name.slice(0, 160) : email,
          role,
          city: typeof metadata.city === "string" ? metadata.city.slice(0, 120) : "",
          passwordResetRequired: false,
        },
      });
    }
  }

  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    city: profile.city,
    wedding_date: profile.weddingDate,
    language: profile.language,
  };
}
