"use client";

import { useMemo, useState } from "react";
import Header from "@/src/components/Header";
import MapWrapper from "@/src/components/MapWrapper";
import PhotoUploader from "@/src/components/PhotoUploader";
import { PhotoPoint, Trip } from "@/src/lib/types";

interface HomeClientProps {
  photoPoints: PhotoPoint[];
  trips: Trip[];
}

function getPhotoTimestamp(photo: PhotoPoint): number | null {
  if (typeof photo.timestamp === "number" && Number.isFinite(photo.timestamp)) {
    return photo.timestamp;
  }

  if (photo.dateTime) {
    const parsed = new Date(photo.dateTime).getTime();
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }

  return null;
}

function isPhotoWithinTripRange(photo: PhotoPoint, trip: Trip): boolean {
  const photoTs = getPhotoTimestamp(photo);
  if (photoTs === null) {
    return false;
  }

  const startTs = new Date(trip.startDate).getTime();
  const endTs = new Date(trip.endDate).getTime();

  if (Number.isNaN(startTs) || Number.isNaN(endTs)) {
    return true;
  }

  return photoTs >= startTs && photoTs <= endTs;
}

export default function HomeClient({ photoPoints, trips }: HomeClientProps) {
  const [activeTripId, setActiveTripId] = useState<string | null>(
    trips[0]?.id ?? null,
  );

  const activeTrip = useMemo(
    () => trips.find((trip) => trip.id === activeTripId) ?? null,
    [activeTripId, trips],
  );

  const visiblePhotoPoints = useMemo(() => {
    if (!activeTrip) {
      return photoPoints;
    }

    return photoPoints.filter((photo) =>
      isPhotoWithinTripRange(photo, activeTrip),
    );
  }, [activeTrip, photoPoints]);

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      {activeTrip ? (
        <Header
          trip={activeTrip}
          trips={trips}
          photoPoints={visiblePhotoPoints}
          onSelectTrip={(trip) => setActiveTripId(trip.id)}
        />
      ) : (
        <header className="z-10 border-b border-zinc-200 bg-white px-4 pb-3 pt-[calc(var(--safe-area-top)+0.75rem)] md:px-6 md:pb-4 md:pt-[calc(var(--safe-area-top)+1rem)]">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl md:text-2xl font-semibold text-zinc-900 truncate">
                GeoGallery
              </h1>
              <p className="text-xs md:text-sm text-zinc-600 truncate">
                Mostrando todas tus fotos (sin viaje activo)
              </p>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 relative">
        {visiblePhotoPoints.length > 0 ? (
          <MapWrapper
            photoPoints={visiblePhotoPoints}
            showTripRoute={Boolean(activeTrip)}
          />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-6">
              <div className="text-6xl mb-4">📸</div>
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">
                No hay fotos para este rango
              </h2>
              <p className="text-zinc-600 mb-4">
                Sube imágenes con metadatos GPS o cambia el viaje activo para
                ver más fotos.
              </p>
            </div>
          </div>
        )}
      </main>

      <PhotoUploader activeTripId={activeTrip?.id ?? null} />
    </div>
  );
}
