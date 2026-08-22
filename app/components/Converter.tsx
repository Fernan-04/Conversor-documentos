"use client";

import { useEffect, useRef, useState } from "react";
import {
  ConvertError,
  convertFiles,
  pingHealth,
  type ConvertResult,
} from "../lib/api";
import {
  downloadBlob,
  fileKey,
  formatBytes,
  MAX_FILES,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_BYTES,
  validateFile,
} from "../lib/files";
import { Dropzone } from "./Dropzone";
import { FileList } from "./FileList";
import styles from "./Converter.module.css";

type Status = "idle" | "converting" | "done" | "error";

function errorTitle(error: ConvertError): string {
  if (error.code === "INFRA_UNAUTHORIZED") return "Acceso no autorizado";
  if (error.code === "NETWORK") return "Sin conexión con el servidor";
  if (error.layer === "infrastructure") return "Hay un problema con tu archivo";
  return "Algo falló de nuestro lado";
}

export function Converter() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [error, setError] = useState<ConvertError | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  // null = desconocido; false = dormido (cold start probable); true = despierto.
  const [serverAwake, setServerAwake] = useState<boolean | null>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Warm-up al montar: un GET /health despierta el plan gratis de Render y nos
  // dice si estaba dormido, para avisar del cold start en el momento oportuno.
  useEffect(() => {
    let alive = true;
    pingHealth().then((ok) => {
      if (alive) setServerAwake(ok);
    });
    return () => {
      alive = false;
    };
  }, []);

  const totalBytes = files.reduce((sum, f) => sum + f.size, 0);
  const invalidFiles = files.filter((f) => validateFile(f) !== null);
  const tooMany = files.length > MAX_FILES;
  const tooLargeTotal = totalBytes > MAX_TOTAL_BYTES;
  const canConvert =
    files.length > 0 &&
    invalidFiles.length === 0 &&
    !tooMany &&
    !tooLargeTotal &&
    status !== "converting";

  function addFiles(incoming: File[]) {
    setResult(null);
    setError(null);
    setStatus("idle");
    setFiles((prev) => {
      const seen = new Set(prev.map(fileKey));
      const merged = [...prev];
      for (const f of incoming) {
        if (!seen.has(fileKey(f))) merged.push(f);
      }
      return merged;
    });
  }

  function removeFile(key: string) {
    setFiles((prev) => prev.filter((f) => fileKey(f) !== key));
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  function clearAll() {
    setFiles([]);
    setResult(null);
    setError(null);
    setStatus("idle");
  }

  async function handleConvert() {
    if (!canConvert) return;
    setStatus("converting");
    setError(null);
    setResult(null);
    setSlowHint(false);
    // Si sabemos que el servidor está dormido, avisamos del cold start ya; si no,
    // usamos el temporizador de 3 s como respaldo.
    if (serverAwake === false) {
      setSlowHint(true);
    } else {
      slowTimer.current = setTimeout(() => setSlowHint(true), 3000);
    }
    try {
      const res = await convertFiles(files);
      setResult(res);
      setStatus("done");
      setServerAwake(true);
    } catch (err) {
      setError(
        err instanceof ConvertError
          ? err
          : new ConvertError({
              code: "UNKNOWN",
              message: "Ocurrió un error inesperado.",
              layer: null,
            })
      );
      setStatus("error");
    } finally {
      if (slowTimer.current) clearTimeout(slowTimer.current);
      setSlowHint(false);
    }
  }

  function handleDownload() {
    if (result) downloadBlob(result.blob, result.filename);
  }

  return (
    <section className={styles.card} aria-label="Conversor de documentos">
      <Dropzone onFiles={addFiles} disabled={status === "converting"} />

      <FileList
        files={files}
        onRemove={removeFile}
        disabled={status === "converting"}
      />

      {invalidFiles.length > 0 && (
        <p className={styles.warn} role="alert">
          Hay archivos que no se pueden convertir: revisa que el formato sea
          compatible y que cada archivo no supere{" "}
          {formatBytes(MAX_FILE_SIZE_BYTES)}. Quítalos para continuar.
        </p>
      )}

      {tooMany && (
        <p className={styles.warn} role="alert">
          Puedes convertir hasta {MAX_FILES} archivos a la vez. Quita algunos
          para continuar.
        </p>
      )}

      {tooLargeTotal && !tooMany && (
        <p className={styles.warn} role="alert">
          El tamaño total supera {formatBytes(MAX_TOTAL_BYTES)}. Quita algún
          archivo para continuar.
        </p>
      )}

      {files.length > 0 && (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={handleConvert}
            disabled={!canConvert}
          >
            {status === "converting"
              ? "Convirtiendo…"
              : files.length > 1
                ? `Convertir ${files.length} archivos`
                : "Convertir a Markdown"}
          </button>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={clearAll}
            disabled={status === "converting"}
          >
            Limpiar
          </button>
        </div>
      )}

      {/* Región de estado para lectores de pantalla y para el usuario */}
      <div aria-live="polite" className={styles.status}>
        {status === "converting" && (
          <p className={styles.info}>
            Procesando en el servidor…
            {slowHint && (
              <span className={styles.hint}>
                {" "}
                El servidor gratuito puede tardar hasta ~50 s en despertar la
                primera vez. Gracias por la paciencia.
              </span>
            )}
          </p>
        )}

        {status === "done" && result && (
          <div className={styles.success} aria-live="assertive">
            <p className={styles.successText}>
              ¡Listo! Tu Markdown está preparado.
            </p>
            <button
              type="button"
              className={styles.downloadBtn}
              onClick={handleDownload}
            >
              Descargar {result.filename}
            </button>
          </div>
        )}

        {status === "error" && error && (
          <div className={styles.errorBox} role="alert">
            <p className={styles.errorTitle}>{errorTitle(error)}</p>
            <p className={styles.errorMsg}>{error.message}</p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={handleConvert}
              disabled={!canConvert}
            >
              Reintentar
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
