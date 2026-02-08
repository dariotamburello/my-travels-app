import MapWrapper from "@/src/components/MapWrapper";
import Header from "@/src/components/Header";
import { PhotoPoint, Trip } from "@/src/lib/types";

/**
 * Carga los datos del mapa de forma estática
 */
async function getMapData(): Promise<PhotoPoint[]> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const dataPath = path.join(process.cwd(), "src", "data", "map-data.json");

    // Verificar si existe el archivo
    try {
      const data = await fs.readFile(dataPath, "utf-8");
      return JSON.parse(data);
    } catch {
      // Si no existe, retornar array vacío
      return [];
    }
  } catch (error) {
    console.error("Error al cargar map-data.json:", error);
    return [];
  }
}

/**
 * Carga los viajes de forma estática
 */
async function getTrips(): Promise<Trip[]> {
  try {
    const fs = await import("fs/promises");
    const path = await import("path");
    const dataPath = path.join(process.cwd(), "src", "data", "trips.json");

    const data = await fs.readFile(dataPath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error al cargar trips.json:", error);
    return [];
  }
}

export default async function Home() {
  const photoPoints = await getMapData();
  const trips = await getTrips();
  const currentTrip = trips[0]; // Obtener el primer viaje

  // Si no hay viaje, mostrar mensaje de error
  if (!currentTrip) {
    return (
      <div className="flex items-center justify-center h-screen bg-zinc-50">
        <div className="text-center max-w-md px-6">
          <div className="text-6xl mb-4">🗺️</div>
          <h2 className="text-xl font-semibold text-zinc-900 mb-2">
            No hay viajes configurados
          </h2>
          <p className="text-zinc-600">
            Agrega viajes al archivo{" "}
            <code className="bg-zinc-100 px-2 py-1 rounded text-sm">
              src/data/trips.json
            </code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      {/* Header Dinámico */}
      <Header trip={currentTrip} trips={trips} photoPoints={photoPoints} />

      {/* Mapa */}
      <main className="flex-1 relative">
        {photoPoints.length > 0 ? (
          <MapWrapper photoPoints={photoPoints} />
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center max-w-md px-6">
              <div className="text-6xl mb-4">📸</div>
              <h2 className="text-xl font-semibold text-zinc-900 mb-2">
                No hay fotos con ubicación
              </h2>
              <p className="text-zinc-600 mb-4">
                Agrega imágenes con metadatos GPS a la carpeta{" "}
                <code className="bg-zinc-100 px-2 py-1 rounded text-sm">
                  public/photos
                </code>
              </p>
              <p className="text-sm text-zinc-500">
                Luego ejecuta{" "}
                <code className="bg-zinc-100 px-2 py-1 rounded">
                  npm run generate:map-data
                </code>
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
