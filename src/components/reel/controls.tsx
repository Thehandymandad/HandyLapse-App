"use client";

import { cn } from "@/lib/utils";

export function Section({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-border bg-white p-4 shadow-3d-sm space-y-3", className)}>
      <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
}) {
  return (
    <label className="block text-sm">
      <span className="flex justify-between text-neutral-700">
        <span>{label}</span>
        <span className="tabular-nums text-muted-foreground">{format ? format(value) : value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[#ffd200]"
      />
    </label>
  );
}

export function Toggle({ label, checked, onChange, hint }: { label: string; checked: boolean; onChange: (v: boolean) => void; hint?: string }) {
  return (
    <label className="flex items-start gap-3 text-sm cursor-pointer select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "mt-0.5 relative h-5 w-9 shrink-0 rounded-full transition-colors",
          checked ? "bg-handy-yellow" : "bg-neutral-300",
        )}
      >
        <span className={cn("absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all", checked ? "left-[18px]" : "left-0.5")} />
      </button>
      <span>
        <span className="text-neutral-800">{label}</span>
        {hint && <span className="block text-xs text-muted-foreground">{hint}</span>}
      </span>
    </label>
  );
}

export function Select<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <label className="block text-sm">
      <span className="text-neutral-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        className="mt-1 w-full rounded-lg border border-border bg-white px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-handy-yellow/40"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Colore: accetta #hex dal picker ma anche rgba() scritto a mano. */
export function ColorInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const hex = /^#[0-9a-f]{6}$/i.test(value) ? value : /^#[0-9a-f]{3}$/i.test(value) ? value.replace(/[0-9a-f]/gi, "$&$&") : "#000000";
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="color" value={hex} onChange={(e) => onChange(e.target.value)} className="h-7 w-9 cursor-pointer rounded border border-border bg-white p-0.5" />
      <span className="flex-1 text-neutral-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-28 rounded-md border border-border px-1.5 py-0.5 font-mono text-xs"
        spellCheck={false}
      />
    </label>
  );
}

export function ProgressBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="space-y-1">
      {label && <p className="text-sm text-neutral-700">{label}</p>}
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-neutral-200">
        <div className="h-full rounded-full bg-handy-yellow transition-[width] duration-200" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}

export function formatTime(t: number) {
  const m = Math.floor(t / 60);
  const s = t - m * 60;
  return `${m}:${s.toFixed(1).padStart(4, "0")}`;
}
