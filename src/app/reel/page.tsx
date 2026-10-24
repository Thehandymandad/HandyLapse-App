import type { Metadata } from "next";
import Link from "next/link";
import { ReelEditor } from "@/components/reel/reel-editor";

export const metadata: Metadata = {
  title: "Reel Editor AI | HandyLapse",
  description: "Monta un reel da zero: taglio pause, sottotitoli animati, zoom e motion graphics copiando lo stile da una reference.",
};

export default function ReelPage() {
  return (
    <div className="min-h-screen bg-grid-pattern flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6 shadow-3d-sm bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border/50">
        <Link href="/">
          <h2 className="text-xl font-bold text-handy-yellow drop-shadow-[0_2px_4px_rgba(255,210,0,0.3)]">HandyLapse</h2>
          <p className="text-xs text-muted-foreground">by Thehandymandad</p>
        </Link>
        <Link href="/" className="text-sm font-medium text-muted-foreground hover:text-foreground">
          Video timelapse →
        </Link>
      </header>
      <main className="flex-1">
        <ReelEditor />
      </main>
    </div>
  );
}
