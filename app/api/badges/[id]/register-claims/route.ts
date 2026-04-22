import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { z } from "zod";

// Accept either claims array or wallets+serialNumbers arrays
const registerClaimsSchema = z.union([
  // Format 1: claims array
  z.object({
    claims: z.array(
      z.object({
        walletAddress: z.string().regex(/^0\.0\.\d+$/, "Invalid wallet format"),
        serialNumber: z.number().int().positive(),
      })
    ),
    transactionId: z.string().optional(),
  }),
  // Format 2: separate wallets and serialNumbers arrays
  z.object({
    wallets: z.array(z.string().regex(/^0\.0\.\d+$/, "Invalid wallet format")),
    serialNumbers: z.array(z.number().int().positive()),
    transactionId: z.string().optional(),
  }),
]);

// POST /api/badges/[id]/register-claims - Register minted NFT claims
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const rateLimitResponse = await checkRateLimit(request, "write");
    if (rateLimitResponse) return rateLimitResponse;

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const validation = registerClaimsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || "Invalid request body" },
        { status: 400 }
      );
    }

    // Normalize to claims array format
    let claims: Array<{ walletAddress: string; serialNumber: number }>;

    if ("claims" in validation.data) {
      claims = validation.data.claims;
    } else {
      const { wallets, serialNumbers } = validation.data;
      if (wallets.length !== serialNumbers.length) {
        return NextResponse.json(
          { error: "Wallets and serial numbers must have same length" },
          { status: 400 }
        );
      }
      claims = wallets.map((wallet, i) => ({
        walletAddress: wallet,
        serialNumber: serialNumbers[i],
      }));
    }

    const badge = await prisma.attendanceBadge.findUnique({
      where: { id },
    });

    if (!badge) {
      return NextResponse.json({ error: "Badge not found" }, { status: 404 });
    }

    if (badge.hostWallet !== user.walletAddress) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (badge.status !== "TOKEN_CREATED" && badge.status !== "MINTED") {
      return NextResponse.json(
        { error: "Token must be created first" },
        { status: 400 }
      );
    }

    // Reject the host's own wallet — Hedera fails the whole airdrop with
    // ACCOUNT_REPEATED_IN_ACCOUNT_AMOUNTS if sender and receiver are the same account.
    claims = claims.filter((c) => c.walletAddress !== badge.hostWallet);
    if (claims.length === 0) {
      return NextResponse.json(
        {
          error:
            "Cannot register your own wallet as an attendee (Hedera rejects self-transfers)",
        },
        { status: 400 }
      );
    }

    // Check for existing claims
    const existingClaims = await prisma.badgeClaim.findMany({
      where: {
        badgeId: id,
        walletAddress: { in: claims.map((c) => c.walletAddress) },
      },
    });

    const existingWallets = new Set(existingClaims.map((c) => c.walletAddress));
    const newClaims = claims.filter((c) => !existingWallets.has(c.walletAddress));

    if (newClaims.length === 0) {
      return NextResponse.json(
        { error: "All wallets already registered" },
        { status: 400 }
      );
    }

    // Create badge claims (pending airdrop)
    await prisma.badgeClaim.createMany({
      data: newClaims.map((claim) => ({
        badgeId: id,
        walletAddress: claim.walletAddress,
        serialNumber: claim.serialNumber,
        status: "PENDING",
      })),
    });

    // Compute airdrop deadline: Event.endDate + 7 days (or mintDate if no endDate)
    const event = await prisma.event.findUnique({
      where: { id: badge.eventId },
      select: { endDate: true, mintDate: true },
    });

    let airdropDeadline: Date | null = null;
    const referenceDate = event?.endDate || event?.mintDate;
    if (referenceDate) {
      airdropDeadline = new Date(referenceDate);
      airdropDeadline.setDate(airdropDeadline.getDate() + 7);
    }

    // Update badge status, supply and deadline
    const updated = await prisma.attendanceBadge.update({
      where: { id },
      data: {
        status: "MINTED",
        supply: { increment: newClaims.length },
        mintedAt: new Date(),
        airdropDeadline,
      },
    });

    return NextResponse.json({
      success: true,
      registered: newClaims.length,
      skipped: existingWallets.size,
      badge: updated,
    });
  } catch (error) {
    console.error("Failed to register claims:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to register claims",
      },
      { status: 500 }
    );
  }
}
