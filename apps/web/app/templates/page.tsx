import { FragmentDivider } from "@/components/FragmentDivider";
import { ScrollReveal } from "@/components/ScrollReveal";
import { TemplateCard } from "@/components/TemplateCard";
import { TEMPLATE_CATEGORIES, TEMPLATES, type TemplateCategory } from "@nemesis/templates";

const CATEGORY_ORDER: TemplateCategory[] = ["launch-snipe", "simple-actions", "utility"];

export default function TemplatesPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <h1 className="font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">templates</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nm-muted">
        Every template follows the same shape: one condition, one proposed action. Pick one to start
        a deployment, or talk to the Master Agent and let it pick for you.
      </p>

      {CATEGORY_ORDER.map((category) => {
        const templates = TEMPLATES.filter((template) => template.category === category);

        return (
          <section key={category} className="mt-12">
            <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">
              {TEMPLATE_CATEGORIES[category]}
            </h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {templates.map((template, index) => (
                <ScrollReveal key={template.id} delayMs={index * 70}>
                  <TemplateCard template={template} />
                </ScrollReveal>
              ))}
            </div>
            <div className="mt-12">
              <FragmentDivider />
            </div>
          </section>
        );
      })}
    </div>
  );
}
