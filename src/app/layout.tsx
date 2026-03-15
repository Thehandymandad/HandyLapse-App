import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "HandyLapse | by Thehandymandad",
  description:
    "Scrivi un'idea. Guarda il video. HandyLapse crea video timelapse da testo — by Il papà tuttofare.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
