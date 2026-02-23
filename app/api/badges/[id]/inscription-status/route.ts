import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const KILOSCRIBE_API_BASE =
  process.env.NEXT_PUBLIC_KILOSCRIBE_BASE_URL || "https://v2-api.tier.bot/api";

// GET /api/badges/[id]/inscription-status
// Polls Kiloscribe API for inscription progress and updates DB when complete
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const badge = await prisma.attendanceBadge.findUnique({
      where: { id },
      select: {
        hostWallet: true,
        imageTopicId: true,
        metadataTopicId: true,
        imageInscriptionTxId: true,
        metadataInscriptionTxId: true,
      },
    });

    if (!badge || badge.hostWallet !== user.walletAddress) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Determine which phase we're checking
    if (badge.imageTopicId && badge.metadataTopicId) {
      return NextResponse.json({ phase: "complete", status: "completed", progress: 1 });
    }

    // Check image inscription
    if (badge.imageInscriptionTxId && !badge.imageTopicId) {
      const result = await pollKiloscribe(badge.imageInscriptionTxId);

      if (result.status === "completed" && result.topicId) {
        // Update DB with completed image inscription
        await prisma.attendanceBadge.update({
          where: { id },
          data: {
            imageTopicId: result.topicId,
            imageInscriptionTxId: null, // Clear pending
          },
        });

        return NextResponse.json({
          phase: "image",
          status: "completed",
          progress: 1,
          messages: result.messages,
          maxMessages: result.maxMessages,
          topicId: result.topicId,
        });
      }

      return NextResponse.json({
        phase: "image",
        status: result.status,
        progress: result.progress,
        messages: result.messages,
        maxMessages: result.maxMessages,
        topicId: null,
        error: result.error,
      });
    }

    // Check metadata inscription
    if (badge.metadataInscriptionTxId && !badge.metadataTopicId) {
      const result = await pollKiloscribe(badge.metadataInscriptionTxId);

      if (result.status === "completed" && result.topicId) {
        await prisma.attendanceBadge.update({
          where: { id },
          data: {
            metadataTopicId: result.topicId,
            metadataInscriptionTxId: null,
          },
        });

        return NextResponse.json({
          phase: "metadata",
          status: "completed",
          progress: 1,
          messages: result.messages,
          maxMessages: result.maxMessages,
          topicId: result.topicId,
        });
      }

      return NextResponse.json({
        phase: "metadata",
        status: result.status,
        progress: result.progress,
        messages: result.messages,
        maxMessages: result.maxMessages,
        topicId: null,
        error: result.error,
      });
    }

    // No pending inscriptions
    if (badge.imageTopicId && !badge.metadataTopicId) {
      return NextResponse.json({
        phase: "image",
        status: "completed",
        progress: 1,
        topicId: badge.imageTopicId,
        needsMetadata: true,
      });
    }

    return NextResponse.json({ phase: "idle", status: "none", progress: 0 });
  } catch (error) {
    console.error("Failed to check inscription status:", error);
    return NextResponse.json(
      { error: "Failed to check status" },
      { status: 500 }
    );
  }
}

async function pollKiloscribe(txId: string): Promise<{
  status: string;
  topicId: string | null;
  progress: number;
  messages: number;
  maxMessages: number;
  error: string | null;
}> {
  try {
    const res = await fetch(
      `${KILOSCRIBE_API_BASE}/inscriptions/retrieve-inscription?id=${encodeURIComponent(txId)}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      return {
        status: "unknown",
        topicId: null,
        progress: 0,
        messages: 0,
        maxMessages: 0,
        error: `Kiloscribe API returned ${res.status}`,
      };
    }

    const data = await res.json();
    const messages = data.messages || 0;
    const maxMessages = data.maxMessages || 1;
    const progress = maxMessages > 0 ? messages / maxMessages : 0;

    return {
      status: data.status || "unknown",
      topicId: data.topic_id || null,
      progress: Math.min(progress, 1),
      messages,
      maxMessages,
      error: null,
    };
  } catch (error) {
    return {
      status: "error",
      topicId: null,
      progress: 0,
      messages: 0,
      maxMessages: 0,
      error: error instanceof Error ? error.message : "Failed to poll Kiloscribe",
    };
  }
}
