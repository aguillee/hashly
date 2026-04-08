const SITE_URL = "https://hash-ly.com";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Hashly",
  url: SITE_URL,
  logo: `${SITE_URL}/logohashly.png`,
  description:
    "The Hedera ecosystem hub — discover NFT mints, meetups, hackathons, DreamCast pools, token rankings, and community projects powered by on-chain voting.",
  sameAs: ["https://x.com/hashly_h", "https://discord.gg/hashly"],
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Hashly",
  url: SITE_URL,
  description:
    "Discover upcoming NFT mints, meetups, hackathons, and everything happening on Hedera Hashgraph. Community-driven rankings powered by on-chain HCS voting.",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/calendar?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Events Calendar", item: `${SITE_URL}/calendar` },
    { "@type": "ListItem", position: 3, name: "Ecosystem", item: `${SITE_URL}/ecosystem` },
    { "@type": "ListItem", position: 4, name: "Leaderboard", item: `${SITE_URL}/leaderboard` },
    { "@type": "ListItem", position: 5, name: "News", item: `${SITE_URL}/news` },
    { "@type": "ListItem", position: 6, name: "HashWorld", item: `${SITE_URL}/community` },
  ],
};

export function JsonLd() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }}
      />
    </>
  );
}

export function EventJsonLd({
  name,
  description,
  startDate,
  endDate,
  image,
  url,
  location,
  organizer,
}: {
  name: string;
  description: string;
  startDate?: string | null;
  endDate?: string | null;
  image?: string | null;
  url: string;
  location?: string | null;
  organizer?: string | null;
}) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description: description.slice(0, 300),
    url,
    ...(image && { image }),
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(location && {
      location: { "@type": "Place", name: location },
    }),
    organizer: {
      "@type": "Organization",
      name: organizer || "Hashly",
      url: SITE_URL,
    },
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
