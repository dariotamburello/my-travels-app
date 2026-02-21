import { NextResponse } from "next/server";
import { queryD1 } from "@/src/lib/d1-client";

const DEMO_USER_ID = "user-123";

interface CreateTripBody {
  name?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
}

function normalizeOptionalDate(input?: string): string | null {
  const value = String(input ?? "").trim();
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateTripBody;

    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const startDateIso = normalizeOptionalDate(body.startDate);
    const endDateIso = normalizeOptionalDate(body.endDate);

    if (!name) {
      return NextResponse.json(
        { error: "El nombre del viaje es obligatorio." },
        { status: 400 },
      );
    }

    if (body.startDate && !startDateIso) {
      return NextResponse.json(
        { error: "La fecha de inicio no es válida." },
        { status: 400 },
      );
    }

    if (body.endDate && !endDateIso) {
      return NextResponse.json(
        { error: "La fecha de fin no es válida." },
        { status: 400 },
      );
    }

    if (startDateIso && endDateIso && new Date(startDateIso) > new Date(endDateIso)) {
      return NextResponse.json(
        { error: "La fecha de inicio no puede ser mayor que la fecha de fin." },
        { status: 400 },
      );
    }

    const tripId = crypto.randomUUID();
    const startDate = startDateIso ?? new Date(0).toISOString();
    const endDate = endDateIso ?? startDate;

    await queryD1(
      `
        INSERT INTO trips (
          id,
          user_id,
          name,
          description,
          start_date,
          end_date,
          origin,
          itinerary
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        tripId,
        DEMO_USER_ID,
        name,
        description,
        startDate,
        endDate,
        "",
        JSON.stringify([]),
      ],
    );

    return NextResponse.json(
      {
        ok: true,
        trip: {
          id: tripId,
          name,
          description,
          startDate,
          endDate,
          origin: "",
          itinerary: [],
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error al crear viaje:", error);
    return NextResponse.json(
      { error: "No se pudo crear el viaje." },
      { status: 500 },
    );
  }
}
