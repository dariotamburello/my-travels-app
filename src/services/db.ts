import "server-only";

import { queryD1 } from "@/src/lib/d1-client";
import { getR2Config } from "@/src/lib/r2";
import { PhotoPoint, Trip } from "@/src/lib/types";

type DbRow = Record<string, unknown>;

function pickString(row: DbRow, keys: string[]): string | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.length > 0) {
      return value;
    }
  }
  return null;
}

function pickNumber(row: DbRow, keys: string[]): number | null {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === "string" && value.trim().length > 0) {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }
  return null;
}

function parseJsonArray(value: string | null): string[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((item): item is string => typeof item === "string");
  } catch {
    return [];
  }
}

function getR2PublicBaseUrl(): string {
  return getR2Config().publicUrl.replace(/\/+$/, "");
}

function resolveLocation(row: DbRow): PhotoPoint["location"] {
  const locationJson = pickString(row, [
    "location_json",
    "locationJson",
    "location",
  ]);
  if (locationJson) {
    try {
      const parsed = JSON.parse(locationJson) as PhotoPoint["location"];
      if (parsed && typeof parsed === "object") {
        return parsed;
      }
    } catch {
      // fallback a columnas individuales
    }
  }

  const country = pickString(row, ["country"]);
  const city = pickString(row, ["city"]);
  const name = pickString(row, ["name", "place_name", "placeName"]);
  const county = pickString(row, ["county"]);
  const label = pickString(row, ["label"]);

  if (!country && !city && !name && !county && !label) {
    return undefined;
  }

  return {
    country,
    city,
    name,
    county,
    label,
  };
}

export async function getTrips(userId: string): Promise<Trip[]> {
  const rows = await queryD1<DbRow>(
    `
      SELECT *
      FROM trips
      WHERE user_id = ?
      ORDER BY rowid ASC
    `,
    [userId],
  );

  return rows.map((row): Trip => {
    const itineraryRaw = pickString(row, ["itinerary"]);

    return {
      id: pickString(row, ["id"]) ?? crypto.randomUUID(),
      name: pickString(row, ["name"]) ?? "Viaje sin nombre",
      description: pickString(row, ["description"]) ?? "",
      startDate:
        pickString(row, ["start_date", "startDate"]) ??
        new Date(0).toISOString(),
      endDate:
        pickString(row, ["end_date", "endDate"]) ?? new Date(0).toISOString(),
      origin: pickString(row, ["origin"]) ?? "",
      itinerary: parseJsonArray(itineraryRaw),
    };
  });
}

export async function getPhotos(
  userId: string,
  tripId?: string,
): Promise<PhotoPoint[]> {
  const hasTripFilter = typeof tripId === "string" && tripId.trim().length > 0;

  const rows = await queryD1<DbRow>(
    `
      SELECT *
      FROM photos
      WHERE user_id = ?
      ${hasTripFilter ? "AND trip_id = ?" : ""}
      ORDER BY timestamp DESC
    `,
    hasTripFilter ? [userId, tripId] : [userId],
  );

  const r2PublicBaseUrl = getR2PublicBaseUrl();

  return rows
    .map((row): PhotoPoint | null => {
      const storageKey = pickString(row, ["storage_key", "storageKey"]);
      if (!storageKey) {
        return null;
      }

      const latitude = pickNumber(row, ["latitude"]);
      const longitude = pickNumber(row, ["longitude"]);

      if (latitude === null || longitude === null) {
        return null;
      }

      const normalizedKey = storageKey
        .replace(/^\/+/, "")
        .replace(/^photos\//i, "")
        .replace(/-(thumb|preview|full)\.webp$/i, "")
        .replace(/\.webp$/i, "");
      const thumbUrl = `${r2PublicBaseUrl}/photos/${normalizedKey}-thumb.webp`;
      const previewUrl = `${r2PublicBaseUrl}/photos/${normalizedKey}-preview.webp`;
      const fullUrl = `${r2PublicBaseUrl}/photos/${normalizedKey}-full.webp`;

      const id =
        pickString(row, ["id"]) ??
        pickString(row, [
          "original_filename",
          "original_name",
          "originalName",
        ]) ??
        normalizedKey;

      return {
        id,
        thumbUrl,
        previewUrl,
        fullUrl,
        imagePath: fullUrl,
        latitude,
        longitude,
        dateTime: pickString(row, ["date_time", "dateTime"]) ?? undefined,
        timestamp: pickNumber(row, ["timestamp"]) ?? undefined,
        title:
          pickString(row, ["title"]) ??
          pickString(row, [
            "original_filename",
            "original_name",
            "originalName",
          ]) ??
          id,
        location: resolveLocation(row) ?? {
          country: pickString(row, ["loc_country", "country"]),
          city: pickString(row, ["loc_city", "city"]),
          name: pickString(row, [
            "loc_name",
            "name",
            "place_name",
            "placeName",
          ]),
          county: pickString(row, ["loc_county", "county"]),
          label: pickString(row, ["loc_label", "label"]),
        },
        isFavorite: pickNumber(row, ["is_favorite", "isFavorite"]) === 1,
      };
    })
    .filter((point): point is PhotoPoint => Boolean(point));
}
