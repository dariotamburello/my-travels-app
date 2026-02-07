import MapWrapper from '@/src/components/MapWrapper';
import { PhotoPoint } from '@/src/lib/types';

/**
 * Carga los datos del mapa de forma estática
 */
async function getMapData(): Promise<PhotoPoint[]> {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    const dataPath = path.join(process.cwd(), 'public', 'map-data.json');
    
    // Verificar si existe el archivo
    try {
      const data = await fs.readFile(dataPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      // Si no existe, retornar array vacío
      return [];
    }
  } catch (error) {
    console.error('Error al cargar map-data.json:', error);
    return [];
  }
}

export default async function Home() {
  const photoPoints = await getMapData();

  return (
    <div className="flex flex-col h-screen bg-zinc-50">
      {/* Header */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">
              GeoGallery
            </h1>
            <p className="text-sm text-zinc-600">
              Crónica Visual Interactiva
            </p>
          </div>
          <div className="text-sm text-zinc-600">
            {photoPoints.length} {photoPoints.length === 1 ? 'foto' : 'fotos'}
          </div>
        </div>
      </header>

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
                Agrega imágenes con metadatos GPS a la carpeta{' '}
                <code className="bg-zinc-100 px-2 py-1 rounded text-sm">
                  public/photos
                </code>
              </p>
              <p className="text-sm text-zinc-500">
                Luego ejecuta{' '}
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
