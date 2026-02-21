"use client";

import { useEffect, useRef, useState } from "react";
import L, { DivIcon, LatLngExpression } from "leaflet";
import { useRouter } from "next/navigation";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { PhotoPoint } from "../lib/types";
import PhotoFullScreen from "./PhotoFullScreen";
import {
  attachPhotoPreviewPopupHandlers,
  buildPhotoPreviewPopupContent,
} from "./PhotoPreviewModal";
import ConfirmModal from "./ConfirmModal";
function getThumbUrl(point: PhotoPoint): string {
  return (
    point.thumbUrl || point.previewUrl || point.fullUrl || point.imagePath || ""
  );
}

interface MapProps {
  photoPoints: PhotoPoint[];
  center?: LatLngExpression;
  zoom?: number;
  showTripRoute?: boolean;
}

/**
 * Componente de mapa minimalista con marcadores personalizados.
 * Usa CartoDB Positron para estética limpia y minimalista.
 * Los marcadores son miniaturas circulares con borde blanco y sombra.
 */
export default function Map({
  photoPoints,
  center = [0, 0],
  zoom = 2,
  showTripRoute = false,
}: MapProps) {
  const router = useRouter();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMapInitialized = useRef(false);
  const hasSetInitialView = useRef(false);
  const [fullScreenPhoto, setFullScreenPhoto] = useState<PhotoPoint | null>(
    null,
  );
  const [photoToDelete, setPhotoToDelete] = useState<PhotoPoint | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    // Solo inicializar si no está ya inicializado
    if (isMapInitialized.current || !containerRef.current) return;

    isMapInitialized.current = true;

    // Crear nuevo mapa con vista por defecto
    const map = L.map(containerRef.current, {
      worldCopyJump: true,
      maxBounds: [
        [-90, -180],
        [90, 180],
      ],
      maxBoundsViscosity: 1.0,
      minZoom: 2,
      maxZoom: 18,
    }).setView([0, 0], 2); // Vista por defecto

    mapRef.current = map;

    // Agregar tile layer (solo una vez)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        minZoom: 2,
        maxZoom: 19,
      },
    ).addTo(map);

    // Cleanup: solo se ejecuta cuando el componente se desmonta
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        isMapInitialized.current = false;
      }
    };
  }, []); // Sin dependencias, solo se ejecuta una vez

  // Segundo useEffect para gestionar los marcadores cuando photoPoints cambia
  useEffect(() => {
    if (!mapRef.current || !isMapInitialized.current) return;

    const map = mapRef.current;

    // Calcular centro automático si hay puntos
    const mapCenter: [number, number] =
      photoPoints.length > 0
        ? [
            photoPoints.reduce((sum, p) => sum + p.latitude, 0) /
              photoPoints.length,
            photoPoints.reduce((sum, p) => sum + p.longitude, 0) /
              photoPoints.length,
          ]
        : (center as [number, number]);

    // Calcular zoom apropiado basado en la dispersión de puntos
    const mapZoom = photoPoints.length > 0 ? 4 : zoom;

    // Limpiar marcadores previos
    map.eachLayer((layer) => {
      const layerWithClass = layer as L.Layer & {
        options?: {
          className?: string;
        };
      };

      if (
        layer instanceof L.MarkerClusterGroup ||
        (layer instanceof L.Polyline &&
          ["trip-route-glow", "trip-route-core"].includes(
            String((layer.options as { className?: string })?.className ?? ""),
          )) ||
        layerWithClass.options?.className === "custom-marker"
      ) {
        map.removeLayer(layer);
      }
    });

    // Crear grupo de clusters con configuración personalizada
    const markers = L.markerClusterGroup({
      maxClusterRadius: 80,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      iconCreateFunction: function (cluster) {
        const count = cluster.getChildCount();
        const childMarkers = cluster.getAllChildMarkers();
        const firstMarker = childMarkers[0];

        // Obtener la imagen del primer marcador
        const imageUrl =
          (firstMarker as L.Marker & { photoImagePath?: string })
            .photoImagePath || "";

        return L.divIcon({
          html: `
            <div class="cluster-marker-wrapper">
              <img class="cluster-photo" src="${imageUrl}" alt="Cluster preview" />
              <div class="cluster-badge">${count}</div>
            </div>
          `,
          className: "custom-cluster-icon",
          iconSize: L.point(50, 50),
          iconAnchor: L.point(25, 25),
          popupAnchor: L.point(0, -25),
        });
      },
    });

    // Agregar marcadores al grupo de clusters
    photoPoints.forEach((point) => {
      const thumbUrl = getThumbUrl(point);
      const favoriteClass = point.isFavorite ? "is-favorite" : "";

      const icon = new DivIcon({
        html: `
          <div class="photo-marker-wrapper">
            <div class="photo-marker ${favoriteClass}">
              <img class="photo-marker-image" src="${thumbUrl}" alt="Foto en mapa" />
            </div>
          </div>
        `,
        className: "custom-marker",
        iconSize: [50, 50],
        iconAnchor: [25, 25],
        popupAnchor: [0, -25],
      });

      const marker = L.marker([point.latitude, point.longitude], {
        icon,
      });

      // Guardar el imagePath en el marker para acceso posterior
      (marker as L.Marker & { photoImagePath?: string }).photoImagePath =
        thumbUrl;

      marker.bindPopup(buildPhotoPreviewPopupContent(point));

      marker.on("popupopen", (event: L.PopupEvent) => {
        const popupElement = event.popup.getElement();
        if (!popupElement) {
          return;
        }

        attachPhotoPreviewPopupHandlers(popupElement, {
          onOpenFullScreen: () => setFullScreenPhoto(point),
          onDeleteClick: () => {
            setPhotoToDelete(point);
            setIsConfirmOpen(true);
          },
        });
      });

      markers.addLayer(marker);
    });

    // Agregar el grupo de clusters al mapa
    map.addLayer(markers);

    if (showTripRoute) {
      const routePoints = [...photoPoints]
        .map((point) => {
          const timestamp =
            typeof point.timestamp === "number" && Number.isFinite(point.timestamp)
              ? point.timestamp
              : point.dateTime
                ? new Date(point.dateTime).getTime()
                : Number.NaN;

          return {
            latitude: point.latitude,
            longitude: point.longitude,
            timestamp,
          };
        })
        .filter((point) => Number.isFinite(point.timestamp))
        .sort((a, b) => a.timestamp - b.timestamp)
        .map((point) => [point.latitude, point.longitude] as [number, number]);

      if (routePoints.length >= 2) {
        const glowLine = L.polyline(routePoints, {
          color: "#3b82f6",
          weight: 6,
          opacity: 0.3,
          className: "trip-route-glow",
        });

        const coreLine = L.polyline(routePoints, {
          color: "#60a5fa",
          weight: 2,
          opacity: 1,
          dashArray: "8, 8",
          lineCap: "round",
          className: "trip-route-core route-line-animated",
        });

        glowLine.addTo(map);
        coreLine.addTo(map);
      }
    }

    // Ajustar vista SOLO la primera vez que hay puntos
    if (!hasSetInitialView.current && photoPoints.length > 0) {
      hasSetInitialView.current = true;
      map.setView(mapCenter, mapZoom);
    }
  }, [photoPoints, center, zoom, showTripRoute]);

  const handleDeletePhoto = async () => {
    if (!photoToDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await fetch("/api/photos/upload", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ id: photoToDelete.id }),
      });

      if (!response.ok) {
        throw new Error("No se pudo eliminar la foto");
      }

      setIsConfirmOpen(false);
      setPhotoToDelete(null);
      setFullScreenPhoto(null);
      router.refresh();
    } catch {
      alert("No se pudo eliminar la foto. Intenta nuevamente.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <style jsx global>{`
        .map-shell {
          position: relative;
          height: 100%;
          width: 100%;
          background: #000;
          overflow: hidden;
        }

        .map-canvas {
          position: absolute;
          inset: 0;
          height: 100%;
          width: 100%;
          background: #000;
        }

        .map-canvas .leaflet-tile-pane {
          filter: grayscale(100%) invert(100%) brightness(85%) contrast(115%);
        }

        .route-line-animated {
          animation: dash-flow 1.5s linear infinite;
        }

        @keyframes dash-flow {
          to {
            stroke-dashoffset: -16;
          }
        }

        .map-vignette {
          position: absolute;
          inset: 0;
          pointer-events: none;
          z-index: 450;
          background: radial-gradient(
            circle at center,
            transparent 55%,
            rgb(0 0 0 / 0.35) 100%
          );
        }

        .custom-marker {
          background: transparent;
          border: none;
        }

        .photo-marker-wrapper {
          width: 50px;
          height: 50px;
          position: relative;
          cursor: pointer;
          overflow: visible;
          transition: transform 0.2s ease;
        }

        .photo-marker-wrapper:hover {
          transform: scale(1.1);
          z-index: 1000;
        }

        .photo-marker {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          border: 3px solid white;
          overflow: hidden;
          background: #18181b;
          box-shadow: 0 8px 15px rgb(0 0 0 / 0.5);
          transition: box-shadow 0.2s ease;
        }

        .photo-marker-image {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: cover;
        }

        .photo-marker.is-favorite {
          border-color: #f59e0b;
          box-shadow:
            0 0 0 2px rgb(251 191 36 / 0.45),
            0 8px 15px rgb(0 0 0 / 0.5);
        }

        .photo-marker-wrapper:hover .photo-marker {
          box-shadow: 0 10px 20px rgb(0 0 0 / 0.55);
        }

        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          overflow: hidden;
          padding: 0;
          background: rgb(24 24 27 / 0.96);
          border: 1px solid rgb(255 255 255 / 0.08);
          backdrop-filter: blur(8px);
        }

        .leaflet-popup-content {
          margin: 0;
          width: 300px !important;
        }

        .photo-popup {
          width: 100%;
        }

        .photo-popup-image {
          width: 100%;
          height: 200px;
          object-fit: cover;
          cursor: zoom-in;
          transition: filter 0.2s ease;
        }

        .photo-popup-image:hover {
          filter: brightness(1.05);
        }

        .photo-popup-info {
          padding: 12px 16px;
          background: rgb(24 24 27 / 0.96);
        }

        .photo-popup-location {
          font-weight: 600;
          font-size: 15px;
          color: #f4f4f5;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .photo-popup-delete {
          margin-left: auto;
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #a1a1aa;
          transition: color 0.2s;
        }

        .photo-popup-delete:hover {
          color: #fb7185;
        }

        .info-button {
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #a1a1aa;
          transition: color 0.2s;
          position: relative;
        }

        .info-button:hover {
          color: #818cf8;
        }

        .tooltip {
          display: none;
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          margin-bottom: 8px;
          padding: 8px 12px;
          background: #1f2937;
          color: white;
          font-size: 11px;
          font-weight: 400;
          border-radius: 6px;
          white-space: nowrap;
          max-width: 250px;
          white-space: normal;
          box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.2);
          z-index: 1000;
          pointer-events: none;
        }

        .tooltip::after {
          content: "";
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 5px solid transparent;
          border-top-color: #1f2937;
        }

        .photo-popup-place {
          font-size: 13px;
          color: #a1a1aa;
          margin-bottom: 6px;
        }

        .photo-popup-date {
          font-size: 12px;
          color: #a1a1aa;
          margin-bottom: 6px;
        }

        .photo-popup-coords {
          font-size: 11px;
          color: #71717a;
          margin-top: 4px;
          font-family: monospace;
        }

        /* Estilos para clusters */
        .custom-cluster-icon {
          background: transparent;
          border: none;
        }

        .cluster-marker-wrapper {
          width: 50px;
          height: 50px;
          position: relative;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .cluster-photo {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          display: block;
          border: 3px solid white;
          overflow: hidden;
          box-shadow: 0 8px 15px rgb(0 0 0 / 0.5);
          transition: all 0.2s ease;
        }

        .cluster-marker-wrapper:hover .cluster-photo {
          transform: scale(1.1);
          box-shadow: 0 10px 20px rgb(0 0 0 / 0.55);
        }

        .cluster-badge {
          position: absolute;
          top: -5px;
          right: -5px;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          font-weight: 700;
          font-size: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid white;
          box-shadow:
            0 2px 4px -1px rgb(0 0 0 / 0.2),
            0 1px 2px -1px rgb(0 0 0 / 0.1);
        }

        /* Sobrescribir estilos predeterminados de markercluster */
        .marker-cluster-small,
        .marker-cluster-medium,
        .marker-cluster-large {
          background-color: transparent !important;
        }

        .marker-cluster-small div,
        .marker-cluster-medium div,
        .marker-cluster-large div {
          background-color: transparent !important;
        }

        .leaflet-control-zoom {
          border: 1px solid rgb(255 255 255 / 0.14) !important;
          border-radius: 14px !important;
          overflow: hidden;
          backdrop-filter: blur(8px);
          background: rgb(17 24 39 / 0.6);
          box-shadow: 0 10px 25px rgb(0 0 0 / 0.35);
        }

        .leaflet-control-zoom a {
          background: rgb(17 24 39 / 0.58) !important;
          color: #f4f4f5 !important;
          border-bottom: 1px solid rgb(255 255 255 / 0.1) !important;
          transition: background 0.2s ease;
        }

        .leaflet-control-zoom a:last-child {
          border-bottom: none !important;
        }

        .leaflet-control-zoom a:hover {
          background: rgb(63 63 70 / 0.72) !important;
        }

        .leaflet-control-attribution {
          background: rgb(0 0 0 / 0.22) !important;
          color: rgb(212 212 216 / 0.5) !important;
          backdrop-filter: blur(6px);
        }

        .leaflet-control-attribution a {
          color: rgb(212 212 216 / 0.66) !important;
        }
      `}</style>

      <PhotoFullScreen
        isOpen={!!fullScreenPhoto}
        photo={fullScreenPhoto}
        onClose={() => setFullScreenPhoto(null)}
      />

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="¿Eliminar foto?"
        message="Esta acción eliminará la imagen de la galería y del mapa."
        confirmLabel="Sí, eliminar"
        cancelLabel="Cancelar"
        isLoading={isDeleting}
        onConfirm={handleDeletePhoto}
        onCancel={() => {
          if (isDeleting) {
            return;
          }
          setIsConfirmOpen(false);
          setPhotoToDelete(null);
        }}
      />

      <div className="map-shell">
        <div ref={containerRef} className="map-canvas" />
        <div className="map-vignette" />
      </div>
    </>
  );
}
