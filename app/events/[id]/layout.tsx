import { Metadata } from "next";
import { prisma } from "@/lib/db";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      select: {
        title: true,
        description: true,
        imageUrl: true,
        mintDate: true,
        endDate: true,
        event_type: true,
        isForeverMint: true,
        host: true,
        votesUp: true,
      },
    });

    if (!event) {
      return { title: "Event Not Found" };
    }

    const typeLabel =
      event.event_type === "ECOSYSTEM_MEETUP"
        ? "Meetup"
        : event.event_type === "HACKATHON"
        ? "Hackathon"
        : event.isForeverMint
        ? "Forever Mint"
        : "NFT Mint";

    const dateStr = event.mintDate
      ? new Date(event.mintDate).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        })
      : "Always Live";

    const cleanDesc = event.description
      .replace(/<[^>]+>/g, "")
      .slice(0, 200)
      .trim();

    const title = `${event.title} — ${typeLabel} on Hedera`;
    const description = `${cleanDesc}${cleanDesc.length >= 200 ? "..." : ""} | ${dateStr} | ${event.votesUp} votes`;

    return {
      title,
      description,
      alternates: { canonical: `/events/${id}` },
      openGraph: {
        title,
        description,
        url: `/events/${id}`,
        type: "article",
        ...(event.imageUrl && {
          images: [
            {
              url: event.imageUrl,
              width: 800,
              height: 600,
              alt: event.title,
            },
          ],
        }),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(event.imageUrl && { images: [event.imageUrl] }),
      },
    };
  } catch {
    return { title: "Event | Hashly" };
  }
}

export default function EventLayout({ children }: Props) {
  return children;
}
