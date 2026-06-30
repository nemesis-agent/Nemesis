import { DeployChat } from "@/components/DeployChat";
import { getTemplateById } from "@nemesis/templates";

interface DeployPageProps {
  searchParams: { template?: string };
}

export default function DeployPage({ searchParams }: DeployPageProps) {
  const template = searchParams.template ? getTemplateById(searchParams.template) : undefined;

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-mono text-2xl font-bold uppercase tracking-widest2 text-nm-fg">deploy</h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-nm-muted">
        {template
          ? `Starting from the "${template.name}" template. If it is production-ready, you can deploy it after reviewing the plan.`
          : "Describe what you want in plain language. The NEMESIS planner will only propose production-ready templates."}
      </p>

      <div className="mt-8">
        <DeployChat initialTemplateId={template?.id} />
      </div>
    </div>
  );
}
