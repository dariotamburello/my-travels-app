"use client";

import { ChangeEvent, useRef, useState } from "react";
import * as exifr from "exifr";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import CreateTripModal from "./CreateTripModal";
import ModalShell from "./ui/ModalShell";
import { SecondaryButton } from "./ui/ModalButtons";

type ResultTone = "neutral" | "success" | "warning" | "error";

interface UploadProgress {
  total: number;
  processed: number;
}

interface ProgressModalState {
  open: boolean;
  title: string;
  detail: string;
  progress: UploadProgress;
  tone: ResultTone;
  resultLines: string[];
}

function isHeicOrHeif(file: File): boolean {
  const mime = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  return (
    mime.includes("heic") ||
    mime.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function resolveLatitude(exifData: unknown): number | null {
  const metadata = exifData as Record<string, unknown> | null;

  if (!metadata) {
    return null;
  }

  const latitude = metadata.latitude ?? metadata.lat;
  return typeof latitude === "number" ? latitude : null;
}

function resolveLongitude(exifData: unknown): number | null {
  const metadata = exifData as Record<string, unknown> | null;

  if (!metadata) {
    return null;
  }

  const longitude = metadata.longitude ?? metadata.lon ?? metadata.lng;
  return typeof longitude === "number" ? longitude : null;
}

function resolveDateTime(exifData: unknown): string | null {
  const metadata = exifData as Record<string, unknown> | null;

  if (!metadata) {
    return null;
  }

  const rawDate =
    metadata.DateTimeOriginal ??
    metadata.CreateDate ??
    metadata.dateTimeOriginal ??
    metadata.DateTime;

  if (rawDate instanceof Date) {
    return rawDate.toISOString();
  }

  if (typeof rawDate === "string" && rawDate.length > 0) {
    return rawDate;
  }

  return null;
}

async function convertHeicIfNeeded(file: File): Promise<File> {
  if (!isHeicOrHeif(file)) {
    return file;
  }

  if (typeof window === "undefined") {
    return file;
  }

  const heic2anyModule = await import("heic2any");
  const heic2any = heic2anyModule.default;

  const conversionResult = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });

  const convertedBlob = Array.isArray(conversionResult)
    ? conversionResult[0]
    : conversionResult;

  return new File(
    [convertedBlob],
    file.name.replace(/\.(heic|heif)$/i, ".jpg"),
    { type: "image/jpeg" },
  );
}

interface PhotoUploaderProps {
  activeTripId?: string | null;
}

export default function PhotoUploader({
  activeTripId = null,
}: PhotoUploaderProps) {
  const router = useRouter();
  const demoUserId = "user-123";
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [isCreateTripOpen, setIsCreateTripOpen] = useState(false);
  const [isCreatingTrip, setIsCreatingTrip] = useState(false);
  const [progressModal, setProgressModal] = useState<ProgressModalState>({
    open: false,
    title: "Procesando fotos...",
    detail: "Preparando carga",
    progress: { total: 0, processed: 0 },
    tone: "neutral",
    resultLines: [],
  });

  const progressPercent =
    progressModal.progress.total > 0
      ? Math.round(
          (progressModal.progress.processed / progressModal.progress.total) *
            100,
        )
      : 0;

  const handleCloseProgressModal = () => {
    if (isProcessing) {
      return;
    }

    setProgressModal((current) => ({ ...current, open: false }));
  };

  const handleOpenFilePicker = () => {
    if (isProcessing) {
      return;
    }

    setIsSpeedDialOpen(false);
    inputRef.current?.click();
  };

  const handleCreateTrip = async (payload: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }) => {
    setIsCreatingTrip(true);

    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = `HTTP ${response.status}`;
        try {
          const data = (await response.json()) as { error?: string };
          if (data.error) {
            message = data.error;
          }
        } catch {
          // Mantener mensaje HTTP
        }

        throw new Error(message);
      }

      setIsCreateTripOpen(false);
      setIsSpeedDialOpen(false);
      router.refresh();
    } finally {
      setIsCreatingTrip(false);
    }
  };

  const handleCopyDetails = async () => {
    if (progressModal.resultLines.length === 0) {
      return;
    }

    const text = progressModal.resultLines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setProgressModal((current) => ({
        ...current,
        detail: "Detalle copiado al portapapeles.",
      }));
    } catch {
      setProgressModal((current) => ({
        ...current,
        detail:
          "No se pudo copiar automáticamente. Selecciona y copia manualmente.",
      }));
    }
  };

  const handleFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);

    if (files.length === 0) {
      return;
    }

    setIsProcessing(true);
    setProgressModal({
      open: true,
      title: `Procesando ${files.length} fotos...`,
      detail: "Validando duplicados",
      progress: { total: files.length, processed: 0 },
      tone: "neutral",
      resultLines: [],
    });

    let existingNames = new Set<string>();

    try {
      const existingResponse = await fetch("/api/photos/upload", {
        method: "GET",
      });
      if (existingResponse.ok) {
        const data = (await existingResponse.json()) as { names?: string[] };
        existingNames = new Set(
          (data.names ?? []).map((name) => name.toLowerCase()),
        );
      }
    } catch {
      existingNames = new Set<string>();
    }

    const duplicateFiles = files.filter((file) =>
      existingNames.has(file.name.toLowerCase()),
    );
    const validFiles = files.filter(
      (file) => !existingNames.has(file.name.toLowerCase()),
    );

    if (validFiles.length === 0) {
      setProgressModal((current) => ({
        ...current,
        title: "Proceso completado",
        detail: "No hay fotos nuevas para subir",
        progress: { total: files.length, processed: files.length },
        tone: "warning",
        resultLines: [
          "Todas las fotos seleccionadas ya están en tu galería.",
          "Selecciona otras imágenes para continuar.",
        ],
      }));
      setIsProcessing(false);
      event.target.value = "";
      return;
    }

    let uploadedCount = 0;
    let duplicateCount = duplicateFiles.length;
    let skippedNoGpsCount = 0;
    let failedCount = 0;
    const errorDetails: string[] = [];

    for (let index = 0; index < validFiles.length; index += 1) {
      const originalFile = validFiles[index];

      try {
        setProgressModal((current) => ({
          ...current,
          detail: `Preparando archivo: ${originalFile.name}`,
        }));

        const file = await convertHeicIfNeeded(originalFile);

        setProgressModal((current) => ({
          ...current,
          detail: `Leyendo EXIF: ${originalFile.name}`,
        }));

        let exifData = await exifr.parse(file, {
          gps: true,
          tiff: true,
          exif: true,
        });

        if (!exifData) {
          exifData = await exifr.parse(originalFile, {
            gps: true,
            tiff: true,
            exif: true,
          });
        }

        const latitude = resolveLatitude(exifData);
        const longitude = resolveLongitude(exifData);

        if (latitude === null || longitude === null) {
          skippedNoGpsCount += 1;
          continue;
        }

        const dateTime = resolveDateTime(exifData);

        setProgressModal((current) => ({
          ...current,
          detail: `Comprimiendo imagen: ${originalFile.name}`,
        }));

        const compressedFile = await imageCompression(file, {
          maxWidthOrHeight: 800,
          useWebWorker: true,
        });

        const formData = new FormData();
        formData.append(
          "file",
          compressedFile,
          compressedFile.name || originalFile.name,
        );
        formData.append("latitude", latitude.toString());
        formData.append("longitude", longitude.toString());
        formData.append("dateTime", dateTime ?? "");
        formData.append("originalName", originalFile.name);
        formData.append("userId", demoUserId);
        if (activeTripId) {
          formData.append("tripId", activeTripId);
        }

        setProgressModal((current) => ({
          ...current,
          detail: `Subiendo imagen: ${originalFile.name}`,
        }));

        const response = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });

        if (response.status === 409) {
          duplicateCount += 1;

          let duplicateMessage = `La foto ${originalFile.name} ya está en tu galería.`;
          try {
            const data = (await response.json()) as {
              message?: string;
              fileName?: string;
            };
            if (data.message) {
              duplicateMessage = data.message;
            } else if (data.fileName) {
              duplicateMessage = `La foto ${data.fileName} ya está en tu galería.`;
            }
          } catch {
            // Si no hay JSON válido, mantenemos mensaje por defecto
          }

          errorDetails.push(duplicateMessage);
          continue;
        }

        if (!response.ok) {
          failedCount += 1;
          let apiError = `HTTP ${response.status}`;
          try {
            const data = (await response.json()) as { error?: string };
            if (data.error) {
              apiError = data.error;
            }
          } catch {
            // Si no hay JSON válido, mantener mensaje HTTP
          }
          errorDetails.push(`${originalFile.name}: ${apiError}`);
          continue;
        }

        uploadedCount += 1;
      } catch (error) {
        failedCount += 1;
        const reason =
          error instanceof Error
            ? error.message
            : "Error desconocido durante el procesamiento";
        errorDetails.push(`${originalFile.name}: ${reason}`);
      } finally {
        setProgressModal((current) => ({
          ...current,
          progress: {
            total: files.length,
            processed: duplicateFiles.length + index + 1,
          },
        }));
      }
    }

    setProgressModal((current) => ({
      ...current,
      detail: "Refrescando mapa...",
      progress: {
        ...current.progress,
        processed: files.length,
      },
    }));

    if (uploadedCount > 0) {
      router.refresh();
    }

    setIsProcessing(false);

    const summaryLine = `Resultado: ${uploadedCount} subida(s), ${duplicateCount} duplicada(s), ${skippedNoGpsCount} sin GPS, ${failedCount} fallida(s).`;

    if (
      uploadedCount > 0 &&
      duplicateCount === 0 &&
      skippedNoGpsCount === 0 &&
      failedCount === 0
    ) {
      setProgressModal((current) => ({
        ...current,
        title: "Proceso completado",
        detail: `Se subieron ${uploadedCount} foto(s) correctamente.`,
        tone: "success",
        resultLines: [],
      }));
    } else {
      const tone: ResultTone =
        failedCount > 0
          ? "error"
          : duplicateCount > 0 || skippedNoGpsCount > 0
            ? "warning"
            : "neutral";

      const detailLines = [summaryLine];
      if (duplicateCount > 0) {
        detailLines.push("Algunas imágenes se omitieron por estar duplicadas.");
      }
      if (skippedNoGpsCount > 0) {
        detailLines.push(
          "Algunas imágenes se omitieron por no tener coordenadas GPS.",
        );
      }

      setProgressModal((current) => ({
        ...current,
        title: "Proceso finalizado con observaciones",
        detail: "Revisa el detalle antes de cerrar.",
        tone,
        resultLines: [...detailLines, ...errorDetails],
      }));
    }

    event.target.value = "";
  };

  const resultBoxClasses =
    progressModal.tone === "success"
      ? "border-emerald-300/40 bg-emerald-500/10 text-emerald-200"
      : progressModal.tone === "warning"
        ? "border-amber-300/40 bg-amber-500/10 text-amber-200"
        : progressModal.tone === "error"
          ? "border-rose-300/40 bg-rose-500/10 text-rose-200"
          : "border-white/15 bg-white/5 text-zinc-300";

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg, image/png, image/heic, image/heif, image/webp"
        className="hidden"
        onChange={handleFilesSelected}
      />

      {progressModal.open && (
        <div className="fixed inset-0 z-2100 flex items-center justify-center bg-black/70 px-6 backdrop-blur-sm">
          <ModalShell className="max-w-lg">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-zinc-100">
                {progressModal.title}
              </h3>
              <button
                type="button"
                onClick={handleCloseProgressModal}
                disabled={isProcessing}
                className="rounded-lg px-2 py-1 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Cerrar modal de progreso"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm text-zinc-300">
              {progressModal.progress.processed} de{" "}
              {progressModal.progress.total} completadas
            </p>
            <p className="mt-1 text-xs text-zinc-500">{progressModal.detail}</p>

            <div className="mt-3">
              <div
                className="h-2.5 w-full overflow-hidden rounded-full bg-zinc-800"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progressPercent}
                aria-label="Progreso de carga de fotos"
              >
                <div
                  className="h-full rounded-full bg-linear-to-r from-indigo-500 to-cyan-400 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <p className="mt-1 text-right text-xs text-zinc-400">
                {progressPercent}%
              </p>
            </div>

            {progressModal.resultLines.length > 0 && (
              <div
                className={`mt-4 max-h-56 overflow-auto rounded-lg border px-3 py-2 text-sm ${resultBoxClasses}`}
              >
                {progressModal.resultLines.map((line, index) => (
                  <p key={`${line}-${index}`} className="mb-1 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              {progressModal.resultLines.length > 0 && (
                <SecondaryButton
                  type="button"
                  onClick={handleCopyDetails}
                  className="mr-2"
                >
                  Copiar detalle
                </SecondaryButton>
              )}
              <SecondaryButton
                type="button"
                onClick={handleCloseProgressModal}
                disabled={isProcessing}
              >
                {isProcessing ? "Procesando..." : "Cerrar"}
              </SecondaryButton>
            </div>
          </ModalShell>
        </div>
      )}

      <CreateTripModal
        isOpen={isCreateTripOpen}
        isSubmitting={isCreatingTrip}
        onClose={() => {
          if (isCreatingTrip) {
            return;
          }
          setIsCreateTripOpen(false);
        }}
        onSubmit={handleCreateTrip}
      />

      <button
        type="button"
        className="fixed inset-0 z-1900"
        aria-hidden="true"
        onClick={() => setIsSpeedDialOpen(false)}
        style={{ display: isSpeedDialOpen ? "block" : "none" }}
      />

      <div className="fixed bottom-5 right-5 z-2000 flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => {
            setIsSpeedDialOpen(false);
            setIsCreateTripOpen(true);
          }}
          disabled={isProcessing || isCreatingTrip}
          className={`flex items-center gap-2 rounded-full border border-white/15 bg-zinc-950/92 px-3 py-2 text-sm font-medium text-zinc-100 shadow-[0_12px_24px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-200 ${
            isSpeedDialOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          } disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label="Crear viaje"
        >
          <span>✈️</span>
          <span>Crear Viaje</span>
        </button>

        <button
          type="button"
          onClick={handleOpenFilePicker}
          disabled={isProcessing || isCreatingTrip}
          className={`flex items-center gap-2 rounded-full border border-white/15 bg-zinc-950/92 px-3 py-2 text-sm font-medium text-zinc-100 shadow-[0_12px_24px_rgba(0,0,0,0.5)] backdrop-blur-md transition-all duration-200 ${
            isSpeedDialOpen
              ? "pointer-events-auto translate-y-0 opacity-100"
              : "pointer-events-none translate-y-3 opacity-0"
          } disabled:cursor-not-allowed disabled:opacity-50`}
          aria-label="Subir foto"
        >
          <span>📸</span>
          <span>Subir Foto</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (isProcessing || isCreatingTrip) {
              return;
            }
            setIsSpeedDialOpen((current) => !current);
          }}
          disabled={isProcessing || isCreatingTrip}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-zinc-950/90 text-2xl font-semibold text-white shadow-[0_14px_28px_rgba(0,0,0,0.55)] backdrop-blur-md transition hover:scale-105 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-700"
          aria-label="Abrir menú de acciones"
          aria-expanded={isSpeedDialOpen}
        >
          <span
            className={`inline-block transition-transform duration-200 ${
              isSpeedDialOpen ? "rotate-45" : "rotate-0"
            }`}
          >
            +
          </span>
        </button>
      </div>
    </>
  );
}
