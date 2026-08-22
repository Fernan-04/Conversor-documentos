// Utilidades para archivos: extensiones soportadas, validación y formato.

export const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".pptx", ".xlsx"] as const;

export const ACCEPT_ATTR = SUPPORTED_EXTENSIONS.join(",");

export interface FormatInfo {
  label: string;
  short: string;
}

const FORMATS: Record<string, FormatInfo> = {
  ".pdf": { label: "PDF", short: "PDF" },
  ".docx": { label: "Word", short: "DOCX" },
  ".pptx": { label: "PowerPoint", short: "PPTX" },
  ".xlsx": { label: "Excel", short: "XLSX" },
};

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
