export type TemplateCategory = "launch-snipe" | "simple-actions" | "utility";

export type RiskLevel = "low" | "mid" | "high" | "degen";

export type BaseProtocol =
  | "uniswap"
  | "aerodrome"
  | "morpho"
  | "moonwell"
  | "avantis"
  | "bankr"
  | "virtuals";

export interface TemplateParameter {
  /** Stable machine key, e.g. "maxApeAmount" */
  key: string;
  /** Human-readable label shown in the deploy form */
  label: string;
  /** Input type for the deploy form */
  type: "number" | "percent" | "currency" | "address" | "select" | "boolean";
  /** Default value pre-filled when a user deploys this template */
  default: string | number | boolean;
  /** One-line explanation of what this parameter controls */
  description: string;
  /** Available choices when type is "select" */
  options?: string[];
  /** Optional unit suffix shown next to the value, e.g. "USDC" or "%" */
  unit?: string;
}

export interface AgentTemplate {
  /** Stable slug used as an identifier across web, bot, and agent config */
  id: string;
  /** Display name */
  name: string;
  category: TemplateCategory;
  risk: RiskLevel;
  /** Short subtitle, shown in template cards (kept under ~12 words) */
  summary: string;
  /** Plain-language description of what the agent watches for */
  condition: string;
  /** Plain-language description of what the agent proposes when the condition is met */
  action: string;
  /** Base MCP protocol skills this template depends on */
  protocols: BaseProtocol[];
  /** Configurable parameters surfaced in the deploy form */
  parameters: TemplateParameter[];
  /**
   * Plain-language summary the Master Agent must read back to the user
   * before deployment, per the approval-first design requirement.
   */
  approvalSummary: string;
  /**
   * Required for "high" and "degen" risk templates. Shown in the risk
   * acknowledgment modal before deployment and as a banner on the
   * template detail page. Should be specific to this template's failure
   * mode, not generic.
   */
  riskNote?: string;
}

export const TEMPLATE_CATEGORIES: Record<TemplateCategory, string> = {
  "launch-snipe": "Launch & snipe",
  "simple-actions": "Simple actions",
  utility: "Utility",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  low: "Low",
  mid: "Mid",
  high: "High",
  degen: "Degen",
};
