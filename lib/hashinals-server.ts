/**
 * Hashinals (HCS-1) — Server-only functions
 *
 * These functions use Node.js APIs (crypto, zlib, zstd-codec)
 * and must NOT be imported from client components.
 */

/**
 * Resolve an HCS-1 topic — fetch all messages, reassemble, decompress, verify
 */
export async function resolveHCS1(
  topicId: string
): Promise<{ data: Buffer; mimeType: string }> {
  const MIRROR_NODE =
    process.env.NEXT_PUBLIC_HEDERA_NETWORK === "testnet"
      ? "https://testnet.mirrornode.hedera.com"
      : "https://mainnet.mirrornode.hedera.com";

  const topicRes = await fetch(`${MIRROR_NODE}/api/v1/topics/${topicId}`);
  if (!topicRes.ok) throw new Error(`Topic ${topicId} not found`);
  const topicInfo = await topicRes.json();
  const memo = topicInfo.memo || "";
  const [expectedHash, compression] = memo.split(":");

  // Fetch all messages
  const messages: Array<{ o: number; c: string }> = [];
  let nextLink: string | null = `${MIRROR_NODE}/api/v1/topics/${topicId}/messages?limit=100&order=asc`;

  while (nextLink) {
    const msgRes: Response = await fetch(nextLink);
    if (!msgRes.ok)
      throw new Error(`Failed to fetch messages from topic ${topicId}`);
    const data = await msgRes.json();

    for (const msg of data.messages || []) {
      const decoded = Buffer.from(msg.message, "base64").toString("utf-8");
      try {
        const parsed = JSON.parse(decoded);
        if (typeof parsed.o === "number" && typeof parsed.c === "string") {
          messages.push(parsed);
        }
      } catch {
        // Skip invalid messages
      }
    }

    nextLink = data.links?.next ? `${MIRROR_NODE}${data.links.next}` : null;
  }

  if (messages.length === 0) {
    throw new Error(`No valid HCS-1 messages found in topic ${topicId}`);
  }

  // Sort and concatenate
  messages.sort((a, b) => a.o - b.o);
  const fullData = messages.map((m) => m.c).join("");

  // Parse data URI
  const dataUriMatch = fullData.match(/^data:([^;]+);base64,/);
  if (!dataUriMatch) {
    throw new Error("Invalid HCS-1 data: missing data URI prefix");
  }
  const mimeType = dataUriMatch[1];
  const base64Data = fullData.slice(dataUriMatch[0].length);

  // Decode + decompress
  const compressedBuf = Buffer.from(base64Data, "base64");
  const { createHash } = require("crypto");

  let decompressed: Buffer;
  if (compression === "zstd") {
    const { ZstdCodec } = require("zstd-codec");
    const zstd = await new Promise<any>((resolve) => {
      ZstdCodec.run((z: any) => resolve(new z.Simple()));
    });
    decompressed = Buffer.from(zstd.decompress(new Uint8Array(compressedBuf)));
  } else {
    // Fallback for gzip (legacy inscriptions)
    const { gunzipSync } = require("zlib");
    decompressed = gunzipSync(compressedBuf);
  }

  // Verify hash
  const actualHash = createHash("sha256").update(decompressed).digest("hex");
  if (expectedHash && actualHash !== expectedHash) {
    console.warn(
      `HCS-1 hash mismatch for topic ${topicId}: expected ${expectedHash}, got ${actualHash}`
    );
  }

  return { data: decompressed, mimeType };
}
