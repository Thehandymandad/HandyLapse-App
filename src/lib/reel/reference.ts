import type { ReferenceStats } from "./types";

export type ReferenceSample = {
  frames: { t: number; dataUrl: string }[];
  stats: ReferenceStats;
};

/**
 * Estrae dalla reel di riferimento i fotogrammi da mostrare all'AI (sparsi + una raffica ravvicinata
 * per vedere le animazioni dei sottotitoli) e misura il ritmo dei tagli.
 */
export async function sampleReference(file: File, onProgress?: (p: number) => void): Promise<ReferenceSample> {
  const mb = await import("mediabunny");
  const input = new mb.Input({ source: new mb.BlobSource(file), formats: mb.ALL_FORMATS });
  try {
    const track = await input.getPrimaryVideoTrack();
    if (!track || !(await track.canDecode())) throw new Error("Non riesco a leggere il video di riferimento in questo browser");
    const duration = await input.computeDuration();
    const width = await track.getDisplayWidth();
    const height = await track.getDisplayHeight();
    const t0 = await track.getFirstTimestamp();

    // 1) Ritmo dei tagli: differenza tra fotogrammi piccoli a 5 fps
    const step = 0.2;
    const paceTimes: number[] = [];
    for (let t = t0; t < t0 + Math.min(duration, 120); t += step) paceTimes.push(t);
    const tiny = new mb.CanvasSink(track, { width: 48, height: Math.max(16, Math.round((48 * height) / width)), fit: "fill", poolSize: 2 });
    const diffs: number[] = [];
    let prev: Uint8ClampedArray | null = null;
    let n = 0;
    for await (const w of tiny.canvasesAtTimestamps(paceTimes)) {
      n++;
      if (!w) continue;
      const c = w.canvas as HTMLCanvasElement;
      const data = c.getContext("2d", { willReadFrequently: true })!.getImageData(0, 0, c.width, c.height).data;
      if (prev) {
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += Math.abs(data[i] - prev[i]) + Math.abs(data[i + 1] - prev[i + 1]) + Math.abs(data[i + 2] - prev[i + 2]);
        }
        diffs.push(sum / (data.length / 4) / 3);
      }
      prev = new Uint8ClampedArray(data);
      if (n % 10 === 0) onProgress?.((n / paceTimes.length) * 0.6);
    }
    const sorted = [...diffs].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)] ?? 0;
    const threshold = Math.max(22, median * 4);
    let cuts = 0;
    diffs.forEach((d, i) => {
      if (d > threshold && (i === 0 || diffs[i - 1] <= threshold)) cuts++;
    });
    const analysed = Math.min(duration, 120);
    const cutsPerMinute = analysed > 0 ? (cuts / analysed) * 60 : 0;

    // 2) Fotogrammi per l'AI
    const times: number[] = [];
    const sparse = 14;
    for (let i = 0; i < sparse; i++) times.push(t0 + ((i + 0.5) / sparse) * duration);
    const burstAt = duration * 0.35;
    for (let i = 0; i < 8; i++) times.push(t0 + Math.min(duration - 0.05, burstAt + i * 0.1));
    times.sort((a, b) => a - b);
    const fw = 360;
    const sink = new mb.CanvasSink(track, { width: fw, height: Math.round((fw * height) / width), fit: "fill", poolSize: 1 });
    const frames: ReferenceSample["frames"] = [];
    let k = 0;
    for await (const w of sink.canvasesAtTimestamps(times)) {
      if (w) frames.push({ t: +(times[k] - t0).toFixed(2), dataUrl: (w.canvas as HTMLCanvasElement).toDataURL("image/jpeg", 0.72) });
      k++;
      onProgress?.(0.6 + (k / times.length) * 0.4);
    }

    return {
      frames,
      stats: {
        duration,
        width,
        height,
        cutsPerMinute: +cutsPerMinute.toFixed(1),
        avgShotLength: cuts > 0 ? +(analysed / (cuts + 1)).toFixed(2) : +analysed.toFixed(2),
      },
    };
  } finally {
    input.dispose();
  }
}
