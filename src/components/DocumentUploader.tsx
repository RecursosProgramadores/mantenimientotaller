import { useRef, useState } from "react";
import { Upload, FileText, Image as ImageIcon, Trash2, Eye, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DOC_CATEGORIES, type AppDocument, type DocCategory } from "@/context/MantePro";
import { toast } from "sonner";

const ACCEPT = ".pdf,.docx,.jpg,.jpeg,.png,application/pdf,image/png,image/jpeg,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX = 10 * 1024 * 1024;
const uid = () => Math.random().toString(36).slice(2, 10);

export const humanSize = (n: number) =>
  n < 1024 ? `${n} B` : n < 1024 * 1024 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 / 1024).toFixed(2)} MB`;

export function isImage(d: AppDocument) { return d.mime.startsWith("image/"); }

export function DocumentUploader({
  documents,
  onAdd,
  onRemove,
}: {
  documents: AppDocument[];
  onAdd: (docs: AppDocument[]) => void;
  onRemove?: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [category, setCategory] = useState<DocCategory>("Diagnóstico previo");
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<AppDocument | null>(null);

  const handle = async (files: FileList | File[]) => {
    const arr = Array.from(files);
    const out: AppDocument[] = [];
    for (const f of arr) {
      if (f.size > MAX) { toast.error(`${f.name} excede 10MB`); continue; }
      const dataUrl = await new Promise<string>((res, rej) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.onerror = rej;
        r.readAsDataURL(f);
      });
      out.push({
        id: uid(), name: f.name, size: f.size, mime: f.type || "application/octet-stream",
        dataUrl, category, description: description || undefined,
        uploadedAt: new Date().toISOString(),
      });
    }
    if (out.length) { onAdd(out); toast.success(`${out.length} archivo(s) subido(s)`); setDescription(""); }
  };

  return (
    <div className="space-y-3">
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <Label>Categoría del documento</Label>
          <Select value={category} onValueChange={(v) => setCategory(v as DocCategory)}>
            <SelectTrigger className="bg-card border-border"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-popover border-border">
              {DOC_CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Descripción</Label>
          <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Detalle del archivo…" />
        </div>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); handle(e.dataTransfer.files); }}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"}`}
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
        <div className="mt-2 text-sm font-medium">Arrastra archivos aquí o haz clic para seleccionar</div>
        <div className="text-xs text-muted-foreground mt-1">PDF, DOCX, JPG, PNG · máx 10MB</div>
        <input
          ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden"
          onChange={(e) => e.target.files && handle(e.target.files)}
        />
      </div>

      {documents.length > 0 && (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((d) => (
            <div key={d.id} className="rounded-md border border-border bg-card overflow-hidden">
              <div className="h-28 bg-muted/30 flex items-center justify-center overflow-hidden">
                {isImage(d)
                  ? <img src={d.dataUrl} alt={d.name} className="h-full w-full object-cover" />
                  : <FileText className="h-10 w-10 text-muted-foreground" />}
              </div>
              <div className="p-2 space-y-1">
                <div className="flex items-center gap-1.5 text-xs font-medium truncate">
                  {isImage(d) ? <ImageIcon className="h-3 w-3 shrink-0" /> : <FileText className="h-3 w-3 shrink-0" />}
                  <span className="truncate" title={d.name}>{d.name}</span>
                </div>
                <div className="text-[10px] text-muted-foreground">{d.category} · {humanSize(d.size)}</div>
                <div className="flex gap-1 pt-1">
                  <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => isImage(d) ? setPreview(d) : window.open(d.dataUrl, "_blank")}>
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                  <a href={d.dataUrl} download={d.name}>
                    <Button size="sm" variant="ghost" className="h-7 px-2"><Download className="h-3.5 w-3.5" /></Button>
                  </a>
                  {onRemove && (
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-critical ml-auto" onClick={() => onRemove(d.id)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <img src={preview.dataUrl} alt={preview.name} className="max-h-full max-w-full rounded-md" />
        </div>
      )}
    </div>
  );
}
