import { existsSync, readFileSync } from "node:fs";

const checks = [];
function check(name, fn) {
  checks.push({ name, fn });
}
function read(path) {
  return readFileSync(path, "utf8");
}
function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const layout = read("apps/web/app/layout.tsx");
const home = read("apps/web/app/page.tsx");
const hero = read("apps/web/components/Hero.tsx");
const footer = read("apps/web/components/Footer.tsx");
const ticker = read("apps/web/components/HeroTicker.tsx");
const networkPulse = read("apps/web/components/NetworkPulse.tsx");
const liveActivityFeed = read("apps/web/components/LiveActivityFeed.tsx");
const growth = read("apps/web/components/GrowthLoop.tsx");
const faq = read("apps/web/components/FAQSection.tsx");
const templateDetail = read("apps/web/app/templates/[id]/page.tsx");
const packageJson = read("package.json");

check("growth metadata is indexed and shareable", () => {
  assert(layout.includes("metadataBase: new URL(siteUrl)"), "layout must use production metadata base");
  assert(layout.includes("keywords:"), "layout must define growth keywords");
  assert(layout.includes("nemesis-product-jsonld"), "layout must expose product JSON-LD");
  assert(layout.includes("nemesis-social-preview-2026.png"), "social preview image must stay wired");
  assert(templateDetail.includes("generateMetadata") && templateDetail.includes("openGraph"), "template detail pages need metadata");
});

check("sitemap and robots are present with safe boundaries", () => {
  assert(existsSync("apps/web/app/sitemap.ts"), "sitemap route missing");
  assert(existsSync("apps/web/app/robots.ts"), "robots route missing");
  const sitemap = read("apps/web/app/sitemap.ts");
  const robots = read("apps/web/app/robots.ts");
  assert(sitemap.includes("TEMPLATES.map"), "sitemap must include template detail pages");
  assert(robots.includes("disallow: [\"/dashboard\", \"/agents/\", \"/api/\"]"), "robots must keep private surfaces out of indexing");
});

check("home network copy reflects Base and Solana support", () => {
  assert(hero.includes("live on base + solana"), "hero badge must not be Base-only");
  assert(networkPulse.includes("base + solana"), "navbar network pill must show both supported networks");
  assert(liveActivityFeed.includes("live feed / base + solana"), "network activity feed must show both supported networks");
  assert(ticker.includes("base + solana live"), "hero ticker must show Base + Solana support");
  assert(![hero, ticker, networkPulse, liveActivityFeed].join("\n").toLowerCase().includes("base mainnet"), "public network copy must not imply Base-only support");
});
check("home page has growth loop and FAQ without unsafe claims", () => {
  assert(home.includes("GrowthLoop"), "home page must render growth loop");
  assert(home.includes("FAQSection"), "home page must render FAQ section");
  assert(growth.includes("x.com/intent/tweet"), "growth loop must include share intent");
  assert(growth.includes("https://t.me/NemesisAgentAppBot"), "growth loop must include Telegram bot CTA");
  assert(growth.includes("String(TEMPLATES.length)"), "growth loop template count must use registry");
  assert(faq.includes("does NEMESIS custody my funds?"), "FAQ must explain custody boundary");
  assert(faq.includes("can an agent execute automatically?"), "FAQ must explain approval-first boundary");
  assert(faq.includes("is NEMESIS free to use?"), "FAQ must explain free access");
  assert(!/guaranteed|risk-free|profit|earn/i.test(growth), "growth copy must avoid unsafe financial claims");
  assert(!/guaranteed|risk-free|profit|earn/i.test(faq), "FAQ copy must avoid unsafe financial claims");
});

check("product-facing source is free from mojibake", () => {
  const bad = /[\u00c2\u00c3\u00e2\u20ac]/;
  for (const [file, content] of [
    ["apps/web/app/page.tsx", home],
    ["apps/web/components/Hero.tsx", hero],
    ["apps/web/components/Footer.tsx", footer],
    ["apps/web/components/GrowthLoop.tsx", growth],
    ["apps/web/components/FAQSection.tsx", faq],
  ]) {
    assert(!bad.test(content), `${file} contains mojibake`);
  }
});

check("package exposes growth audit gate", () => {
  assert(packageJson.includes("audit:growth"), "package script audit:growth missing");
});

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
  console.error(`${failed} growth audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} growth audit checks passed`);
