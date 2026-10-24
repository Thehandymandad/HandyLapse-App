"use client";

import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uid } from "@/lib/reel/planner";
import type { EditPlan, MotionKind, PlannedGraphic, Word } from "@/lib/reel/types";
import { Section } from "./controls";

type Props = {
  plan: EditPlan;
  setPlan: (p: EditPlan) => void;
  words: Word[];
  removed: Set<number>;
  /** Indice della parola sotto la testina di riproduzione. */
  currentWord: number;
  onSeekWord: (i: number) => void;
  onRegenerate: () => void;
  regenerating: boolean;
};

const KINDS: { value: MotionKind; label: string }[] = [
  { value: "keyword", label: "Card parola" },
  { value: "stat", label: "Numero grande" },
  { value: "list", label: "Punto elenco" },
  { value: "emoji", label: "Emoji gigante" },
];

export function GraphicsPanel({ plan, setPlan, words, removed, currentWord, onSeekWord, onRegenerate, regenerating }: Props) {
  const update = (id: string, patch: Partial<PlannedGraphic>) =>
    setPlan({ ...plan, graphics: plan.graphics.map((g) => (g.id === id ? { ...g, ...patch } : g)) });
  const at = (i: number) => (words[i] ? `${words[i].start.toFixed(1)}s · “${words[i].text}”` : "");
  const sortedGraphics = [...plan.graphics].sort((a, b) => a.startWord - b.startWord);
  const sortedZooms = [...plan.zooms].sort((a, b) => a.wordIndex - b.wordIndex);
  const canAdd = currentWord >= 0 && words.length > 0;

  return (
    <div className="space-y-4">
      <Section title="Piano di montaggio">
        <p className="text-sm text-muted-foreground">
          {plan.source === "ai" ? "Creato dall'AI leggendo cosa dici." : "Creato automaticamente (senza AI)."} Puoi modificare tutto o rigenerarlo.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onRegenerate} disabled={regenerating || !words.length}>
          <RefreshCw className={regenerating ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"} /> Rigenera piano AI
        </Button>
      </Section>

      <Section title="Titolo hook (primi secondi)">
        <input
          value={plan.hook}
          onChange={(e) => setPlan({ ...plan, hook: e.target.value })}
          placeholder="Es: IL TRUCCO CHE NESSUNO TI DICE"
          className="w-full rounded-lg border border-border px-3 py-2 text-sm font-semibold"
        />
      </Section>

      <Section title={`Grafiche (${plan.graphics.length})`}>
        <ul className="space-y-2">
          {sortedGraphics.map((g) => (
            <li key={g.id} className={`space-y-1.5 rounded-lg border border-border p-2 ${removed.has(g.startWord) ? "opacity-50" : ""}`}>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => onSeekWord(g.startWord)} className="flex-1 truncate text-left text-xs text-muted-foreground hover:underline">
                  {at(g.startWord)}
                </button>
                <button type="button" onClick={() => setPlan({ ...plan, graphics: plan.graphics.filter((x) => x.id !== g.id) })} aria-label="Elimina">
                  <Trash2 className="h-4 w-4 text-neutral-400 hover:text-red-500" />
                </button>
              </div>
              <div className="flex gap-2">
                <select
                  value={g.kind}
                  onChange={(e) => update(g.id, { kind: e.target.value as MotionKind })}
                  className="rounded-md border border-border px-1 py-1 text-xs"
                >
                  {KINDS.map((k) => (
                    <option key={k.value} value={k.value}>
                      {k.label}
                    </option>
                  ))}
                </select>
                <input value={g.text} onChange={(e) => update(g.id, { text: e.target.value })} className="min-w-0 flex-1 rounded-md border border-border px-2 py-1 text-sm" />
                <input
                  value={g.emoji ?? ""}
                  onChange={(e) => update(g.id, { emoji: e.target.value || undefined })}
                  placeholder="😀"
                  className="w-12 rounded-md border border-border px-1 py-1 text-center text-sm"
                />
              </div>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!canAdd}
          onClick={() =>
            setPlan({
              ...plan,
              graphics: [
                ...plan.graphics,
                { id: uid("g"), kind: "keyword", startWord: currentWord, endWord: Math.min(words.length - 1, currentWord + 3), text: words[currentWord].text.toUpperCase().replace(/[.,!?;:]+$/, "") },
              ],
            })
          }
        >
          <Plus className="h-3.5 w-3.5" /> Aggiungi grafica alla posizione attuale
        </Button>
      </Section>

      <Section title={`Zoom (${plan.zooms.length})`}>
        <ul className="space-y-1.5">
          {sortedZooms.map((z) => (
            <li key={z.id} className="flex items-center gap-2 text-sm">
              <button type="button" onClick={() => onSeekWord(z.wordIndex)} className="flex-1 truncate text-left text-xs text-muted-foreground hover:underline">
                {at(z.wordIndex)}
              </button>
              <select
                value={z.kind}
                onChange={(e) => setPlan({ ...plan, zooms: plan.zooms.map((x) => (x.id === z.id ? { ...x, kind: e.target.value as "punch" | "smooth" } : x)) })}
                className="rounded-md border border-border px-1 py-0.5 text-xs"
              >
                <option value="punch">Punch</option>
                <option value="smooth">Lento</option>
              </select>
              <input
                type="range"
                min={0}
                max={1}
                step={0.1}
                value={z.strength}
                onChange={(e) => setPlan({ ...plan, zooms: plan.zooms.map((x) => (x.id === z.id ? { ...x, strength: Number(e.target.value) } : x)) })}
                className="w-20 accent-[#ffd200]"
                aria-label="Forza"
              />
              <button type="button" onClick={() => setPlan({ ...plan, zooms: plan.zooms.filter((x) => x.id !== z.id) })} aria-label="Elimina">
                <Trash2 className="h-4 w-4 text-neutral-400 hover:text-red-500" />
              </button>
            </li>
          ))}
        </ul>
        <Button
          type="button"
          size="sm"
          variant="secondary"
          disabled={!canAdd}
          onClick={() => setPlan({ ...plan, zooms: [...plan.zooms, { id: uid("z"), wordIndex: currentWord, kind: "punch", strength: 0.7 }] })}
        >
          <Plus className="h-3.5 w-3.5" /> Aggiungi zoom alla posizione attuale
        </Button>
      </Section>
    </div>
  );
}
