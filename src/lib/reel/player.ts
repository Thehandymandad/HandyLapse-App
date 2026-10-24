import { renderFrame, OUT_H, OUT_W } from "./renderer";
import { outToSrc } from "./timeline";
import type { ReelStyle, Timeline } from "./types";

/**
 * Anteprima in tempo reale: il <video> (muto) fornisce i frame e salta da un segmento all'altro,
 * l'orologio è quello dell'audio già mixato, così l'audio non ha buchi sui tagli.
 */
export class ReelPlayer {
  private ctx: CanvasRenderingContext2D;
  private audioCtx: AudioContext | null = null;
  private audioNode: AudioBufferSourceNode | null = null;
  private startedAt = 0;
  private perfStart = 0;
  private raf = 0;
  private seg = -1;
  private mix: AudioBuffer | null = null;
  playing = false;
  time = 0;
  tl: Timeline | null = null;
  style: ReelStyle | null = null;
  framingX = 0.5;
  onTime: (t: number, playing: boolean) => void = () => undefined;

  constructor(
    private canvas: HTMLCanvasElement,
    private video: HTMLVideoElement,
  ) {
    canvas.width = OUT_W;
    canvas.height = OUT_H;
    this.ctx = canvas.getContext("2d")!;
    video.muted = true;
    video.playsInline = true;
    video.addEventListener("seeked", this.handleSeeked);
    video.addEventListener("loadeddata", this.handleSeeked);
  }

  private handleSeeked = () => {
    if (!this.playing) this.draw();
  };

  setData(tl: Timeline, style: ReelStyle, framingX: number) {
    this.tl = tl;
    this.style = style;
    this.framingX = framingX;
    if (this.time > tl.duration) this.time = tl.duration;
    if (!this.playing) this.syncVideo(true);
  }

  setMix(mix: AudioBuffer | null) {
    this.mix = mix;
    if (this.playing) this.restartAudio();
  }

  draw() {
    if (!this.tl || !this.style) return;
    const ready = this.video.readyState >= 2;
    renderFrame(this.ctx, {
      source: ready ? this.video : null,
      srcW: this.video.videoWidth,
      srcH: this.video.videoHeight,
      t: this.time,
      tl: this.tl,
      style: this.style,
      framingX: this.framingX,
    });
  }

  private syncVideo(force = false) {
    if (!this.tl) return;
    const pos = outToSrc(this.tl, this.time);
    if (pos.index < 0) return;
    if (force || pos.index !== this.seg || Math.abs(this.video.currentTime - pos.src) > 0.2) {
      this.seg = pos.index;
      if (!this.video.seeking || force) this.video.currentTime = pos.src;
    }
  }

  private now() {
    if (this.audioCtx && this.audioNode) return this.audioCtx.currentTime - this.startedAt;
    return (performance.now() - this.perfStart) / 1000;
  }

  private restartAudio() {
    this.audioNode?.stop();
    this.audioNode?.disconnect();
    this.audioNode = null;
    this.perfStart = performance.now() - this.time * 1000;
    if (!this.audioCtx || !this.mix) return;
    const node = this.audioCtx.createBufferSource();
    node.buffer = this.mix;
    node.connect(this.audioCtx.destination);
    const at = this.audioCtx.currentTime + 0.03;
    node.start(at, Math.min(this.time, this.mix.duration));
    this.startedAt = at - this.time;
    this.audioNode = node;
  }

  async play() {
    if (!this.tl || this.playing) return;
    if (this.time >= this.tl.duration - 0.05) this.time = 0;
    if (!this.audioCtx) this.audioCtx = new AudioContext();
    await this.audioCtx.resume().catch(() => undefined);
    this.playing = true;
    this.syncVideo(true);
    this.video.play().catch(() => undefined);
    this.restartAudio();
    const loop = () => {
      if (!this.playing || !this.tl) return;
      this.time = Math.max(0, this.now());
      if (this.time >= this.tl.duration) {
        this.time = this.tl.duration;
        this.pause();
        return;
      }
      this.syncVideo();
      this.draw();
      this.onTime(this.time, true);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  pause() {
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.audioNode?.stop();
    this.audioNode = null;
    this.video.pause();
    this.onTime(this.time, false);
    this.draw();
  }

  seek(t: number) {
    if (!this.tl) return;
    this.time = Math.min(Math.max(0, t), this.tl.duration);
    this.syncVideo(true);
    if (this.playing) this.restartAudio();
    else this.draw();
    this.onTime(this.time, this.playing);
  }

  destroy() {
    this.pause();
    this.video.removeEventListener("seeked", this.handleSeeked);
    this.video.removeEventListener("loadeddata", this.handleSeeked);
    this.audioCtx?.close().catch(() => undefined);
  }
}
