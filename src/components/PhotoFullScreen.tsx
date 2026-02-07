"use client";

import { motion, AnimatePresence } from "framer-motion";
import { PhotoPoint } from "../lib/types";

interface PhotoFullScreenProps {
  isOpen: boolean;
  photo: PhotoPoint | null;
  onClose: () => void;
}

/**
 * Componente fullscreen para visualizar fotos a tamaño completo
 * con animación suave de apertura/cierre
 */
export default function PhotoFullScreen({
  isOpen,
  photo,
  onClose,
}: PhotoFullScreenProps) {
  if (!photo) return null;

  const locationInfo = photo.location || {};
  const cityCountry =
    [locationInfo.city, locationInfo.country].filter(Boolean).join(", ") ||
    "Ubicación desconocida";
  const nameCounty = [locationInfo.name, locationInfo.county]
    .filter(Boolean)
    .join(", ");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop oscuro */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: "rgba(0, 0, 0, 0.95)",
              zIndex: 9998,
            }}
          />

          {/* Contenedor de la imagen */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
              padding: "20px",
            }}
          >
            {/* Imagen */}
            <div
              style={{
                maxWidth: "90vw",
                maxHeight: "75vh",
                overflow: "auto",
                borderRadius: "12px",
                backgroundColor: "#1f1f1f",
                marginBottom: "20px",
              }}
            >
              <img
                src={photo.imagePath}
                alt={photo.title || "Photo"}
                style={{
                  width: "100%",
                  height: "auto",
                  display: "block",
                  borderRadius: "12px",
                }}
              />
            </div>

            {/* Información debajo de la imagen */}
            <div
              style={{
                color: "white",
                textAlign: "center",
                maxWidth: "600px",
              }}
            >
              <div
                style={{
                  fontSize: "18px",
                  fontWeight: "600",
                  marginBottom: "8px",
                }}
              >
                {cityCountry}
                {locationInfo.label && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      alert(locationInfo.label);
                    }}
                    style={{
                      marginLeft: "8px",
                      background: "transparent",
                      border: "none",
                      color: "#a0aec0",
                      cursor: "pointer",
                      fontSize: "16px",
                      padding: "0 6px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = "#4f46e5";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = "#a0aec0";
                    }}
                  >
                    ⓘ
                  </button>
                )}
              </div>

              {photo.dateTime && (
                <div
                  style={{
                    fontSize: "14px",
                    color: "#cbd5e1",
                    marginBottom: "8px",
                  }}
                >
                  {new Date(photo.dateTime).toLocaleDateString("es-ES", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </div>
              )}

              {nameCounty && (
                <div
                  style={{
                    fontSize: "13px",
                    color: "#a0aec0",
                    marginBottom: "12px",
                  }}
                >
                  {nameCounty}
                </div>
              )}

              <div
                style={{
                  fontSize: "11px",
                  color: "#718096",
                  fontFamily: "monospace",
                }}
              >
                {photo.latitude.toFixed(6)}, {photo.longitude.toFixed(6)}
              </div>
            </div>

            {/* Botón de cierre */}
            <motion.button
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.15 }}
              onClick={onClose}
              style={{
                position: "absolute",
                top: "20px",
                right: "20px",
                width: "48px",
                height: "48px",
                borderRadius: "50%",
                backgroundColor: "rgba(255, 255, 255, 0.1)",
                border: "2px solid rgba(255, 255, 255, 0.3)",
                color: "white",
                fontSize: "28px",
                fontWeight: "300",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.15)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.5)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  "rgba(255, 255, 255, 0.1)";
                e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.3)";
              }}
            >
              ✕
            </motion.button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
