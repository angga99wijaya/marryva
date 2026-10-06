import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import { getAuthenticatedUser } from "@/lib/auth/server";

export async function GET() {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  const profile = await prisma.userProfile.findUnique({ where: { id: user.id } });
  if (!profile) return NextResponse.json({ detail: "Profile not found." }, { status: 404 });

  return NextResponse.json({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    city: profile.city,
    wedding_date: profile.weddingDate,
    language: profile.language,
  });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const authUserId = data?.claims?.sub;
  const emailClaim = data?.claims?.email;
  if (error || typeof authUserId !== "string" || typeof emailClaim !== "string") {
    return NextResponse.json({ detail: "Authentication required." }, { status: 401 });
  }

  const email = emailClaim.toLowerCase();
  const body: unknown = await request.json();
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ detail: "Invalid profile data." }, { status: 400 });
  }
  const input = body as Record<string, unknown>;
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 160) : "";
  const city = typeof input.city === "string" ? input.city.trim().slice(0, 120) : "";
  const weddingDate = typeof input.wedding_date === "string" ? input.wedding_date.slice(0, 32) : "";
  const requestedRole = input.role === "vendor" ? "vendor" : "couple";
  if (!name) return NextResponse.json({ detail: "Name is required." }, { status: 400 });

  const existing = await prisma.userProfile.findUnique({ where: { email } });
  const profile = existing
    ? await prisma.userProfile.update({
        where: { id: existing.id },
        data: { authUserId, name, city, weddingDate, passwordResetRequired: false },
      })
    : await prisma.userProfile.create({
        data: {
          id: authUserId,
          authUserId,
          email,
          name,
          city,
          weddingDate,
          role: requestedRole,
          passwordResetRequired: false,
        },
      });

  return NextResponse.json({
    id: profile.id,
    email: profile.email,
    name: profile.name,
    role: profile.role,
    city: profile.city,
    wedding_date: profile.weddingDate,
    language: profile.language,
  });
}
