import { FragmentDivider } from "@/components/FragmentDivider";

export default function AgentDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 animate-pulse">
      <div className="h-3 w-20 bg-nm-surface" />
      <div className="mt-4 flex items-start justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-nm-surface" />
          <div className="h-3 w-64 bg-nm-surface" />
        </div>
        <div className="h-6 w-20 bg-nm-surface" />
      </div>
      <div className="mt-6">
        <FragmentDivider loading />
      </div>
      <div className="mt-6 grid grid-cols-3 gap-2 sm:gap-4">
        {[0, 1, 2].map((i) => (
          <div key={i} className="border border-nm-border p-3 sm:p-4 space-y-2">
            <div className="h-8 w-8 bg-nm-surface" />
            <div className="h-3 w-16 bg-nm-surface" />
          </div>
        ))}
      </div>
      <div className="mt-10 space-y-3">
        <div className="h-3 w-24 bg-nm-surface" />
        <div className="border border-nm-border p-5 space-y-3">
          <div className="h-4 w-32 bg-nm-surface" />
          <div className="h-3 w-full bg-nm-surface" />
          <div className="h-3 w-4/5 bg-nm-surface" />
        </div>
      </div>
    </div>
  );
}
