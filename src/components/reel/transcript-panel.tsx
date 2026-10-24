"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/reel/planner";
import { isRemovalActive } from "@/lib/reel/timeline";
import type { EditPlan, Range, ReelStyle, Word } from "@/lib/reel/types";
import { cn } from "@/lib/utils";
import { Section, Slider, Toggle, formatTime } from "./controls";

type Props = {
  words: Word[];
  setWords: (w: Word[]) => void;
  plan: EditPlan;
  setPlan: (p: EditPlan) => void;
  style: ReelStyle;
  setStyle: (s: ReelStyle) => void;
  removed: Set<number>;
  autoThresholdDb: number;
  sourceDuration: number;
  outDuration: number;
  captionOffset: number;
  setCaptionOffset: (v: number) => void;
  trim: Range;
  setTrim: (r: Range) => void;
  onManualText: (text: string) => void;
  onSeekSource: (t: number) => void;
};

type Mode = "cut" | "edit" | "keyword";

const REASON_LABEL: Record<string, string> = { filler: "Intercalare", retake: "Ripetizione", "off-topic": "Fuori tema", manual: "Manuale" };

export function TranscriptPanel(p: Props) {
  const [mode, setMode] = useState<Mode>("cut");
  const [manual, setManual] = useState("");
  const [editing, setEditing] = useState<number | null>(null);
  const cuts = p.style.cuts;
  const setCuts = (patch: Partial<ReelStyle["cuts"]>) => p.setStyle({ ...p.style, cuts: { ...cuts, ...patch } });
  const keywords = new Set(p.plan.emphasis.map((e) => e.wordIndex));

  function clickWord(i: number) {
    p.onSeekSource(p.words[i].start);
    if (mode === "edit") {
      setEditing(i);
      return;
    }
    if (mode === "keyword") {
      const emphasis = keywords.has(i) ? p.plan.emphasis.filter((e) => e.wordIndex !== i) : [...p.plan.emphasis, { wordIndex: i }];
      p.setPlan({ ...p.plan, emphasis });
      return;
    }
    // taglio: se la parola è dentro un taglio attivo lo disattivo, altrimenti ne creo uno manuale
    const hit = p.plan.removals.find((r) => isRemovalActive(r, p.style) && i >= r.startWord && i <= r.endWord);
    if (hit) {
      p.setPlan({
        ...p.plan,
        removals: hit.reason === "manual" ? p.plan.removals.filter((r) => r !== hit) : p.plan.removals.map((r) => (r === hit ? { ...r, enabled: false } : r)),
      });
    } else {
      p.setPlan({ ...p.plan, removals: [...p.plan.removals, { id: uid("r"), startWord: i, endWord: i, reason: "manual", enabled: true }] });
    }
  }

  const saved = p.sourceDuration - p.outDuration;
  const suggestions = p.plan.removals.filter((r) => r.reason !== "manual");

  return (
    <div className="space-y-4">
      <Section title="Taglio delle pause">
        <p className="text-sm">
          Da <b>{formatTime(p.sourceDuration)}</b> a <b>{formatTime(p.outDuration)}</b>
          <span className="text-muted-foreground"> — tolti {saved.toFixed(1)}s ({Math.round((saved / Math.max(0.01, p.sourceDuration)) * 100)}%)</span>
        </p>
        <Toggle
          label="Soglia silenzio automatica"
          hint={`Rilevata: ${p.autoThresholdDb.toFixed(0)} dB`}
          checked={cuts.silenceThresholdDb === null}
          onChange={(v) => setCuts({ silenceThresholdDb: v ? null : Math.round(p.autoThresholdDb) })}
        />
        {cuts.silenceThresholdDb !== null && (
          <Slider
            label="Soglia silenzio"
            value={cuts.silenceThresholdDb}
            min={-80}
            max={-10}
            step={1}
            onChange={(v) => setCuts({ silenceThresholdDb: v })}
            format={(v) => `${v} dB`}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Pausa minima" value={cuts.minSilence} min={0.1} max={3} onChange={(v) => setCuts({ minSilence: v })} format={(v) => `${v.toFixed(2)}s`} />
          <Slider label="Margine prima" value={cuts.paddingBefore} min={0} max={0.5} onChange={(v) => setCuts({ paddingBefore: v })} format={(v) => `${v.toFixed(2)}s`} />
          <Slider label="Margine dopo" value={cuts.paddingAfter} min={0} max={0.6} onChange={(v) => setCuts({ paddingAfter: v })} format={(v) => `${v.toFixed(2)}s`} />
          <Slider
            label="Sync sottotitoli"
            value={p.captionOffset}
            min={-0.6}
            max={0.6}
            onChange={p.setCaptionOffset}
            format={(v) => `${v > 0 ? "+" : ""}${v.toFixed(2)}s`}
          />
          <Slider label="Inizio video" value={p.trim.start} min={0} max={p.sourceDuration} step={0.1} onChange={(v) => p.setTrim({ ...p.trim, start: Math.min(v, p.trim.end - 0.5) })} format={formatTime} />
          <Slider label="Fine video" value={p.trim.end} min={0} max={p.sourceDuration} step={0.1} onChange={(v) => p.setTrim({ ...p.trim, end: Math.max(v, p.trim.start + 0.5) })} format={formatTime} />
        </div>
        <Toggle label="Togli gli intercalari (ehm, uhm…)" checked={cuts.removeFillers} onChange={(v) => setCuts({ removeFillers: v })} />
        <Toggle label="Togli le ripetizioni / frasi rifatte" checked={cuts.removeRetakes} onChange={(v) => setCuts({ removeRetakes: v })} />
      </Section>

      <Section title="Testo del video">
        {p.words.length ? (
          <>
            <div className="flex gap-1 rounded-lg bg-neutral-100 p-1 text-xs font-medium">
              {(
                [
                  ["cut", "✂️ Taglia"],
                  ["edit", "✏️ Correggi"],
                  ["keyword", "⭐ Evidenzia"],
                ] as [Mode, string][]
              ).map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={cn("flex-1 rounded-md px-2 py-1.5", mode === m ? "bg-white shadow-3d-sm" : "text-muted-foreground")}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {mode === "cut" && "Clicca una parola per tagliarla dal video (o per ripristinarla)."}
              {mode === "edit" && "Clicca una parola per correggerne il testo nei sottotitoli."}
              {mode === "keyword" && "Clicca una parola per colorarla come parola chiave."}
            </p>
            <div className="max-h-[420px] overflow-y-auto rounded-lg border border-border p-3 leading-8">
              {p.words.map((w, i) =>
                editing === i ? (
                  <input
                    key={i}
                    autoFocus
                    defaultValue={w.text}
                    onBlur={(e) => {
                      const next = [...p.words];
                      next[i] = { ...w, text: e.target.value };
                      p.setWords(next);
                      setEditing(null);
                    }}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className="mx-0.5 w-28 rounded border border-handy-yellow px-1 text-sm"
                  />
                ) : (
                  <button
                    key={i}
                    type="button"
                    onClick={() => clickWord(i)}
                    title={`${w.start.toFixed(2)}s`}
                    className={cn(
                      "mx-0.5 rounded px-0.5 text-sm transition hover:bg-handy-yellow/30",
                      p.removed.has(i) && "bg-red-50 text-red-400 line-through",
                      keywords.has(i) && !p.removed.has(i) && "font-bold text-emerald-700",
                    )}
                  >
                    {w.text}
                  </button>
                ),
              )}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">Nessuna trascrizione: incolla qui sotto il testo che dici nel video.</p>
        )}
        <details className="text-sm" open={!p.words.length}>
          <summary className="cursor-pointer text-muted-foreground">Incolla / sostituisci il testo a mano</summary>
          <textarea
            value={manual}
            onChange={(e) => setManual(e.target.value)}
            rows={4}
            placeholder="Scrivi qui esattamente quello che dici nel video…"
            className="mt-2 w-full rounded-lg border border-border p-2 text-sm"
          />
          <Button type="button" size="sm" disabled={!manual.trim()} onClick={() => p.onManualText(manual)}>
            Usa questo testo
          </Button>
        </details>
      </Section>

      {suggestions.length > 0 && (
        <Section title={`Tagli suggeriti (${suggestions.length})`}>
          <ul className="space-y-1.5">
            {suggestions.map((r) => (
              <li key={r.id} className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={r.enabled}
                  onChange={(e) => p.setPlan({ ...p.plan, removals: p.plan.removals.map((x) => (x.id === r.id ? { ...x, enabled: e.target.checked } : x)) })}
                  className="mt-1 accent-[#ffd200]"
                />
                <button type="button" className="text-left" onClick={() => p.onSeekSource(p.words[r.startWord]?.start ?? 0)}>
                  <span className="mr-1 rounded bg-neutral-100 px-1.5 py-0.5 text-[11px] font-medium">{REASON_LABEL[r.reason]}</span>
                  <span className={cn(!isRemovalActive(r, p.style) && "text-muted-foreground")}>
                    “{p.words.slice(r.startWord, r.endWord + 1).map((w) => w.text).join(" ")}”
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}
    </div>
  );
}
