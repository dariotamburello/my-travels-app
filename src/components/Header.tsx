"use client";

import { useState } from "react";
import { Trip, PhotoPoint } from "../lib/types";
import TripSelector from "./TripSelector";
import TripStats from "./TripStats";

interface HeaderProps {
  trip: Trip;
  trips: Trip[];
  photoPoints: PhotoPoint[];
  onSelectTrip?: (trip: Trip) => void;
}

export default function Header({
  trip,
  trips,
  photoPoints,
  onSelectTrip,
}: HeaderProps) {
  const [showTripSelector, setShowTripSelector] = useState(false);
  const [showTripStats, setShowTripStats] = useState(false);

  return (
    <>
      <header className="bg-white border-b border-zinc-200 px-4 md:px-6 py-3 md:py-4 z-10">
        <div className="flex items-center justify-between gap-4">
          <div className="flex-1 min-w-0">
            <button
              onClick={() => setShowTripSelector(true)}
              className="group text-left hover:opacity-80 transition-opacity w-full"
            >
              <h1 className="text-xl md:text-2xl font-semibold text-zinc-900 flex items-center gap-1 md:gap-2 truncate">
                {trip.name}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="text-zinc-400 group-hover:text-indigo-600 transition-colors shrink-0"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </h1>
              <p className="text-xs md:text-sm text-zinc-600 truncate">
                {trip.description}
              </p>
            </button>
          </div>

          {/* Botón de estadísticas - compacto en mobile */}
          <button
            onClick={() => setShowTripStats(true)}
            title={`Ver estadísticas (${trip.itinerary.length} ciudades)`}
            className="shrink-0 relative group p-2 md:px-4 md:py-2 rounded-lg font-medium transition-all duration-200 shadow-sm hover:shadow-md"
          >
            {/* Mobile: Solo icono */}
            <div className="flex md:hidden items-center justify-center">
              <span className="text-lg hover:scale-110 transition-transform">
                📊
              </span>
              {/* Tooltip en mobile */}
              <div className="hidden group-hover:block absolute right-0 top-12 bg-zinc-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-50">
                {trip.itinerary.length} ciudades
              </div>
            </div>

            {/* Desktop: Texto + icono */}
            <div className="hidden md:flex items-center gap-2 bg-linear-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700">
              <span>📊</span>
              <span>
                {trip.itinerary.length}{" "}
                {trip.itinerary.length === 1 ? "Ciudad" : "Ciudades"}
              </span>
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                className="group-hover:translate-x-0.5 transition-transform"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </div>
          </button>
        </div>
      </header>

      {/* Modales */}
      <TripSelector
        isOpen={showTripSelector}
        trips={trips}
        currentTrip={trip}
        onSelectTrip={(selectedTrip) => {
          if (onSelectTrip) onSelectTrip(selectedTrip);
        }}
        onClose={() => setShowTripSelector(false)}
      />

      <TripStats
        isOpen={showTripStats}
        trip={trip}
        photoPoints={photoPoints}
        onClose={() => setShowTripStats(false)}
      />
    </>
  );
}
