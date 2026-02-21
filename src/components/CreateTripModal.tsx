"use client";

import { FormEvent, useEffect, useState } from "react";
import ModalShell from "./ui/ModalShell";
import { PrimaryButton, SecondaryButton } from "./ui/ModalButtons";

interface CreateTripModalProps {
  isOpen: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description?: string;
    startDate?: string;
    endDate?: string;
  }) => Promise<void>;
}

export default function CreateTripModal({
  isOpen,
  isSubmitting = false,
  onClose,
  onSubmit,
}: CreateTripModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setDescription("");
      setStartDate("");
      setEndDate("");
      setError(null);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("El nombre del viaje es obligatorio.");
      return;
    }

    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      setError("La fecha de inicio no puede ser mayor que la fecha de fin.");
      return;
    }

    setError(null);

    try {
      await onSubmit({
        name: trimmedName,
        description: description.trim() || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "No se pudo crear el viaje. Intenta nuevamente.",
      );
    }
  };

  return (
    <div className="fixed inset-0 z-2200 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
      <ModalShell className="max-w-lg">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-zinc-100">Crear viaje</h3>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg px-2 py-1 text-sm text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Cerrar modal de crear viaje"
          >
            ✕
          </button>
        </div>

        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Nombre <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Ej: Italia en otoño"
              className="w-full rounded-[10px] border border-white/10 bg-[rgba(0,0,0,0.2)] px-3 py-2 text-sm text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] outline-none transition focus:border-[#3b82f6]"
              maxLength={120}
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-300">
              Descripción
            </label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Notas opcionales del viaje"
              className="min-h-20 w-full rounded-[10px] border border-white/10 bg-[rgba(0,0,0,0.2)] px-3 py-2 text-sm text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] outline-none transition focus:border-[#3b82f6]"
              maxLength={600}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Fecha inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
                className="w-full rounded-[10px] border border-white/10 bg-[rgba(0,0,0,0.2)] px-3 py-2 text-sm text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] outline-none transition focus:border-[#3b82f6]"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-300">
                Fecha fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
                className="w-full rounded-[10px] border border-white/10 bg-[rgba(0,0,0,0.2)] px-3 py-2 text-sm text-white shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] outline-none transition focus:border-[#3b82f6]"
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-rose-400/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-300">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <SecondaryButton
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </SecondaryButton>
            <PrimaryButton type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creando..." : "Crear viaje"}
            </PrimaryButton>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
