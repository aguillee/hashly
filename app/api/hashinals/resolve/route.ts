import { NextRequest, NextResponse } from "next/server";
import { resolveHCS1 } from "@/lib/hashinals-server";

// GET /api/hashinals/resolve?topicId=0.0.12345&network=testnet
// Resolves an HCS-1 topic and returns the file as binary response
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get("topicId");
  const network = (searchParams.get("network") ||
    process.env.NEXT_PUBLIC_HEDERA_NETWORK ||
    "mainnet") as "mainnet" | "testnet";

  if (!topicId || !/^0\.0\.\d+$/.test(topicId)) {
    return NextResponse.json(
      { error: "Invalid topicId parameter" },
      { status: 400 }
    );
  }

  try {
    const { data, mimeType } = await resolveHCS1(topicId);

    return new NextResponse(new Uint8Array(data), {
      status: 200,
      headers: {
        "Content-Type": mimeType,
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Failed to resolve HCS-1 topic:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to resolve HCS-1 topic",
      },
      { status: 500 }
    );
  }
}
