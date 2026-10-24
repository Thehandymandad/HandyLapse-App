import { resolveFont } from "./fonts";
import type { CaptionGroup, GraphicEvent, ReelStyle, Timeline } from "./types";

export const OUT_W = 1080;
export const OUT_H = 1920;

const EMOJI_FONT = '"Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';

export type FrameInput = {
  source: CanvasImageSource | null;
  srcW: number;
  srcH: number;
  /** Tempo di output in secondi. */
  t: number;
  tl: Timeline;
  style: ReelStyle;
  /** Inquadratura orizzontale quando il video è più largo del 9:16 (0 = sinistra, 1 = destra). */
  framingX: number;
};

// ---------- easing ----------
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const easeOutCubic = (x: number) => 1 - Math.pow(1 - clamp01(x), 3);
const easeInOutSine = (x: number) => -(Math.cos(Math.PI * clamp01(x)) - 1) / 2;
const easeOutBack = (x: number, s = 1.70158) => {
  const p = clamp01(x) - 1;
  return 1 + (s + 1) * p * p * p + s * p * p;
};
const easeOutElastic = (x: number) => {
  const p = clamp01(x);
  if (p === 0 || p === 1) return p;
  return Math.pow(2, -10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1;
};
const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function luminance(color: string) {
  const m = color.match(/^#([0-9a-f]{6}|[0-9a-f]{3})/i);
  if (!m) {
    const rgb = color.match(/(\d+(?:\.\d+)?)/g);
    if (!rgb || rgb.length < 3) return 0.5;
    return (0.299 * +rgb[0] + 0.587 * +rgb[1] + 0.114 * +rgb[2]) / 255;
  }
  const hex = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1];
  const n = parseInt(hex, 16);
  return (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

const contrastText = (bg: string) => (luminance(bg) > 0.6 ? "#111111" : "#FFFFFF");

function fontString(family: string, weight: number, size: number) {
  const f = resolveFont(family, weight);
  return `${f.weight} ${Math.round(size)}px "${f.family}", "Arial Black", sans-serif`;
}

function setLetterSpacing(ctx: CanvasRenderingContext2D, px: number) {
  const c = ctx as CanvasRenderingContext2D & { letterSpacing?: string };
  if ("letterSpacing" in c) c.letterSpacing = `${px}px`;
}

// ---------- zoom ----------
export function zoomAt(t: number, tl: Timeline, style: ReelStyle) {
  let z = 1;
  if (!style.zoom.enabled) return z;
  if (style.zoom.alternateOnCuts) {
    let k = 0;
    for (const c of tl.cuts) if (c <= t) k++;
    if (k % 2 === 1) z *= style.zoom.alternateScale;
  }
  for (const e of tl.zooms) {
    if (t < e.start || t > e.end) continue;
    const len = e.end - e.start;
    let amt: number;
    if (e.kind === "punch") {
      amt = easeOutCubic(Math.min((t - e.start) / 0.08, (e.end - t) / 0.18));
    } else {
      const back = 0.45;
      amt = t < e.end - back ? easeInOutSine((t - e.start) / Math.max(0.1, len - back)) : easeInOutSine((e.end - t) / back);
    }
    z *= 1 + (e.scale - 1) * amt;
  }
  return z;
}

// ---------- frame ----------
const vignetteCache = new Map<string, CanvasGradient>();

export function renderFrame(ctx: CanvasRenderingContext2D, f: FrameInput) {
  const { t, tl, style } = f;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, OUT_W, OUT_H);

  if (f.source && f.srcW > 0 && f.srcH > 0) {
    const cover = Math.max(OUT_W / f.srcW, OUT_H / f.srcH);
    const dw = f.srcW * cover;
    const dh = f.srcH * cover;
    const dx = (OUT_W - dw) * clamp01(f.framingX);
    const dy = (OUT_H - dh) / 2;
    let z = zoomAt(t, tl, style);
    const fx = OUT_W * style.zoom.focusX;
    const fy = OUT_H * style.zoom.focusY;
    let sx = 0;
    let sy = 0;
    if (style.zoom.shake) {
      const active = tl.zooms.find((e) => e.kind === "punch" && t >= e.start && t < e.start + 0.25);
      if (active) {
        const k = 1 - (t - active.start) / 0.25;
        sx = Math.sin(t * 90) * 14 * k;
        sy = Math.cos(t * 70) * 10 * k;
        z *= 1.03;
      }
    }
    ctx.save();
    ctx.translate(fx + sx, fy + sy);
    ctx.scale(z, z);
    ctx.translate(-fx, -fy);
    const g = style.grade;
    const filters = [
      g.brightness !== 1 && `brightness(${g.brightness})`,
      g.contrast !== 1 && `contrast(${g.contrast})`,
      g.saturation !== 1 && `saturate(${g.saturation})`,
      g.warmth > 0 && `sepia(${(g.warmth * 0.35).toFixed(3)})`,
      g.warmth < 0 && `hue-rotate(${(g.warmth * 12).toFixed(1)}deg)`,
    ].filter(Boolean);
    if (filters.length) ctx.filter = filters.join(" ");
    ctx.drawImage(f.source, dx, dy, dw, dh);
    ctx.restore();
  }

  if (style.grade.vignette > 0) {
    const key = style.grade.vignette.toFixed(2);
    let grad = vignetteCache.get(key);
    if (!grad) {
      grad = ctx.createRadialGradient(OUT_W / 2, OUT_H / 2, OUT_H * 0.25, OUT_W / 2, OUT_H / 2, OUT_H * 0.75);
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, `rgba(0,0,0,${(style.grade.vignette * 0.85).toFixed(3)})`);
      vignetteCache.set(key, grad);
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, OUT_W, OUT_H);
  }

  if (style.motion.flashOnCut) {
    for (const c of tl.cuts) {
      const d = t - c;
      if (d >= 0 && d < 0.12) {
        ctx.fillStyle = `rgba(255,255,255,${((1 - d / 0.12) * 0.5).toFixed(3)})`;
        ctx.fillRect(0, 0, OUT_W, OUT_H);
      }
    }
  }

  for (const g of tl.graphics) {
    if (t >= g.start && t < g.end) drawGraphic(ctx, g, t, style);
  }

  const group = tl.captions.find((c) => t >= c.start && t < c.end);
  if (group) drawCaption(ctx, group, t, style);

  if (style.motion.progressBar && tl.duration > 0) {
    const h = 14;
    const y = style.motion.progressBarPosition === "top" ? 0 : OUT_H - h;
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.fillRect(0, y, OUT_W, h);
    ctx.fillStyle = style.motion.accentColor;
    ctx.fillRect(0, y, OUT_W * clamp01(t / tl.duration), h);
  }
  ctx.restore();
}

// ---------- captions ----------
type Placed = { text: string; x: number; y: number; w: number; idx: number };

function layoutLines(ctx: CanvasRenderingContext2D, words: string[], maxWidth: number, maxChars: number) {
  const space = ctx.measureText(" ").width;
  const lines: { idx: number[]; width: number }[] = [];
  let cur: number[] = [];
  let width = 0;
  let chars = 0;
  words.forEach((w, i) => {
    const ww = ctx.measureText(w).width;
    if (cur.length && (width + space + ww > maxWidth || chars + 1 + w.length > maxChars)) {
      lines.push({ idx: cur, width });
      cur = [];
      width = 0;
      chars = 0;
    }
    width += (cur.length ? space : 0) + ww;
    chars += (cur.length ? 1 : 0) + w.length;
    cur.push(i);
  });
  if (cur.length) lines.push({ idx: cur, width });
  return { lines, space };
}

function drawCaption(ctx: CanvasRenderingContext2D, g: CaptionGroup, t: number, style: ReelStyle) {
  const c = style.captions;
  const age = t - g.start;
  const maxWidth = OUT_W * 0.84;
  let size = c.fontSize;
  ctx.save();
  setLetterSpacing(ctx, c.letterSpacing);
  ctx.font = fontString(c.fontFamily, c.fontWeight, size);
  const texts = g.words.map((w) => w.text);
  const widest = Math.max(...texts.map((w) => ctx.measureText(w).width));
  if (widest > maxWidth) {
    size *= maxWidth / widest;
    ctx.font = fontString(c.fontFamily, c.fontWeight, size);
  }
  const { lines, space } = layoutLines(ctx, texts, maxWidth, c.maxCharsPerLine);
  const lineH = size * 1.14;
  const totalH = lines.length * lineH;
  const cy = OUT_H * c.positionY;
  const top = cy - totalH / 2;

  const placed: Placed[] = [];
  lines.forEach((line, li) => {
    let x = OUT_W / 2 - line.width / 2;
    const y = top + li * lineH + lineH / 2;
    for (const i of line.idx) {
      const w = ctx.measureText(texts[i]).width;
      placed.push({ text: texts[i], x, y, w, idx: i });
      x += w + space;
    }
  });

  // Animazione di entrata del blocco
  let scale = 1;
  let alpha = 1;
  let dy = 0;
  switch (c.animation) {
    case "pop":
      scale = 0.7 + 0.3 * easeOutBack(age / 0.18, 2.2);
      alpha = clamp01(age / 0.06);
      break;
    case "bounce":
      scale = 0.45 + 0.55 * easeOutElastic(age / 0.45);
      alpha = clamp01(age / 0.05);
      break;
    case "fade":
      alpha = easeOutCubic(age / 0.2);
      break;
    case "slide-up":
      dy = (1 - easeOutCubic(age / 0.22)) * 70;
      alpha = easeOutCubic(age / 0.18);
      break;
  }
  const tilt = c.tilt ? ((rand(g.seed) - 0.5) * 2 * c.tilt * Math.PI) / 180 : 0;

  ctx.translate(OUT_W / 2, cy + dy);
  ctx.rotate(tilt);
  ctx.scale(scale, scale);
  ctx.translate(-OUT_W / 2, -cy);
  ctx.globalAlpha = alpha;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.lineJoin = "round";
  ctx.miterLimit = 2;

  if (c.background !== "none" && placed.length) {
    const padX = size * 0.35;
    const padY = size * 0.18;
    const w = Math.max(...lines.map((l) => l.width)) + padX * 2;
    ctx.fillStyle = c.backgroundColor;
    roundRect(ctx, OUT_W / 2 - w / 2, top - padY, w, totalH + padY * 2, c.background === "pill" ? (totalH + padY * 2) / 2 : size * 0.22);
    ctx.fill();
  }

  if (g.emoji) {
    const ea = clamp01(age / 0.25);
    ctx.save();
    ctx.font = `${Math.round(size * 1.15)}px ${EMOJI_FONT}`;
    ctx.textAlign = "center";
    const es = easeOutBack(ea, 2.5);
    ctx.translate(OUT_W / 2, top - size * 0.85);
    ctx.scale(es, es);
    ctx.rotate(Math.sin(age * 6) * 0.08);
    ctx.fillText(g.emoji, 0, 0);
    ctx.restore();
  }

  const activeIdx = g.words.findIndex((w, i) => t >= w.start && (i === g.words.length - 1 || t < g.words[i + 1].start));

  for (const p of placed) {
    const w = g.words[p.idx];
    if (c.animation === "typewriter" && t < w.start) continue;
    const active = p.idx === activeIdx && c.highlightMode !== "none";
    let fill = c.color;
    if (c.highlightMode !== "none" && w.keyword) fill = c.keywordColor;
    if (active && c.highlightMode !== "box") fill = c.highlightColor;

    ctx.save();
    let ws = 1;
    if (active && (c.highlightMode === "scale" || c.animation === "pop" || c.animation === "bounce")) {
      const wa = t - w.start;
      ws = (c.highlightMode === "scale" ? 1.12 : 1) + 0.1 * Math.max(0, 1 - wa / 0.14);
    }
    if (ws !== 1) {
      ctx.translate(p.x + p.w / 2, p.y);
      ctx.scale(ws, ws);
      ctx.translate(-(p.x + p.w / 2), -p.y);
    }
    if (active && c.highlightMode === "box") {
      const padX = size * 0.14;
      const padY = size * 0.08;
      ctx.fillStyle = c.highlightColor;
      roundRect(ctx, p.x - padX, p.y - size * 0.55 - padY, p.w + padX * 2, size * 1.1 + padY * 2, size * 0.18);
      ctx.fill();
      fill = c.strokeWidth > 0 ? c.color : contrastText(c.highlightColor);
    }
    if (active && c.highlightMode === "underline") {
      ctx.fillStyle = c.highlightColor;
      roundRect(ctx, p.x, p.y + size * 0.48, p.w, size * 0.12, size * 0.06);
      ctx.fill();
    }
    const boxed = active && c.highlightMode === "box";
    if (c.strokeWidth > 0 && !boxed) {
      ctx.shadowColor = c.shadowColor;
      ctx.shadowBlur = c.shadowBlur;
      ctx.shadowOffsetY = c.shadowOffsetY;
      ctx.strokeStyle = c.strokeColor;
      ctx.lineWidth = c.strokeWidth * 2;
      ctx.strokeText(p.text, p.x, p.y);
      ctx.shadowColor = "transparent";
    } else if (!boxed) {
      ctx.shadowColor = c.shadowColor;
      ctx.shadowBlur = c.shadowBlur;
      ctx.shadowOffsetY = c.shadowOffsetY;
    }
    ctx.fillStyle = fill;
    ctx.fillText(p.text, p.x, p.y);
    ctx.restore();
  }
  ctx.restore();
}

// ---------- motion graphics ----------
function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (cur && ctx.measureText(next).width > maxWidth) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

function drawGraphic(ctx: CanvasRenderingContext2D, g: GraphicEvent, t: number, style: ReelStyle) {
  const m = style.motion;
  const age = t - g.start;
  const left = g.end - t;
  const outP = clamp01(left / 0.2);
  // Le grafiche stanno nella metà opposta ai sottotitoli
  const baseY = style.captions.positionY > 0.5 ? OUT_H * 0.24 : OUT_H * 0.7;
  ctx.save();
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  ctx.lineJoin = "round";

  if (g.kind === "emoji" || (!g.text && g.emoji)) {
    const s = easeOutElastic(age / 0.6) * outP;
    ctx.translate(OUT_W / 2, baseY);
    ctx.rotate(Math.sin(age * 5) * 0.12);
    ctx.scale(s, s);
    ctx.font = `230px ${EMOJI_FONT}`;
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 30;
    ctx.fillText(g.emoji || "✨", 0, 0);
    if (g.text) {
      ctx.font = fontString(m.fontFamily, 900, 70);
      ctx.fillStyle = "#fff";
      ctx.strokeStyle = "#000";
      ctx.lineWidth = 14;
      ctx.strokeText(g.text, 0, 170);
      ctx.fillText(g.text, 0, 170);
    }
    ctx.restore();
    return;
  }

  if (g.kind === "stat") {
    const x = OUT_W / 2 + (1 - easeOutBack(age / 0.35, 1.4)) * -OUT_W * 0.8;
    ctx.globalAlpha = outP;
    ctx.translate(x, baseY);
    ctx.rotate(-0.05);
    ctx.font = fontString(m.fontFamily, 900, 150);
    const lines = wrap(ctx, g.text, OUT_W * 0.86);
    lines.forEach((line, i) => {
      const y = (i - (lines.length - 1) / 2) * 150;
      ctx.strokeStyle = m.secondaryColor;
      ctx.lineWidth = 24;
      ctx.strokeText(line, 0, y);
      ctx.fillStyle = m.accentColor;
      ctx.fillText(line, 0, y);
    });
    if (g.emoji) {
      ctx.font = `120px ${EMOJI_FONT}`;
      ctx.fillText(g.emoji, 0, -lines.length * 75 - 70);
    }
    ctx.restore();
    return;
  }

  if (g.kind === "list") {
    const size = 64;
    ctx.font = fontString(m.fontFamily, 800, size);
    const label = `${g.emoji ?? "✓"}  ${g.text}`;
    const w = Math.min(OUT_W * 0.86, ctx.measureText(label).width + 80);
    const x = 60 - (1 - easeOutCubic(age / 0.3)) * (w + 80) - (1 - outP) * (w + 80);
    ctx.textAlign = "left";
    ctx.shadowColor = "rgba(0,0,0,0.35)";
    ctx.shadowBlur = 24;
    ctx.fillStyle = m.accentColor;
    roundRect(ctx, x, baseY - 60, w, 120, 60);
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.fillStyle = m.textColor;
    ctx.fillText(label, x + 40, baseY + 2, w - 80);
    ctx.restore();
    return;
  }

  // hook + keyword: card colorata con pop
  const isHook = g.kind === "hook";
  const size = isHook ? 88 : 76;
  ctx.font = fontString(m.fontFamily, 900, size);
  const lines = wrap(ctx, g.text, OUT_W * 0.76);
  const lineH = size * 1.12;
  const w = Math.max(...lines.map((l) => ctx.measureText(l).width)) + size * 0.9;
  const h = lines.length * lineH + size * 0.55;
  const s = (isHook ? easeOutBack(age / 0.4, 2) : easeOutBack(age / 0.3, 2.6)) * (0.6 + 0.4 * outP);
  const y = isHook ? OUT_H * (style.captions.positionY > 0.5 ? 0.2 : 0.72) : baseY;
  const rot = isHook ? -0.035 : (rand(g.start * 7) - 0.5) * 0.12;
  ctx.globalAlpha = outP;
  ctx.translate(OUT_W / 2, y);
  ctx.rotate(rot);
  ctx.scale(s, s);
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 10;
  ctx.fillStyle = m.accentColor;
  roundRect(ctx, -w / 2, -h / 2, w, h, size * 0.28);
  ctx.fill();
  ctx.shadowColor = "transparent";
  if (isHook) {
    // barra decorativa che si allunga
    ctx.fillStyle = m.secondaryColor;
    const bw = w * 0.5 * easeOutCubic((age - 0.25) / 0.4);
    roundRect(ctx, -bw / 2, h / 2 + 18, bw, 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = m.textColor;
  lines.forEach((line, i) => ctx.fillText(line, 0, (i - (lines.length - 1) / 2) * lineH + size * 0.04));
  if (g.emoji) {
    ctx.font = `${size * 1.2}px ${EMOJI_FONT}`;
    ctx.fillText(g.emoji, w / 2 - size * 0.2, -h / 2 - size * 0.1);
  }
  ctx.restore();
}
