const EVM_ADDRESS_RE = /0x[a-fA-F0-9]{40}/g;
const SOLANA_WALLET_KEY_RE = /solana:([1-9A-HJ-NP-Za-km-z]{32,44})/g;
const TX_HASH_RE = /0x[a-fA-F0-9]{64}/g;
const TELEGRAM_TOKEN_RE = /\b\d{8,12}:[A-Za-z0-9_-]{25,}\b/g;
const SECRET_KEY_RE = /\b(?:sk-or-v1-|sk-)[A-Za-z0-9_-]{16,}\b/g;

export function maskIdentifier(value: string): string {
  if (value.startsWith("solana:")) {
    const raw = value.slice("solana:".length);
    return raw.length > 10 ? `solana:${raw.slice(0, 4)}...${raw.slice(-4)}` : "solana:***";
  }
  if (value.startsWith("0x") && value.length >= 12) return `${value.slice(0, 6)}...${value.slice(-4)}`;
  if (/^-?\d{5,}$/.test(value)) return `telegram:***${value.slice(-4)}`;
  return value.length > 18 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

export function redactText(value: string): string {
  return value
    .replace(TELEGRAM_TOKEN_RE, "[redacted-telegram-token]")
    .replace(SECRET_KEY_RE, "[redacted-secret]")
    .replace(SOLANA_WALLET_KEY_RE, (_match, address: string) => `solana:${maskIdentifier(address)}`)
    .replace(TX_HASH_RE, (match) => `${match.slice(0, 10)}...${match.slice(-6)}`)
    .replace(EVM_ADDRESS_RE, (match) => maskIdentifier(match));
}

export function redactForLog(error: unknown): string {
  if (error instanceof Error) return redactText(error.message).slice(0, 240);
  return redactText(String(error)).slice(0, 240);
}

export function balancePrivacyBucket(balanceEth: number): string {
  if (!Number.isFinite(balanceEth) || balanceEth <= 0) return "none";
  if (balanceEth < 0.01) return "below 0.01 ETH";
  if (balanceEth < 0.1) return "0.01-0.1 ETH";
  if (balanceEth < 1) return "0.1-1 ETH";
  if (balanceEth < 10) return "1-10 ETH";
  return "above 10 ETH";
}
