import { FragmentDivider } from "@/components/FragmentDivider";

export default function TemplateDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 animate-pulse">
      <div className="h-3 w-20 bg-nm-surface" />
      <div className="mt-4 h-8 w-56 bg-nm-surface" />
      <div className="mt-3 h-4 w-full max-w-md bg-nm-surface" />
      <div className="mt-8">
        <FragmentDivider segments={16} loading />
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className="space-y-2">
            <div className="h-3 w-20 bg-nm-surface" />
            <div className="h-4 w-full bg-nm-surface" />
            <div className="h-4 w-4/5 bg-nm-surface" />
          </div>
        ))}
      </div>
      <div className="mt-8">
        <div className="h-3 w-20 bg-nm-surface" />
        <div className="mt-3 divide-y divide-nm-border border border-nm-border">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center justify-between p-4">
              <div className="space-y-1">
                <div className="h-4 w-28 bg-nm-surface" />
                <div className="h-3 w-48 bg-nm-surface" />
              </div>
              <div className="h-3 w-20 bg-nm-surface" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
