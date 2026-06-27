"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { NetworkPulse } from "@/components/NetworkPulse";
import { WalletConnectButton } from "@/components/WalletConnectButton";

const NAV_LINKS = [
  { href: "/agents/new", label: "deploy" },
  { href: "/dashboard", label: "agents" },
  { href: "/templates", label: "templates" },
  { href: "/#network", label: "network" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const pathname = usePathname();

  // Close on Escape, regardless of focus location.
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Lock body scroll while the mobile panel is open.
  useEffect(() => {
    if (menuOpen) {
      const previous = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = previous;
      };
    }
  }, [menuOpen]);

  return (
    <header className="relative border-b border-nm-border bg-nm-bg">
      <div className="relative z-50 mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <Link
          href="/"
          className="group flex items-center gap-3 font-mono text-sm font-bold tracking-widest2 text-nm-fg"
          aria-label="NEMESIS home"
          onClick={() => setMenuOpen(false)}
        >
          <div className="relative overflow-hidden rounded-sm border border-transparent transition-colors duration-300 group-hover:border-nm-fragment-red/30">
            <Image
              src="/assets/nemesis-avatar.png"
              alt="NEMESIS"
              width={28}
              height={28}
              className="rounded-sm object-cover transition-transform duration-500 ease-out group-hover:scale-110"
              priority
            />
            <div className="absolute inset-0 bg-nm-fragment-red mix-blend-overlay opacity-0 transition-opacity duration-300 group-hover:opacity-30" />
          </div>
          <span
            className="nav-logo-text relative z-10 transition-colors duration-300 group-hover:text-white"
            data-text="NEMESIS"
          >
            NEMESIS
          </span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-6 font-mono text-xs uppercase tracking-widest2 text-nm-muted md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="nav-link transition-colors hover:text-nm-fg"
              onClick={(e) => {
                if (link.href.startsWith("/#") && pathname === "/") {
                  e.preventDefault();
                  const targetId = link.href.substring(2);
                  document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
                }
              }}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <NetworkPulse />
          <WalletConnectButton />

          {/* Mobile menu toggle: only the hamburger is hidden on desktop, not the whole control */}
          <button
            type="button"
            className="flex h-11 w-11 flex-col items-center justify-center gap-1.5 border border-nm-border md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-panel"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span
              className={`h-px w-4 bg-nm-fg transition-transform duration-200 ${
                menuOpen ? "translate-y-[3.5px] rotate-45" : ""
              }`}
            />
            <span
              className={`h-px w-4 bg-nm-fg transition-opacity duration-200 ${
                menuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`h-px w-4 bg-nm-fg transition-transform duration-200 ${
                menuOpen ? "-translate-y-[3.5px] -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {/* Mobile nav panel */}
      {menuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-40 bg-nm-bg/60 md:hidden"
            onClick={() => setMenuOpen(false)}
          />
          <nav
            id="mobile-nav-panel"
            aria-label="Mobile"
            className="mobile-menu-in absolute inset-x-0 top-full z-50 border-b border-nm-border bg-nm-bg md:hidden"
          >
            <div className="flex flex-col px-6 py-2">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="border-b border-nm-border py-4 font-mono text-xs uppercase tracking-widest2 text-nm-muted last:border-b-0 hover:text-nm-fg"
                  onClick={(e) => {
                    if (link.href.startsWith("/#") && pathname === "/") {
                      e.preventDefault();
                      const targetId = link.href.substring(2);
                      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" });
                    }
                    setMenuOpen(false);
                  }}
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </nav>
        </>
      )}
    </header>
  );
}
