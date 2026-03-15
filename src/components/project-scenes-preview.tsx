"use client";

/**
 * Anteprima scene in formato verticale 9:16 (TikTok/Reels).
 * I video sono mostrati senza taglio: aspect-ratio 9/16, object-fit contain.
 */
interface Scene {
  id: string;
  order_index: number;
  hook_type: string;
  video_url: string | null;
  audio_url: string | null;
  narrator_script?: string | null;
}

interface ProjectScenesPreviewProps {
  scenes: Scene[];
}

export function ProjectScenesPreview({ scenes }: ProjectScenesPreviewProps) {
  if (scenes.length === 0) return null;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-foreground">Anteprima scene (9:16 verticale)</h3>
      <div className="flex flex-col items-center gap-6">
        {scenes
          .sort((a, b) => a.order_index - b.order_index)
          .map((scene) => (
            <div key={scene.id} className="w-full space-y-2">
              <p className="text-xs text-muted-foreground capitalize">
                {scene.hook_type.replace(/_/g, " ")} — Scena {scene.order_index}
              </p>
              <div
                className="mx-auto w-full max-w-[280px] overflow-hidden rounded-xl bg-black/5 dark:bg-black/20"
                style={{ aspectRatio: "9/16" }}
              >
                {scene.video_url ? (
                  <video
                    src={scene.video_url}
                    controls
                    playsInline
                    className="h-full w-full object-contain"
                    style={{ aspectRatio: "9/16" }}
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                    Video in generazione…
                  </div>
                )}
              </div>
              {scene.audio_url && (
                <audio src={scene.audio_url} controls className="w-full max-w-[280px]" />
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
