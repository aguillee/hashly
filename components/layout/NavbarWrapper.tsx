"use client";

import dynamic from "next/dynamic";

// Use dynamic import with ssr: false to avoid SSG issues with client components
const Navbar = dynamic(
  () => import("./Navbar").then((mod) => mod.Navbar),
  { ssr: false }
);

export function NavbarWrapper() {
  return <Navbar />;
}
