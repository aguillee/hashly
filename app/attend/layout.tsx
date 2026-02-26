import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    noarchive: true,
    nosnippet: true,
    noimageindex: true,
  },
  title: "Event Check-in",
};

export default function AttendLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
