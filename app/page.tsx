import { Converter } from "./components/Converter";
import styles from "./page.module.css";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>doc2md</h1>
          <p className={styles.tagline}>
            Convierte <strong>PDF, Word, PowerPoint y Excel</strong> a Markdown.
            Sin instalar nada.
          </p>
        </header>

        <Converter />

        <section className={styles.privacy} aria-label="Aviso de privacidad">
          <h2 className={styles.privacyTitle}>Tu privacidad</h2>
          <p>
            Tus archivos se procesan en el servidor <strong>solo durante la
            conversión</strong> y no se guardan en ningún lado — ni el original
            ni el resultado. Lo único que persiste es lo que tú descargas a tu
            dispositivo. No hay cuentas, ni historial, ni seguimiento.
          </p>
        </section>
      </main>

      <footer className={styles.footer}>
        <p>Procesamiento efímero · Sin almacenamiento · Uso personal</p>
      </footer>
    </div>
  );
}
