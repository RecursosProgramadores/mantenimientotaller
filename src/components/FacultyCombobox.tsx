import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Check, ChevronsUpDown, GraduationCap } from "lucide-react";
import { UNHEVAL_FACULTADES } from "@/lib/facultades";

// Buscador de facultad — compartido entre el registro interno (panel admin) y
// el autoregistro público de alumnos.
//
// `variant`:
//  - "compact" (default): combobox con filtro de texto (Popover + cmdk), para
//    la fila densa del formulario admin (h-8, text-xs).
//  - "field": campo del autoregistro público (/registro-uso). Aquí usamos un
//    <Select> nativo de Radix en vez del combobox — con solo 14 facultades no
//    hace falta buscador, y el Popover+cmdk anidado dentro del modal (que ya
//    es un Dialog) competía por el scroll: el listado no respondía a la
//    rueda del mouse. Radix Select maneja su propio scroll internamente y ya
//    se usa así en el resto de la app (selects dentro de Dialogs), así que
//    hereda ese mismo comportamiento correcto — además de mismo alto/radio
//    que el resto de campos del formulario (Nombres, DNI, etc.) e icono a la
//    izquierda para no verse como un control aparte.
export function FacultyCombobox({
  value,
  onChange,
  variant = "compact",
}: {
  value: string;
  onChange: (v: string) => void;
  variant?: "compact" | "field";
}) {
  const [open, setOpen] = useState(false);

  if (variant === "field") {
    return (
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="relative h-10 rounded-lg border-input pl-8 pr-3 text-sm shadow-none">
          <GraduationCap className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <SelectValue placeholder="Selecciona tu facultad…" />
        </SelectTrigger>
        <SelectContent className="max-h-72">
          {UNHEVAL_FACULTADES.map((f) => (
            <SelectItem key={f} value={f} className="py-2.5 text-sm">
              {f}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex h-8 w-full cursor-pointer items-center justify-between gap-2 rounded-md border border-input bg-background px-2.5 text-xs transition-colors duration-150 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            !value && "text-muted-foreground",
          )}
        >
          <span className="truncate">{value || "Selecciona tu facultad…"}</span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[--radix-popover-trigger-width] p-0">
        <Command>
          <CommandInput placeholder="Buscar facultad…" className="text-xs" />
          <CommandList>
            <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
              No se encontró ninguna facultad.
            </CommandEmpty>
            <CommandGroup>
              {UNHEVAL_FACULTADES.map((f) => (
                <CommandItem
                  key={f}
                  value={f}
                  onSelect={() => { onChange(f); setOpen(false); }}
                  className="cursor-pointer text-xs"
                >
                  <Check className={cn("h-3.5 w-3.5 shrink-0", value === f ? "text-primary opacity-100" : "opacity-0")} />
                  {f}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
