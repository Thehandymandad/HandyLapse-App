import { logoOutline } from "./logo";

/**
 * Icone delle app disegnate da codice su canvas 2D (niente immagini scaricate): servono come facce
 * delle card del carosello 3D. Stilizzate, riconoscibili per forma e colori.
 */
export type AppIcon = "instagram" | "tiktok" | "claude" | "openai";

function rounded(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Nota musicale di TikTok (su griglia 100×100). */
const TIKTOK_NOTE =
  "M52 14 h13 c1 9 7 16 17 17 v13 c-7 0 -13 -2 -17 -5 v26 c0 13 -10 22 -22 22 c-12 0 -21 -9 -21 -21 c0 -13 11 -22 24 -20 v13 c-5 -1 -11 2 -11 8 c0 5 4 8 8 8 c5 0 9 -4 9 -9 z";

/** Disegna l'icona nel quadrato [0,size]. */
export function drawAppIcon(ctx: CanvasRenderingContext2D, icon: AppIcon, size: number) {
  const r = size * 0.22;
  ctx.save();
  switch (icon) {
    case "instagram": {
      const g = ctx.createRadialGradient(size * 0.3, size * 1.05, size * 0.05, size * 0.3, size * 1.05, size * 1.3);
      g.addColorStop(0, "#FEDA75");
      g.addColorStop(0.25, "#FA7E1E");
      g.addColorStop(0.5, "#D62976");
      g.addColorStop(0.75, "#962FBF");
      g.addColorStop(1, "#4F5BD5");
      rounded(ctx, 0, 0, size, size, r);
      ctx.fillStyle = g;
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = size * 0.075;
      rounded(ctx, size * 0.2, size * 0.2, size * 0.6, size * 0.6, size * 0.17);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size * 0.14, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "#fff";
      ctx.beginPath();
      ctx.arc(size * 0.67, size * 0.33, size * 0.04, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "tiktok": {
      rounded(ctx, 0, 0, size, size, r);
      ctx.fillStyle = "#010101";
      ctx.fill();
      const p = new Path2D(TIKTOK_NOTE);
      const s = size / 100;
      for (const [dx, color] of [
        [-2.2, "#25F4EE"],
        [2.2, "#FE2C55"],
        [0, "#FFFFFF"],
      ] as const) {
        ctx.save();
        ctx.translate(dx * s, dx * s * 0.6);
        ctx.scale(s, s);
        ctx.fillStyle = color;
        ctx.fill(p);
        ctx.restore();
      }
      break;
    }
    case "claude": {
      rounded(ctx, 0, 0, size, size, r);
      ctx.fillStyle = "#F4EFE6";
      ctx.fill();
      ctx.fillStyle = "#D9704F";
      ctx.beginPath();
      logoOutline(360).forEach(([x, y], i) => {
        const px = size / 2 + x * size * 0.36;
        const py = size / 2 + y * size * 0.36;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      });
      ctx.closePath();
      ctx.fill();
      break;
    }
    case "openai": {
      rounded(ctx, 0, 0, size, size, r);
      ctx.fillStyle = "#0B0B0B";
      ctx.fill();
      // "nodo" a sei maglie: anelli arrotondati ruotati di 60°
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = size * 0.055;
      ctx.lineJoin = "round";
      for (let k = 0; k < 6; k++) {
        ctx.save();
        ctx.translate(size / 2, size / 2);
        ctx.rotate((k * Math.PI) / 3);
        rounded(ctx, -size * 0.05, -size * 0.27, size * 0.17, size * 0.36, size * 0.085);
        ctx.stroke();
        ctx.restore();
      }
      break;
    }
  }
  ctx.restore();
}
