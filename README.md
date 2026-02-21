# 🌍 GeoGallery

GeoGallery convierte tus fotos con GPS en una galería cartográfica interactiva. Subes imágenes, se procesan automáticamente y aparecen en un mapa minimalista con contexto de ubicación y fecha.

---

## ✨ Qué puede hacer hoy

- **Subida desde la web:** botón flotante para cargar múltiples fotos en lote.
- **Soporte HEIC/HEIF, JPG, PNG y WebP:** conversión y compresión automáticas antes de subir.
- **Mapa interactivo con clustering:** pines con miniatura y agrupación automática cuando hay muchas fotos.
- **Vista previa y fullscreen:** popup con metadatos y visualizador ampliado.
- **Eliminación de fotos:** borrar desde el popup con confirmación.
- **Organización por viaje:** selector de viaje y estadísticas visuales (duración, países, ciudades y fotos).

---

## 🧭 Flujo de uso

1. Abre la app y selecciona un viaje.
2. Haz clic en `+` para elegir una o varias fotos.
3. El sistema valida duplicados, lee EXIF (GPS/fecha) y sube solo fotos válidas.
4. El mapa se refresca automáticamente con las nuevas ubicaciones.

Si una imagen no tiene coordenadas GPS, se omite y aparece en el detalle del resultado.

---

## 🏗️ Arquitectura (alto nivel)

- **Frontend:** Next.js + React + Leaflet (`react-leaflet` + `leaflet.markercluster`).
- **API:** `app/api/photos/upload/route.ts` (GET: nombres existentes, POST: subida, DELETE: eliminación).
- **Persistencia:** metadatos en **Cloudflare D1** y archivos de imagen en **Cloudflare R2**.
- **Procesamiento de imagen:** variantes WebP (`thumb`, `preview`, `full`) generadas con `sharp`.
- **Geocoding inverso:** Nominatim para enriquecer país/ciudad/lugar.

---

## ⚙️ Variables de entorno

Configura estas variables antes de ejecutar en local o producción:

```bash
R2_ENDPOINT=https://<accountid>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<tu_access_key>
R2_SECRET_ACCESS_KEY=<tu_secret_key>
R2_BUCKET_NAME=<tu_bucket>
# URL pública base del bucket (dominio custom o r2.dev)
R2_PUBLIC_URL=https://<tu_public_url>

CLOUDFLARE_ACCOUNT_ID=<tu_account_id>
CLOUDFLARE_DATABASE_ID=<tu_database_id>
CLOUDFLARE_D1_TOKEN=<tu_token_d1>
```

---

## 🚀 Desarrollo

```bash
pnpm install
pnpm dev
```

Abre `http://localhost:3000`.

---

## 🗺️ Estado del roadmap

- ✅ Hito 1: Base de proyecto + extracción EXIF
- ✅ Hito 2: Mapa + clustering + pines con miniatura
- ✅ Hito 3: Modal/visualización + optimización de imágenes en pipeline
- 🟡 Hito 4: Filtro temporal avanzado (slider) pendiente
- ⏳ Hito 5: Rutas dinámicas (polylines) pendiente

