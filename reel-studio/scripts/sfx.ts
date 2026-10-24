/** npm run sfx — genera gli effetti sonori con ffmpeg (sintesi, niente file scaricati) in public/sfx/. */
import fs from "node:fs";
import path from "node:path";
import { ffmpeg, log, ROOT } from "./lib/sh";

const SFX: Record<string, { expr: string; d: number; af?: string }> = {
  whoosh: { expr: "(random(0)-0.5)*1.4*pow(sin(PI*t/0.5),2)", d: 0.5, af: "bandpass=f=1400:width_type=h:w=2200,highpass=f=300,vibrato=f=6:d=0.3" },
  pop: { expr: "sin(2*PI*(950*t-2600*t*t))*exp(-28*t)*0.8", d: 0.14 },
  ding: { expr: "(sin(2*PI*1320*t)*exp(-5*t)*0.5+sin(2*PI*1980*t)*exp(-7*t)*0.25+sin(2*PI*2640*t)*exp(-9*t)*0.12)", d: 0.9 },
  click: { expr: "sin(2*PI*2400*t)*exp(-110*t)*0.9", d: 0.05 },
  riser: { expr: "(sin(2*PI*(180*t+260*t*t))*0.35+(random(0)-0.5)*0.35)*t/1.2", d: 1.2, af: "highpass=f=150" },
  boom: { expr: "sin(2*PI*(70*t-18*t*t))*exp(-3.5*t)*0.95", d: 1.1, af: "lowpass=f=400" },
};

export async function makeSfx(force = false) {
  const dir = path.join(ROOT, "public/sfx");
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, s] of Object.entries(SFX)) {
    const out = path.join(dir, `${name}.wav`);
    if (!force && fs.existsSync(out)) continue;
    const af = [s.af, "afade=t=out:st=" + (s.d * 0.85).toFixed(3) + ":d=" + (s.d * 0.15).toFixed(3), "aformat=channel_layouts=stereo"].filter(Boolean).join(",");
    await ffmpeg(["-f", "lavfi", "-i", `aevalsrc='${s.expr}':s=48000:d=${s.d}`, "-af", af, "-c:a", "pcm_s16le", out]);
    log(`sfx/${name}.wav`);
  }
}

if (process.argv[1]?.endsWith("sfx.ts")) makeSfx(process.argv.includes("--force")).catch((e) => (console.error(e), process.exit(1)));
