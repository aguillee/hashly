import { NextResponse } from "next/server";

const TOKEN_ID = "0.0.7235629";
const SENTX_API = "https://api.sentx.io/v1/public/market/listings";

export async function GET() {
  try {
    const apiKey = process.env.SENTX_API_KEY;
    const url = `${SENTX_API}?token=${TOKEN_ID}${apiKey ? `&apikey=${apiKey}` : ""}`;

    const res = await fetch(url, { next: { revalidate: 300 } }); // cache 5 min
    if (!res.ok) return NextResponse.json({ listings: {} });

    const data = await res.json();
    const listings: Record<number, { price: number; currency: string; url: string }> = {};

    for (const l of data.marketListings || []) {
      if (!l.isAvailableForPurchase) continue;
      const serial = l.nftSerialId;
      // Only keep the cheapest listing per serial
      if (!listings[serial] || l.salePrice < listings[serial].price) {
        listings[serial] = {
          price: l.salePrice,
          currency: l.paymentToken?.symbol || "HBAR",
          url: `https://sentx.io/nft-marketplace/${TOKEN_ID}/${serial}`,
        };
      }
    }

    return NextResponse.json({ listings, count: Object.keys(listings).length });
  } catch {
    return NextResponse.json({ listings: {}, count: 0 });
  }
}
