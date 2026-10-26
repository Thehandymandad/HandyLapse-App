import type { MetadataRoute } from "next";

/** Web app installabile: su iPhone Safari → Condividi → "Aggiungi alla schermata Home" apre /reel a tutto schermo. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Reel Studio",
    short_name: "Reel Studio",
    description: "Monta i tuoi reel: tagli, sottotitoli, zoom e grafiche in automatico.",
    start_url: "/reel",
    scope: "/",
    display: "standalone",
    background_color: "#0A0B0E",
    theme_color: "#0A0B0E",
    icons: [
      { src: "/reel-icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/reel-icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
