import { existsSync, readFileSync } from "node:fs";

const checks = [];
function check(name, fn) { checks.push({ name, fn }); }
function read(path) { return readFileSync(path, "utf8"); }
function assert(condition, message) { if (!condition) throw new Error(message); }

check("telegram help command is registered and discoverable", () => {
  const index = read("apps/telegram-bot/src/index.ts");
  const help = read("apps/telegram-bot/src/commands/help.ts");
  const start = read("apps/telegram-bot/src/commands/start.ts");
  assert(index.includes('import { helpCommand } from "./commands/help.js";'), "help command import missing");
  assert(index.includes('bot.command("help", helpCommand);'), "help command registration missing");
  assert(help.includes("helpCommand"), "help command handler missing");
  assert(help.includes("NEMESIS never signs or broadcasts without you"), "help command must state approval-first behavior");
  assert((start.match(/\/help - show command guide/g) ?? []).length >= 2, "start copy must expose /help for linked and unlinked users");
});

check("telegram bot-facing source is ascii-safe", () => {
  const files = [
    "apps/telegram-bot/src/commands/agents.ts",
    "apps/telegram-bot/src/commands/help.ts",
    "apps/telegram-bot/src/commands/link.ts",
    "apps/telegram-bot/src/commands/pause.ts",
    "apps/telegram-bot/src/commands/start.ts",
    "apps/telegram-bot/src/commands/status.ts",
    "apps/telegram-bot/src/handlers/approval.ts",
    "apps/telegram-bot/src/handlers/menu.ts",
    "apps/telegram-bot/src/index.ts",
    "apps/telegram-bot/src/lib/auth.ts",
    "apps/telegram-bot/src/lib/format.ts",
    "apps/telegram-bot/src/lib/ui.ts",
  ];
  for (const file of files) {
    assert(!/[^\x00-\x7F]/.test(read(file)), `${file} contains non-ASCII bot-facing text`);
  }
});


check("telegram UX exposes menu, dashboard actions, and ownership-scoped agent controls", () => {
  const index = read("apps/telegram-bot/src/index.ts");
  const ui = read("apps/telegram-bot/src/lib/ui.ts");
  const menu = read("apps/telegram-bot/src/handlers/menu.ts");
  const agents = read("apps/telegram-bot/src/commands/agents.ts");
  const approval = read("apps/telegram-bot/src/handlers/approval.ts");
  assert(index.includes("setMyCommands"), "Telegram command menu must be registered");
  assert(index.includes("registerMenuHandlers(bot)"), "Telegram menu callbacks must be registered");
  assert(ui.includes("mainMenuKeyboard"), "Telegram main menu keyboard missing");
  assert(ui.includes("proposalKeyboard"), "Telegram proposal keyboard missing");
  assert(ui.includes("Markup.button.url(\"open in dashboard\""), "Proposal keyboard must expose dashboard URL button");
  assert(menu.includes("agent.walletAddress.toLowerCase() !== wallet.toLowerCase()"), "Agent action callbacks must enforce wallet ownership");
  assert(menu.includes("agent:pause:") && menu.includes("agent:resume:"), "Agent pause/resume callbacks missing");
  assert(agents.includes("agentKeyboard(agent)"), "/agents must expose per-agent action buttons");
  assert(approval.includes("proposalKeyboard(proposal"), "Proposal notifications must use upgraded keyboard");
});
check("solana proposal confirmation supports retrying pending signatures", () => {
  const execute = read("apps/web/components/ExecuteProposalButton.tsx");
  assert(execute.includes("solanaPendingSignature"), "Solana pending signature state missing");
  assert(execute.includes("response.status === 425"), "Solana 425 pending confirmation handling missing");
  assert(execute.includes("Retry Solana verification"), "Solana retry button label missing");
  assert(execute.includes("await confirmSolanaSignature(signature)"), "Initial Solana submit must use retry-aware confirmation helper");
  assert((execute.match(/confirm-solana/g) ?? []).length === 1, "Solana confirm endpoint should be called from one helper only");
});

check("production smoke covers every template detail route", () => {
  const smoke = read("tools/smoke-production.mjs");
  assert(smoke.includes("function templateIds()"), "smoke must discover template IDs");
  assert(smoke.includes("...templateIds().map"), "smoke must include all template detail routes");
  assert(smoke.includes("All ${checks.length} smoke checks passed"), "smoke should report dynamic check count");
});

check("public docs, brand assets, and product copy are synchronized", () => {
  const readme = read("README.md");
  const guide = read("docs/PRODUCT_GUIDE.md");
  const security = read("docs/SECURITY.md");
  const layout = read("apps/web/app/layout.tsx");
  const wagmi = read("apps/web/lib/wagmi.ts");
  const navbar = read("apps/web/components/Navbar.tsx");
  const how = read("apps/web/components/HowItWorks.tsx");
  const chat = read("apps/web/components/ChatWithNemesis.tsx");
  const hero = read("apps/web/components/Hero.tsx");
  const ticker = read("apps/web/components/HeroTicker.tsx");
  const footer = read("apps/web/components/Footer.tsx");
  const logicFlow = read("apps/web/components/LogicFlow.tsx");
  const boot = read("apps/web/components/BootSequence.tsx");
  assert(readme.includes("./assets/nemesis-banner.png"), "README must use current banner asset");
  assert(layout.includes("/assets/nemesis-social-preview-2026.png"), "metadata must use current social preview asset");
  assert(layout.includes("/assets/nemesis-favicon.png"), "metadata must use current icon asset");
  assert(wagmi.includes("/assets/nemesis-favicon.png"), "WalletConnect metadata must use current icon asset");
  assert(navbar.includes("/assets/nemesis-avatar.png"), "navbar must use current avatar asset");
  assert(guide.includes("Open the Telegram bot from the dashboard"), "product guide must explain Telegram bot entry point");
  assert(security.includes("Proposal confirmations"), "security docs must cover proposal confirmation checks");
  assert(!chat.includes("platform on Base."), "chat copy must not describe Base-only support");
  assert(!how.includes("Solana actions are review-only for now"), "how-it-works copy must not contain stale Solana copy");
  const publicBrandCopy = [hero, ticker, footer, logicFlow, boot].join("\n").toLowerCase();
  assert(!publicBrandCopy.includes("hermes"), "public UI must not claim Hermes attribution");
  assert(publicBrandCopy.includes("openrouter"), "public UI must include OpenRouter attribution");
  for (const internalDoc of ["docs/OPS_RUNBOOK.md", "docs/PHASE_AUDITS.md", "docs/P2_HARDENING_CHECKLIST.md"]) {
    assert(!existsSync(internalDoc), internalDoc + " should stay out of public docs");
  }
});

check("package scripts expose P1 and P2 gates", () => {
  const pkg = JSON.parse(read("package.json"));
  assert(pkg.scripts?.["audit:p1"] === "node tools/audit-p1.mjs", "audit:p1 script missing");
  assert(pkg.scripts?.["audit:p2"] === "node tools/audit-p2.mjs", "audit:p2 script missing");
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
  console.error(`${failed} P2 audit check(s) failed`);
  process.exit(1);
}

console.log(`All ${checks.length} P2 audit checks passed`);