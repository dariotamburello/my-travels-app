import { PhotoPoint } from "../lib/types";

interface PhotoPreviewPopupHandlers {
  onOpenFullScreen: () => void;
  onDeleteClick: () => void;
}

export function buildPhotoPreviewPopupContent(photo: PhotoPoint): string {
  const previewUrl = photo.previewUrl || photo.fullUrl || photo.imagePath || "";

  const locationInfo = photo.location || {};
  const cityCountry =
    [locationInfo.city, locationInfo.country].filter(Boolean).join(", ") ||
    "Ubicación desconocida";
  const nameCounty = [locationInfo.name, locationInfo.county]
    .filter(Boolean)
    .join(", ");

  return `
    <div class="photo-popup">
      <img
        src="${previewUrl}"
        alt="${photo.title || "Photo"}"
        class="photo-popup-image"
        data-point-id="${photo.id}"
        style="cursor: zoom-in;"
      />
      <div class="photo-popup-info">
        <div class="photo-popup-location">
          <span>${cityCountry}</span>
          <button
            class="photo-popup-delete"
            aria-label="Eliminar foto"
            title="Eliminar foto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 6h18"></path>
              <path d="M8 6V4h8v2"></path>
              <path d="M19 6l-1 14H6L5 6"></path>
              <path d="M10 11v6"></path>
              <path d="M14 11v6"></path>
            </svg>
          </button>
        </div>
        ${nameCounty ? `<div class="photo-popup-place">${nameCounty}</div>` : ""}
        ${
          photo.dateTime
            ? `<div class="photo-popup-date">
            ${new Date(photo.dateTime).toLocaleDateString("es-ES", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>`
            : ""
        }
      </div>
    </div>
  `;
}

export function attachPhotoPreviewPopupHandlers(
  container: HTMLElement,
  handlers: PhotoPreviewPopupHandlers,
) {
  const image = container.querySelector<HTMLImageElement>(".photo-popup-image");
  if (image) {
    image.style.cursor = "zoom-in";
    image.addEventListener("click", handlers.onOpenFullScreen);
  }

  const deleteButton = container.querySelector<HTMLButtonElement>(
    ".photo-popup-delete",
  );

  if (deleteButton) {
    deleteButton.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      handlers.onDeleteClick();
    });
  }
}
