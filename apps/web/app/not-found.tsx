import { Button } from "@/components/Button";
import { FragmentDivider } from "@/components/FragmentDivider";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-24 text-center">
      <p className="font-mono text-[10px] uppercase tracking-widest2 text-nm-fragment-red">
        404
      </p>

      <div className="mx-auto mt-4 inline-block">
        <h1 className="glitch-wordmark font-mono text-5xl font-bold tracking-widest2 sm:text-6xl">
          <span className="glitch-layer glitch-layer--red" aria-hidden="true">
            NEMESIS
          </span>
          <span className="glitch-layer glitch-layer--blue" aria-hidden="true">
            NEMESIS
          </span>
          <span className="glitch-base">NEMESIS</span>
        </h1>
      </div>

      <p className="mt-6 font-mono text-sm uppercase tracking-widest2 text-nm-muted">
        chaos in. <span className="text-nm-fg">nothing out.</span>
      </p>

      <p className="mx-auto mt-4 max-w-sm text-sm leading-relaxed text-nm-muted">
        This page doesn&apos;t exist. The agent that was supposed to find it
        couldn&apos;t. Happens.
      </p>

      <div className="mx-auto mt-10 max-w-xs">
        <FragmentDivider segments={16} />
      </div>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button href="/" variant="primary" magnetic>
          Go home
        </Button>
        <Button href="/templates" variant="secondary" magnetic>
          Browse templates
        </Button>
      </div>
    </div>
  );
}
