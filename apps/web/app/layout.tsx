import type { Metadata } from "next";
import Script from "next/script";

import { BootSequence } from "@/components/BootSequence";
import { CommandMenu } from "@/components/CommandMenu";
import { CustomCursor } from "@/components/CustomCursor";
import { Footer } from "@/components/Footer";
import { HeroScene } from "@/components/HeroScene";
import { Navbar } from "@/components/Navbar";
import { Providers } from "./providers";

import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nemesis-agent.xyz";

const productJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "NEMESIS",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  url: siteUrl,
  description: "Approval-first agents for Base and Solana wallets.",
  sameAs: [
    "https://x.com/Nemesis_agent",
    "https://github.com/nemesis-agent/Nemesis",
    "https://t.me/NemesisAgentAppBot",
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "NEMESIS - approval-first agents on Base and Solana",
  description:
    "Deploy approval-first agents on Base and Solana. Agents propose; your wallet signs.",
  keywords: [
    "NEMESIS",
    "Base agents",
    "Solana agents",
    "approval-first automation",
    "wallet automation",
    "Telegram crypto agent",
  ],
  alternates: {
    canonical: "/",
  },
  category: "technology",
  icons: {
    icon: "/assets/nemesis-favicon.png",
  },
  openGraph: {
    title: "NEMESIS - approval-first agents on Base and Solana",
    description: "Chaos in. Order out. Approval-first agents on Base and Solana.",
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
        <Script id="nemesis-product-jsonld" type="application/ld+json" strategy="beforeInteractive">
          {JSON.stringify(productJsonLd)}
        </Script>
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
