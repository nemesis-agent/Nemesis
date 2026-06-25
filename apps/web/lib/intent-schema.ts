import { z } from "zod";
import { TEMPLATES } from "@nemesis/templates";

// Extract the valid template IDs dynamically so we don't have to manually update this array
const templateIds = TEMPLATES.map(t => t.id) as [string, ...string[]];

export const intentSchema = z.object({
  reasoning: z
    .string()
    .describe(
      "A brief explanation of why this template and parameters were chosen based on the user's prompt and their current wallet balance."
    ),
  templateId: z
    .enum(templateIds)
    .describe(
      "The exact ID of the matching template."
    ),
  parameters: z
    .record(z.union([z.string(), z.number(), z.boolean()]))
    .describe(
      "The exact parameters required by the chosen template, intelligently extracted from the prompt. For example, if target drop is 5%, value should be 5. If limit price is $3000, value should be 3000."
    ),
});
