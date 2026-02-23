/**
 * Hashinals (HCS-1) — Client-safe utilities
 *
 * This file is safe to import from client components.
 * Server-only functions (resolveHCS1) are in lib/hashinals-server.ts
 */

/**
 * Build HIP-412 compliant NFT metadata
 */
export interface HCS1Metadata {
  name: string;
  creator: string;
  description: string;
  image: string; // hcs://1/{topicId}
  type: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  properties?: Record<string, string | number | boolean | undefined>;
}

export function buildHIP412Metadata(params: {
  name: string;
  creator?: string;
  description: string;
  imageTopicId: string;
  imageContentType: string;
  attributes?: Array<{ trait_type: string; value: string }>;
  properties?: Record<string, string | undefined>;
}): HCS1Metadata {
  const metadata: HCS1Metadata = {
    name: params.name,
    creator: params.creator || "Hashly",
    description: params.description,
    image: `hcs://1/${params.imageTopicId}`,
    type: params.imageContentType,
  };

  if (params.attributes && params.attributes.length > 0) {
    metadata.attributes = params.attributes;
  }

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
