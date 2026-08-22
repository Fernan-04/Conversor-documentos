"use client";

import { useRef, useState } from "react";
import { ConvertError, convertFiles, type ConvertResult } from "../lib/api";
import { downloadBlob, fileKey, isSupported } from "../lib/files";
import { Dropzone } from "./Dropzone";
import { FileList } from "./FileList";
import styles from "./Converter.module.css";

type Status = "idle" | "converting" | "done" | "error";

export function Converter() {
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ConvertResult | null>(null);
  const [error, setError] = useState<ConvertError | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasUnsupported = files.some((f) => !isSupported(f.name));
  const canConvert =
    files.length > 0 && !hasUnsupported && status !== "converting";

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
    slowTimer.current = setTimeout(() => setSlowHint(true), 3000);
    try {
      const res = await convertFiles(files);
      setResult(res);
      setStatus("done");
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

  const isInfra = error?.layer === "infrastructure" || error?.layer === "network";

  return (
    <section className={styles.card} aria-label="Conversor de documentos">
      <Dropzone onFiles={addFiles} disabled={status === "converting"} />

      <FileList
        files={files}
        onRemove={removeFile}
        disabled={status === "converting"}
      />

      {hasUnsupported && (
        <p className={styles.warn} role="alert">
          Hay archivos con un formato no soportado. Quítalos para poder convertir
          (solo PDF, Word, PowerPoint y Excel).
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
          <div className={styles.success}>
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
            <p className={styles.errorTitle}>
              {isInfra
                ? "Hay un problema con tu archivo"
                : "Algo falló de nuestro lado"}
            </p>
            <p className={styles.errorMsg}>{error.message}</p>
            {!isInfra && (
              <p className={styles.errorSub}>
                Puedes intentarlo de nuevo en unos segundos.
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
