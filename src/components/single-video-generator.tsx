"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface SingleVideoGeneratorProps {
  projectId: string;
  status: string;
  userPrompt: string | null;
  videoUrl: string | null;
  startImageUrl: string | null;
  endImageUrl: string | null;
}

export function SingleVideoGenerator({
  projectId,
  status,
  userPrompt,
  videoUrl,
  startImageUrl,
  endImageUrl,
}: SingleVideoGeneratorProps) {
  const router = useRouter();
  const [started, setStarted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "pending" || !userPrompt?.trim() || started) return;

    setStarted(true);
    setError(null);

    fetch("/api/generate-video", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Avvio generazione fallito");
        router.refresh();
      })
      .catch((err) => {
        setError(err.message || "Errore");
      });
  }, [projectId, status, userPrompt, started, router]);

  useEffect(() => {
    if (status !== "generating_assets" && status !== "completed") return;
    const interval = status === "generating_assets" ? 2000 : 5000;
    const t = setInterval(() => router.refresh(), interval);
    return () => clearInterval(t);
  }, [status, router]);

  if (status === "pending" && userPrompt) {
    return (
      <div className="rounded-xl border-2 border-handy-yellow/40 bg-handy-yellow/10 p-4 space-y-2">
        {error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : started ? (
          <div className="flex items-center gap-2 text-neutral-800">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-handy-yellow border-t-transparent" />
            <span className="text-sm font-medium">Avvio generazione video...</span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-neutral-800">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-handy-yellow border-t-transparent" />
            <span className="text-sm font-medium">Preparazione...</span>
          </div>
        )}
      </div>
    );
  }

  if (status === "generating_assets") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-2 text-neutral-800">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-handy-yellow border-t-transparent" />
          <span className="text-sm font-medium">Generazione in corso...</span>
        </div>

        {/* Le due immagini che si realizzano */}
        <div className="grid grid-cols-2 gap-4">
          <ImageSlot
            label="Inizio"
            sublabel="Prima immagine"
            imageUrl={startImageUrl}
            step={1}
          />
          <ImageSlot
            label="Fine"
            sublabel="Seconda immagine"
            imageUrl={endImageUrl}
            step={2}
          />
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Poi generiamo il video timelapse tra le due → aggiornamento automatico
        </p>
      </div>
    );
  }

  if (status === "completed" && videoUrl) {
    return (
      <div className="space-y-4">
        {/* Anteprima immagini + video in fila */}
        <div className="grid grid-cols-2 gap-3">
          {startImageUrl && (
            <div className="rounded-xl overflow-hidden border-2 border-handy-yellow/30 shadow-3d-sm aspect-[9/16] max-h-[140px]">
              <img src={startImageUrl} alt="Inizio" className="w-full h-full object-cover" />
              <p className="text-[10px] text-center py-0.5 bg-handy-yellow/20 text-neutral-700 font-medium">Inizio</p>
            </div>
          )}
          {endImageUrl && (
            <div className="rounded-xl overflow-hidden border-2 border-handy-yellow/30 shadow-3d-sm aspect-[9/16] max-h-[140px]">
              <img src={endImageUrl} alt="Fine" className="w-full h-full object-cover" />
              <p className="text-[10px] text-center py-0.5 bg-handy-yellow/20 text-neutral-700 font-medium">Fine</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Video (9:16)</h3>
          <div
            className="mx-auto w-full max-w-[280px] overflow-hidden rounded-xl border-2 border-handy-yellow/40 bg-neutral-100 shadow-3d hover:shadow-3d-lg transition-all duration-300"
            style={{ aspectRatio: "9/16" }}
          >
            <video
              src={videoUrl}
              controls
              playsInline
              className="h-full w-full object-contain"
              style={{ aspectRatio: "9/16" }}
            />
          </div>
        </div>
      </div>
    );
  }

  return null;
}

function ImageSlot({
  label,
  sublabel,
  imageUrl,
  step,
}: {
  label: string;
  sublabel: string;
  imageUrl: string | null;
  step: number;
}) {
  const isReady = !!imageUrl;

  return (
    <div
      className={`relative rounded-xl border-2 overflow-hidden transition-all duration-500 ${
        isReady
          ? "border-handy-yellow/50 shadow-3d-yellow scale-100 opacity-100"
          : "border-handy-yellow/30 bg-handy-yellow/5 shadow-3d-sm"
      }`}
      style={{ aspectRatio: "9/16" }}
    >
      {isReady ? (
        <>
          <img
            src={imageUrl}
            alt={label}
            className="absolute inset-0 w-full h-full object-cover animate-fade-in-zoom"
          />
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-2">
            <p className="text-xs font-semibold text-white">{label}</p>
            <p className="text-[10px] text-white/80">{sublabel}</p>
          </div>
          <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-handy-yellow flex items-center justify-center text-xs font-bold text-neutral-900">
            ✓
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
          <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-handy-yellow border-t-transparent mb-2" />
          <p className="text-xs font-semibold text-neutral-700">{label}</p>
          <p className="text-[10px] text-muted-foreground">{sublabel}</p>
          <span className="absolute top-2 right-2 w-6 h-6 rounded-full bg-handy-yellow/30 flex items-center justify-center text-xs font-bold text-neutral-600">
            {step}
          </span>
        </div>
      )}
    </div>
  );
}
