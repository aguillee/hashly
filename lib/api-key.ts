import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";

/**
 * Public API key auth — gate for the /api/v1/* surface.
 *
 * Keys live as a comma-separated list in HASHLY_API_KEYS. Caller passes the
 * key either as `Authorization: Bearer <key>` (preferred) or `?api_key=<key>`
 * for one-off browser tests.
 *
 * Comparison is timing-safe so an attacker can't probe character-by-character.
 *
 * This helper is INDEPENDENT of the existing `getCurrentUser()` auth — the
 * public API never touches the user session, so we don't accidentally leak
 * the admin's identity to API consumers.
 */

function getValidKeys(): string[] {
  const raw = process.env.HASHLY_API_KEYS || "";
  return raw
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k.length > 0);
}

function safeEquals(a: string, b: string): boolean {
  // Buffers must match in length for timingSafeEqual; pad first to avoid throw.
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) return false;
  try {
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

/**
 * Validates the request and returns null on success or a 401 NextResponse
 * on failure. Use it as the first line in any /api/v1 route handler:
 *
 *   const fail = requireApiKey(request);
 *   if (fail) return fail;
 */
export function requireApiKey(request: NextRequest): NextResponse | null {
  const validKeys = getValidKeys();

  // No keys configured = endpoint locked down (deny by default).
  if (validKeys.length === 0) {
    return NextResponse.json(
      {
        error: "API access is not configured on this deployment.",
        code: "API_DISABLED",
      },
      { status: 503 }
    );
  }

  // Pull from header first, then query string fallback.
  const authHeader = request.headers.get("authorization") || "";
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const queryKey = request.nextUrl.searchParams.get("api_key") || "";
  const provided = bearer || queryKey;

  if (!provided) {
    return NextResponse.json(
      {
        error: "Missing API key. Pass it as 'Authorization: Bearer <key>' or '?api_key=<key>'.",
        code: "MISSING_API_KEY",
      },
      { status: 401 }
    );
  }

  // Compare against every valid key with timing-safe equality.
  const ok = validKeys.some((k) => safeEquals(provided, k));
  if (!ok) {
    return NextResponse.json(
      { error: "Invalid API key.", code: "INVALID_API_KEY" },
      { status: 401 }
    );
  }

  return null;
}

/**
 * Convenience wrapper for /api-docs page server-side checks: returns whether
 * the deployment has any keys configured (so the page can warn admins to
 * set HASHLY_API_KEYS in env).
 */
export function isApiConfigured(): boolean {
  return getValidKeys().length > 0;
}
