import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  title: "Event Check-in Host",
};

export default function CheckinLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
