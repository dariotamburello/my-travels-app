# GeoGallery: Crónica Visual Interactiva

**GeoGallery** es una aplicación web progresiva (PWA) diseñada para transformar una carpeta de fotografías estáticas en una experiencia de exploración geográfica y temporal. Utiliza los metadatos **EXIF** de las imágenes para posicionarlas en un mapa minimalista, permitiendo revivir viajes mediante una narrativa de tiempo y espacio.

---

## Estado del Proyecto

- [x] **Hito 1:** Setup de Next.js y script de extracción de metadatos (FS + EXIF)
- [x] **Hito 2:** Integración de Leaflet, configuración de Tiles minimalistas y carga de pines
- [ ] **Hito 3:** UI de Modal y optimización de imágenes
- [ ] **Hito 4:** Slider temporal y lógica de filtrado reactivo
- [ ] **Hito 5:** Implementación de rutas dinámicas (Polylines) por secuencia de tiempo

---

## Características Implementadas

### Hito 1: Extracción de Metadatos
- Script de generación de `map-data.json` con manejo robusto de errores
- Soporte para múltiples formatos de imagen (JPG, PNG, HEIC, WebP)
- Validación exhaustiva de coordenadas GPS
- Manejo de fotos corruptas o sin metadatos sin romper el build
- Sistema de tipos TypeScript fuerte (`PhotoPoint`, `ExifResult`)

### Hito 2: Mapa Interactivo
- Integración de React-Leaflet con carga dinámica (SSR deshabilitado)
- Tiles de CartoDB Positron para estética minimalista
- Marcadores personalizados con miniaturas circulares
- Bordes blancos sutiles y sombras (shadow-md)
- Efectos hover con animaciones suaves
- Popups informativos con imagen, fecha y coordenadas
- Clean Architecture: separación de lógica en `src/lib` y componentes en `src/components`

---

## Instalación

```bash
# Instalar dependencias
npm install

# Si hay conflictos de peer dependencies
npm install --legacy-peer-deps
```

---

## Uso

### 1. Agregar Fotos

Coloca tus fotografías con metadatos GPS en la carpeta `public/photos/`:

```
public/
  photos/
    foto1.jpg
    foto2.jpg
    ...
```

### 2. Generar Datos del Mapa

Ejecuta el script de extracción de metadatos:

```bash
npm run generate:map-data
```

Este comando:
- Escanea todas las imágenes en `public/photos`
- Extrae coordenadas GPS y fechas de captura
- Genera `public/map-data.json` con los datos procesados
- Muestra estadísticas de fotos procesadas vs. con errores

**Salida esperada:**
```
📸 Generando map-data.json...
📁 Encontradas 15 imágenes
✅ IMG_1234.jpg: [40.4168, -3.7038]
✅ IMG_1235.jpg: [41.3874, 2.1686]
❌ IMG_1236.jpg: Coordenadas GPS inválidas o ausentes

✨ Proceso completado:
   - Procesadas exitosamente: 12
   - Con errores: 3
   - Total: 15
   - Archivo generado: public/map-data.json
```

### 3. Ejecutar la Aplicación

```bash
# Modo desarrollo
npm run dev

# Modo producción
npm run build
npm start
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## Arquitectura del Proyecto

```
geogallery/
├── app/
│   ├── page.tsx           # Página principal (carga map-data.json)
│   └── layout.tsx         # Layout raíz con metadata
├── src/
│   ├── lib/
│   │   ├── types.ts                # Interfaces TypeScript (PhotoPoint, ExifResult)
│   │   └── extractMetadata.ts      # Utilidad de extracción EXIF
│   └── components/
│       ├── Map.tsx                 # Componente de mapa con Leaflet
│       └── MapWrapper.tsx          # Wrapper con carga dinámica
├── scripts/
│   └── generate-map-data.mjs       # Script de generación de datos
├── public/
│   ├── photos/                     # Carpeta para imágenes
│   └── map-data.json               # Datos generados
└── package.json
```

---

## Stack Tecnológico

| Tecnología | Rol | Justificación |
| :--- | :--- | :--- |
| **Next.js 16** | Core Framework | Renderizado híbrido (SSR/SSG) y optimización de imágenes |
| **React-Leaflet** | Motor de Mapas | Manipulación declarativa del mapa compatible con React |
| **Exifr** | Metadata Parser | Alta compatibilidad para extraer coordenadas decimales |
| **Tailwind CSS** | Styling | Sistema de diseño utility-first para agilidad y responsividad |
| **TypeScript** | Type Safety | Tipado fuerte para prevenir errores en tiempo de desarrollo |

---

## Reglas de Calidad Implementadas

### 1. Robustez EXIF
- El script maneja errores si una foto no tiene metadatos GPS o está corrupta
- No rompe el build: crea un archivo vacío en caso de error fatal
- Logging detallado de éxitos y fallos

### 2. Performance de Mapa
- Carga dinámica de React-Leaflet con `next/dynamic` y `ssr: false`
- Evita errores de hidratación en SSR
- Componente wrapper para separar lógica de carga

### 3. Estética Minimalista
- Tiles de CartoDB Positron para apariencia limpia
- Marcadores circulares con miniaturas de fotos
- Borde blanco sutil (3px) y sombra media (`shadow-md`)
- Efectos hover suaves con transiciones CSS

### 4. Tipado Fuerte
- Interfaz `PhotoPoint` para consistencia de datos
- Interfaz `ExifResult` para resultados de extracción
- Type safety en todos los componentes y utilidades

### 5. Clean Architecture
- Lógica de extracción en `src/lib/extractMetadata.ts`
- Componentes de UI en `src/components/`
- Separación clara de responsabilidades

---

## Próximos Pasos

### Hito 3: Modal y Optimización de Imágenes
- Modal inmersivo con `next/image`
- Soporte para gestos táctiles (swipe, pinch-to-zoom)
- Transiciones suaves con Framer Motion

### Hito 4: Filtro Temporal
- Slider interactivo para filtrar por fecha
- Animación de aparición/desaparición de marcadores
- Control de reproducción tipo "time-travel"

### Hito 5: Rutas de Viaje
- Algoritmo de proximidad temporal (< 24h)
- Dibujo de Polylines entre fotos consecutivas
- Clustering inteligente de marcadores cercanos

---

## Solución de Problemas

### Error: "No se pudieron extraer metadatos EXIF"
- Verifica que la foto tenga metadatos GPS (la mayoría de smartphones los incluyen)
- Algunas cámaras requieren activar "geolocalización" en la configuración
- Usa herramientas como `exiftool` para inspeccionar metadatos manualmente

### Error: "Cannot find module 'exifr'"
```bash
npm install --legacy-peer-deps
```

### El mapa no carga
- Verifica que `public/map-data.json` exista y contenga datos válidos
- Revisa la consola del navegador para errores de Leaflet
- Asegúrate de que el puerto 3000 no esté ocupado

---

## Licencia

MIT

---

## Autor

Desarrollado como parte del proyecto GeoGallery.
