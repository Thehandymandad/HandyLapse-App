import { renderFrame, OUT_H, OUT_W } from "./renderer";
import { outToSrc } from "./timeline";
import { sliceAudioBuffer } from "./mix";
import type { ReelStyle, Timeline } from "./types";

export const EXPORT_FPS = 30;

type ExportInput = {
  file: File;
  tl: Timeline;
  style: ReelStyle;
  framingX: number;
  mix: AudioBuffer;
  onProgress: (p: number, label: string) => void;
  signal?: AbortSignal;
};

export type ExportResult = { blob: Blob; ext: string; codec: string };

/** Render offline frame per frame con WebCodecs (più veloce del tempo reale e senza scatti). */
export async function exportWithWebCodecs({ file, tl, style, framingX, mix, onProgress, signal }: ExportInput): Promise<ExportResult> {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track) throw new Error("Il file non contiene una traccia video");
    if (!(await track.canDecode())) throw new Error("Il browser non riesce a decodificare questo video");

    const dw = await track.getDisplayWidth();
    const dh = await track.getDisplayHeight();
    // Decodifica alla risoluzione che serve (con margine per gli zoom), non oltre
    const k = Math.min(1, Math.max(OUT_W / dw, OUT_H / dh) * 1.4);
    const sink = new mb.CanvasSink(track, { width: Math.round(dw * k), height: Math.round(dh * k), fit: "fill", poolSize: 3 });

    const output = new mb.Output({ format: new mb.Mp4OutputFormat({ fastStart: "in-memory" }), target: new mb.BufferTarget() });
    const videoCodec = await mb.getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], { width: OUT_W, height: OUT_H });
    if (!videoCodec) throw new Error("Nessun codec video disponibile per l'export");
    const audioCodec = await mb.getFirstEncodableAudioCodec(["aac", "opus"], { numberOfChannels: 2, sampleRate: mix.sampleRate });

    const canvas = document.createElement("canvas");
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    const ctx = canvas.getContext("2d")!;

    const videoSource = new mb.CanvasSource(canvas, { codec: videoCodec, bitrate: 12_000_000, keyFrameInterval: 1 });
    output.addVideoTrack(videoSource, { frameRate: EXPORT_FPS });
    const audioSource = audioCodec ? new mb.AudioBufferSource({ codec: audioCodec, quality: mb.QUALITY_HIGH }) : null;
    if (audioSource) output.addAudioTrack(audioSource);
    await output.start();

    const t0 = await track.getFirstTimestamp();
    const frames = Math.max(1, Math.round(tl.duration * EXPORT_FPS));
    const times = Array.from({ length: frames }, (_, i) => Math.max(t0, outToSrc(tl, i / EXPORT_FPS).src + t0));
    let audioDone = 0;
    let i = 0;
    let last: CanvasImageSource | null = null;
    for await (const wrapped of sink.canvasesAtTimestamps(times)) {
      if (signal?.aborted) {
        await output.cancel();
        throw new DOMException("Export annullato", "AbortError");
      }
      if (wrapped) last = wrapped.canvas;
      const t = i / EXPORT_FPS;
      renderFrame(ctx, { source: last, srcW: wrapped?.canvas.width ?? dw * k, srcH: wrapped?.canvas.height ?? dh * k, t, tl, style, framingX });
      await videoSource.add(t, 1 / EXPORT_FPS);
      // audio interlacciato a blocchi di 1s
      if (audioSource && (t + 1 >= audioDone || i === frames - 1)) {
        const to = i === frames - 1 ? mix.duration : Math.min(mix.duration, audioDone + 1);
        if (to > audioDone) {
          await audioSource.add(sliceAudioBuffer(mix, audioDone, to));
          audioDone = to;
        }
      }
      i++;
      if (i % 5 === 0) onProgress(i / frames, `Render frame ${i}/${frames}`);
    }
    if (audioSource && audioDone < mix.duration) await audioSource.add(sliceAudioBuffer(mix, audioDone, mix.duration));
    videoSource.close();
    audioSource?.close();
    onProgress(1, "Finalizzo il file…");
    await output.finalize();
    const buffer = output.target.buffer;
    if (!buffer) throw new Error("Export vuoto");
    return { blob: new Blob([buffer], { type: "video/mp4" }), ext: "mp4", codec: `${videoCodec}/${audioCodec ?? "no-audio"}` };
  } finally {
    input.dispose();
  }
}

export async function supportsWebCodecsExport(): Promise<boolean> {
  if (typeof window === "undefined" || !("VideoEncoder" in window)) return false;
  try {
    const mb = await import("mediabunny");
    return !!(await mb.getFirstEncodableVideoCodec(["avc", "hevc", "vp9", "av1"], { width: OUT_W, height: OUT_H }));
  } catch {
    return false;
  }
}

/**
 * Fallback per browser senza WebCodecs: riproduce il montaggio in tempo reale e lo registra con MediaRecorder.
 * Il video sorgente fornisce solo i frame; l'audio è il mix già pronto.
 */
export async function exportRealtime({
  videoUrl,
  tl,
  style,
  framingX,
  mix,
  onProgress,
  signal,
}: Omit<ExportInput, "file"> & { videoUrl: string }): Promise<ExportResult> {
  const video = document.createElement("video");
  video.src = videoUrl;
  video.muted = true;
  video.playsInline = true;
  await new Promise<void>((res, rej) => {
    video.onloadeddata = () => res();
    video.onerror = () => rej(new Error("Impossibile leggere il video"));
  });
  const canvas = document.createElement("canvas");
  canvas.width = OUT_W;
  canvas.height = OUT_H;
  const ctx = canvas.getContext("2d")!;
  const audioCtx = new AudioContext();
  await audioCtx.resume();
  const dest = audioCtx.createMediaStreamDestination();
  const stream = new MediaStream([...canvas.captureStream(EXPORT_FPS).getVideoTracks(), ...dest.stream.getAudioTracks()]);
  const mime = ["video/mp4;codecs=avc1,mp4a.40.2", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm"].find((m) =>
    MediaRecorder.isTypeSupported(m),
  );
  const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 10_000_000 });
  const chunks: Blob[] = [];
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);

  const first = outToSrc(tl, 0);
  video.currentTime = first.src;
  await new Promise((r) => (video.onseeked = r));
  await video.play();
  const src = audioCtx.createBufferSource();
  src.buffer = mix;
  src.connect(dest);
  rec.start(250);
  const startAt = audioCtx.currentTime + 0.05;
  src.start(startAt);

  let seg = first.index;
  await new Promise<void>((resolve) => {
    const tick = () => {
      const t = audioCtx.currentTime - startAt;
      if (signal?.aborted || t >= tl.duration) return resolve();
      const pos = outToSrc(tl, Math.max(0, t));
      if (pos.index !== seg || Math.abs(video.currentTime - pos.src) > 0.25) {
        seg = pos.index;
        video.currentTime = pos.src;
      }
      renderFrame(ctx, { source: video, srcW: video.videoWidth, srcH: video.videoHeight, t: Math.max(0, t), tl, style, framingX });
      onProgress(Math.max(0, t) / tl.duration, "Registrazione in tempo reale…");
      requestAnimationFrame(tick);
    };
    tick();
  });
  rec.stop();
  await new Promise((r) => (rec.onstop = r));
  video.pause();
  src.stop();
  audioCtx.close();
  if (signal?.aborted) throw new DOMException("Export annullato", "AbortError");
  const type = rec.mimeType || mime || "video/webm";
  return { blob: new Blob(chunks, { type }), ext: type.includes("mp4") ? "mp4" : "webm", codec: type };
}
