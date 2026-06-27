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
    siteName: "NEMESIS",
    type: "website",
    url: "/",
    images: [{
      url: "/assets/nemesis-social-preview-2026.png",
      width: 1200,
      height: 675,
      alt: "NEMESIS approval-first agents on Base and Solana",
    }],
  },
  twitter: {
    card: "summary_large_image",
    title: "NEMESIS - approval-first agents",
    description: "Deploy guarded agents on Base and Solana. Your wallet remains the final signer.",
    images: ["/assets/nemesis-social-preview-2026.png"],
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
