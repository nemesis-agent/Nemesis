import type { AgentTemplate } from "@nemesis/templates";

/**
 * Fills {paramKey} placeholders in a template's approvalSummary with its
 * current parameter values (defaults, unless overridden), formatted with
 * units. Used to render the plain-language deployment plan the Master
 * Agent must show before any agent is created.
 */
export function fillApprovalSummary(
  template: AgentTemplate,
  overrides: Record<string, string | number | boolean> = {},
): string {
  return template.parameters.reduce((text, param) => {
    const value = overrides[param.key] ?? param.default;
    const formatted = typeof value === "boolean" ? (value ? "on" : "off") : `${value}${param.unit ? ` ${param.unit}` : ""}`;
    return text.replaceAll(`{${param.key}}`, formatted);
  }, template.approvalSummary);
}
