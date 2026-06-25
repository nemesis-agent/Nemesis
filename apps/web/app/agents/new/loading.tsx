import { FragmentDivider } from "@/components/FragmentDivider";

export default function DeployLoading() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16 animate-pulse">
      <div className="h-8 w-32 bg-nm-surface" />
      <div className="mt-3 h-4 w-80 bg-nm-surface" />
      <div className="mt-8 border border-nm-border">
        <div className="flex flex-col gap-4 p-6">
          <div className="max-w-[85%] space-y-2">
            <div className="h-3 w-24 bg-nm-surface" />
            <div className="h-4 w-full bg-nm-surface" />
            <div className="h-4 w-4/5 bg-nm-surface" />
          </div>
        </div>
        <FragmentDivider segments={24} loading />
        <div className="flex gap-3 p-6">
          <div className="h-12 flex-1 bg-nm-surface" />
          <div className="h-12 w-20 bg-nm-surface" />
        </div>
      </div>
    </div>
  );
}
