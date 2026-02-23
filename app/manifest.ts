import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "GeoGallery",
    short_name: "GeoGallery",
    description:
      "Galería cartográfica de fotos con rutas de viaje, subida rápida y exploración visual.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#0f172a",
    categories: ["travel", "photo", "lifestyle"],
    lang: "es",
    icons: [
      {
        src: "/pwa/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/pwa/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    screenshots: [
      {
        src: "/pwa/splash.svg",
        sizes: "1284x2778",
        type: "image/svg+xml",
        form_factor: "wide",
      },
    ],
  };
}
