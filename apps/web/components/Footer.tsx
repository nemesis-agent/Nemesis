import { FragmentDivider } from "@/components/FragmentDivider";

const BADGES = ["powered by openrouter", "base + solana", "approval-first"];

export function Footer() {
  return (
    <footer className="mt-24">
      <FragmentDivider />
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 font-mono text-xs uppercase tracking-widest2 text-nm-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <span>nemesis — the market&apos;s reckoning</span>
          <div className="hidden h-3 w-px bg-nm-border sm:block" aria-hidden="true" />
          <div className="flex items-center gap-5">
            <a href="/terms" className="text-nm-muted transition-colors hover:text-nm-fg">terms</a>
            <a href="/privacy" className="text-nm-muted transition-colors hover:text-nm-fg">privacy</a>
            <a href="https://x.com/Nemesis_agent" target="_blank" rel="noopener noreferrer" className="text-nm-muted transition-colors hover:text-nm-fg" aria-label="X (Twitter)">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-[14px] w-[14px]">
                <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z" />
              </svg>
            </a>
            <a href="https://github.com/nemesis-agent/Nemesis" target="_blank" rel="noopener noreferrer" className="text-nm-muted transition-colors hover:text-nm-fg" aria-label="GitHub">
              <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {BADGES.map((badge) => (
            <span key={badge} className="border border-nm-border px-2 py-1 text-[10px] normal-case tracking-normal">
              {badge}
            </span>
          ))}
        </div>
      </div>
    </footer>
  );
}
