import { existsSync, readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const publicCopyFiles = [
  "apps/web/app/page.tsx",
  "apps/web/app/agents/new/page.tsx",
  "apps/web/app/dashboard/page.tsx",
  "apps/web/components/BootSequence.tsx",
  "apps/web/components/ChatWithNemesis.tsx",
  "apps/web/components/HowItWorks.tsx",
  "apps/web/components/Hero.tsx",
  "apps/web/components/DeployChat.tsx",
  "apps/web/components/Navbar.tsx",
  "apps/web/components/Footer.tsx",
  "apps/web/components/FAQSection.tsx",
];
const publicCopy = publicCopyFiles.map(read).join("\n");
const layout = read("apps/web/app/layout.tsx");
const wagmi = read("apps/web/lib/wagmi.ts");
const sitemap = read("apps/web/app/sitemap.ts");
const robots = read("apps/web/app/robots.ts");
const readme = read("README.md");

check("public UI copy uses current NEMESIS identity", () => {
  for (const stale of ["Master Agent", "built on hermes", "Built on Hermes", "platform on Base.", "Live on Base", "Historical Backtest", "Run Backtest", "Est. APY", "Win Rate"]) {
    assert(!publicCopy.includes(stale), `public UI copy contains stale phrase: ${stale}`);
  }
  for (const phrase of ["Talk with NEMESIS", "NEMESIS planner", "approval-first", "Base and Solana", "OpenRouter"]) {
    assert(publicCopy.includes(phrase), `public UI copy missing current phrase: ${phrase}`);
  }
});

check("metadata and wallet identity are approval-first and shareable", () => {
  assert(layout.includes("NEMESIS - approval-first agents on Base and Solana"), "root metadata title must be approval-first and multi-chain");
  assert(layout.includes("/assets/nemesis-social-preview-2026.png"), "root metadata must use current social preview asset");
  assert(layout.includes("/assets/nemesis-favicon.png"), "root metadata must use current favicon");
  assert(layout.includes("https://x.com/Nemesis_agent"), "JSON-LD must include official X");
  assert(layout.includes("https://github.com/nemesis-agent/Nemesis"), "JSON-LD must include official GitHub");
  assert(layout.includes("https://t.me/NemesisAgentAppBot"), "JSON-LD must include official Telegram bot");
  assert(wagmi.includes('appName: "NEMESIS"'), "WalletConnect app name must be NEMESIS");
  assert(wagmi.includes("Approval-first agents on Base and Solana"), "WalletConnect description must be current");
  assert(wagmi.includes("/assets/nemesis-favicon.png"), "WalletConnect icon must use current favicon");
});

check("public discovery routes stay indexed safely", () => {
  for (const route of ["/docs", "/changelog", "/roadmap", "/updates", "/terms", "/privacy"]) {
    assert(sitemap.includes(route), `sitemap missing ${route}`);
    assert(robots.includes(route), `robots missing ${route}`);
  }
  assert(robots.includes('"/dashboard"') && robots.includes('"/api/"'), "robots must disallow private/dashboard/API surfaces");
});

check("README exposes public product only", () => {
  assert(readme.includes("nemesis-agent.xyz"), "README must include live website");
  assert(readme.includes("HTXeyDoVbtJxEApA4oRMT1xLtCGoUQ5P962Cur6EASY"), "README must include official contract address");
  assert(!readme.includes("ARCHITECTURE.md") && !readme.includes("CONTEXT.md"), "README must not link ignored internal docs");
});

for (const asset of [
  "apps/web/public/assets/nemesis-social-preview-2026.png",
  "apps/web/public/assets/nemesis-favicon.png",
  "apps/web/public/assets/nemesis-avatar.png",
]) {
  check(`asset exists: ${asset}`, () => assert(existsSync(asset), `${asset} missing`));
}

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log(`PASS ${item.name}`);
  } catch (error) {
    failed += 1;
    console.error(`FAIL ${item.name}`);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  console.error(`${failed} copy/metadata audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} copy/metadata audit checks passed`);