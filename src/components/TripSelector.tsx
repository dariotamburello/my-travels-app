"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Trip } from "../lib/types";
import ModalShell from "./ui/ModalShell";
import { SecondaryButton } from "./ui/ModalButtons";

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
            <ModalShell className="max-w-lg overflow-hidden p-0">
              {/* Header */}
              <div className="border-b border-white/10 px-6 py-5 text-white">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold mb-1">Mis Viajes</h2>
                    <p className="text-zinc-400 text-sm">
                      Selecciona un viaje para explorar
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="text-zinc-400 hover:text-white transition-colors p-1"
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
                          ? "bg-white/10 border-[#3b82f6] shadow-md"
                          : "bg-white/5 border-white/10 hover:border-white/25 hover:bg-white/10"
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3
                              className={`font-bold text-lg ${
                                isActive ? "text-white" : "text-zinc-100"
                              }`}
                            >
                              {trip.name}
                            </h3>
                            {isActive && (
                              <span className="bg-[#3b82f6] text-white text-xs px-2 py-0.5 rounded-full font-medium">
                                Actual
                              </span>
                            )}
                          </div>
                          <p
                            className={`text-sm mb-3 ${
                              isActive ? "text-zinc-300" : "text-zinc-400"
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
                            isActive ? "bg-white/10" : "bg-black/20"
                          }`}
                        >
                          <div className="font-semibold text-zinc-100">
                            {totalDays}
                          </div>
                          <div
                            className={
                              isActive ? "text-zinc-300" : "text-zinc-400"
                            }
                          >
                            días
                          </div>
                        </div>
                        <div
                          className={`p-2 rounded-lg ${
                            isActive ? "bg-white/10" : "bg-black/20"
                          }`}
                        >
                          <div className="font-semibold text-zinc-100">
                            {trip.itinerary.length}
                          </div>
                          <div
                            className={
                              isActive ? "text-zinc-300" : "text-zinc-400"
                            }
                          >
                            ciudades
                          </div>
                        </div>
                        <div
                          className={`p-2 rounded-lg ${
                            isActive ? "bg-white/10" : "bg-black/20"
                          }`}
                        >
                          <div className="font-semibold text-zinc-100">
                            {trip.origin}
                          </div>
                          <div
                            className={
                              isActive ? "text-zinc-300" : "text-zinc-400"
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
                            ? "border-white/15 text-zinc-300"
                            : "border-white/10 text-zinc-400"
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
              <div className="px-6 py-4 border-t border-white/10">
                <SecondaryButton
                  onClick={onClose}
                  className="w-full"
                >
                  Cancelar
                </SecondaryButton>
              </div>
            </ModalShell>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
