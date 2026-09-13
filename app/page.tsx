import { Converter } from "./components/Converter";
import { ThemeToggle } from "./components/ThemeToggle";
import { formatBytes, MAX_FILES, MAX_FILE_SIZE_BYTES } from "./lib/files";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <div className={styles.topBar}>
          <ThemeToggle />
        </div>

        <header className={styles.header}>
          <h1 className={styles.title}>
            Mark<span className={styles.titleAccent}>docs</span>
          </h1>
          <p className={styles.tagline}>
            Convierte <strong>PDF, Word, PowerPoint, Excel, texto y CSV</strong>{" "}
            a Markdown, o <strong>pega texto directamente</strong> desde una
            web, Google Docs o Word. Sin instalar nada.
          </p>
        </header>

        <Converter />

        <section className={styles.privacy} aria-label="Privacidad y límites">
          <h2 className={styles.privacyTitle}>Tu privacidad</h2>
          <p>
            Tus archivos se procesan en el servidor <strong>solo durante la
            conversión</strong> y no se guardan en ningún lado — ni el original
            ni el resultado. Lo único que persiste es lo que tú descargas a tu
            dispositivo. No hay cuentas, ni historial, ni seguimiento; los
            registros del servidor guardan solo metadatos (formato, tamaño,
            duración), <strong>nunca el contenido</strong>.
          </p>

          <h2 className={styles.limitsTitle}>Formatos y límites</h2>
          <ul className={styles.limits}>
            <li>Formatos: PDF, DOCX, PPTX, XLSX, TXT, MD, CSV, TSV y HTML.</li>
            <li>
              Hasta {formatBytes(MAX_FILE_SIZE_BYTES)} por archivo y {MAX_FILES}{" "}
              archivos por conversión.
            </li>
            <li>
              El servidor gratuito puede tardar hasta ~50 s en responder la
              primera vez (se “duerme” cuando no se usa).
            </li>
          </ul>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Procesamiento efímero · Sin almacenamiento · Uso personal</p>
      </footer>
    </div>
  );
}
