import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Reel Studio",
  description: "Monta i tuoi reel: tagli, sottotitoli, zoom e grafiche in automatico.",
  appleWebApp: { capable: true, title: "Reel Studio", statusBarStyle: "black-translucent" },
  icons: { icon: "/reel-icon-192.png", apple: "/reel-icon-180.png" },
};

export const viewport: Viewport = {
  themeColor: "#0A0B0E",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function ReelLayout({ children }: { children: React.ReactNode }) {
  return children;
}
