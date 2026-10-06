import { NextResponse, type NextRequest } from "next/server";
import { searchVendors } from "@/lib/vendor-search";

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q") ?? "";
  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "30");

  if (!query.trim()) {
    return NextResponse.json({ error: "Query parameter 'q' is required." }, { status: 400 });
  }
  if (!Number.isFinite(limit)) {
    return NextResponse.json({ error: "Query parameter 'limit' must be a number." }, { status: 400 });
  }

  try {
    return NextResponse.json(await searchVendors(query, limit));
  } catch (error) {
    console.error("Vendor search failed.", error);
    return NextResponse.json({ error: "Vendor search is unavailable." }, { status: 500 });
  }
}
