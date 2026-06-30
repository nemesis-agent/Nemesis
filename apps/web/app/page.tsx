import Link from "next/link";

import { ChatWithNemesis } from "@/components/ChatWithNemesis";
import { FAQSection } from "@/components/FAQSection";
import { GrowthLoop } from "@/components/GrowthLoop";
import { Hero } from "@/components/Hero";
import { HowItWorks } from "@/components/HowItWorks";
import { LiveActivityFeed } from "@/components/LiveActivityFeed";
import { ScrollReveal } from "@/components/ScrollReveal";
import { TemplateCard } from "@/components/TemplateCard";
import { TEMPLATES } from "@nemesis/templates";

const FEATURED_TEMPLATE_IDS = ["ape-agent", "limit-order", "portfolio-rebalancer"];

export default function HomePage() {
  const featured = FEATURED_TEMPLATE_IDS.map((id) => TEMPLATES.find((template) => template.id === id)).filter(
    (template): template is (typeof TEMPLATES)[number] => Boolean(template),
  );

  return (
    <>
      <Hero />
      <HowItWorks />
      <LiveActivityFeed />

      <section className="mx-auto max-w-4xl px-6 py-16">
        <ScrollReveal>
          <div className="flex flex-col items-center text-center">
            <h2 className="font-mono text-xl font-bold uppercase tracking-widest2 text-nm-fg">
              Talk with Nemesis
            </h2>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-nm-muted">
              Have questions about architecture, security, templates, or wallet safety? Talk with NEMESIS directly. No private data is required.
            </p>
          </div>
        </ScrollReveal>
        
        <ScrollReveal delayMs={150}>
          <div className="mt-10 card-premium">
            <ChatWithNemesis />
          </div>
        </ScrollReveal>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="font-mono text-xs uppercase tracking-widest2 text-nm-muted">templates</h2>
          <Link href="/templates" className="font-mono text-xs uppercase tracking-widest2 text-nm-fragment-red">
            view all {TEMPLATES.length} {"->"}
          </Link>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {featured.map((template, index) => (
            <ScrollReveal key={template.id} delayMs={index * 80}>
              <TemplateCard template={template} />
            </ScrollReveal>
          ))}
        </div>
      </section>

      <FAQSection />
      <GrowthLoop />
    </>
  );
}
