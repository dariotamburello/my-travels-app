import { readdir, readFile, writeFile } from "fs/promises";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// Obtener __dirname en ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Script para generar el archivo map-data.json a partir de fotos en /public/photos
 * Extrae metadatos EXIF con manejo robusto de errores
 */

/**
 * Realiza reverse geocoding usando la API de Nominatim
 * @param {number} lat - Latitud
 * @param {number} lon - Longitud
 * @returns {Promise<object>} - Información de ubicación
 */
async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=geocodejson&lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "GeoGallery/1.0 (photo mapping app)",
        "Accept-Language": "es",
      },
    });

    if (!response.ok) {
      console.warn(`⚠️  Geocoding falló con status ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.features || data.features.length === 0) {
      return null;
    }

    const geocoding = data.features[0]?.properties?.geocoding;

    if (!geocoding) {
      return null;
    }

    return {
      country: geocoding.country || null,
      city: geocoding.city || null,
      name: geocoding.name || null,
      county: geocoding.county || null,
      label: geocoding.label || null,
    };
  } catch (error) {
    console.warn(`⚠️  Error en geocoding: ${error.message}`);
    return null;
  }
}

/**
 * Añade delay para respetar límites de API
 * @param {number} ms - Milisegundos de espera
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function extractExifMetadata(imagePath) {
  try {
    const exifr = (await import("exifr")).default;

    const data = await exifr.parse(imagePath, {
      gps: true,
      exif: true,
      // CRÍTICO: Añadir los tags de referencia
      pick: [
        "GPSLatitude",
        "GPSLatitudeRef",
        "GPSLongitude",
        "GPSLongitudeRef",
        "DateTimeOriginal",
        "CreateDate",
        "ModifyDate",
      ],
    });

    if (!data) {
      return { error: "No se pudieron extraer metadatos EXIF" };
    }

    // Capturamos las coordenadas calculadas por exifr
    let lat = data.latitude;
    let lng = data.longitude;

    // CORRECCIÓN MANUAL:
    // Manchester es 2.24 West. Si lng es 2.24 y Ref es 'W', debe ser -2.24
    if (data.GPSLatitudeRef === "S" && lat > 0) lat = -lat;
    if (data.GPSLongitudeRef === "W" && lng > 0) lng = -lng;

    const hasValidGPS =
      typeof lat === "number" &&
      typeof lng === "number" &&
      !isNaN(lat) &&
      !isNaN(lng) &&
      lat >= -90 &&
      lat <= 90 &&
      lng >= -180 &&
      lng <= 180;

    if (!hasValidGPS) return { error: "Coordenadas GPS inválidas o ausentes" };

    const dateTime =
      data.DateTimeOriginal || data.CreateDate || data.ModifyDate;

    return {
      gps: {
        latitude: lat,
        longitude: lng,
      },
      dateTime: dateTime ? dateTime.toISOString() : undefined,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    console.warn(`⚠️  Error al procesar ${imagePath}:`, errorMessage);
    return { error: `Error al leer EXIF: ${errorMessage}` };
  }
}

function isImageFile(filename) {
  const supportedExtensions = [
    ".jpg",
    ".jpeg",
    ".png",
    ".heic",
    ".heif",
    ".webp",
  ];
  const ext = filename.toLowerCase().slice(filename.lastIndexOf("."));
  return supportedExtensions.includes(ext);
}

async function generateMapData() {
  console.log("📸 Generando map-data.json...");

  const photosDir = join(process.cwd(), "public", "photos");
  const outputPath = join(process.cwd(), "public", "map-data.json");

  try {
    // Leer archivos de la carpeta photos
    const files = await readdir(photosDir);
    const imageFiles = files.filter(isImageFile);

    console.log(`📁 Encontradas ${imageFiles.length} imágenes`);

    const photoPoints = [];
    let processedCount = 0;
    let errorCount = 0;

    // Procesar cada imagen
    for (const filename of imageFiles) {
      const imagePath = join(photosDir, filename);
      const result = await extractExifMetadata(imagePath);

      if (result.error) {
        console.log(`❌ ${filename}: ${result.error}`);
        errorCount++;
        continue;
      }

      if (result.gps) {
        // Realizar reverse geocoding
        console.log(`🌍 Obteniendo ubicación para ${filename}...`);
        const location = await reverseGeocode(
          result.gps.latitude,
          result.gps.longitude,
        );

        // Esperar 1 segundo antes de la siguiente petición
        await sleep(1000);

        const photoPoint = {
          id: filename,
          imagePath: `/photos/${filename}`,
          latitude: result.gps.latitude,
          longitude: result.gps.longitude,
          dateTime: result.dateTime,
          timestamp: result.dateTime
            ? new Date(result.dateTime).getTime()
            : undefined,
          title: filename,
          location: location,
        };

        photoPoints.push(photoPoint);
        processedCount++;

        const locationStr =
          location?.city || location?.country || "Ubicación desconocida";
        console.log(
          `✅ ${filename}: [${result.gps.latitude.toFixed(4)}, ${result.gps.longitude.toFixed(4)}] - ${locationStr}`,
        );
      }
    }

    // Ordenar por fecha (más antigua primero)
    photoPoints.sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return a.timestamp - b.timestamp;
    });

    // Escribir archivo JSON
    await writeFile(outputPath, JSON.stringify(photoPoints, null, 2), "utf-8");

    console.log(`\n✨ Proceso completado:`);
    console.log(`   - Procesadas exitosamente: ${processedCount}`);
    console.log(`   - Con errores: ${errorCount}`);
    console.log(`   - Total: ${imageFiles.length}`);
    console.log(`   - Archivo generado: public/map-data.json\n`);
  } catch (error) {
    console.error("💥 Error fatal al generar map-data.json:", error);

    // Crear archivo vacío para no romper el build
    await writeFile(outputPath, JSON.stringify([], null, 2), "utf-8");
    console.log(
      "⚠️  Se creó un map-data.json vacío para evitar romper el build",
    );

    // No lanzar error para que el build continúe
    process.exit(0);
  }
}

generateMapData();
