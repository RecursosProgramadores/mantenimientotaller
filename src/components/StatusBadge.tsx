import { cn } from "@/lib/utils";
import type { MachineStatus } from "@/context/MantePro";

const styles: Record<MachineStatus, string> = {
  "Operativo": "bg-success/15 text-success border-success/30",
  "En Revisión": "bg-warning/15 text-warning border-warning/30",
  "En Taller": "bg-info/15 text-info border-info/30",
  "Fuera de Servicio": "bg-critical/15 text-critical border-critical/30",
};

export function StatusBadge({ status, className }: { status: MachineStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        styles[status],
        className,
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
