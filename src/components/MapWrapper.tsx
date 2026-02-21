"use client";

import dynamic from "next/dynamic";
import { PhotoPoint } from "../lib/types";

// Carga dinámica del mapa con SSR deshabilitado para evitar errores de hidratación
const MapComponent = dynamic(() => import("./Map"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center bg-black">
      <div className="text-center">
        <div className="animate-pulse text-zinc-400">Cargando mapa...</div>
      </div>
    </div>
  ),
});

interface MapWrapperProps {
  photoPoints: PhotoPoint[];
  showTripRoute?: boolean;
}

/**
 * Wrapper del componente de mapa que maneja la carga dinámica
 * para evitar errores de hidratación con Leaflet
 */
export default function MapWrapper({
  photoPoints,
  showTripRoute = false,
}: MapWrapperProps) {
  return (
    <div className="h-full w-full">
      <MapComponent photoPoints={photoPoints} showTripRoute={showTripRoute} />
    </div>
  );
}
