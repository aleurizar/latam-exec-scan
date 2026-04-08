import { useState, useCallback } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, FileSpreadsheet, ArrowRight, ArrowLeft, Check, AlertCircle, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

type ImportType = "companies" | "executives";
type DuplicateMode = "skip" | "overwrite";
type Step = "upload" | "mapping" | "config" | "importing" | "done";

const COMPANY_FIELDS = [
  { key: "name", label: "Nombre", required: true },
  { key: "country", label: "País", required: true },
  { key: "industry", label: "Industria", required: true },
  { key: "size", label: "Tamaño", required: false },
  { key: "revenue_usd", label: "Ingresos (USD)", required: false },
  { key: "website", label: "Sitio web", required: false },
  { key: "description", label: "Descripción", required: false },
];

const EXECUTIVE_FIELDS = [
  { key: "full_name", label: "Nombre completo", required: true },
  { key: "position", label: "Cargo", required: true },
  { key: "country", label: "País", required: true },
  { key: "company_name", label: "Empresa (nombre)", required: true },
  { key: "email", label: "Email", required: false },
  { key: "seniority", label: "Seniority", required: false },
  { key: "linkedin_url", label: "LinkedIn", required: false },
];

interface ImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImportDialog = ({ open, onOpenChange }: ImportDialogProps) => {
  const [step, setStep] = useState<Step>("upload");
  const [importType, setImportType] = useState<ImportType>("companies");
  const [fileHeaders, setFileHeaders] = useState<string[]>([]);
  const [fileData, setFileData] = useState<Record<string, string>[]>([]);
  const [fileName, setFileName] = useState("");
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [duplicateMode, setDuplicateMode] = useState<DuplicateMode>("skip");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ inserted: number; skipped: number; updated: number; errors: string[] } | null>(null);

  const targetFields = importType === "companies" ? COMPANY_FIELDS : EXECUTIVE_FIELDS;
  const requiredFields = targetFields.filter(f => f.required);

  const reset = () => {
    setStep("upload");
    setFileHeaders([]);
    setFileData([]);
    setFileName("");
    setMapping({});
    setDuplicateMode("skip");
    setImporting(false);
    setResult(null);
  };

  const handleClose = (val: boolean) => {
    if (!val) reset();
    onOpenChange(val);
  };

  const handleFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

        if (json.length === 0) {
          toast.error("El archivo está vacío");
          return;
        }

        const headers = Object.keys(json[0]);
        setFileHeaders(headers);
        setFileData(json);
        setFileName(file.name);

        // Auto-map by similarity
        const autoMap: Record<string, string> = {};
        for (const field of targetFields) {
          const match = headers.find(h =>
            h.toLowerCase().replace(/[_\s-]/g, "") === field.key.toLowerCase().replace(/[_\s-]/g, "") ||
            h.toLowerCase().includes(field.key.toLowerCase()) ||
            h.toLowerCase().includes(field.label.toLowerCase())
          );
          if (match) autoMap[field.key] = match;
        }
        setMapping(autoMap);
        setStep("mapping");
      } catch {
        toast.error("Error al leer el archivo. Asegúrate de que sea un CSV o Excel válido.");
      }
    };
    reader.readAsArrayBuffer(file);
  }, [targetFields]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const allRequiredMapped = requiredFields.every(f => mapping[f.key]);

  const handleImport = async () => {
    setStep("importing");
    setImporting(true);

    try {
      const mappedRows = fileData.map(row => {
        const mapped: Record<string, string> = {};
        for (const [fieldKey, headerName] of Object.entries(mapping)) {
          if (headerName) mapped[fieldKey] = String(row[headerName] ?? "").trim();
        }
        return mapped;
      }).filter(row => {
        // Filter out rows missing required fields
        return requiredFields.every(f => row[f.key] && row[f.key].length > 0);
      });

      if (mappedRows.length === 0) {
        toast.error("No hay filas válidas para importar");
        setStep("config");
        setImporting(false);
        return;
      }

      // Split into chunks of 200 rows to avoid timeouts
      const CHUNK_SIZE = 200;
      const totals = { inserted: 0, skipped: 0, updated: 0, errors: [] as string[] };

      for (let i = 0; i < mappedRows.length; i += CHUNK_SIZE) {
        const chunk = mappedRows.slice(i, i + CHUNK_SIZE);
        const { data, error } = await supabase.functions.invoke("import-data", {
          body: {
            type: importType,
            rows: chunk,
            duplicateMode,
          },
        });

        if (error) throw error;

        totals.inserted += data.inserted || 0;
        totals.skipped += data.skipped || 0;
        totals.updated += data.updated || 0;
        if (data.errors?.length) {
          // Adjust error row numbers for chunk offset
          totals.errors.push(...data.errors.map((e: string) => {
            const match = e.match(/^Fila (\d+):(.*)/);
            if (match) return `Fila ${parseInt(match[1]) + i}:${match[2]}`;
            return e;
          }));
        }
      }

      setResult(totals);
      setStep("done");
      toast.success(`Importación completada: ${totals.inserted} insertados`);
    } catch (err: any) {
      toast.error(err.message || "Error al importar");
      setStep("config");
    } finally {
      setImporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar {importType === "companies" ? "Empresas" : "Ejecutivos"}
          </DialogTitle>
        </DialogHeader>

        {/* Step indicators */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          {(["upload", "mapping", "config"] as Step[]).map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              {i > 0 && <ArrowRight className="w-3 h-3" />}
              <Badge variant={step === s || (step === "importing" && s === "config") || (step === "done" && s === "config") ? "default" : "outline"} className="text-xs">
                {i + 1}. {s === "upload" ? "Archivo" : s === "mapping" ? "Mapeo" : "Configurar"}
              </Badge>
            </div>
          ))}
        </div>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Button
                variant={importType === "companies" ? "default" : "outline"}
                size="sm"
                onClick={() => setImportType("companies")}
              >
                Empresas
              </Button>
              <Button
                variant={importType === "executives" ? "default" : "outline"}
                size="sm"
                onClick={() => setImportType("executives")}
              >
                Ejecutivos
              </Button>
            </div>

            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 text-center hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => document.getElementById("import-file-input")?.click()}
            >
              <Upload className="w-10 h-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                Arrastra un archivo CSV o Excel aquí
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                o haz clic para seleccionar
              </p>
              <input
                id="import-file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />
            </div>

            <div className="text-xs text-muted-foreground">
              <p className="font-medium mb-1">Campos requeridos:</p>
              <div className="flex flex-wrap gap-1">
                {requiredFields.map(f => (
                  <Badge key={f.key} variant="secondary" className="text-xs">{f.label}</Badge>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step: Mapping */}
        {step === "mapping" && (
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{fileName}</span> — {fileData.length} filas detectadas
              </p>
            </div>

            <ScrollArea className="flex-1">
              <div className="space-y-3 pr-3">
                {targetFields.map(field => (
                  <div key={field.key} className="flex items-center gap-3">
                    <div className="w-40 shrink-0">
                      <Label className="text-sm flex items-center gap-1">
                        {field.label}
                        {field.required && <span className="text-destructive">*</span>}
                      </Label>
                    </div>
                    <ArrowLeft className="w-4 h-4 text-muted-foreground shrink-0" />
                    <Select
                      value={mapping[field.key] || "__none__"}
                      onValueChange={(val) =>
                        setMapping(prev => ({ ...prev, [field.key]: val === "__none__" ? "" : val }))
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Seleccionar columna..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">— No mapear —</SelectItem>
                        {fileHeaders.map(h => (
                          <SelectItem key={h} value={h}>{h}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Preview */}
            {fileData.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1">Vista previa (primeras 3 filas):</p>
                <Card>
                  <ScrollArea className="max-h-32">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {targetFields.filter(f => mapping[f.key]).map(f => (
                            <TableHead key={f.key} className="text-xs whitespace-nowrap">{f.label}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {fileData.slice(0, 3).map((row, i) => (
                          <TableRow key={i}>
                            {targetFields.filter(f => mapping[f.key]).map(f => (
                              <TableCell key={f.key} className="text-xs truncate max-w-[150px]">
                                {String(row[mapping[f.key]] ?? "")}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </Card>
              </div>
            )}

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("upload")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
              </Button>
              <Button disabled={!allRequiredMapped} onClick={() => setStep("config")}>
                Siguiente <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Config */}
        {step === "config" && (
          <div className="space-y-6">
            <Card>
              <CardContent className="pt-6">
                <Label className="text-sm font-medium mb-3 block">¿Qué hacer con duplicados?</Label>
                <p className="text-xs text-muted-foreground mb-3">
                  {importType === "companies"
                    ? "Un duplicado se identifica por el mismo nombre de empresa."
                    : "Un duplicado se identifica por el mismo email del ejecutivo."}
                </p>
                <RadioGroup value={duplicateMode} onValueChange={(v) => setDuplicateMode(v as DuplicateMode)}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="skip" id="skip" />
                    <Label htmlFor="skip" className="text-sm">Omitir duplicados (no insertar)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="overwrite" id="overwrite" />
                    <Label htmlFor="overwrite" className="text-sm">Sobrescribir duplicados (actualizar datos)</Label>
                  </div>
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="bg-muted/50 rounded-lg p-4 text-sm space-y-1">
              <p><span className="font-medium">Tipo:</span> {importType === "companies" ? "Empresas" : "Ejecutivos"}</p>
              <p><span className="font-medium">Archivo:</span> {fileName}</p>
              <p><span className="font-medium">Filas:</span> {fileData.length}</p>
              <p><span className="font-medium">Campos mapeados:</span> {Object.values(mapping).filter(Boolean).length} / {targetFields.length}</p>
            </div>

            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep("mapping")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Atrás
              </Button>
              <Button onClick={handleImport}>
                Importar {fileData.length} registros <Check className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="flex flex-col items-center justify-center py-12 gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Importando datos...</p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && result && (
          <div className="space-y-4">
            <div className="flex flex-col items-center py-6 gap-2">
              <Check className="w-12 h-12 text-green-500" />
              <p className="text-lg font-semibold">Importación completada</p>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-primary">{result.inserted}</p>
                  <p className="text-xs text-muted-foreground">Insertados</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-muted-foreground">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Omitidos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 text-center">
                  <p className="text-2xl font-bold text-accent-foreground">{result.updated}</p>
                  <p className="text-xs text-muted-foreground">Actualizados</p>
                </CardContent>
              </Card>
            </div>

            {result.errors.length > 0 && (
              <Card className="border-destructive/50">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-4 h-4 text-destructive" />
                    <p className="text-sm font-medium text-destructive">{result.errors.length} errores</p>
                  </div>
                  <ScrollArea className="max-h-24">
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {result.errors.slice(0, 10).map((err, i) => <li key={i}>• {err}</li>)}
                      {result.errors.length > 10 && <li>...y {result.errors.length - 10} más</li>}
                    </ul>
                  </ScrollArea>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-end">
              <Button onClick={() => handleClose(false)}>Cerrar</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};
