/**
 * Representa un punto fotográfico con sus coordenadas geográficas y metadatos.
 */
export interface PhotoPoint {
  /** Identificador único de la foto */
  id: string;
  /** Ruta para miniatura del mapa (100x100 WebP) */
  thumbUrl?: string;
  /** Ruta para preview en popup (máx 800px WebP) */
  previewUrl?: string;
  /** Ruta para vista fullscreen (máx 1600px WebP) */
  fullUrl?: string;
  /** Compatibilidad con datos antiguos */
  imagePath?: string;
  /** Latitud en formato decimal */
  latitude: number;
  /** Longitud en formato decimal */
  longitude: number;
  /** Fecha y hora original de captura (ISO 8601) */
  dateTime?: string;
  /** Marca de tiempo en milisegundos para filtrado temporal */
  timestamp?: number;
  /** Título o descripción opcional */
  title?: string;
  /** Información de geocoding inverso */
  location?: {
    /** País */
    country?: string | null;
    /** Ciudad */
    city?: string | null;
    /** Nombre de lugar específico */
    name?: string | null;
    /** Provincia o condado */
    county?: string | null;
    /** Etiqueta completa de ubicación */
    label?: string | null;
  };
}

/**
 * Resultado de la extracción de metadatos EXIF
 */
export interface ExifResult {
  /** Coordenadas GPS si están disponibles */
  gps?: {
    latitude: number;
    longitude: number;
  };
  /** Fecha y hora original */
  dateTime?: string;
  /** Indica si hubo errores en la extracción */
  error?: string;
}

/**
 * Representa un viaje con su itinerario y fechas
 */
export interface Trip {
  /** Identificador único del viaje */
  id: string;
  /** Nombre del viaje */
  name: string;
  /** Descripción del viaje */
  description: string;
  /** Fecha de inicio (ISO 8601) */
  startDate: string;
  /** Fecha de finalización (ISO 8601) */
  endDate: string;
  /** País o ciudad de origen */
  origin: string;
  /** Lista de ciudades visitadas en orden */
  itinerary: string[];
}
