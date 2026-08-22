// Cliente de la API de conversión (doc2md). La URL viene de una variable de
// entorno pública; si falta, usa la instancia desplegada en Render como fallback.

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "https://api-conversor-gvzr.onrender.com"
).replace(/\/$/, "");

// API key opcional para proteger el endpoint público de Render. Si el backend
// define `API_KEY`, la web debe enviar la misma en la cabecera `X-API-Key`.
// CAVEAT: `NEXT_PUBLIC_*` se incrusta en el bundle y es visible en la pestaña
// Network — frena bots y accesos a la URL "pelada", no es un secreto fuerte.
const API_KEY = process.env.NEXT_PUBLIC_API_KEY ?? "";

export interface ApiErrorBody {
  code: string;
  message: string;
  layer: string | null;
}

export interface ConvertResult {
  blob: Blob;
  filename: string;
}

/** Error de conversión con la info tipificada que devuelve la API (§8.2). */
export class ConvertError extends Error {
  code: string;
  layer: string | null;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.name = "ConvertError";
    this.code = body.code;
    this.layer = body.layer;
  }
}

function outputFilename(files: File[]): string {
  if (files.length > 1) return "markdown.zip";
  const name = files[0]?.name ?? "documento";
  return name.replace(/\.[^.]+$/, "") + ".md";
}

/**
 * Envía los archivos a la API y devuelve el resultado como blob descargable.
 * Un archivo -> .md; varios -> .zip. Lanza `ConvertError` en errores de la API.
 */
export async function convertFiles(files: File[]): Promise<ConvertResult> {
  const form = new FormData();
  for (const file of files) form.append("files", file);

  let res: Response;
  try {
    // No fijamos Content-Type: el navegador pone el boundary de multipart solo.
    res = await fetch(`${API_URL}/convert`, {
      method: "POST",
      body: form,
      headers: API_KEY ? { "X-API-Key": API_KEY } : undefined,
    });
  } catch {
    throw new ConvertError({
      code: "NETWORK",
      message:
        "No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.",
      layer: "network",
    });
  }

  if (!res.ok) {
    let body: ApiErrorBody;
    try {
      body = (await res.json()) as ApiErrorBody;
    } catch {
      body = {
        code: `HTTP_${res.status}`,
        message: `El servidor respondió con un error (${res.status}).`,
        layer: null,
      };
    }
    throw new ConvertError(body);
  }

  // El nombre real viene en Content-Disposition, pero ese header no es legible
  // vía CORS por defecto, así que lo calculamos en el cliente (equivalente).
  const blob = await res.blob();
  return { blob, filename: outputFilename(files) };
}

/** Comprueba si la API está despierta (para avisar del cold start del plan free). */
export async function pingHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/health`, { method: "GET" });
    return res.ok;
  } catch {
    return false;
  }
}
