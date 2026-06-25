import { TEMPLATES, type AgentTemplate } from "@nemesis/templates";

/**
 * Very small keyword matcher used to drive the deploy chat mockup. It is
 * intentionally simple — in production this step is the Master Agent's
 * job (intent parsing via an LLM, reading the user's wallet, etc). See
 * ARCHITECTURE.md, "Master Agent — intent interpretation".
 */
export function matchTemplate(input: string): AgentTemplate {
  const text = input.toLowerCase();

  const scored = TEMPLATES.map((template) => {
    const haystack = [template.name, template.summary, template.condition, template.action, ...template.protocols]
      .join(" ")
      .toLowerCase();

    const words = text.split(/\s+/).filter((word) => word.length > 3);
    const score = words.reduce((total, word) => (haystack.includes(word) ? total + 1 : total), 0);

    return { template, score };
  });

  scored.sort((a, b) => b.score - a.score);

  const best = scored[0];
  return best && best.score > 0 ? best.template : TEMPLATES[0]!;
}
