"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trip, PhotoPoint } from "../lib/types";

interface TripStatsProps {
  isOpen: boolean;
  trip: Trip | null;
  photoPoints: PhotoPoint[];
  onClose: () => void;
}

export default function TripStats({
  isOpen,
  trip,
  photoPoints,
  onClose,
}: TripStatsProps) {
  if (!trip) return null;

  // Calcular días totales
  const startDate = new Date(trip.startDate);
  const endDate = new Date(trip.endDate);
  const totalDays = Math.ceil(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Calcular países únicos desde photoPoints
  const uniqueCountries = new Set(
    photoPoints
      .map((p) => p.location?.country)
      .filter((country): country is string => !!country),
  );
  const totalCountries = uniqueCountries.size;

  // Total de fotos
  const totalPhotos = photoPoints.length;

  // Calcular ciudades únicas desde photoPoints
  const uniqueCities = new Set(
    photoPoints
      .map((p) => p.location?.city)
      .filter((city): city is string => !!city),
  );
  const totalCitiesWithPhotos = uniqueCities.size;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-9998 cursor-pointer"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-9999 w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200">
              {/* Header del modal */}
              <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-1">
                      Estadísticas del Viaje
                    </h2>
                    <p className="text-indigo-100 text-sm">{trip.name}</p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-white/80 hover:text-white transition-colors p-1"
                  >
                    <svg
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                    >
                      <line x1="18" y1="6" x2="6" y2="18" />
                      <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Contenido */}
              <div className="p-6 space-y-4">
                {/* Stat Card - Días totales */}
                <div className="bg-linear-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-700 font-medium mb-1">
                        Duración Total
                      </p>
                      <p className="text-3xl font-bold text-blue-900">
                        {totalDays}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">días</p>
                    </div>
                    <div className="text-4xl">📅</div>
                  </div>
                  <div className="mt-3 pt-3 border-t border-blue-200 text-xs text-blue-700">
                    {startDate.toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}{" "}
                    →{" "}
                    {endDate.toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </div>
                </div>

                {/* Grid de estadísticas */}
                <div className="grid grid-cols-3 gap-3">
                  {/* Países */}
                  <div className="bg-linear-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="text-2xl mb-2">🌍</div>
                    <p className="text-2xl font-bold text-green-900">
                      {totalCountries}
                    </p>
                    <p className="text-xs text-green-700 mt-1">países</p>
                  </div>

                  {/* Ciudades con fotos */}
                  <div className="bg-linear-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="text-2xl mb-2">🏙️</div>
                    <p className="text-2xl font-bold text-purple-900">
                      {totalCitiesWithPhotos}
                    </p>
                    <p className="text-xs text-purple-700 mt-1">ciudades</p>
                  </div>

                  {/* Fotos */}
                  <div className="bg-linear-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
                    <div className="text-2xl mb-2">📸</div>
                    <p className="text-2xl font-bold text-pink-900">
                      {totalPhotos}
                    </p>
                    <p className="text-xs text-pink-700 mt-1">fotos</p>
                  </div>
                </div>

                {/* Itinerario Preview */}
                <div className="bg-zinc-50 rounded-xl p-4 border border-zinc-200">
                  <p className="text-sm font-semibold text-zinc-700 mb-2">
                    📍 Itinerario Planeado
                  </p>
                  <p className="text-xs text-zinc-600">
                    {trip.itinerary.length} ciudades visitadas
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {trip.itinerary.slice(0, 8).map((city, index) => (
                      <span
                        key={index}
                        className="inline-block bg-white text-zinc-700 text-xs px-2 py-1 rounded-full border border-zinc-200"
                      >
                        {city}
                      </span>
                    ))}
                    {trip.itinerary.length > 8 && (
                      <span className="inline-block bg-zinc-200 text-zinc-600 text-xs px-2 py-1 rounded-full">
                        +{trip.itinerary.length - 8} más
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="bg-zinc-50 px-6 py-4 border-t border-zinc-200">
                <button
                  onClick={onClose}
                  className="w-full bg-linear-to-r from-indigo-600 to-purple-600 text-white py-2.5 rounded-lg font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200 shadow-sm hover:shadow-md"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
