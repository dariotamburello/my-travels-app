# 🌍 GeoGallery: Crónica Visual Interactiva

**GeoGallery** es una aplicación web progresiva (PWA) diseñada para transformar una carpeta de fotografías estáticas en una experiencia de exploración geográfica y temporal. Utiliza los metadatos **EXIF** de las imágenes para posicionarlas en un mapa minimalista, permitiendo revivir viajes mediante una narrativa de tiempo y espacio.

---

## 🎨 1. Experiencia de Usuario (UX)

* **Minimalismo Cartográfico:** El mapa actúa como un lienzo artístico. Se prioriza la visualización de fronteras, países y ciudades principales, eliminando ruido visual (calles, comercios, tráfico).
* **Interacción Fluida:** Los pines en el mapa son miniaturas circulares de las fotos. Al interactuar, se despliega un modal inmersivo con la imagen en alta resolución.
* **Narrativa Temporal (Time-Travel):** Un control deslizante (slider) permite filtrar las fotos dinámicamente según su fecha de captura, animando la aparición y desaparición de marcadores.

---

## ⚙️ 2. Alcance Funcional

### A. Procesamiento de Datos (Backend / Build-time)
* **Extracción Automática:** Script que escanea la carpeta `/public/photos`.
* **Parsing EXIF:** Uso de `exif-reader` para extraer `GPSLatitude`, `GPSLongitude` y `DateTimeOriginal`.
* **Generación de Manifiesto:** Creación de un archivo `map-data.json` para evitar el procesamiento binario pesado en el lado del cliente.

### B. Visualización Geográfica (Frontend)
* **Motor de Mapa:** `React-Leaflet` con proveedores de tiles minimalistas (CartoDB Positron / Muted).
* **Clustering Inteligente:** Agrupación de pines cercanos para mantener la limpieza visual y el rendimiento.
* **Rutas de Viaje (Travel Paths):** Algoritmo de proximidad temporal para dibujar líneas (`Polylines`) entre fotos tomadas en un mismo trayecto (ej. intervalo < 24h).

### C. Componentes UI
* **Filtro de Tiempo:** Slider interactivo desarrollado con `Framer Motion`.
* **Visualizador Pro:** Modal con optimización de carga vía `next/image` y soporte para gestos táctiles.

---

## 🛠️ 3. Stack Tecnológico

| Tecnología | Rol | Justificación |
| :--- | :--- | :--- |
| **Next.js 15** | Core Framework | Renderizado híbrido (SSR/SSG) y API Routes para FileSystem. |
| **React-Leaflet** | Motor de Mapas | Manipulación declarativa del mapa compatible con React. |
| **Exifr / Exif-reader** | Metadata Parser | Alta compatibilidad para extraer coordenadas decimales. |
| **Tailwind CSS** | Styling | Sistema de diseño utility-first para agilidad y responsividad. |
| **Framer Motion** | Animaciones | Manejo de estados de presencia y transiciones de pines. |

---

## 🏗️ 4. Arquitectura de Datos

1.  **Input:** Carpeta física de imágenes en `/public/photos`.
2.  **Process:** Script de pre-procesamiento que normaliza coordenadas a formato decimal.
3.  **Store:** Objeto JSON estático generado en tiempo de build o via API Route.
4.  **Output:** Marcadores dinámicos renderizados sobre la capa de Leaflet.

---

## 🗺️ 5. Hoja de Ruta (Roadmap)

* [ ] **Hito 1:** Setup de Next.js y script de extracción de metadatos (FS + EXIF).
* [ ] **Hito 2:** Integración de Leaflet, configuración de Tiles minimalistas y carga de pines.
* [ ] **Hito 3:** UI de Modal y optimización de imágenes.
* [ ] **Hito 4:** Slider temporal y lógica de filtrado reactivo.
* [ ] **Hito 5:** Implementación de rutas dinámicas (Polylines) por secuencia de tiempo.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

