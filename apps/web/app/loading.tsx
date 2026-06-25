import { FragmentDivider } from "@/components/FragmentDivider";

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <FragmentDivider segments={24} loading />
      <div className="mt-8 space-y-4">
        <div className="h-6 w-48 bg-nm-surface" />
        <div className="h-4 w-80 bg-nm-surface" />
        <div className="h-4 w-64 bg-nm-surface" />
      </div>
    </div>
  );
}
