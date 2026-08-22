// Utilidades para archivos: extensiones soportadas, validación y formato.

export const SUPPORTED_EXTENSIONS = [
  ".pdf",
  ".docx",
  ".pptx",
  ".xlsx",
  ".txt",
  ".md",
  ".csv",
  ".tsv",
] as const;

export const ACCEPT_ATTR = SUPPORTED_EXTENSIONS.join(",");

// Límites reflejados del backend (fuente de verdad: docs/CONTRACT.md). Se validan
// en el cliente para avisar antes de subir; el servidor sigue siendo la autoridad.
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB por archivo
export const MAX_FILES = 20; // nº máximo de archivos por conversión
export const MAX_TOTAL_BYTES = 60 * 1024 * 1024; // 60 MB en total

export interface FormatInfo {
  label: string;
  short: string;
}

const FORMATS: Record<string, FormatInfo> = {
  ".pdf": { label: "PDF", short: "PDF" },
  ".docx": { label: "Word", short: "DOCX" },
  ".pptx": { label: "PowerPoint", short: "PPTX" },
  ".xlsx": { label: "Excel", short: "XLSX" },
  ".txt": { label: "Texto", short: "TXT" },
  ".md": { label: "Markdown", short: "MD" },
  ".csv": { label: "CSV", short: "CSV" },
  ".tsv": { label: "TSV", short: "TSV" },
};

export type FileIssue = "too-large" | "unsupported";

/** Valida un archivo en el cliente. Devuelve el motivo o `null` si es válido. */
export function validateFile(file: File): FileIssue | null {
  if (!isSupported(file.name)) return "unsupported";
  if (file.size > MAX_FILE_SIZE_BYTES) return "too-large";
  return null;
}

export function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot === -1 ? "" : filename.slice(dot).toLowerCase();
}

export function isSupported(filename: string): boolean {
  return (SUPPORTED_EXTENSIONS as readonly string[]).includes(extensionOf(filename));
}

export function formatInfo(filename: string): FormatInfo {
  return FORMATS[extensionOf(filename)] ?? { label: "Desconocido", short: "?" };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Clave estable para deduplicar archivos seleccionados. */
export function fileKey(file: File): string {
  return `${file.name}:${file.size}:${file.lastModified}`;
}

/** Dispara la descarga de un blob en el navegador. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
