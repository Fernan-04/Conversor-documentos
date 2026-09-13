"use client";

import { useRef, useState } from "react";
import { MAX_PASTE_CHARS, pasteToFile } from "../lib/files";
import styles from "./PasteBox.module.css";

interface PasteBoxProps {
  /** Se llama con el archivo sintético (.html o .txt) listo para convertir. */
  onConvert: (file: File) => void;
  disabled?: boolean;
}

// Heurística mínima: ¿el HTML del portapapeles trae ETIQUETAS reales, o es
// solo texto envuelto en un <meta>/<span> sin estructura?
const HAS_MARKUP_RE = /<(h[1-6]|ul|ol|table|strong|b|em|i|a)[\s>]/i;

export function PasteBox({ onConvert, disabled = false }: PasteBoxProps) {
  const [text, setText] = useState("");
  const [html, setHtml] = useState("");
  const [hasFormat, setHasFormat] = useState(false);
  const [name, setName] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const overLimit = text.length > MAX_PASTE_CHARS;
  const canConvert = text.trim().length > 0 && !overLimit && !disabled;

  function handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    // No se bloquea el pegado nativo (el texto plano se inserta solo); solo
    // se guarda el HTML del portapapeles aparte, si trae formato real.
    const pastedHtml = e.clipboardData.getData("text/html");
    if (pastedHtml && HAS_MARKUP_RE.test(pastedHtml)) {
      setHtml(pastedHtml);
      setHasFormat(true);
    } else {
      setHtml("");
      setHasFormat(false);
    }
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setText(e.target.value);
    // Si el usuario edita a mano después de pegar, el HTML capturado ya no
    // corresponde 1:1 al texto visible: se descarta para no aplicarle un
    // formato que ya no coincide.
    if (hasFormat) {
      setHasFormat(false);
      setHtml("");
    }
  }

  function handleRemoveFormat() {
    setHtml("");
    setHasFormat(false);
  }

  function handleConvertClick() {
    if (!canConvert) return;
    onConvert(pasteToFile(hasFormat ? html : "", text, name));
  }

  function handleClear() {
    setText("");
    setHtml("");
    setHasFormat(false);
    setName("");
    textareaRef.current?.focus();
  }

  return (
    <div className={styles.box}>
      <label htmlFor="paste-textarea" className={styles.label}>
        Pega tu texto aquí
      </label>
      <textarea
        id="paste-textarea"
        ref={textareaRef}
        className={styles.textarea}
        placeholder="Pega texto copiado de una web, Google Docs, Word o Notion: se conservan títulos, negritas, listas, tablas y enlaces."
        value={text}
        onChange={handleChange}
        onPaste={handlePaste}
        disabled={disabled}
        rows={10}
      />

      <div className={styles.row}>
        {hasFormat ? (
          <span className={styles.formatChip}>
            ✓ Formato detectado (títulos, listas, tablas, enlaces)
            <button
              type="button"
              className={styles.removeFormatBtn}
              onClick={handleRemoveFormat}
            >
              Quitar formato
            </button>
          </span>
        ) : (
          text.trim().length > 0 && (
            <span className={styles.plainHint}>
              Se convertirá como texto plano (sin negritas/enlaces del origen).
            </span>
          )
        )}
        <span className={styles.counter} aria-live="polite">
          {text.length.toLocaleString("es")} caracteres
        </span>
      </div>

      {overLimit && (
        <p className={styles.warn} role="alert">
          El texto supera el límite de {MAX_PASTE_CHARS.toLocaleString("es")}{" "}
          caracteres. Pégalo en partes más pequeñas.
        </p>
      )}

      <div className={styles.nameRow}>
        <label htmlFor="paste-name" className={styles.nameLabel}>
          Nombre del archivo (opcional)
        </label>
        <input
          id="paste-name"
          type="text"
          className={styles.nameInput}
          placeholder="texto-pegado"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={disabled}
        />
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.primaryBtn}
          onClick={handleConvertClick}
          disabled={!canConvert}
        >
          Convertir a Markdown
        </button>
        <button
          type="button"
          className={styles.ghostBtn}
          onClick={handleClear}
          disabled={disabled || (text.length === 0 && name.length === 0)}
        >
          Limpiar
        </button>
      </div>
    </div>
  );
}
