/**
 * Scrolling marquee ticker — continuous horizontal scroll of brand/tech
 * keywords below the hero CTAs. Pure CSS animation, no JS. Uses three
 * copies of the item list so the loop is always seamless regardless of
 * screen width.
 */
export function HeroTicker() {
  const items = [
    "base mainnet",
    "approval-first",
    "powered by openrouter",
    "base + solana",
    "your keys",
    "autonomous agents",
    "propose · not execute",
    "chaos in · order out",
    "on-chain execution",
  ];

  // Triplicate so the CSS infinite scroll never shows a gap.
  const track = [...items, ...items, ...items];

  return (
    <div
      className="overflow-hidden border-y border-nm-border py-3"
      aria-hidden="true"
    >
      <div className="ticker-track flex gap-0 whitespace-nowrap">
        {track.map((item, i) => (
          <span
            key={i}
            className="inline-flex items-center gap-4 px-6 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted"
          >
            <span className="text-nm-fragment-red opacity-60">◆</span>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
