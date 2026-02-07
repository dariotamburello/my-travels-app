/**
 * Representa un punto fotográfico con sus coordenadas geográficas y metadatos.
 */
export interface PhotoPoint {
  /** Identificador único de la foto */
  id: string;
  /** Ruta relativa a la imagen desde /public */
  imagePath: string;
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
