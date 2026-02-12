/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "kabila-arweave.b-cdn.net" },
      { protocol: "https", hostname: "launchpad-assets.kabila.app" },
      { protocol: "https", hostname: "sentx.io" },
      { protocol: "https", hostname: "*.sentx.io" },
      { protocol: "https", hostname: "mainnet.mirrornode.hedera.com" },
      { protocol: "https", hostname: "*.hedera.com" },
      { protocol: "https", hostname: "arweave.net" },
      { protocol: "https", hostname: "*.arweave.net" },
      { protocol: "https", hostname: "ipfs.io" },
      { protocol: "https", hostname: "cloudflare-ipfs.com" },
      { protocol: "https", hostname: "dwk1opv266jxs.cloudfront.net" },
      { protocol: "https", hostname: "*.cloudfront.net" },
    ],
  },
  experimental: {
    serverComponentsExternalPackages: ["@hashgraph/sdk"],
  },
};

module.exports = nextConfig;
