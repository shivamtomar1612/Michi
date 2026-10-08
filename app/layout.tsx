import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "MICHI — Travel deeper. Leave lighter.", template: "%s | MICHI" },
  description: "Discover Japan with cultural understanding, destination care, and community benefit at the heart of every journey.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" data-scroll-behavior="smooth"><body>{children}</body></html>;
}
