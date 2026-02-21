"use client";

import ModalShell from "./ui/ModalShell";
import { DestructiveButton, SecondaryButton } from "./ui/ModalButtons";

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmLabel = "Eliminar",
  cancelLabel = "Cancelar",
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-2200 flex items-center justify-center bg-black/65 px-4 backdrop-blur-sm">
      <ModalShell className="max-w-md">
        <h3 className="text-lg font-semibold text-zinc-100">{title}</h3>
        <p className="mt-2 text-sm text-zinc-400">{message}</p>

        <div className="mt-6 flex justify-end gap-2">
          <SecondaryButton
            type="button"
            onClick={onCancel}
            disabled={isLoading}
          >
            {cancelLabel}
          </SecondaryButton>
          <DestructiveButton
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Eliminando..." : confirmLabel}
          </DestructiveButton>
        </div>
      </ModalShell>
    </div>
  );
}
