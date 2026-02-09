import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Popular Hedera tokens to seed
const POPULAR_TOKENS = [
  { address: "0.0.731861", symbol: "SAUCE", name: "SAUCE", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.731861.png", decimals: 6 },
  { address: "0.0.1460200", symbol: "XSAUCE", name: "xSAUCE", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.1460200-2.png", decimals: 6 },
  { address: "0.0.786931", symbol: "HSUITE", name: "HubSuite", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.786931.png", decimals: 4 },
  { address: "0.0.456858", symbol: "USDC", name: "USD Coin", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.456858.png", decimals: 6 },
  { address: "0.0.2283230", symbol: "KARATE", name: "Karate", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.2283230.png", decimals: 8 },
  { address: "0.0.859814", symbol: "CLXY", name: "Calaxy Tokens", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.859814.png", decimals: 6 },
  { address: "0.0.1055483", symbol: "PACK", name: "HashPack", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.1055483.png", decimals: 6 },
  { address: "0.0.751086", symbol: "SHIBR", name: "Shibar", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.751086.png", decimals: 4 },
  { address: "0.0.2453465", symbol: "WAR", name: "WAR", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.2453465.png", decimals: 4 },
  { address: "0.0.1058822", symbol: "DOVU", name: "DOVU", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.1058822.png", decimals: 8 },
  { address: "0.0.4732018", symbol: "GRELF", name: "GRELF", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.4732018.png", decimals: 8 },
  { address: "0.0.6468719", symbol: "hi5", name: "hi5", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.6468719.png", decimals: 4 },
  { address: "0.0.3155415", symbol: "HST", name: "HeadStarter", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.3155415.png", decimals: 8 },
  { address: "0.0.1001002", symbol: "CREAM", name: "Cream", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.1001002.png", decimals: 6 },
  { address: "0.0.5044876", symbol: "WHBAR", name: "Wrapped HBAR", icon: "https://dwk1opv266jxs.cloudfront.net/icons/tokens/0.0.5044876.png", decimals: 8 },
];

async function main() {
  console.log("Seeding tokens...");

  for (const token of POPULAR_TOKENS) {
    try {
      await prisma.token.upsert({
        where: { tokenAddress: token.address },
        update: {
          symbol: token.symbol,
          name: token.name,
          icon: token.icon,
          decimals: token.decimals,
        },
        create: {
          tokenAddress: token.address,
          symbol: token.symbol,
          name: token.name,
          icon: token.icon,
          decimals: token.decimals,
          isApproved: true,
          isHidden: false,
          totalVotes: 0,
        },
      });
      console.log(`✅ Added/Updated: ${token.symbol} (${token.address})`);
    } catch (error) {
      console.error(`❌ Failed to add ${token.symbol}:`, error);
    }
  }

  const count = await prisma.token.count();
  console.log(`\nTotal tokens in DB: ${count}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
