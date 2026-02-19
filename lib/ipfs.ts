/**
 * IPFS utilities for NFT metadata
 * Uses Pinata for IPFS pinning
 *
 * Required env vars:
 * - PINATA_API_KEY
 * - PINATA_SECRET_KEY
 */

const PINATA_API_KEY = process.env.PINATA_API_KEY;
const PINATA_SECRET_KEY = process.env.PINATA_SECRET_KEY;

export function isIPFSConfigured(): boolean {
  return !!(PINATA_API_KEY && PINATA_SECRET_KEY);
}

/**
 * HIP-412 compliant NFT metadata structure
 * https://hips.hedera.com/hip/hip-412
 */
export interface NFTMetadata {
  name: string;
  description?: string;
  image: string; // IPFS URI (ipfs://CID)
  type: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  properties?: {
    event?: string;
    date?: string;
    location?: string;
    [key: string]: string | number | boolean | undefined;
  };
  localization?: {
    uri: string;
    default: string;
    locales: string[];
  };
}

/**
 * Upload a file to IPFS via Pinata
 * Returns the IPFS CID
 */
export async function uploadFileToIPFS(
  file: Buffer,
  filename: string,
  contentType: string
): Promise<{ cid: string; ipfsUri: string }> {
  if (!isIPFSConfigured()) {
    throw new Error("IPFS not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY");
  }

  const formData = new FormData();
  // Convert Buffer to Uint8Array for Blob compatibility
  const uint8Array = new Uint8Array(file);
  const blob = new Blob([uint8Array], { type: contentType });
  formData.append("file", blob, filename);

  const response = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
    method: "POST",
    headers: {
      pinata_api_key: PINATA_API_KEY!,
      pinata_secret_api_key: PINATA_SECRET_KEY!,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata upload failed: ${error}`);
  }

  const data = await response.json();
  const cid = data.IpfsHash;

  return {
    cid,
    ipfsUri: `ipfs://${cid}`,
  };
}

/**
 * Upload JSON metadata to IPFS via Pinata
 * Returns the IPFS CID
 */
export async function uploadMetadataToIPFS(
  metadata: NFTMetadata,
  name?: string
): Promise<{ cid: string; ipfsUri: string }> {
  if (!isIPFSConfigured()) {
    throw new Error("IPFS not configured. Set PINATA_API_KEY and PINATA_SECRET_KEY");
  }

  const response = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: PINATA_API_KEY!,
      pinata_secret_api_key: PINATA_SECRET_KEY!,
    },
    body: JSON.stringify({
      pinataContent: metadata,
      pinataMetadata: {
        name: name || metadata.name,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Pinata metadata upload failed: ${error}`);
  }

  const data = await response.json();
  const cid = data.IpfsHash;

  return {
    cid,
    ipfsUri: `ipfs://${cid}`,
  };
}

/**
 * Create and upload complete NFT metadata for a badge
 * 1. Upload image to IPFS
 * 2. Create HIP-412 metadata with image CID
 * 3. Upload metadata to IPFS
 * Returns the metadata CID to use when minting
 */
export async function createBadgeMetadata(params: {
  name: string;
  description?: string;
  imageBuffer: Buffer;
  imageFilename: string;
  imageContentType: string;
  eventTitle?: string;
  eventDate?: string;
  eventLocation?: string;
}): Promise<{
  imageCid: string;
  metadataCid: string;
  metadataUri: string;
}> {
  // 1. Upload image to IPFS
  const imageResult = await uploadFileToIPFS(
    params.imageBuffer,
    params.imageFilename,
    params.imageContentType
  );

  // 2. Create HIP-412 compliant metadata
  const metadata: NFTMetadata = {
    name: params.name,
    description: params.description || `Attendance badge for ${params.eventTitle || params.name}`,
    image: imageResult.ipfsUri,
    type: params.imageContentType as NFTMetadata["type"],
    properties: {
      event: params.eventTitle,
      date: params.eventDate,
      location: params.eventLocation,
    },
  };

  // Remove undefined properties
  if (metadata.properties) {
    Object.keys(metadata.properties).forEach((key) => {
      if (metadata.properties![key] === undefined) {
        delete metadata.properties![key];
      }
    });
  }

  // 3. Upload metadata to IPFS
  const metadataResult = await uploadMetadataToIPFS(metadata, params.name);

  return {
    imageCid: imageResult.cid,
    metadataCid: metadataResult.cid,
    metadataUri: metadataResult.ipfsUri,
  };
}

/**
 * Get IPFS gateway URL for a CID
 */
export function getIPFSGatewayUrl(cid: string): string {
  // Use Pinata gateway or public gateway
  return `https://gateway.pinata.cloud/ipfs/${cid}`;
}

/**
 * Convert ipfs:// URI to gateway URL
 */
export function ipfsUriToGatewayUrl(ipfsUri: string): string {
  if (ipfsUri.startsWith("ipfs://")) {
    const cid = ipfsUri.replace("ipfs://", "");
    return getIPFSGatewayUrl(cid);
  }
  return ipfsUri;
}
