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
  ".html",
  ".htm",
] as const;

export const ACCEPT_ATTR = SUPPORTED_EXTENSIONS.join(",");

// Límites reflejados del backend (fuente de verdad: docs/CONTRACT.md). Se validan
// en el cliente para avisar antes de subir; el servidor sigue siendo la autoridad.
export const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB por archivo
export const MAX_FILES = 20; // nº máximo de archivos por conversión
export const MAX_TOTAL_BYTES = 60 * 1024 * 1024; // 60 MB en total
// Límite del cuadro "Pegar texto" (no hay archivo real, así que se limita el
// tamaño del texto pegado en el cliente; el servidor igual valida el tamaño
// del archivo sintético que se genera a partir de él).
export const MAX_PASTE_CHARS = 2_000_000; // ~2 MB de texto

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
  ".html": { label: "HTML", short: "HTML" },
  ".htm": { label: "HTML", short: "HTML" },
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

/** Primeras palabras del texto pegado, saneadas, como nombre de archivo por
 * defecto (p. ej. "Hackatón Internacional de..." -> "Hackaton-Internacional-de"). */
function guessPasteName(text: string): string {
  const firstLine = text.split("\n").find((l) => l.trim().length > 0) ?? "";
  const slug = firstLine
    .trim()
    .slice(0, 50)
    .replace(/[\\/:*?"<>|]/g, "")
    .trim();
  return slug || "texto-pegado";
}

// Etiquetas mínimas que indican que el HTML del portapapeles trae formato real
// (título, lista, tabla, negrita, enlace) y no es solo texto plano envuelto en
// un <meta>/<span> sin estructura (lo que pegan algunos editores simples).
const _RICH_HTML_RE = /<(h[1-6]|ul|ol|table|strong|b|em|i|a)[\s>]/i;

/**
 * Convierte el texto pegado del portapapeles en un `File` sintético para
 * reutilizar el mismo flujo de conversión que subir un archivo (§Ronda 6,
 * "Pegar texto"). Si el HTML trae formato real se manda como `.html` (conserva
 * títulos/listas/tablas/enlaces); si no, como `.txt` (más liviano).
 */
export function pasteToFile(html: string, text: string, name?: string): File {
  const base = (name?.trim() || guessPasteName(text)).replace(/\.(html?|txt)$/i, "");
  if (html && _RICH_HTML_RE.test(html)) {
    return new File([html], `${base}.html`, { type: "text/html" });
  }
  return new File([text], `${base}.txt`, { type: "text/plain" });
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
