"use client";

import { useEffect, useRef, useState } from "react";
import {
  fileKey,
  formatBytes,
  formatInfo,
  MAX_FILE_SIZE_BYTES,
  validateFile,
} from "../lib/files";
import styles from "./FileList.module.css";

interface FileListProps {
  files: File[];
  onRemove: (key: string) => void;
  disabled?: boolean;
}

export function FileList({ files, onRemove, disabled = false }: FileListProps) {
  const listRef = useRef<HTMLUListElement>(null);
  // Índice cuyo botón "Quitar" debe recibir el foco tras eliminar un archivo,
  // para no perder la posición del teclado / lector de pantalla.
  const [pendingFocus, setPendingFocus] = useState<number | null>(null);

  useEffect(() => {
    if (pendingFocus === null) return;
    const buttons = listRef.current?.querySelectorAll<HTMLButtonElement>(
      "button[data-remove]"
    );
    if (buttons && buttons.length > 0) {
      buttons[Math.min(pendingFocus, buttons.length - 1)]?.focus();
    }
    setPendingFocus(null);
  }, [files, pendingFocus]);

  if (files.length === 0) return null;

  function handleRemove(key: string, index: number) {
    setPendingFocus(index);
    onRemove(key);
  }

  return (
    <ul
      ref={listRef}
      className={styles.list}
      role="list"
      aria-label="Archivos seleccionados"
    >
      {files.map((file, index) => {
        const key = fileKey(file);
        const issue = validateFile(file);
        const info = formatInfo(file.name);
        const issueText =
          issue === "unsupported"
            ? "formato no soportado"
            : issue === "too-large"
              ? `supera ${formatBytes(MAX_FILE_SIZE_BYTES)}`
              : null;
        return (
          <li key={key} className={styles.item}>
            <span
              className={`${styles.badge} ${issue ? styles.badgeBad : ""}`}
              aria-hidden="true"
            >
              {info.short}
            </span>
            <span className={styles.meta}>
              <span className={styles.name} title={file.name}>
                {file.name}
              </span>
              <span className={styles.sub}>
                {info.label} · {formatBytes(file.size)}
                {issueText && (
                  <span className={styles.badFormat}> · {issueText}</span>
                )}
              </span>
            </span>
            <button
              type="button"
              data-remove
              className={styles.remove}
              onClick={() => handleRemove(key, index)}
              disabled={disabled}
              aria-label={`Quitar ${file.name}`}
            >
              <svg
                viewBox="0 0 24 24"
                width="18"
                height="18"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M18 6 6 18" />
                <path d="m6 6 12 12" />
              </svg>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
