import { FragmentDivider } from "@/components/FragmentDivider";

function TemplateCardSkeleton() {
  return (
    <div className="border border-nm-border p-5 animate-pulse">
      <div className="flex items-start justify-between gap-3">
        <div className="h-4 w-36 bg-nm-surface" />
        <div className="h-5 w-12 bg-nm-surface" />
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full bg-nm-surface" />
        <div className="h-3 w-4/5 bg-nm-surface" />
      </div>
      <div className="mt-5 flex gap-2">
        <div className="h-5 w-16 bg-nm-surface" />
        <div className="h-5 w-20 bg-nm-surface" />
      </div>
    </div>
  );
}

export default function TemplatesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="h-8 w-40 bg-nm-surface animate-pulse" />
      <div className="mt-3 h-4 w-96 bg-nm-surface animate-pulse" />
      {[0, 1, 2].map((section) => (
        <div key={section} className="mt-12">
          <div className="h-3 w-32 bg-nm-surface animate-pulse" />
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => <TemplateCardSkeleton key={i} />)}
          </div>
          <div className="mt-12">
            <FragmentDivider segments={24} loading />
          </div>
        </div>
      ))}
    </div>
  );
}
