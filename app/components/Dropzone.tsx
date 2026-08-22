"use client";

import { useRef, useState } from "react";
import { ACCEPT_ATTR, SUPPORTED_EXTENSIONS } from "../lib/files";
import styles from "./Dropzone.module.css";

interface DropzoneProps {
  onFiles: (files: File[]) => void;
  disabled?: boolean;
}

export function Dropzone({ onFiles, disabled = false }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  function openPicker() {
    if (!disabled) inputRef.current?.click();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  }

  return (
    // Botón nativo: Enter/Espacio, foco y semántica los da el navegador. El
    // arrastrar-y-soltar es un extra encima (no es accesible por teclado de por sí).
    <button
      type="button"
      disabled={disabled}
      aria-describedby="dropzone-formats"
      className={`${styles.zone} ${dragActive ? styles.active : ""} ${
        disabled ? styles.disabled : ""
      }`}
      onClick={openPicker}
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragActive(true);
      }}
      onDragLeave={() => setDragActive(false)}
      onDrop={handleDrop}
    >
      <svg
        className={styles.icon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 16V4" />
        <path d="m6 10 6-6 6 6" />
        <path d="M4 16v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
      </svg>
      <span className={styles.primary}>Arrastra tus documentos aquí</span>
      <span className={styles.secondary}>o haz clic para elegirlos</span>
      <span id="dropzone-formats" className={styles.formats}>
        {SUPPORTED_EXTENSIONS.map((e) => e.replace(".", "").toUpperCase()).join(
          " · "
        )}
      </span>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPT_ATTR}
        className="sr-only"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) onFiles(files);
          e.target.value = ""; // permite volver a elegir el mismo archivo
        }}
      />
    </button>
  );
}
