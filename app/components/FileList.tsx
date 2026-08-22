"use client";

import { fileKey, formatBytes, formatInfo, isSupported } from "../lib/files";
import styles from "./FileList.module.css";

interface FileListProps {
  files: File[];
  onRemove: (key: string) => void;
  disabled?: boolean;
}

export function FileList({ files, onRemove, disabled = false }: FileListProps) {
  if (files.length === 0) return null;

  return (
    <ul className={styles.list} role="list" aria-label="Archivos seleccionados">
      {files.map((file) => {
        const key = fileKey(file);
        const supported = isSupported(file.name);
        const info = formatInfo(file.name);
        return (
          <li key={key} className={styles.item}>
            <span
              className={`${styles.badge} ${!supported ? styles.badgeBad : ""}`}
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
                {!supported && (
                  <span className={styles.badFormat}> · formato no soportado</span>
                )}
              </span>
            </span>
            <button
              type="button"
              className={styles.remove}
              onClick={() => onRemove(key)}
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
