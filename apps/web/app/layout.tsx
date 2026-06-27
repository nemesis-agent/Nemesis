import type { Metadata } from "next";

import { BootSequence } from "@/components/BootSequence";
import { CommandMenu } from "@/components/CommandMenu";
import { CustomCursor } from "@/components/CustomCursor";
import { Footer } from "@/components/Footer";
import { HeroScene } from "@/components/HeroScene";
import { Navbar } from "@/components/Navbar";
import { Providers } from "./providers";

import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "NEMESIS - autonomous agents on Base and Solana",
  description:
    "Deploy approval-first agents on Base and Solana. Chaos in, order out.",
  icons: {
    icon: "/assets/nemesis-favicon.png",
  },
  openGraph: {
    title: "NEMESIS - autonomous agents on Base and Solana",
    description: "Chaos in. Order out. Deploy approval-first agents on Base and Solana.",
    images: ["/assets/nemesis-banner.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="flex min-h-screen flex-col">
        <BootSequence />
        <CustomCursor />
        <CommandMenu />
        <HeroScene />
        <Providers>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
