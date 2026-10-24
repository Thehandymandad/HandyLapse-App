"use client";

import { useRef, useState } from "react";
import { Download, Save, Sparkles, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { REEL_FONTS } from "@/lib/reel/fonts";
import { normalizeStyle, PRESETS } from "@/lib/reel/presets";
import { analyzeReference } from "@/lib/reel/pipeline";
import type { ReelStyle } from "@/lib/reel/types";
import { cn } from "@/lib/utils";
import { ColorInput, ProgressBar, Section, Select, Slider, Toggle } from "./controls";

type Props = {
  style: ReelStyle;
  onChange: (s: ReelStyle) => void;
  customStyles: ReelStyle[];
  onSaveCustom: (s: ReelStyle) => void;
  /** Mostra solo preset + reference (schermata iniziale). */
  compact?: boolean;
};

const fontOptions = REEL_FONTS.map((f) => ({ value: f.family, label: `${f.family} — ${f.note}` }));

export function StylePanel({ style, onChange, customStyles, onSaveCustom, compact }: Props) {
  const [refBusy, setRefBusy] = useState<{ p: number; label: string } | null>(null);
  const [refNotes, setRefNotes] = useState<string | null>(null);
  const [refError, setRefError] = useState<string | null>(null);
  const refInput = useRef<HTMLInputElement>(null);
  const importInput = useRef<HTMLInputElement>(null);

  function set<S extends keyof ReelStyle>(section: S, patch: Partial<ReelStyle[S]>) {
    onChange({ ...style, [section]: { ...(style[section] as object), ...patch } });
  }
  const c = style.captions;
  const z = style.zoom;
  const m = style.motion;
  const g = style.grade;

  async function onReference(file: File) {
    setRefError(null);
    setRefNotes(null);
    setRefBusy({ p: 0, label: "Preparo la reference…" });
    try {
      const res = await analyzeReference(file, (p, label) => setRefBusy({ p, label }));
      const s = normalizeStyle(res.style, style);
      s.id = `ref-${Date.now().toString(36)}`;
      if (!s.name || s.name === style.name) s.name = `Reference ${file.name.replace(/\.[^.]+$/, "").slice(0, 24)}`;
      onChange(s);
      onSaveCustom(s);
      setRefNotes(res.notes || `Ritmo misurato: ${res.stats.cutsPerMinute} tagli al minuto.`);
    } catch (e) {
      setRefError(e instanceof Error ? e.message : "Analisi non riuscita");
    } finally {
      setRefBusy(null);
    }
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(style, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stile-${style.id}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  async function importJson(file: File) {
    try {
      const s = normalizeStyle(JSON.parse(await file.text()));
      if (s.id === "base") s.id = `import-${Date.now().toString(36)}`;
      onChange(s);
      onSaveCustom(s);
    } catch {
      setRefError("File JSON di stile non valido");
    }
  }

  const all = [...PRESETS, ...customStyles];

  return (
    <div className="space-y-4">
      <Section title="Stile">
        <div className="grid grid-cols-2 gap-2">
          {all.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(p)}
              className={cn(
                "rounded-lg border-2 px-3 py-2 text-left transition hover:-translate-y-0.5 hover:shadow-3d-sm",
                style.id === p.id ? "border-handy-yellow bg-handy-yellow/10" : "border-border bg-white",
              )}
            >
              <span
                className="block truncate text-sm"
                style={{ fontFamily: `"${p.captions.fontFamily}", sans-serif`, fontWeight: p.captions.fontWeight, color: "#111" }}
              >
                {p.captions.uppercase ? p.name.toUpperCase() : p.name}
              </span>
              <span className="mt-1 flex gap-1">
                {[p.captions.color, p.captions.highlightColor, p.captions.keywordColor, p.motion.accentColor].map((col, i) => (
                  <span key={i} className="h-3 w-3 rounded-full border border-black/10" style={{ background: col }} />
                ))}
              </span>
            </button>
          ))}
        </div>
        {style.description && <p className="text-xs text-muted-foreground">{style.description}</p>}
      </Section>

      <Section title="Copia lo stile da una reference">
        <p className="text-sm text-muted-foreground">
          Carica un reel che ti piace: l&apos;AI studia font, colori, animazioni dei sottotitoli, zoom, grafiche e ritmo dei tagli e crea uno stile
          identico da applicare al tuo video.
        </p>
        <input
          ref={refInput}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && onReference(e.target.files[0])}
        />
        {refBusy ? (
          <ProgressBar value={refBusy.p} label={refBusy.label} />
        ) : (
          <Button type="button" variant="outline" onClick={() => refInput.current?.click()} className="w-full">
            <Sparkles className="h-4 w-4" /> Carica reference e analizza
          </Button>
        )}
        {refNotes && <p className="rounded-lg bg-green-50 p-2 text-xs text-green-900">✅ Stile creato. {refNotes}</p>}
        {refError && <p className="rounded-lg bg-red-50 p-2 text-xs text-red-800">{refError}</p>}
        <div className="flex gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={() => onSaveCustom({ ...style, id: style.id.startsWith("custom") || style.id.startsWith("ref") || style.id.startsWith("import") ? style.id : `custom-${Date.now().toString(36)}` })}>
            <Save className="h-3.5 w-3.5" /> Salva stile
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={exportJson}>
            <Download className="h-3.5 w-3.5" /> Esporta JSON
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => importInput.current?.click()}>
            <Upload className="h-3.5 w-3.5" /> Importa
          </Button>
          <input
            ref={importInput}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
        </div>
      </Section>

      {!compact && (
        <>
          <Section title="Sottotitoli">
            <Toggle label="Sottotitoli attivi" checked={c.enabled} onChange={(v) => set("captions", { enabled: v })} />
            <Select label="Font" value={c.fontFamily} options={fontOptions} onChange={(v) => set("captions", { fontFamily: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Slider label="Dimensione" value={c.fontSize} min={28} max={180} step={1} onChange={(v) => set("captions", { fontSize: v })} />
              <Slider label="Peso" value={c.fontWeight} min={400} max={900} step={100} onChange={(v) => set("captions", { fontWeight: v })} />
              <Slider label="Parole per volta" value={c.maxWordsPerCaption} min={1} max={10} step={1} onChange={(v) => set("captions", { maxWordsPerCaption: v })} />
              <Slider label="Caratteri per riga" value={c.maxCharsPerLine} min={6} max={40} step={1} onChange={(v) => set("captions", { maxCharsPerLine: v })} />
              <Slider label="Posizione verticale" value={c.positionY} min={0.1} max={0.92} onChange={(v) => set("captions", { positionY: v })} format={(v) => `${Math.round(v * 100)}%`} />
              <Slider label="Inclinazione" value={c.tilt} min={0} max={15} step={0.5} onChange={(v) => set("captions", { tilt: v })} format={(v) => `${v}°`} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Animazione"
                value={c.animation}
                options={[
                  { value: "pop", label: "Pop" },
                  { value: "bounce", label: "Rimbalzo" },
                  { value: "fade", label: "Dissolvenza" },
                  { value: "slide-up", label: "Dal basso" },
                  { value: "typewriter", label: "Parola per parola" },
                  { value: "none", label: "Nessuna" },
                ]}
                onChange={(v) => set("captions", { animation: v })}
              />
              <Select
                label="Parola attiva"
                value={c.highlightMode}
                options={[
                  { value: "color", label: "Colore" },
                  { value: "box", label: "Box" },
                  { value: "scale", label: "Ingrandita" },
                  { value: "underline", label: "Sottolineata" },
                  { value: "none", label: "Nessuna" },
                ]}
                onChange={(v) => set("captions", { highlightMode: v })}
              />
              <Select
                label="Sfondo"
                value={c.background}
                options={[
                  { value: "none", label: "Nessuno" },
                  { value: "box", label: "Riquadro" },
                  { value: "pill", label: "Pillola" },
                ]}
                onChange={(v) => set("captions", { background: v })}
              />
            </div>
            <Toggle label="Tutto maiuscolo" checked={c.uppercase} onChange={(v) => set("captions", { uppercase: v })} />
            <Toggle label="Emoji sopra i sottotitoli" checked={c.emojis} onChange={(v) => set("captions", { emojis: v })} />
            <ColorInput label="Testo" value={c.color} onChange={(v) => set("captions", { color: v })} />
            <ColorInput label="Parola attiva" value={c.highlightColor} onChange={(v) => set("captions", { highlightColor: v })} />
            <ColorInput label="Parole chiave" value={c.keywordColor} onChange={(v) => set("captions", { keywordColor: v })} />
            <ColorInput label="Contorno" value={c.strokeColor} onChange={(v) => set("captions", { strokeColor: v })} />
            <ColorInput label="Ombra" value={c.shadowColor} onChange={(v) => set("captions", { shadowColor: v })} />
            {c.background !== "none" && <ColorInput label="Sfondo" value={c.backgroundColor} onChange={(v) => set("captions", { backgroundColor: v })} />}
            <div className="grid grid-cols-2 gap-3">
              <Slider label="Contorno" value={c.strokeWidth} min={0} max={30} step={1} onChange={(v) => set("captions", { strokeWidth: v })} />
              <Slider label="Ombra" value={c.shadowBlur} min={0} max={60} step={1} onChange={(v) => set("captions", { shadowBlur: v })} />
            </div>
          </Section>

          <Section title="Zoom e inquadratura">
            <Toggle label="Zoom automatici" checked={z.enabled} onChange={(v) => set("zoom", { enabled: v })} />
            <Select
              label="Tipo"
              value={z.mode}
              options={[
                { value: "mixed", label: "Misti (consigliato)" },
                { value: "punch", label: "Punch (scatto)" },
                { value: "smooth", label: "Lenti (push-in)" },
              ]}
              onChange={(v) => set("zoom", { mode: v })}
            />
            <div className="grid grid-cols-2 gap-3">
              <Slider label="Intensità" value={z.intensity} min={1} max={1.8} onChange={(v) => set("zoom", { intensity: v })} format={(v) => `${v.toFixed(2)}x`} />
              <Slider label="Ogni (s)" value={z.every} min={1} max={30} step={0.5} onChange={(v) => set("zoom", { every: v })} />
              <Slider label="Fuoco X" value={z.focusX} min={0} max={1} onChange={(v) => set("zoom", { focusX: v })} format={(v) => `${Math.round(v * 100)}%`} />
              <Slider label="Fuoco Y (viso)" value={z.focusY} min={0} max={1} onChange={(v) => set("zoom", { focusY: v })} format={(v) => `${Math.round(v * 100)}%`} />
            </div>
            <Toggle
              label="Alterna inquadratura sui tagli"
              hint="Nasconde i jump cut alternando largo/stretto"
              checked={z.alternateOnCuts}
              onChange={(v) => set("zoom", { alternateOnCuts: v })}
            />
            {z.alternateOnCuts && (
              <Slider label="Zoom alternato" value={z.alternateScale} min={1} max={1.5} onChange={(v) => set("zoom", { alternateScale: v })} format={(v) => `${v.toFixed(2)}x`} />
            )}
            <Toggle label="Shake sui punch" checked={z.shake} onChange={(v) => set("zoom", { shake: v })} />
            <p className="text-xs text-muted-foreground">Dopo aver cambiato frequenza degli zoom premi &quot;Rigenera piano AI&quot; nella scheda Grafiche.</p>
          </Section>

          <Section title="Motion graphics">
            <Toggle label="Titolo hook iniziale" checked={m.hookTitle} onChange={(v) => set("motion", { hookTitle: v })} />
            <Toggle label="Card parole chiave / numeri / liste" checked={m.keywordPops} onChange={(v) => set("motion", { keywordPops: v })} />
            <Toggle label="Emoji giganti" checked={m.emojiPops} onChange={(v) => set("motion", { emojiPops: v })} />
            <Toggle label="Barra di avanzamento" checked={m.progressBar} onChange={(v) => set("motion", { progressBar: v })} />
            <Toggle label="Flash bianco sui tagli" checked={m.flashOnCut} onChange={(v) => set("motion", { flashOnCut: v })} />
            <Select label="Font grafiche" value={m.fontFamily} options={fontOptions} onChange={(v) => set("motion", { fontFamily: v })} />
            <ColorInput label="Colore principale" value={m.accentColor} onChange={(v) => set("motion", { accentColor: v })} />
            <ColorInput label="Colore secondario" value={m.secondaryColor} onChange={(v) => set("motion", { secondaryColor: v })} />
            <ColorInput label="Testo delle card" value={m.textColor} onChange={(v) => set("motion", { textColor: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Slider label="Durata hook (s)" value={m.hookDuration} min={0.8} max={6} step={0.1} onChange={(v) => set("motion", { hookDuration: v })} />
              <Slider label="Una grafica ogni (s)" value={m.density} min={2} max={30} step={0.5} onChange={(v) => set("motion", { density: v })} />
            </div>
          </Section>

          <Section title="Colore">
            <div className="grid grid-cols-2 gap-3">
              <Slider label="Luminosità" value={g.brightness} min={0.6} max={1.5} onChange={(v) => set("grade", { brightness: v })} />
              <Slider label="Contrasto" value={g.contrast} min={0.6} max={1.6} onChange={(v) => set("grade", { contrast: v })} />
              <Slider label="Saturazione" value={g.saturation} min={0} max={2} onChange={(v) => set("grade", { saturation: v })} />
              <Slider label="Calore" value={g.warmth} min={-1} max={1} onChange={(v) => set("grade", { warmth: v })} />
              <Slider label="Vignettatura" value={g.vignette} min={0} max={1} onChange={(v) => set("grade", { vignette: v })} />
            </div>
          </Section>

          <Section title="Effetti sonori">
            <Toggle label="Effetti sonori (whoosh, pop)" checked={style.sfx.enabled} onChange={(v) => set("sfx", { enabled: v })} />
            <Toggle label="Whoosh sugli zoom" checked={style.sfx.whooshOnZoom} onChange={(v) => set("sfx", { whooshOnZoom: v })} />
            <Toggle label="Pop sulle grafiche" checked={style.sfx.popOnGraphics} onChange={(v) => set("sfx", { popOnGraphics: v })} />
            <Slider label="Volume effetti" value={style.sfx.volume} min={0} max={1} onChange={(v) => set("sfx", { volume: v })} format={(v) => `${Math.round(v * 100)}%`} />
          </Section>
        </>
      )}
    </div>
  );
}
