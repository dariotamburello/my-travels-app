"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trip } from "../lib/types";

interface TripSelectorProps {
  isOpen: boolean;
  trips: Trip[];
  currentTrip: Trip | null;
  onSelectTrip: (trip: Trip) => void;
  onClose: () => void;
}

export default function TripSelector({
  isOpen,
  trips,
  currentTrip,
  onSelectTrip,
  onClose,
}: TripSelectorProps) {
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
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-9999 w-full max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-white rounded-2xl shadow-2xl overflow-hidden border border-zinc-200">
              {/* Header */}
              <div className="bg-linear-to-r from-indigo-600 to-purple-600 px-6 py-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Mis Viajes</h2>
                    <p className="text-indigo-100 text-sm">
                      Selecciona un viaje para explorar
                    </p>
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

              {/* Lista de viajes */}
              <div className="p-6 space-y-3 max-h-[60vh] overflow-y-auto">
                {trips.map((trip) => {
                  const isActive = currentTrip?.id === trip.id;
                  const startDate = new Date(trip.startDate);
                  const endDate = new Date(trip.endDate);
                  const totalDays = Math.ceil(
                    (endDate.getTime() - startDate.getTime()) /
                      (1000 * 60 * 60 * 24),
                  );

                  return (
                    <motion.button
                      key={trip.id}
                      onClick={() => {
                        onSelectTrip(trip);
                        onClose();
                      }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 ${
                        isActive
                          ? "bg-linear-to-br from-indigo-50 to-purple-50 border-indigo-400 shadow-md"
                          : "bg-white border-zinc-200 hover:border-indigo-300 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className={`font-bold text-lg ${
                                isActive ? "text-indigo-900" : "text-zinc-900"
                              }`}
                            >
                              {trip.name}
                            </h3>
                            {isActive && (
                              <span className="bg-indigo-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                Actual
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-sm mb-3 ${
                              isActive ? "text-indigo-700" : "text-zinc-600"
                            }`}
                          >
                            {trip.description}
                          </p>
                        </div>
                      </div>

                      {/* Información del viaje */}
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div
                          className={`p-2 rounded-lg ${
                            isActive ? "bg-white/50" : "bg-zinc-50"
                          }`}
                        >
                          <div className="font-semibold text-zinc-900">
                            {totalDays}
                          </div>
                          <div
                            className={
                              isActive ? "text-indigo-700" : "text-zinc-600"
                            }
                          >
                            días
                          </div>
                        </div>
                        <div
                          className={`p-2 rounded-lg ${
                            isActive ? "bg-white/50" : "bg-zinc-50"
                          }`}
                        >
                          <div className="font-semibold text-zinc-900">
                            {trip.itinerary.length}
                          </div>
                          <div
                            className={
                              isActive ? "text-indigo-700" : "text-zinc-600"
                            }
                          >
                            ciudades
                          </div>
                        </div>
                        <div
                          className={`p-2 rounded-lg ${
                            isActive ? "bg-white/50" : "bg-zinc-50"
                          }`}
                        >
                          <div className="font-semibold text-zinc-900">
                            {trip.origin}
                          </div>
                          <div
                            className={
                              isActive ? "text-indigo-700" : "text-zinc-600"
                            }
                          >
                            origen
                          </div>
                        </div>
                      </div>

                      {/* Fechas */}
                      <div
                        className={`mt-3 pt-3 border-t text-xs ${
                          isActive
                            ? "border-indigo-200 text-indigo-700"
                            : "border-zinc-200 text-zinc-600"
                        }`}
                      >
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
                    </motion.button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="bg-zinc-50 px-6 py-4 border-t border-zinc-200">
                <button
                  onClick={onClose}
                  className="w-full bg-zinc-200 text-zinc-700 py-2.5 rounded-lg font-medium hover:bg-zinc-300 transition-all duration-200"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
