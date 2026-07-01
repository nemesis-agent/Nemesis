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

const templateSource = read("packages/templates/index.ts");

function extractBalancedObject(source, start) {
  let depth = 0;
  let inString = false;
  let quote = "";
  let escaped = false;
  for (let i = start; i < source.length; i += 1) {
    const char = source[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === quote) inString = false;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      inString = true;
      quote = char;
      continue;
    }
    if (char === "{") depth += 1;
    if (char === "}") {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error("Unbalanced template object");
}

function templateBlocks() {
  const blocks = [];
  const pattern = /\n\s*\{\s*\n\s*id:\s*"([^"]+)"/g;
  let match;
  while ((match = pattern.exec(templateSource)) !== null) {
    const objectStart = templateSource.indexOf("{", match.index);
    blocks.push({ id: match[1], block: extractBalancedObject(templateSource, objectStart) });
  }
  return blocks;
}

function stringField(block, field) {
  const match = block.match(new RegExp(`${field}:\\s*"((?:\\\\"|[^"])*)"`));
  return match?.[1];
}

function arrayStrings(block, field) {
  const match = block.match(new RegExp(`${field}:\\s*\\[([\\s\\S]*?)\\]`));
  if (!match) return [];
  return [...match[1].matchAll(/"([^"]+)"/g)].map((item) => item[1]);
}

function parameterKeys(block) {
  return [...block.matchAll(/key:\s*"([^"]+)"/g)].map((item) => item[1]);
}

const blocks = templateBlocks();

check("web security headers are explicit and wallet-compatible", () => {
  const config = read("apps/web/next.config.mjs");
  for (const directive of [
    "Content-Security-Policy",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "connect-src 'self' https: wss:",
    "Referrer-Policy",
    "Strict-Transport-Security",
    "X-Content-Type-Options",
    "X-Frame-Options",
    "Permissions-Policy",
  ]) {
    assert(config.includes(directive), `web security config missing ${directive}`);
  }
  assert(!config.includes("'unsafe-eval'"), "production CSP must not allow unsafe eval");
});
check("template registry has expected production coverage", () => {
  assert(blocks.length >= 12, `expected at least 12 templates, found ${blocks.length}`);
  const ids = new Set();
  for (const { id, block } of blocks) {
    assert(!ids.has(id), `duplicate template id ${id}`);
    ids.add(id);
    for (const field of ["name", "category", "risk", "summary", "condition", "action", "approvalSummary"]) {
      assert(Boolean(stringField(block, field)), `${id} missing ${field}`);
    }
    assert(stringField(block, "runtimeStatus") === "production", `${id} is not marked production`);
    assert(arrayStrings(block, "protocols").length > 0, `${id} has no protocols`);
    assert(parameterKeys(block).length > 0, `${id} has no parameter keys`);
  }
});

check("approval summaries interpolate only declared parameter keys", () => {
  for (const { id, block } of blocks) {
    const keys = new Set(parameterKeys(block));
    const summary = stringField(block, "approvalSummary") ?? "";
    const placeholders = [...summary.matchAll(/\{([a-zA-Z0-9_]+)\}/g)].map((match) => match[1]);
    assert(placeholders.length > 0, `${id} approval summary has no real parameter placeholders`);
    for (const placeholder of placeholders) {
      assert(keys.has(placeholder), `${id} approval summary references missing parameter ${placeholder}`);
    }
  }
});

check("high and degen templates have specific risk notes", () => {
  for (const { id, block } of blocks) {
    const risk = stringField(block, "risk");
    if (risk === "high" || risk === "degen") {
      const note = stringField(block, "riskNote") ?? "";
      assert(note.length >= 120, `${id} needs a detailed risk note`);
      assert(!/generic|elevated risk/i.test(note), `${id} risk note is too generic`);
    }
  }
});

check("solana templates stay solflare/jupiter scoped", () => {
  for (const { id, block } of blocks) {
    if (stringField(block, "chain") !== "solana") continue;
    const protocols = arrayStrings(block, "protocols");
    assert(protocols.includes("jupiter"), `${id} missing jupiter protocol`);
    assert(protocols.includes("solflare"), `${id} missing solflare protocol`);
    assert((stringField(block, "action") ?? "").includes("Nothing signs or broadcasts automatically"), `${id} action must state approval-first behavior`);
  }
});

check("no mojibake characters in product-facing source", () => {
  const files = [
    "packages/templates/index.ts",
    "packages/db/src/agents.ts",
    "apps/web/app/dashboard/page.tsx",
    "apps/web/app/agents/[id]/page.tsx",
    "apps/web/app/templates/[id]/page.tsx",
    "apps/web/components/DeployChat.tsx",
    "apps/web/components/ConnectTelegramCard.tsx",
  ];
  const bad = /[\u00c2\u00c3\u00e2\u20ac\u201d\u2026]/;
  for (const file of files) {
    assert(!bad.test(read(file)), `${file} contains mojibake or non-ASCII punctuation`);
  }
});

check("telegram linking UX exposes bot CTA and per-chain code generation", () => {
  const card = read("apps/web/components/ConnectTelegramCard.tsx");
  assert(card.includes("NemesisAgentAppBot"), "Telegram card must default to the NEMESIS bot username");
  assert(card.includes("https://t.me/"), "Telegram card must expose a direct bot URL");
  assert(card.includes("Open bot"), "Telegram card must render an Open bot CTA");
  assert(card.includes("JSON.stringify({ chain })"), "Telegram code generation must send the selected chain");
  assert(card.includes("Generate ${chain} code"), "Telegram UI must expose per-chain code buttons");
});

check("wallet connect UX keeps Base and Solflare in one connect menu", () => {
  const wallet = read("apps/web/components/WalletConnectButton.tsx");
  assert(wallet.includes("ConnectButton.Custom"), "Base wallet connect must stay in unified menu");
  assert(wallet.includes("useWalletModal"), "Solana wallet modal must be wired");
  assert(wallet.includes("Solflare"), "Unified connect menu must name Solflare");
  assert(wallet.includes("disconnect Solflare"), "Solflare disconnect action must exist");
});

check("deploy flow remains approval-first and risk gated", () => {
  const deploy = read("apps/web/components/DeployChat.tsx");
  assert(deploy.includes("fillApprovalSummary(template, pendingParams)"), "Deploy plans must show filled approval summaries");
  assert(deploy.includes("RiskAcknowledgmentModal"), "High/degen plans must be gated by risk modal");
  assert(deploy.includes("isTemplateProductionReady"), "Gated templates must not deploy");
  assert(deploy.includes("/api/agents"), "Deploy flow must call server-side agent creation");
  assert(deploy.includes("deploy review path"), "Deploy flow must show the deploy review path");
  assert(deploy.includes("final checklist"), "Deploy flow must show a final checklist");
  assert(deploy.includes("getTemplateExecutionCoverage"), "Deploy flow must expose execution coverage context");
});

check("proposal execution checks Base and Solana confirmation paths", () => {
  const executeButton = read("apps/web/components/ExecuteProposalButton.tsx");
  const confirmBase = read("apps/web/app/api/proposals/[id]/confirm/route.ts");
  const confirmSolana = read("apps/web/app/api/proposals/[id]/confirm-solana/route.ts");
  assert(executeButton.includes("solana-jupiter-swap"), "Frontend must detect Solana Jupiter proposal payloads");
  assert(confirmBase.includes("tx.from.toLowerCase()"), "Base confirmation must verify signer");
  assert(confirmBase.includes("expectedPayload.chainId !== 8453"), "Base confirmation must verify chain ID");
  assert(confirmSolana.includes("getTransaction"), "Solana confirmation must fetch confirmed transaction details");
  assert(confirmSolana.includes("auth.wallet.solanaAddress"), "Solana confirmation must verify authenticated wallet");
  assert(confirmSolana.includes("transactionMessageHash"), "Solana confirmation must verify transaction message hash");
  assert(confirmSolana.includes("transactionIncludesSigner"), "Solana confirmation must verify signer inclusion");
});

check("public docs are product-facing and current", () => {
  const readme = read("README.md");
  const productGuide = read("docs/PRODUCT_GUIDE.md");
  const security = read("docs/SECURITY.md");
  const privacy = read("docs/PRIVACY.md");
  assert(readme.includes("./assets/nemesis-banner.png"), "README must use the current NEMESIS banner asset");
  assert(readme.includes("https://nemesis-agent.xyz"), "README must link the live app");
  assert(readme.includes("Base and Solana"), "README must describe Base and Solana support");
  assert(readme.includes("approval-first"), "README must state approval-first positioning");
  assert(productGuide.includes("Base and Solana"), "product guide must describe both supported networks");
  assert(productGuide.includes("Telegram"), "product guide must describe Telegram proposal alerts");
  assert(security.includes("Non-custodial") || security.includes("non-custodial"), "security docs must state non-custodial model");
  assert(security.includes("approval-first"), "security docs must state approval-first model");
  assert(privacy.includes("Telegram"), "privacy docs must cover Telegram link data");
  for (const internalDoc of [
    "docs/OPS_RUNBOOK.md",
    "docs/PHASE_AUDITS.md",
    "docs/P1_HARDENING_CHECKLIST.md",
    "docs/P2_HARDENING_CHECKLIST.md",
    "docs/LEGAL_PRIVACY_TERMS_REVIEW.md",
  ]) {
    assert(!existsSync(internalDoc), internalDoc + " should not be part of the public product docs");
  }
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
  console.error(`${failed} P1 audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} P1 audit checks passed`);
