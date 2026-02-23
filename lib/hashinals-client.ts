/**
 * Hashinals (HCS-1) — Client-side (browser) functions
 *
 * These functions run in the browser and use Web APIs instead of Node.js APIs.
 * Used by useHederaTransactions hook for on-chain inscription.
 */

import pako from "pako";

const CHUNK_SIZE = 1024; // Max bytes per HCS message content

/**
 * Compress, encode, and chunk a file for HCS-1 inscription (browser-compatible)
 */
export async function prepareFileForInscription(
  buffer: Uint8Array,
  mimeType: string
): Promise<{ chunks: string[]; hash: string }> {
  // 1. Calculate SHA-256 of original uncompressed file
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer as unknown as ArrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // 2. Compress with gzip (using pako)
  const compressed = pako.gzip(buffer, { level: 9 });

  // 3. Encode to base64
  let binary = "";
  for (let i = 0; i < compressed.length; i++) {
    binary += String.fromCharCode(compressed[i]);
  }
  const base64 = btoa(binary);

  // 4. Prepend data URI to first chunk
  const fullData = `data:${mimeType};base64,${base64}`;

  // 5. Split into chunks of CHUNK_SIZE
  const chunks: string[] = [];
  for (let i = 0; i < fullData.length; i += CHUNK_SIZE) {
    chunks.push(fullData.slice(i, i + CHUNK_SIZE));
  }

  return { chunks, hash };
}

/**
 * Build the HCS-1 topic memo
 * Format: {sha256}:{compression}:{encoding}
 */
export function buildTopicMemo(hash: string): string {
  return `${hash}:gzip:base64`;
}

/**
 * Build a chunk message in HCS-1 format
 */
export function buildChunkMessage(
  orderIndex: number,
  content: string
): string {
  return JSON.stringify({ o: orderIndex, c: content });
}

/**
 * Build HIP-412 compliant NFT metadata
 */
export interface HCS1Metadata {
  name: string;
  description: string;
  image: string;
  type: string;
  properties?: Record<string, string | number | boolean | undefined>;
}

export function buildHIP412Metadata(params: {
  name: string;
  description: string;
  imageTopicId: string;
  imageContentType: string;
  properties?: Record<string, string | undefined>;
}): HCS1Metadata {
  const metadata: HCS1Metadata = {
    name: params.name,
    description: params.description,
    image: `hcs://1/${params.imageTopicId}`,
    type: params.imageContentType,
  };

  if (params.properties) {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(params.properties)) {
      if (value !== undefined) cleaned[key] = value;
    }
    if (Object.keys(cleaned).length > 0) {
      metadata.properties = cleaned;
    }
  }

  return metadata;
}
