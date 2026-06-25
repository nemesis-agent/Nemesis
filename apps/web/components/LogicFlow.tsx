import { ArrowRight, Cpu, Database, CheckCircle, BrainCircuit } from "lucide-react";

export function LogicFlow() {
  const steps = [
    { id: 1, title: "Intent Parsing", desc: "Hermes 3", icon: BrainCircuit, color: "text-nm-fragment-blue", border: "border-nm-fragment-blue/30" },
    { id: 2, title: "Oracle Check", desc: "Base Pyth", icon: Database, color: "text-nm-muted", border: "border-nm-border" },
    { id: 3, title: "Smart Contract", desc: "Aerodrome", icon: Cpu, color: "text-nm-muted", border: "border-nm-border" },
    { id: 4, title: "Approval Gate", desc: "User Wallet", icon: CheckCircle, color: "text-nm-resolve", border: "border-nm-resolve/30" },
  ];

  return (
    <div className="border border-nm-border bg-[#0a0a0a] p-6">
      <div className="mb-6">
        <h3 className="font-mono text-xs font-bold uppercase tracking-widest2 text-nm-fg">
          Execution Flow DAG
        </h3>
        <p className="mt-1 font-mono text-[10px] text-nm-muted uppercase tracking-widest2">
          Deterministic execution path
        </p>
      </div>
      
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {steps.map((step, i) => (
          <div key={step.id} className="flex flex-col md:flex-row items-center gap-4 w-full">
            <div className={`flex flex-col items-center justify-center p-4 w-full md:w-32 border bg-nm-bg shadow-sm transition-colors ${step.border}`}>
              <step.icon className={`h-6 w-6 mb-3 ${step.color}`} />
              <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-center text-nm-fg">
                {step.title}
              </p>
              <p className="mt-1 font-mono text-[9px] uppercase tracking-widest2 text-nm-muted">
                {step.desc}
              </p>
            </div>
            
            {i < steps.length - 1 && (
              <div className="flex items-center justify-center md:flex-1 w-full my-2 md:my-0">
                <div className="h-4 w-px md:h-px md:w-full bg-nm-border relative">
                  <div className="absolute right-[-4px] top-1/2 -translate-y-1/2 hidden md:block">
                    <ArrowRight className="h-3 w-3 text-nm-muted" />
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
