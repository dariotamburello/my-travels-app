"use client";

import { ChangeEvent, useRef, useState } from "react";
import * as exifr from "exifr";
import imageCompression from "browser-image-compression";
import { useRouter } from "next/navigation";
import heic2any from "heic2any";

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

export default function PhotoUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressModal, setProgressModal] = useState<ProgressModalState>({
    open: false,
    title: "Procesando fotos...",
    detail: "Preparando carga",
    progress: { total: 0, processed: 0 },
    tone: "neutral",
    resultLines: [],
  });

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

    inputRef.current?.click();
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
        detail: "No se pudo copiar automáticamente. Selecciona y copia manualmente.",
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
      const existingResponse = await fetch("/api/photos/upload", { method: "GET" });
      if (existingResponse.ok) {
        const data = (await existingResponse.json()) as { names?: string[] };
        existingNames = new Set((data.names ?? []).map((name) => name.toLowerCase()));
      }
    } catch {
      existingNames = new Set<string>();
    }

    const duplicateFiles = files.filter((file) => existingNames.has(file.name.toLowerCase()));
    const validFiles = files.filter((file) => !existingNames.has(file.name.toLowerCase()));

    if (validFiles.length === 0) {
      setProgressModal((current) => ({
        ...current,
        title: "Proceso completado",
        detail: "No hay fotos nuevas para subir",
        progress: { total: files.length, processed: files.length },
        tone: "warning",
        resultLines: [
          "Todas las fotos seleccionadas ya existen en map-data.json.",
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
        formData.append("file", compressedFile, compressedFile.name || originalFile.name);
        formData.append("latitude", latitude.toString());
        formData.append("longitude", longitude.toString());
        formData.append("dateTime", dateTime ?? "");
        formData.append("originalName", originalFile.name);

        setProgressModal((current) => ({
          ...current,
          detail: `Subiendo y actualizando map-data.json: ${originalFile.name}`,
        }));

        const response = await fetch("/api/photos/upload", {
          method: "POST",
          body: formData,
        });

        if (response.status === 409) {
          duplicateCount += 1;
          errorDetails.push(`${originalFile.name}: la foto ya existe en map-data.json.`);
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
          error instanceof Error ? error.message : "Error desconocido durante el procesamiento";
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

    if (uploadedCount > 0 && duplicateCount === 0 && skippedNoGpsCount === 0 && failedCount === 0) {
      setProgressModal((current) => ({
        ...current,
        title: "Proceso completado",
        detail: "La carga finalizó correctamente y el mapa se actualizó.",
        tone: "success",
        resultLines: [summaryLine],
      }));
    } else {
      const tone: ResultTone =
        failedCount > 0 ? "error" : duplicateCount > 0 || skippedNoGpsCount > 0 ? "warning" : "neutral";

      const detailLines = [summaryLine];
      if (duplicateCount > 0) {
        detailLines.push("Algunas imágenes se omitieron por estar duplicadas.");
      }
      if (skippedNoGpsCount > 0) {
        detailLines.push("Algunas imágenes se omitieron por no tener coordenadas GPS.");
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
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : progressModal.tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-800"
      : progressModal.tone === "error"
      ? "border-rose-200 bg-rose-50 text-rose-800"
      : "border-zinc-200 bg-zinc-50 text-zinc-700";

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
        <div className="fixed inset-0 z-2100 flex items-center justify-center bg-black/40 px-6">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-lg">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-semibold text-zinc-900">
                {progressModal.title}
              </h3>
              <button
                type="button"
                onClick={handleCloseProgressModal}
                disabled={isProcessing}
                className="rounded px-2 py-1 text-sm text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Cerrar modal de progreso"
              >
                ✕
              </button>
            </div>

            <p className="mt-3 text-sm text-zinc-600">
              {progressModal.progress.processed} de {progressModal.progress.total} completadas
            </p>
            <p className="mt-1 text-xs text-zinc-500">{progressModal.detail}</p>

            {progressModal.resultLines.length > 0 && (
              <div className={`mt-4 max-h-56 overflow-auto rounded-lg border px-3 py-2 text-sm ${resultBoxClasses}`}>
                {progressModal.resultLines.map((line, index) => (
                  <p key={`${line}-${index}`} className="mb-1 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>
            )}

            <div className="mt-4 flex justify-end">
              {progressModal.resultLines.length > 0 && (
                <button
                  type="button"
                  onClick={handleCopyDetails}
                  className="mr-2 rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Copiar detalle
                </button>
              )}
              <button
                type="button"
                onClick={handleCloseProgressModal}
                disabled={isProcessing}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isProcessing ? "Procesando..." : "Cerrar"}
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={handleOpenFilePicker}
        disabled={isProcessing}
        className="fixed bottom-5 right-5 z-2000 flex h-14 w-14 items-center justify-center rounded-full border-2 border-white bg-zinc-900 text-2xl font-semibold text-white shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-500"
        aria-label="Subir fotos"
      >
        +
      </button>
    </>
  );
}