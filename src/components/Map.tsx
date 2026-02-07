"use client";

import { useEffect, useRef, useState } from "react";
import L, { DivIcon, LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { PhotoPoint } from "../lib/types";
import PhotoFullScreen from "./PhotoFullScreen";

interface MapProps {
  photoPoints: PhotoPoint[];
  center?: LatLngExpression;
  zoom?: number;
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
}: MapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMapInitialized = useRef(false);
  const hasSetInitialView = useRef(false);
  const [fullScreenPhoto, setFullScreenPhoto] = useState<PhotoPoint | null>(
    null,
  );

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
    }).setView([0, 0], 2); // Vista por defecto

    mapRef.current = map;

    // Agregar tile layer (solo una vez)
    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
      {
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: "abcd",
        maxZoom: 20,
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
      if (
        layer instanceof L.MarkerClusterGroup ||
        (layer.options && (layer as any).options.className === "custom-marker")
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
        const imageUrl = (firstMarker as any).photoImagePath || "";

        return L.divIcon({
          html: `
            <div class="cluster-marker-wrapper">
              <div class="cluster-photo" style="background-image: url('${imageUrl}')"></div>
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
      const icon = new DivIcon({
        html: `
          <div class="photo-marker-wrapper">
            <div class="photo-marker" style="background-image: url('${point.imagePath}')"></div>
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
      (marker as any).photoImagePath = point.imagePath;

      // Crear popup
      const locationInfo = point.location || {};
      const cityCountry =
        [locationInfo.city, locationInfo.country].filter(Boolean).join(", ") ||
        "Ubicación desconocida";
      const nameCounty = [locationInfo.name, locationInfo.county]
        .filter(Boolean)
        .join(", ");

      const popupContent = `
        <div class="photo-popup">
          <img
            src="${point.imagePath}"
            alt="${point.title || "Photo"}"
            class="photo-popup-image"
            data-point-id="${point.id}"
            style="cursor: zoom-in;"
          />
          <div class="photo-popup-info">
            <div class="photo-popup-location">
              <span>${cityCountry}</span>
              ${
                locationInfo.label
                  ? `
                <button class="info-button" onclick="event.stopPropagation();"
                        onmouseenter="this.querySelector('.tooltip').style.display='block'"
                        onmouseleave="this.querySelector('.tooltip').style.display='none'">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="16" x2="12" y2="12"></line>
                    <line x1="12" y1="8" x2="12.01" y2="8"></line>
                  </svg>
                  <div class="tooltip">${locationInfo.label}</div>
                </button>
              `
                  : ""
              }
            </div>
            ${nameCounty ? `<div class="photo-popup-place">${nameCounty}</div>` : ""}
            ${
              point.dateTime
                ? `<div class="photo-popup-date">
                ${new Date(point.dateTime).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>`
                : ""
            }
          </div>
        </div>
      `;

      marker.bindPopup(popupContent);

      // Evento para detectar clic en la imagen y abrir fullscreen
      marker.on("popupopen", () => {
        setTimeout(() => {
          const popupContent = document.querySelector(".leaflet-popup-content");
          if (popupContent) {
            const img =
              popupContent.querySelector<HTMLImageElement>(
                ".photo-popup-image",
              );
            if (img) {
              img.addEventListener("click", () => {
                setFullScreenPhoto(point);
              });
              img.style.cursor = "zoom-in";
            }
          }
        }, 100);
      });
      markers.addLayer(marker);
    });

    // Agregar el grupo de clusters al mapa
    map.addLayer(markers);

    // Ajustar vista SOLO la primera vez que hay puntos
    if (!hasSetInitialView.current && photoPoints.length > 0) {
      hasSetInitialView.current = true;
      map.setView(mapCenter, mapZoom);
    }
  }, [photoPoints, center, zoom]);

  return (
    <>
      <style jsx global>{`
        .custom-marker {
          background: transparent;
          border: none;
        }

        .photo-marker-wrapper {
          width: 50px;
          height: 50px;
          position: relative;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .photo-marker-wrapper:hover {
          transform: scale(1.15);
          z-index: 1000;
        }

        .photo-marker {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          background-size: cover;
          background-position: center;
          border: 3px solid white;
          box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 0.1),
            0 2px 4px -2px rgb(0 0 0 / 0.1);
          transition: box-shadow 0.2s ease;
        }

        .photo-marker-wrapper:hover .photo-marker {
          box-shadow:
            0 10px 15px -3px rgb(0 0 0 / 0.15),
            0 4px 6px -4px rgb(0 0 0 / 0.1);
        }

        .leaflet-popup-content-wrapper {
          border-radius: 12px;
          overflow: hidden;
          padding: 0;
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
          background: white;
        }

        .photo-popup-location {
          font-weight: 600;
          font-size: 15px;
          color: #1f2937;
          margin-bottom: 6px;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .info-button {
          background: transparent;
          border: none;
          padding: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: #6b7280;
          transition: color 0.2s;
          position: relative;
        }

        .info-button:hover {
          color: #4f46e5;
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
          color: #6b7280;
          margin-bottom: 6px;
        }

        .photo-popup-date {
          font-size: 12px;
          color: #9ca3af;
          margin-bottom: 6px;
        }

        .photo-popup-coords {
          font-size: 11px;
          color: #9ca3af;
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
          background-size: cover;
          background-position: center;
          border: 3px solid white;
          box-shadow:
            0 4px 6px -1px rgb(0 0 0 / 0.2),
            0 2px 4px -2px rgb(0 0 0 / 0.1);
          transition: all 0.2s ease;
        }

        .cluster-marker-wrapper:hover .cluster-photo {
          transform: scale(1.15);
          box-shadow:
            0 10px 15px -3px rgb(0 0 0 / 0.25),
            0 4px 6px -4px rgb(0 0 0 / 0.1);
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
      `}</style>

      <PhotoFullScreen
        isOpen={!!fullScreenPhoto}
        photo={fullScreenPhoto}
        onClose={() => setFullScreenPhoto(null)}
      />

      <div ref={containerRef} style={{ height: "100%", width: "100%" }} />
    </>
  );
}
