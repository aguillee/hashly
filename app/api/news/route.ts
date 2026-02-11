import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Revalidate every hour

// Genfinity RSS feed with pagination (10 articles per page)
const GENFINITY_FEED_URL = "https://genfinity.io/category/crypto/hedera/feed/";
// RSS.app has correct featured images via media:content - use as image source
const RSSAPP_FEED_URL = "https://rss.app/feeds/N9mUv8Owi8P1bnoa.xml";
const MAX_PAGES = 10; // Fetch up to 10 pages (100 articles)

interface NewsItem {
  id: string;
  title: string;
  description: string;
  link: string;
  image: string | null;
  pubDate: string;
  creator: string;
  isGenfinity: boolean;
}

// Parse RSS XML to extract news items
function parseRSS(xml: string): NewsItem[] {
  const items: NewsItem[] = [];

  // Extract all <item> elements
  const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g);
  if (!itemMatches) return items;

  for (const itemXml of itemMatches) {
    // Extract title
    const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
    const title = titleMatch ? (titleMatch[1] || titleMatch[2] || "").trim() : "";

    // Extract link
    const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
    const link = linkMatch ? linkMatch[1].trim() : "";

    // Extract guid
    const guidMatch = itemXml.match(/<guid[^>]*>(.*?)<\/guid>/);
    const id = guidMatch ? guidMatch[1].trim() : link;

    // Extract description (may contain CDATA)
    const descMatch = itemXml.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>|<description>([\s\S]*?)<\/description>/);
    let description = descMatch ? (descMatch[1] || descMatch[2] || "").trim() : "";

    // Clean HTML from description and extract text
    description = description
      .replace(/<img[^>]*>/gi, "") // Remove img tags
      .replace(/<[^>]+>/g, " ") // Remove all HTML tags
      .replace(/&nbsp;/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 300); // Limit description length

    if (description.length === 300) {
      description += "...";
    }

    // Extract image - prioritize content:encoded, then media:content, then description
    let image: string | null = null;

    // Helper to check if URL is a valid content image (not emoji/icon)
    const isValidImage = (url: string): boolean => {
      const invalidPatterns = [
        "twemoji",
        "emoji",
        "s.w.org",
        "/72x72/",
        "/16x16/",
        "/32x32/",
        "/64x64/",
        "abs.twimg.com",
        ".svg",
        "wp-smiley",
        "gravatar.com",
        "platform.twitter.com",
        "pbs.twimg.com/profile",
      ];
      return !invalidPatterns.some(pattern => url.includes(pattern));
    };

    // Priority 1: media:content (RSS.app feed has correct featured images here)
    const mediaMatch = itemXml.match(/<media:content[^>]*url="([^"]+)"/);
    if (mediaMatch && isValidImage(mediaMatch[1])) {
      image = mediaMatch[1];
    }

    // Priority 2: Try description which may have img tag (RSS.app includes it)
    if (!image) {
      const descImgMatch = itemXml.match(/<description><!\[CDATA\[<div><img src="([^"]+)"/);
      if (descImgMatch && isValidImage(descImgMatch[1])) {
        image = descImgMatch[1];
      }
    }

    // Priority 3: content:encoded (for original Genfinity feed fallback)
    if (!image) {
      const contentMatch = itemXml.match(/<content:encoded><!\[CDATA\[([\s\S]*?)\]\]><\/content:encoded>/);
      if (contentMatch) {
        let content = contentMatch[1];

        // Remove "Recent Updates" section which contains images from OTHER articles
        const recentUpdatesIndex = content.indexOf("Recent Updates");
        if (recentUpdatesIndex !== -1) {
          const groupBefore = content.lastIndexOf("<div class=\"wp-block-group", recentUpdatesIndex);
          if (groupBefore !== -1) {
            content = content.substring(0, groupBefore);
          }
        }

        // Remove related posts and embedded content
        content = content.replace(/<figure[^>]*class="[^"]*wp-block-post-featured-image[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, "");
        content = content.replace(/<figure[^>]*class="[^"]*wp-block-embed[^"]*"[^>]*>[\s\S]*?<\/figure>/gi, "");
        content = content.replace(/<blockquote class="twitter-tweet"[\s\S]*?<\/blockquote>/gi, "");

        const imgMatches = Array.from(content.matchAll(/<img[^>]*src="([^"]+)"/g));
        for (const match of imgMatches) {
          const imgUrl = match[1];
          if (isValidImage(imgUrl) && imgUrl.includes("wp-content/uploads")) {
            image = imgUrl;
            break;
          }
        }
      }
    }

    // Extract pubDate
    const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
    const pubDate = pubDateMatch ? pubDateMatch[1].trim() : "";

    // Extract creator
    const creatorMatch = itemXml.match(/<dc:creator><!\[CDATA\[(.*?)\]\]><\/dc:creator>|<dc:creator>(.*?)<\/dc:creator>/);
    const creator = creatorMatch ? (creatorMatch[1] || creatorMatch[2] || "").trim() : "";

    // Check if from Genfinity
    const isGenfinity = link.includes("genfinity.io");

    if (title && link) {
      items.push({
        id,
        title,
        description,
        link,
        image,
        pubDate,
        creator,
        isGenfinity,
      });
    }
  }

  return items;
}

// Fetch a single page of RSS feed
async function fetchRSSPage(page: number): Promise<NewsItem[]> {
  const url = page === 1 ? GENFINITY_FEED_URL : `${GENFINITY_FEED_URL}?paged=${page}`;

  const response = await fetch(url, {
    next: { revalidate: 3600 },
    headers: {
      "User-Agent": "Hashly/1.0",
    },
  });

  if (!response.ok) {
    return [];
  }

  const xml = await response.text();
  return parseRSS(xml);
}

// Fetch RSS.app feed to get correct featured images
async function fetchImageMap(): Promise<Map<string, string>> {
  const imageMap = new Map<string, string>();

  try {
    const response = await fetch(RSSAPP_FEED_URL, {
      next: { revalidate: 3600 },
      headers: { "User-Agent": "Hashly/1.0" },
    });

    if (response.ok) {
      const xml = await response.text();
      const itemMatches = xml.match(/<item>([\s\S]*?)<\/item>/g) || [];

      for (const itemXml of itemMatches) {
        // Extract link (normalize by removing query params)
        const linkMatch = itemXml.match(/<link>(.*?)<\/link>/);
        if (!linkMatch) continue;
        const link = linkMatch[1].trim().split("?")[0];

        // Extract media:content image
        const mediaMatch = itemXml.match(/<media:content[^>]*url="([^"]+)"/);
        if (mediaMatch) {
          imageMap.set(link, mediaMatch[1]);
        }
      }
    }
  } catch (error) {
    console.error("Failed to fetch RSS.app feed for images:", error);
  }

  return imageMap;
}

// Fetch og:image from article page
async function fetchOgImage(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "Hashly/1.0" },
    });

    if (!response.ok) return null;

    const html = await response.text();
    // Look for og:image meta tag
    const ogMatch = html.match(/<meta[^>]*property="og:image"[^>]*content="([^"]+)"/i)
      || html.match(/<meta[^>]*content="([^"]+)"[^>]*property="og:image"/i);

    if (ogMatch) {
      return ogMatch[1];
    }
  } catch {
    // Silently fail
  }
  return null;
}

// Fetch og:images in batches to avoid overwhelming the server
async function fetchMissingImages(items: NewsItem[], imageMap: Map<string, string>): Promise<void> {
  const BATCH_SIZE = 10;
  const itemsNeedingImages = items.filter(item => {
    const normalizedLink = item.link.split("?")[0];
    return !imageMap.has(normalizedLink) && !item.image;
  });

  for (let i = 0; i < itemsNeedingImages.length; i += BATCH_SIZE) {
    const batch = itemsNeedingImages.slice(i, i + BATCH_SIZE);
    const results = await Promise.all(
      batch.map(async (item) => {
        const cleanUrl = item.link.split("?")[0];
        const ogImage = await fetchOgImage(cleanUrl);
        return { link: item.link.split("?")[0], image: ogImage };
      })
    );

    for (const result of results) {
      if (result.image) {
        imageMap.set(result.link, result.image);
      }
    }
  }
}

// GET /api/news - Fetch news from RSS feed with pagination
export async function GET(request: NextRequest) {
  const rateLimitResponse = await checkRateLimit(request, "public");
  if (rateLimitResponse) return rateLimitResponse;

  try {
    // Fetch RSS.app feed first to get correct images, then fetch all Genfinity pages
    const [imageMap, ...pageResults] = await Promise.all([
      fetchImageMap(),
      ...Array.from({ length: MAX_PAGES }, (_, i) => fetchRSSPage(i + 1)),
    ]);

    // Combine all pages and deduplicate by id
    const seenIds = new Set<string>();
    const allNews: NewsItem[] = [];

    for (const pageNews of pageResults) {
      for (const item of pageNews) {
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          allNews.push(item);
        }
      }
    }

    // Fetch missing images from article pages (og:image)
    await fetchMissingImages(allNews, imageMap);

    // Apply images from map to all items
    for (const item of allNews) {
      const normalizedLink = item.link.split("?")[0];
      const betterImage = imageMap.get(normalizedLink);
      if (betterImage) {
        item.image = betterImage;
      }
    }

    // Sort by date, newest first
    allNews.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      news: allNews,
      lastUpdated: new Date().toISOString(),
    });
  } catch (error) {
    console.error("News fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch news" },
      { status: 500 }
    );
  }
}
