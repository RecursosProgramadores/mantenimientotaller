import { cn } from "@/lib/utils";
import type { Criticality } from "@/context/MantePro";

const tones: Record<Criticality, string> = {
  Alto: "bg-critical/15 text-critical border-critical/30",
  Medio: "bg-warning/15 text-warning border-warning/30",
  Bajo: "bg-success/15 text-success border-success/30",
};

export function CriticalityBadge({ level, className }: { level: Criticality; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium", tones[level], className)}>
      {level}
    </span>
  );
}
