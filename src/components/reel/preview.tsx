"use client";

import { useEffect, useRef, useState } from "react";
import { Pause, Play, SkipBack } from "lucide-react";
import { ReelPlayer } from "@/lib/reel/player";
import type { ReelStyle, Timeline } from "@/lib/reel/types";
import { formatTime } from "./controls";

type Props = {
  videoUrl: string;
  tl: Timeline;
  style: ReelStyle;
  framingX: number;
  mix: AudioBuffer | null;
  playerRef: React.MutableRefObject<ReelPlayer | null>;
  onTime?: (t: number) => void;
};

export function ReelPreview({ videoUrl, tl, style, framingX, mix, playerRef, onTime }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const onTimeRef = useRef(onTime);
  onTimeRef.current = onTime;

  useEffect(() => {
    const player = new ReelPlayer(canvasRef.current!, videoRef.current!);
    player.onTime = (t, p) => {
      setTime(t);
      setPlaying(p);
      onTimeRef.current?.(t);
    };
    playerRef.current = player;
    return () => {
      player.destroy();
      playerRef.current = null;
    };
  }, [playerRef]);

  useEffect(() => {
    playerRef.current?.setData(tl, style, framingX);
  }, [tl, style, framingX, playerRef]);

  useEffect(() => {
    playerRef.current?.setMix(mix);
  }, [mix, playerRef]);

  // Ridisegna quando i font finiscono di caricarsi
  useEffect(() => {
    const redraw = () => playerRef.current && !playerRef.current.playing && playerRef.current.draw();
    document.fonts?.addEventListener?.("loadingdone", redraw);
    return () => document.fonts?.removeEventListener?.("loadingdone", redraw);
  }, [playerRef]);

  const toggle = () => {
    const p = playerRef.current;
    if (!p) return;
    if (p.playing) p.pause();
    else p.play();
  };

  const seekFromEvent = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    playerRef.current?.seek(x * tl.duration);
  };

  const pct = (t: number) => `${(t / Math.max(0.001, tl.duration)) * 100}%`;

  return (
    <div className="space-y-3">
      <div className="relative mx-auto aspect-[9/16] w-full max-w-[340px] overflow-hidden rounded-[28px] border-[6px] border-neutral-900 bg-black shadow-3d-lg">
        <canvas ref={canvasRef} className="h-full w-full" onClick={toggle} />
        <video ref={videoRef} src={videoUrl} className="pointer-events-none absolute left-0 top-0 h-px w-px opacity-0" preload="auto" playsInline muted />
        {!playing && (
          <button
            type="button"
            onClick={toggle}
            className="absolute inset-0 m-auto flex h-16 w-16 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur transition hover:scale-105"
            aria-label="Riproduci"
          >
            <Play className="h-8 w-8 translate-x-0.5" />
          </button>
        )}
      </div>

      <div className="mx-auto w-full max-w-[340px] space-y-2">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => playerRef.current?.seek(0)} className="rounded-md p-1.5 hover:bg-neutral-100" aria-label="Inizio">
            <SkipBack className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={toggle}
            className="rounded-full bg-handy-yellow p-2 shadow-3d-yellow transition hover:-translate-y-0.5"
            aria-label={playing ? "Pausa" : "Play"}
          >
            {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </button>
          <span className="ml-auto font-mono text-xs tabular-nums text-muted-foreground">
            {formatTime(time)} / {formatTime(tl.duration)}
          </span>
        </div>

        <div
          className="relative h-12 cursor-pointer touch-none select-none rounded-lg bg-neutral-100"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            seekFromEvent(e);
          }}
          onPointerMove={(e) => e.buttons && seekFromEvent(e)}
        >
          {tl.captions.map((c, i) => (
            <div key={`c${i}`} className="absolute top-1 h-3 rounded-sm bg-neutral-400/60" style={{ left: pct(c.start), width: pct(c.end - c.start) }} />
          ))}
          {tl.zooms.map((z, i) => (
            <div key={`z${i}`} className="absolute top-5 h-2.5 rounded-sm bg-sky-400/80" style={{ left: pct(z.start), width: pct(z.end - z.start) }} />
          ))}
          {tl.graphics.map((g) => (
            <div key={g.id} className="absolute bottom-1 h-3 rounded-sm bg-handy-yellow" style={{ left: pct(g.start), width: pct(g.end - g.start) }} />
          ))}
          {tl.cuts.map((c, i) => (
            <div key={`k${i}`} className="absolute inset-y-0 w-px bg-red-400/70" style={{ left: pct(c) }} />
          ))}
          <div className="absolute -top-1 -bottom-1 w-0.5 rounded bg-neutral-900" style={{ left: pct(time) }} />
        </div>
        <p className="flex flex-wrap gap-x-3 text-[11px] text-muted-foreground">
          <span>▬ sottotitoli</span>
          <span className="text-sky-500">▬ zoom</span>
          <span className="text-yellow-500">▬ grafiche</span>
          <span className="text-red-400">| tagli ({tl.cuts.length})</span>
        </p>
      </div>
    </div>
  );
}
