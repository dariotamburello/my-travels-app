import { ExifResult } from "./types";

/**
 * Extrae metadatos EXIF de una imagen con manejo robusto de errores.
 *
 * @param imagePath - Ruta absoluta al archivo de imagen
 * @returns Objeto con coordenadas GPS y fecha, o error si falla
 */
export async function extractExifMetadata(
  imagePath: string,
): Promise<ExifResult> {
  try {
    const exifr = (await import("exifr")).default;

    const data = await exifr.parse(imagePath, {
      gps: true,
      exif: true,
      // IMPORTANTE: Añadimos las referencias (Ref)
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

    if (!data) return { error: "No se pudieron extraer metadatos EXIF" };

    // LÓGICA DE CORRECCIÓN:
    // Si exifr no lo hizo automáticamente, forzamos el signo según la referencia.
    let lat = data.latitude;
    let lng = data.longitude;

    if (data.GPSLatitudeRef === "S" && lat > 0) lat = -lat;
    if (data.GPSLongitudeRef === "W" && lng > 0) lng = -lng;

    // Validar coordenadas GPS finales
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
    console.warn(`Error al procesar ${imagePath}:`, errorMessage);
    return { error: `Error al leer EXIF: ${errorMessage}` };
  }
}

/**
 * Convierte coordenadas DMS (grados, minutos, segundos) a formato decimal.
 * Útil si exifr devuelve arrays en lugar de decimales.
 *
 * @param degrees - Grados
 * @param minutes - Minutos
 * @param seconds - Segundos
 * @param direction - Dirección (N, S, E, W)
 * @returns Coordenada en formato decimal
 */
export function dmsToDecimal(
  degrees: number,
  minutes: number,
  seconds: number,
  direction: "N" | "S" | "E" | "W",
): number {
  let decimal = degrees + minutes / 60 + seconds / 3600;

  if (direction === "S" || direction === "W") {
    decimal *= -1;
  }

  return decimal;
}

/**
 * Valida si un archivo es una imagen soportada.
 *
 * @param filename - Nombre del archivo
 * @returns true si es una imagen soportada
 */
export function isImageFile(filename: string): boolean {
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
