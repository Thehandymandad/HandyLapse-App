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

type LiveProject = {
  status: string;
  video_url: string | null;
  start_image_url: string | null;
  end_image_url: string | null;
};

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
  const [live, setLive] = useState<LiveProject | null>(null);

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

  // Polling API stato: dati sempre freschi dal DB; quando completed aggiorniamo subito la UI (senza aspettare refresh pagina)
  useEffect(() => {
    if (status !== "pending" && status !== "generating_assets") return;

    let intervalId: ReturnType<typeof setInterval>;

    const fetchStatus = () => {
      fetch(`/api/project/${projectId}/status`)
        .then((res) => res.ok ? res.json() : null)
        .then((data: LiveProject | null) => {
          if (data) {
            setLive(data);
            if (data.status === "completed") clearInterval(intervalId);
          }
        })
        .catch(() => {});
    };

    fetchStatus();
    intervalId = setInterval(fetchStatus, 1500);
    return () => clearInterval(intervalId);
  }, [projectId, status]);

  const displayStatus = live?.status ?? status;
  const displayVideoUrl = live?.video_url ?? videoUrl;
  const displayStartUrl = live?.start_image_url ?? startImageUrl;
  const displayEndUrl = live?.end_image_url ?? endImageUrl;

  if (displayStatus === "pending" || displayStatus === "generating_assets") {
    if (error) {
      return <p className="text-sm text-destructive">{error}</p>;
    }
    return null;
  }

  if (displayStatus === "completed") {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {displayStartUrl && (
            <div className="rounded-xl overflow-hidden border-2 border-handy-yellow/30 shadow-3d-sm aspect-[9/16] max-h-[140px]">
              <img src={displayStartUrl} alt="Inizio" className="w-full h-full object-cover" />
              <p className="text-[10px] text-center py-0.5 bg-handy-yellow/20 text-neutral-700 font-medium">Inizio</p>
            </div>
          )}
          {displayEndUrl && (
            <div className="rounded-xl overflow-hidden border-2 border-handy-yellow/30 shadow-3d-sm aspect-[9/16] max-h-[140px]">
              <img src={displayEndUrl} alt="Fine" className="w-full h-full object-cover" />
              <p className="text-[10px] text-center py-0.5 bg-handy-yellow/20 text-neutral-700 font-medium">Fine</p>
            </div>
          )}
        </div>
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-foreground">Il tuo video</h3>
          {displayVideoUrl ? (
            <>
              <div
                className="mx-auto w-full max-w-[280px] overflow-hidden rounded-xl border-2 border-handy-yellow/40 bg-neutral-100 shadow-3d hover:shadow-3d-lg transition-all duration-300"
                style={{ aspectRatio: "9/16" }}
              >
                <video
                  src={displayVideoUrl}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-contain"
                  style={{ aspectRatio: "9/16" }}
                />
              </div>
              <a
                href={displayVideoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm font-medium text-handy-yellow hover:underline"
              >
                Apri video in nuova scheda →
              </a>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              Video pronto, aggiornamento in corso…
            </p>
          )}
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
