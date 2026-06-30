import { existsSync, readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const docsPath = "apps/web/app/docs/page.tsx";
const changelogPath = "apps/web/app/changelog/page.tsx";
const roadmapPath = "apps/web/app/roadmap/page.tsx";
const updatesPath = "apps/web/app/updates/page.tsx";
const tokenSafetyPath = "docs/TOKEN_SAFETY.md";
const docs = existsSync(docsPath) ? read(docsPath) : "";
const changelog = existsSync(changelogPath) ? read(changelogPath) : "";
const roadmap = existsSync(roadmapPath) ? read(roadmapPath) : "";
const updates = existsSync(updatesPath) ? read(updatesPath) : "";
const tokenSafety = existsSync(tokenSafetyPath) ? read(tokenSafetyPath) : "";
const footer = read("apps/web/components/Footer.tsx");
const navbar = read("apps/web/components/Navbar.tsx");
const sitemap = read("apps/web/app/sitemap.ts");
const robots = read("apps/web/app/robots.ts");

check("docs, changelog, roadmap, and updates routes exist", () => {
  assert(existsSync(docsPath), "docs page route missing");
  assert(existsSync(changelogPath), "changelog page route missing");
  assert(docs.includes("export const metadata"), "docs page should define metadata");
  assert(changelog.includes("export const metadata"), "changelog page should define metadata");
  assert(existsSync(roadmapPath), "roadmap page route missing");
  assert(roadmap.includes("export const metadata"), "roadmap page should define metadata");
  assert(existsSync(updatesPath), "updates page route missing");
  assert(updates.includes("export const metadata"), "updates page should define metadata");
});

check("docs cover public product essentials", () => {
  for (const phrase of [
    "how NEMESIS works",
    "how to deploy an agent",
    "security model",
    "telegram linking",
    "base and solana support",
    "talk with NEMESIS",
    "template detail pages",
    "operational status",
    "how to verify NEMESIS",
    "what the token does not do",
    "avoid impersonators",
    "does not custody funds",
    "do not hold signing authority",
  ]) {
    assert(docs.includes(phrase), `docs missing phrase: ${phrase}`);
  }
});

check("changelog is public-facing and current", () => {
  for (const phrase of [
    "template detail polish and docs sync",
    "public FAQ and docs layer",
    "Talk with NEMESIS expansion",
    "Base and Solana approval-first agents",
  ]) {
    assert(changelog.includes(phrase), `changelog missing phrase: ${phrase}`);
  }
});


check("roadmap is directional and boundary-focused", () => {
  for (const phrase of [
    "shipped",
    "building",
    "exploring",
    "not planned",
    "No item is a promise of timing or outcome",
    "Automatic transaction execution without explicit wallet approval",
    "Paywalls, premium tiers, or access gating",
  ]) {
    assert(roadmap.includes(phrase), `roadmap missing phrase: ${phrase}`);
  }
});
check("updates page is Medium-backed and privacy-safe", () => {
  for (const phrase of [
    "https://medium.com/@nemesisagent1",
    "why approval-first agents",
    "what NEMESIS can and cannot access",
    "how Telegram proposal linking works",
    "Base and Solana support notes",
    "template detail pages without performance theater",
    "public-safe health and runner visibility",
    "should not reveal secrets",
  ]) {
    assert(updates.includes(phrase), `updates missing phrase: ${phrase}`);
  }
});


check("token safety docs are public and anti-scam focused", () => {
  for (const phrase of [
    "How To Verify",
    "What The Token Does Not Do",
    "Avoid Impersonators",
    "Official Channels Only",
    "https://nemesis-agent.xyz",
    "https://x.com/Nemesis_agent",
    "https://github.com/nemesis-agent/Nemesis",
    "https://t.me/NemesisAgentAppBot",
    "does not let agents auto-execute transactions",
    "does not replace wallet approval",
  ]) {
    assert(tokenSafety.includes(phrase), `token safety docs missing phrase: ${phrase}`);
  }
});
check("docs, changelog, roadmap, and updates are discoverable", () => {
  assert(navbar.includes('{ href: "/docs", label: "docs" }'), "navbar should link docs");
  assert(footer.includes('href="/docs"'), "footer should link docs");
  assert(footer.includes('href="/changelog"'), "footer should link changelog");
  assert(footer.includes('href="/roadmap"'), "footer should link roadmap");
  assert(footer.includes('href="/updates"'), "footer should link updates");
  assert(sitemap.includes('`${SITE_URL}/docs`'), "sitemap should include docs");
  assert(sitemap.includes('`${SITE_URL}/changelog`'), "sitemap should include changelog");
  assert(sitemap.includes('`${SITE_URL}/roadmap`'), "sitemap should include roadmap");
  assert(sitemap.includes('`${SITE_URL}/updates`'), "sitemap should include updates");
  assert(robots.includes('"/docs"') && robots.includes('"/changelog"') && robots.includes('"/roadmap"') && robots.includes('"/updates"'), "robots should allow docs, changelog, roadmap, and updates");
});

check("public docs avoid unsafe claims and mojibake", () => {
  const combined = `${docs}\n${changelog}\n${roadmap}\n${updates}\n${tokenSafety}\n${footer}`;
  assert(!/[\u00c2\u00c3\u00e2\u20ac]/.test(combined), "docs-facing source contains mojibake");
  assert(!/risk-free|guaranteed|guarantees|guarantee outcome|passive income/i.test(combined), "docs-facing copy contains unsafe claims");
});

let failed = 0;
for (const item of checks) {
  try {
    item.fn();
    console.log("PASS " + item.name);
  } catch (error) {
    failed += 1;
    console.error("FAIL " + item.name);
    console.error(error instanceof Error ? error.message : error);
  }
}

if (failed > 0) {
  console.error(failed + " docs audit check(s) failed");
  process.exit(1);
}

console.log("All " + checks.length + " docs audit checks passed");
