import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import sharp from "sharp";

interface StoredPhotoPoint {
  id: string;
  thumbUrl?: string;
  previewUrl?: string;
  fullUrl?: string;
  imagePath?: string;
  latitude: number;
  longitude: number;
  dateTime?: string;
  timestamp?: number;
  title?: string;
  location?: {
    country?: string | null;
    city?: string | null;
    name?: string | null;
    county?: string | null;
    label?: string | null;
  } | null;
}

function getMapDataPaths() {
  const root = process.cwd();
  return {
    srcDataPath: path.join(root, "src", "data", "map-data.json"),
  };
}

async function readMapData(): Promise<StoredPhotoPoint[]> {
  const { srcDataPath } = getMapDataPaths();

  try {
    const srcRaw = await fs.readFile(srcDataPath, "utf-8");
    const parsed = JSON.parse(srcRaw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function writeMapData(points: StoredPhotoPoint[]): Promise<void> {
  const { srcDataPath } = getMapDataPaths();

  const serialized = JSON.stringify(points, null, 2);

  await fs.mkdir(path.dirname(srcDataPath), { recursive: true });

  await fs.writeFile(srcDataPath, serialized, "utf-8");
}

async function reverseGeocode(lat: number, lon: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=geocodejson&lat=${lat}&lon=${lon}`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "GeoGallery/1.0 (photo mapping app)",
        "Accept-Language": "es",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as {
      features?: Array<{
        properties?: {
          geocoding?: {
            country?: string;
            city?: string;
            name?: string;
            county?: string;
            label?: string;
          };
        };
      }>;
    };

    const geocoding = data.features?.[0]?.properties?.geocoding;
    if (!geocoding) {
      return null;
    }

    return {
      country: geocoding.country || null,
      city: geocoding.city || null,
      name: geocoding.name || null,
      county: geocoding.county || null,
      label: geocoding.label || null,
    };
  } catch {
    return null;
  }
}

function buildBaseName(originalName: string): string {
  const withoutExt = originalName
    .replace(/\.[^/.]+$/, "")
    .trim()
    .toLowerCase();
  const normalized = withoutExt
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return normalized || `photo_${Date.now()}`;
}

export async function GET() {
  const points = await readMapData();
  const names = points.map((point) => point.id);
  return NextResponse.json({ names });
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo inválido." }, { status: 400 });
    }

    const latitude = Number(formData.get("latitude"));
    const longitude = Number(formData.get("longitude"));
    const dateTime = String(formData.get("dateTime") ?? "");
    const originalName = String(
      formData.get("originalName") ?? file.name ?? "",
    ).trim();

    if (!originalName) {
      return NextResponse.json(
        { error: "Nombre de archivo inválido." },
        { status: 400 },
      );
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Las coordenadas GPS son obligatorias." },
        { status: 400 },
      );
    }

    const currentPoints = await readMapData();
    const alreadyExists = currentPoints.some(
      (point) => point.id.toLowerCase() === originalName.toLowerCase(),
    );

    if (alreadyExists) {
      return NextResponse.json(
        { error: "La foto ya existe en map-data.json.", code: "DUPLICATE" },
        { status: 409 },
      );
    }

    const location = await reverseGeocode(latitude, longitude);

    const photosDir = path.join(process.cwd(), "public", "photos");
    await fs.mkdir(photosDir, { recursive: true });

    const sourceBuffer = Buffer.from(await file.arrayBuffer());

    try {
      await sharp(sourceBuffer).metadata();
    } catch {
      return NextResponse.json(
        { error: "El archivo subido no es una imagen válida." },
        { status: 400 },
      );
    }

    const baseName = buildBaseName(originalName);
    const fullFilename = `${baseName}.webp`;
    const previewFilename = `${baseName}-preview.webp`;
    const thumbFilename = `${baseName}-thumb.webp`;

    const fullOutputPath = path.join(photosDir, fullFilename);
    const previewOutputPath = path.join(photosDir, previewFilename);
    const thumbOutputPath = path.join(photosDir, thumbFilename);

    try {
      await Promise.all([
        sharp(sourceBuffer)
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 88 })
          .toFile(fullOutputPath),
        sharp(sourceBuffer)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toFile(previewOutputPath),
        sharp(sourceBuffer)
          .resize(100, 100, { fit: "cover", position: "attention" })
          .webp({ quality: 80 })
          .toFile(thumbOutputPath),
      ]);
    } catch (error) {
      console.error("Error al procesar variantes con sharp:", error);
      return NextResponse.json(
        { error: "No se pudieron generar las variantes de imagen." },
        { status: 500 },
      );
    }

    const parsedDate = dateTime ? new Date(dateTime) : null;
    const hasValidDate =
      parsedDate instanceof Date && !Number.isNaN(parsedDate.getTime());

    const fullUrl = `/photos/${fullFilename}`;
    const previewUrl = `/photos/${previewFilename}`;
    const thumbUrl = `/photos/${thumbFilename}`;

    const newRecord: StoredPhotoPoint = {
      id: originalName,
      fullUrl,
      previewUrl,
      thumbUrl,
      imagePath: fullUrl,
      latitude,
      longitude,
      dateTime: hasValidDate ? parsedDate.toISOString() : undefined,
      timestamp: hasValidDate ? parsedDate.getTime() : undefined,
      title: originalName,
      location,
    };

    const updatedPoints = [...currentPoints, newRecord].sort((a, b) => {
      if (!a.timestamp) return 1;
      if (!b.timestamp) return -1;
      return a.timestamp - b.timestamp;
    });

    await writeMapData(updatedPoints);

    return NextResponse.json({
      ok: true,
      point: newRecord,
      total: updatedPoints.length,
    });
  } catch (error) {
    console.error("Error al subir foto:", error);
    return NextResponse.json(
      { error: "No se pudo subir la foto." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = (await request.json()) as { id?: string };
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Id inválido." }, { status: 400 });
    }

    const currentPoints = await readMapData();
    const pointToDelete = currentPoints.find(
      (point) => point.id.toLowerCase() === id.toLowerCase(),
    );

    if (!pointToDelete) {
      return NextResponse.json(
        { error: "Foto no encontrada." },
        { status: 404 },
      );
    }

    const candidatePaths = [
      pointToDelete.fullUrl,
      pointToDelete.previewUrl,
      pointToDelete.thumbUrl,
      pointToDelete.imagePath,
    ].filter((value): value is string => Boolean(value));

    await Promise.all(
      candidatePaths.map(async (filePath) => {
        const relativePath = filePath.replace(/^\/+/, "");
        const absolutePath = path.join(process.cwd(), "public", relativePath);

        try {
          await fs.unlink(absolutePath);
        } catch {
          // Si el archivo no existe, continuamos para mantener consistencia del JSON
        }
      }),
    );

    const updatedPoints = currentPoints.filter(
      (point) => point.id.toLowerCase() !== id.toLowerCase(),
    );

    await writeMapData(updatedPoints);

    return NextResponse.json({ ok: true, total: updatedPoints.length });
  } catch (error) {
    console.error("Error al eliminar foto:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la foto." },
      { status: 500 },
    );
  }
}
