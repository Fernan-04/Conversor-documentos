import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Markdocs — Conversor a Markdown",
  description:
    "Convierte PDF, Word, PowerPoint, Excel, texto y CSV a Markdown. Tus archivos se procesan en el servidor solo durante la conversión y no se guardan en ningún lado.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f7f5" },
    { media: "(prefers-color-scheme: dark)", color: "#16171a" },
  ],
};

// Se ejecuta antes de pintar: aplica el tema guardado para evitar el parpadeo
// (FOUC). Si no hay preferencia guardada, no toca nada y manda el CSS del sistema.
const THEME_INIT = `(function(){try{var t=localStorage.getItem('theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t;}}catch(e){}})();`;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
