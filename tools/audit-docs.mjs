import { existsSync, readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

const docsPath = "apps/web/app/docs/page.tsx";
const changelogPath = "apps/web/app/changelog/page.tsx";
const docs = existsSync(docsPath) ? read(docsPath) : "";
const changelog = existsSync(changelogPath) ? read(changelogPath) : "";
const footer = read("apps/web/components/Footer.tsx");
const navbar = read("apps/web/components/Navbar.tsx");
const sitemap = read("apps/web/app/sitemap.ts");
const robots = read("apps/web/app/robots.ts");

check("docs and changelog routes exist", () => {
  assert(existsSync(docsPath), "docs page route missing");
  assert(existsSync(changelogPath), "changelog page route missing");
  assert(docs.includes("export const metadata"), "docs page should define metadata");
  assert(changelog.includes("export const metadata"), "changelog page should define metadata");
});

check("docs cover public product essentials", () => {
  for (const phrase of [
    "how NEMESIS works",
    "how to deploy an agent",
    "security model",
    "telegram linking",
    "base and solana support",
    "talk with NEMESIS",
    "does not custody funds",
    "do not hold signing authority",
  ]) {
    assert(docs.includes(phrase), `docs missing phrase: ${phrase}`);
  }
});

check("changelog is public-facing and current", () => {
  for (const phrase of [
    "public FAQ and docs layer",
    "Talk with NEMESIS expansion",
    "Base and Solana approval-first agents",
  ]) {
    assert(changelog.includes(phrase), `changelog missing phrase: ${phrase}`);
  }
});

check("docs and changelog are discoverable", () => {
  assert(navbar.includes('{ href: "/docs", label: "docs" }'), "navbar should link docs");
  assert(footer.includes('href="/docs"'), "footer should link docs");
  assert(footer.includes('href="/changelog"'), "footer should link changelog");
  assert(sitemap.includes('`${SITE_URL}/docs`'), "sitemap should include docs");
  assert(sitemap.includes('`${SITE_URL}/changelog`'), "sitemap should include changelog");
  assert(robots.includes('"/docs"') && robots.includes('"/changelog"'), "robots should allow docs and changelog");
});

check("public docs avoid unsafe claims and mojibake", () => {
  const combined = `${docs}\n${changelog}\n${footer}`;
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
