import { NextResponse } from "next/server";
import { openApiSpec } from "@/lib/openapi-spec";

// The spec itself is public (it's just metadata describing the API surface).
// Only the actual data endpoints below are gated by HASHLY_API_KEYS.
// Without this we'd need to hard-code the spec into the docs page bundle.
export const dynamic = "force-static";

export async function GET() {
  return NextResponse.json(openApiSpec);
}
