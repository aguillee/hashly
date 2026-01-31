import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, "auth");
  if (rateLimitResponse) return rateLimitResponse;

  const cookieStore = await cookies();
  cookieStore.delete("auth-token");

  return NextResponse.json({ success: true });
}
