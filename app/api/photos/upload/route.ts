import { DeleteObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { NextResponse } from "next/server";
import sharp from "sharp";
import { queryD1 } from "@/src/lib/d1-client";
import { getR2Client, getR2Config } from "@/src/lib/r2";

const DEMO_USER_ID = "user-123";

async function reverseGeocode(lat: number, lon: number) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&accept-language=es`;
    const response = await fetch(url, {
      headers: {
        "User-Agent": "GeoGallery/1.0 (dariotamburello@hotmail.com)",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    return {
      country: data.address?.country || null,
      city:
        data.address?.city ||
        data.address?.town ||
        data.address?.village ||
        null,
      name: data.name || data.address?.road || null,
      county: data.address?.county || null,
      label: data.display_name || null,
    };
  } catch (error) {
    console.error("Error en Reverse Geocoding:", error);
    return null;
  }
}

function parseValidDate(dateTime: string): Date | null {
  if (!dateTime) {
    return null;
  }

  const parsedDate = new Date(dateTime);
  if (Number.isNaN(parsedDate.getTime())) {
    return null;
  }

  return parsedDate;
}

export async function GET() {
  try {
    const rows = await queryD1<{ original_filename?: string }>(
      `
        SELECT original_filename
        FROM photos
        WHERE user_id = ?
      `,
      [DEMO_USER_ID],
    );

    const names = rows
      .map((row) => String(row.original_filename ?? "").trim())
      .filter((value) => value.length > 0);

    return NextResponse.json({ names });
  } catch (error) {
    console.error("Error al listar nombres en D1:", error);
    return NextResponse.json({ names: [] }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let r2Client;
    let r2Config;

    try {
      r2Client = getR2Client();
      r2Config = getR2Config();
    } catch (error) {
      console.error("Configuración R2 inválida:", error);
      return NextResponse.json(
        { error: "Configuración de Cloudflare R2 incompleta." },
        { status: 500 },
      );
    }

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
    const tripIdRaw = String(formData.get("tripId") ?? "").trim();
    const tripId = tripIdRaw.length > 0 ? tripIdRaw : null;

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

    const duplicateRows = await queryD1<{ total?: number }>(
      `
        SELECT COUNT(1) AS total
        FROM photos
        WHERE user_id = ?
          AND (
            lower(original_filename) = lower(?)
            OR lower(original_filename) = lower(?)
          )
      `,
      [DEMO_USER_ID, String(file.name ?? ""), originalName],
    );

    const duplicateCount = Number(duplicateRows[0]?.total ?? 0);
    if (duplicateCount > 0) {
      return NextResponse.json(
        {
          error: "Esta foto ya fue subida",
          code: "DUPLICATE",
          fileName: originalName,
          message: `La foto ${originalName} ya está en tu galería`,
        },
        { status: 409 },
      );
    }

    const location = await reverseGeocode(latitude, longitude);
    const sourceBuffer = Buffer.from(await file.arrayBuffer());

    try {
      await sharp(sourceBuffer).metadata();
    } catch {
      return NextResponse.json(
        { error: "El archivo subido no es una imagen válida." },
        { status: 400 },
      );
    }

    const storageKey = crypto.randomUUID();
    const fullObjectKey = `photos/${storageKey}-full.webp`;
    const previewObjectKey = `photos/${storageKey}-preview.webp`;
    const thumbObjectKey = `photos/${storageKey}-thumb.webp`;

    try {
      const [fullBuffer, previewBuffer, thumbBuffer] = await Promise.all([
        sharp(sourceBuffer)
          .resize({ width: 1600, withoutEnlargement: true })
          .webp({ quality: 88 })
          .toBuffer(),
        sharp(sourceBuffer)
          .resize({ width: 800, withoutEnlargement: true })
          .webp({ quality: 85 })
          .toBuffer(),
        sharp(sourceBuffer)
          .resize(100, 100, { fit: "cover", position: "attention" })
          .webp({ quality: 80 })
          .toBuffer(),
      ]);

      await Promise.all([
        r2Client.send(
          new PutObjectCommand({
            Bucket: r2Config.bucketName,
            Key: fullObjectKey,
            Body: fullBuffer,
            ContentType: "image/webp",
            CacheControl: "public, max-age=31536000, immutable",
          }),
        ),
        r2Client.send(
          new PutObjectCommand({
            Bucket: r2Config.bucketName,
            Key: previewObjectKey,
            Body: previewBuffer,
            ContentType: "image/webp",
            CacheControl: "public, max-age=31536000, immutable",
          }),
        ),
        r2Client.send(
          new PutObjectCommand({
            Bucket: r2Config.bucketName,
            Key: thumbObjectKey,
            Body: thumbBuffer,
            ContentType: "image/webp",
            CacheControl: "public, max-age=31536000, immutable",
          }),
        ),
      ]);
    } catch (error) {
      console.error("Error al procesar/subir variantes a R2:", error);
      return NextResponse.json(
        { error: "No se pudieron generar o subir las variantes de imagen." },
        { status: 500 },
      );
    }

    const parsedDate = parseValidDate(dateTime);
    const publicBaseUrl = r2Config.publicUrl.replace(/\/+$/, "");
    const fullUrl = `${publicBaseUrl}/photos/${storageKey}-full.webp`;
    const previewUrl = `${publicBaseUrl}/photos/${storageKey}-preview.webp`;
    const thumbUrl = `${publicBaseUrl}/photos/${storageKey}-thumb.webp`;
    const photoId = crypto.randomUUID();

    await queryD1(
      `
        INSERT INTO photos (
          id,
          user_id,
          trip_id,
          original_filename,
          storage_key,
          latitude,
          longitude,
          date_time,
          timestamp,
          loc_country,
          loc_city,
          loc_name,
          loc_county,
          loc_label
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        photoId,
        DEMO_USER_ID,
        tripId,
        originalName,
        storageKey,
        latitude,
        longitude,
        parsedDate ? parsedDate.toISOString() : null,
        parsedDate ? parsedDate.getTime() : null,
        location?.country ?? null,
        location?.city ?? null,
        location?.name ?? null,
        location?.county ?? null,
        location?.label ?? null,
      ],
    );

    return NextResponse.json({
      ok: true,
      point: {
        id: photoId,
        storageKey,
        fullUrl,
        previewUrl,
        thumbUrl,
        imagePath: fullUrl,
        latitude,
        longitude,
        dateTime: parsedDate ? parsedDate.toISOString() : undefined,
        timestamp: parsedDate ? parsedDate.getTime() : undefined,
        title: originalName,
        location,
      },
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
    let r2Client;
    let r2Config;

    try {
      r2Client = getR2Client();
      r2Config = getR2Config();
    } catch (error) {
      console.error("Configuración R2 inválida:", error);
      return NextResponse.json(
        { error: "Configuración de Cloudflare R2 incompleta." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { id?: string };
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json({ error: "Id inválido." }, { status: 400 });
    }

    const rows = await queryD1<{
      storage_key?: string;
      original_filename?: string;
    }>(
      `
        SELECT storage_key, original_filename
        FROM photos
        WHERE user_id = ?
          AND (id = ? OR original_filename = ?)
        LIMIT 1
      `,
      [DEMO_USER_ID, id, id],
    );

    const storageKey = String(rows[0]?.storage_key ?? "").trim();
    if (!storageKey) {
      return NextResponse.json(
        { error: "Foto no encontrada." },
        { status: 404 },
      );
    }

    const r2Keys = [
      `photos/${storageKey}-full.webp`,
      `photos/${storageKey}-preview.webp`,
      `photos/${storageKey}-thumb.webp`,
    ];

    await Promise.all(
      r2Keys.map(async (key) => {
        try {
          await r2Client.send(
            new DeleteObjectCommand({
              Bucket: r2Config.bucketName,
              Key: key,
            }),
          );
        } catch (error) {
          console.error(`No se pudo eliminar ${key} en R2:`, error);
        }
      }),
    );

    await queryD1(
      `
        DELETE FROM photos
        WHERE user_id = ?
          AND (id = ? OR original_filename = ?)
      `,
      [DEMO_USER_ID, id, id],
    );

    const countRows = await queryD1<{ total?: number }>(
      `
        SELECT COUNT(1) AS total
        FROM photos
        WHERE user_id = ?
      `,
      [DEMO_USER_ID],
    );

    return NextResponse.json({
      ok: true,
      total: Number(countRows[0]?.total ?? 0),
    });
  } catch (error) {
    console.error("Error al eliminar foto:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar la foto." },
      { status: 500 },
    );
  }
}
