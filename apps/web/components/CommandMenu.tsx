"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import { Search, Terminal, Zap, Compass, Activity, BookOpen } from "lucide-react";
import { TEMPLATES } from "@nemesis/templates";

export function CommandMenu() {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = (command: () => void) => {
    setOpen(false);
    command();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[99999] bg-nm-bg/80 backdrop-blur-sm transition-opacity">
      <div className="fixed left-1/2 top-1/2 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 p-4 sm:p-0">
        <Command
          className="overflow-hidden rounded-md border border-nm-border bg-[#0a0a0a] shadow-[0_16px_64px_rgba(226,82,79,0.1)]"
          loop
        >
          <div className="flex items-center border-b border-nm-border px-4 py-3" cmdk-input-wrapper="">
            <Terminal className="mr-3 h-4 w-4 text-nm-muted" />
            <Command.Input
              autoFocus
              placeholder="Deploy agent, check status, or explore templates..."
              className="w-full bg-transparent font-mono text-sm text-nm-fg placeholder:text-nm-muted focus:outline-none"
            />
            <span className="ml-2 rounded border border-nm-border bg-nm-surface px-1.5 font-mono text-[10px] uppercase text-nm-muted">
              esc
            </span>
          </div>

          <Command.List className="max-h-[340px] overflow-y-auto p-2" style={{ scrollbarWidth: "none" }}>
            <Command.Empty className="py-6 text-center font-mono text-sm text-nm-muted">
              No results found.
            </Command.Empty>

            <Command.Group heading={<div className="mb-2 px-2 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">Actions</div>}>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/agents/new"))}
                className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 font-mono text-sm text-nm-fg transition-colors aria-selected:bg-nm-surface aria-selected:text-white"
              >
                <Zap className="h-4 w-4 text-nm-fragment-red" />
                <span>Deploy New Agent</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/dashboard"))}
                className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 font-mono text-sm text-nm-fg transition-colors aria-selected:bg-nm-surface aria-selected:text-white"
              >
                <Activity className="h-4 w-4 text-nm-resolve" />
                <span>View Dashboard (Active Agents)</span>
              </Command.Item>
              <Command.Item
                onSelect={() => runCommand(() => router.push("/#network"))}
                className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 font-mono text-sm text-nm-fg transition-colors aria-selected:bg-nm-surface aria-selected:text-white"
              >
                <Compass className="h-4 w-4 text-nm-fragment-blue" />
                <span>Live Network Activity</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading={<div className="mb-2 mt-4 px-2 font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">Templates</div>}>
              {TEMPLATES.slice(0, 5).map((template) => (
                <Command.Item
                  key={template.id}
                  onSelect={() => runCommand(() => router.push(`/templates/${template.id}`))}
                  className="flex cursor-pointer items-center gap-3 rounded-sm px-3 py-2.5 font-mono text-sm text-nm-fg transition-colors aria-selected:bg-nm-surface aria-selected:text-white"
                >
                  <BookOpen className="h-4 w-4 text-nm-muted" />
                  <span>{template.name}</span>
                  <span className="ml-auto font-mono text-[10px] uppercase tracking-widest2 text-nm-muted">
                    {template.risk} risk
                  </span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
      
      {/* Click outside to close (handled by wrapping div but let's add an explicit background click handler) */}
      <div className="absolute inset-0 z-[-1]" onClick={() => setOpen(false)} />
    </div>
  );
}
