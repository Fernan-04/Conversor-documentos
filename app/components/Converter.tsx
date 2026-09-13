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
import { PasteBox } from "./PasteBox";
import styles from "./Converter.module.css";

type Status = "idle" | "converting" | "done" | "error";
type Mode = "upload" | "paste";

function errorTitle(error: ConvertError): string {
  if (error.code === "INFRA_RATE_LIMITED") return "Demasiadas peticiones";
  if (error.code === "INFRA_UNAUTHORIZED") return "Acceso no autorizado";
  if (error.code === "NETWORK") return "Sin conexión con el servidor";
  if (error.layer === "infrastructure") return "Hay un problema con tu archivo";
  return "Algo falló de nuestro lado";
}

// Mensajes de carga en etapas (puramente cosméticos: no reflejan progreso real
// del servidor, que no lo expone — solo el paso del tiempo). El objetivo es
// que el usuario sienta que algo sigue pasando en vez de creer que la app se
// congeló. Los tiempos están calibrados contra mediciones reales: la mayoría
// de conversiones terminan en el paso 2; el paso 4 (~20s) coincide con el
// peor caso medido (PDFs con varias imágenes grandes + OCR).
const STAGE_DELAYS_MS = [0, 1200, 3500, 9000, 20000];

function stageMessage(index: number, mode: Mode, fileCount: number): string {
  const many = mode === "upload" && fileCount > 1;
  switch (index) {
    case 0:
      return "Conectando con el servidor…";
    case 1:
      if (mode === "paste") return "Enviando tu texto…";
      return many ? "Enviando tus archivos…" : "Enviando tu archivo…";
    case 2:
      if (mode === "paste") return "Convirtiendo tu texto a Markdown…";
      return many ? "Convirtiendo tus archivos a Markdown…" : "Convirtiendo tu archivo a Markdown…";
    case 3:
      return "Seguimos trabajando en ello, ya casi está…";
    default:
      return "Esto está tardando un poco más de lo normal, pero sigue en marcha…";
  }
}

export function Converter() {
  const [mode, setMode] = useState<Mode>("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<Status>("idle");
  const [result, setResult] = useState<ConvertResult | null>(null);
  // Texto del Markdown cuando es un solo archivo (para copiar / previsualizar);
  // null si el resultado es un .zip de varios archivos.
  const [resultText, setResultText] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [error, setError] = useState<ConvertError | null>(null);
  const [slowHint, setSlowHint] = useState(false);
  const [stageIndex, setStageIndex] = useState(0);
  const [serverAwake, setServerAwake] = useState<boolean | null>(null);
  const slowTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const stageTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const uploadTabRef = useRef<HTMLButtonElement>(null);
  const pasteTabRef = useRef<HTMLButtonElement>(null);

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

  function resetOutput() {
    setResult(null);
    setResultText(null);
    setShowPreview(false);
    setCopied(false);
    setCopyFailed(false);
    setError(null);
    setStatus("idle");
  }

  function addFiles(incoming: File[]) {
    resetOutput();
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
    resetOutput();
  }

  function clearAll() {
    setFiles([]);
    resetOutput();
  }

  function handleModeChange(next: Mode) {
    if (next === mode) return;
    setMode(next);
    resetOutput();
  }

  // Un archivo sintético del cuadro "Pegar texto" (§Ronda 6): se guarda en el
  // mismo estado `files` (así "Reintentar" y el resto del flujo funcionan
  // igual que al subir un archivo) y se convierte de inmediato, pasándolo
  // explícito para no depender de que `setFiles` ya se haya aplicado.
  function handlePasteConvert(file: File) {
    setFiles([file]);
    resetOutput();
    handleConvert([file]);
  }

  async function handleConvert(filesOverride?: File[]) {
    const target = filesOverride ?? files;
    if (!filesOverride && !canConvert) return;
    if (target.length === 0) return;
    setStatus("converting");
    setError(null);
    setResult(null);
    setResultText(null);
    setShowPreview(false);
    setCopied(false);
    setCopyFailed(false);
    setSlowHint(false);
    setStageIndex(0);
    // Etapas de carga (cosméticas, ver `stageMessage`): programadas todas de
    // una vez al iniciar, para que el texto avance solo aunque la petición
    // tarde.
    stageTimers.current.forEach(clearTimeout);
    stageTimers.current = STAGE_DELAYS_MS.slice(1).map((delay, i) =>
      setTimeout(() => setStageIndex(i + 1), delay)
    );
    if (serverAwake === false) {
      setSlowHint(true);
    } else {
      slowTimer.current = setTimeout(() => setSlowHint(true), 3000);
    }
    try {
      const res = await convertFiles(target);
      setResult(res);
      // Un solo archivo => tenemos el Markdown en texto para copiar/previsualizar.
      setResultText(target.length === 1 ? await res.blob.text() : null);
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
      stageTimers.current.forEach(clearTimeout);
      stageTimers.current = [];
      setSlowHint(false);
    }
  }

  function handleDownload() {
    if (result) downloadBlob(result.blob, result.filename);
  }

  async function handleCopy() {
    if (!resultText) return;
    try {
      await navigator.clipboard.writeText(resultText);
      setCopied(true);
      setCopyFailed(false);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // El navegador bloquea el portapapeles (permiso denegado / contexto no
      // seguro): lo avisamos y sugerimos la vista previa como alternativa.
      setCopyFailed(true);
    }
  }

  return (
    <section className={styles.card} aria-label="Conversor de documentos">
      <div className={styles.tabs} role="tablist" aria-label="Forma de entrada">
        <button
          ref={uploadTabRef}
          type="button"
          role="tab"
          id="tab-upload"
          aria-selected={mode === "upload"}
          aria-controls="panel-upload"
          tabIndex={mode === "upload" ? 0 : -1}
          className={`${styles.tab} ${mode === "upload" ? styles.tabActive : ""}`}
          onClick={() => handleModeChange("upload")}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              handleModeChange("paste");
              pasteTabRef.current?.focus();
            }
          }}
        >
          Subir archivos
        </button>
        <button
          ref={pasteTabRef}
          type="button"
          role="tab"
          id="tab-paste"
          aria-selected={mode === "paste"}
          aria-controls="panel-paste"
          tabIndex={mode === "paste" ? 0 : -1}
          className={`${styles.tab} ${mode === "paste" ? styles.tabActive : ""}`}
          onClick={() => handleModeChange("paste")}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              handleModeChange("upload");
              uploadTabRef.current?.focus();
            }
          }}
        >
          Pegar texto
        </button>
      </div>

      {mode === "upload" && (
        <div id="panel-upload" role="tabpanel" aria-labelledby="tab-upload" className={styles.panel}>
          <Dropzone onFiles={addFiles} disabled={status === "converting"} />

          <FileList
            files={files}
            onRemove={removeFile}
            disabled={status === "converting"}
          />

          {files.length > 0 && (
            <p className={styles.counter}>
              {files.length} archivo{files.length !== 1 ? "s" : ""} ·{" "}
              {formatBytes(totalBytes)} de {formatBytes(MAX_TOTAL_BYTES)}
            </p>
          )}

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
                onClick={() => handleConvert()}
                disabled={!canConvert}
              >
                {status === "converting" ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    Convirtiendo…
                  </>
                ) : files.length > 1 ? (
                  `Convertir ${files.length} archivos`
                ) : (
                  "Convertir a Markdown"
                )}
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
        </div>
      )}

      {mode === "paste" && (
        <div id="panel-paste" role="tabpanel" aria-labelledby="tab-paste" className={styles.panel}>
          <PasteBox onConvert={handlePasteConvert} disabled={status === "converting"} />
        </div>
      )}

      {/* Región de estado para lectores de pantalla y para el usuario */}
      <div aria-live="polite" className={styles.status}>
        {status === "converting" && (
          <>
            <p className={styles.info}>
              {stageMessage(stageIndex, mode, files.length)}
              {slowHint && (
                <span className={styles.hint}>
                  {" "}
                  El servidor gratuito puede tardar hasta ~50 s en despertar la
                  primera vez. Gracias por la paciencia.
                </span>
              )}
            </p>
            <div
              className={styles.progressTrack}
              role="progressbar"
              aria-busy="true"
              aria-label="Convirtiendo"
            >
              <div className={styles.progressBar} />
            </div>
          </>
        )}

        {status === "done" && result && (
          <div className={styles.success} aria-live="assertive">
            <p className={styles.successText}>
              ¡Listo! Tu Markdown está preparado.
            </p>
            <div className={styles.resultActions}>
              <button
                type="button"
                className={styles.downloadBtn}
                onClick={handleDownload}
                title={`Descargar ${result.filename}`}
              >
                Descargar <span className={styles.downloadName}>{result.filename}</span>
              </button>
              {resultText !== null && (
                <>
                  <button
                    type="button"
                    className={`${styles.secondaryBtn} ${copied ? styles.copied : ""}`}
                    onClick={handleCopy}
                    title="Copia el texto al portapapeles para pegarlo en cualquier editor (Word, correo, un chat…)."
                  >
                    {copied ? "✓ ¡Copiado!" : "Copiar texto Markdown"}
                  </button>
                  <button
                    type="button"
                    className={styles.secondaryBtn}
                    onClick={() => setShowPreview((v) => !v)}
                    aria-expanded={showPreview}
                  >
                    {showPreview ? "Ocultar vista previa" : "Ver vista previa"}
                  </button>
                </>
              )}
            </div>
            {copyFailed && (
              <p className={styles.copyHint} role="alert">
                No se pudo copiar automáticamente. Abre la vista previa y
                selecciona el texto para copiarlo a mano.
              </p>
            )}
            {resultText !== null && showPreview && (
              <pre className={styles.preview} aria-label="Vista previa del Markdown">
                {resultText}
              </pre>
            )}
          </div>
        )}

        {status === "error" && error && (
          <div className={styles.errorBox} role="alert">
            <p className={styles.errorTitle}>{errorTitle(error)}</p>
            <p className={styles.errorMsg}>{error.message}</p>
            <button
              type="button"
              className={styles.retryBtn}
              onClick={() => handleConvert()}
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
