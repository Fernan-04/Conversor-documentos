# doc2md-web

Frontend del conversor **doc2md**: una página única (Next.js + TypeScript) para
subir documentos y descargarlos como Markdown. Consume la API de conversión
(FastAPI, desplegada aparte en Render).

- Arrastra y suelta (o elige) **PDF, Word, PowerPoint y Excel**.
- Un botón convierte; otro descarga el resultado (`.md`, o `.zip` si son varios).
- Mobile-first, accesible (teclado + lectores de pantalla), modo claro/oscuro.
- Cero cuentas, cero seguimiento. Los archivos se procesan en el servidor solo
  durante la conversión y no se guardan.

## Desarrollo local

```bash
npm install
cp .env.example .env.local     # ajusta NEXT_PUBLIC_API_URL si hace falta
npm run dev                    # http://localhost:3000
```

## Variable de entorno

| Variable | Descripción |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL pública de la API de conversión (Render). Sin barra final. |

Si no se define, usa como fallback la instancia desplegada
(`https://api-conversor-gvzr.onrender.com`).

## Despliegue en Vercel

1. Sube este proyecto a su propio repo de GitHub (separado del de la API).
2. En Vercel: **Add New… → Project** → importa el repo. Framework: **Next.js**
   (autodetectado). No cambies el build command.
3. En **Environment Variables** agrega `NEXT_PUBLIC_API_URL` con la URL de tu API
   de Render.
4. **Deploy**. Vercel te da una URL tipo `https://doc2md-web.vercel.app`.

> Recuerda: al abrir la web por primera vez tras un rato de inactividad, la API
> gratuita de Render puede tardar ~50 s en “despertar”. La UI avisa de esto.

## Estructura

```
app/
├── layout.tsx           # metadata, tema, <html lang="es">
├── page.tsx             # header + Converter + aviso de privacidad
├── globals.css          # tokens de diseño (claro/oscuro)
├── components/
│   ├── Dropzone.tsx     # arrastrar y soltar / elegir archivo
│   ├── FileList.tsx     # lista de archivos con tipo y tamaño
│   └── Converter.tsx    # estado, llamada a la API, descarga
└── lib/
    ├── api.ts           # cliente de la API + errores tipificados
    └── files.ts         # formatos soportados, validación, utilidades
```
