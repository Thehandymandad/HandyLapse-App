"use client";

/** Badge crediti in angolo. Per ora solo UI, valore non utilizzato. */
export function CreditsBadge() {
  return (
    <div
      className="inline-flex items-center gap-1.5 rounded-full border-2 border-handy-yellow/50 bg-handy-yellow/10 px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-3d-sm hover:shadow-3d hover:scale-105 transition-all duration-200 cursor-default"
      title="Crediti disponibili (presto attivo)"
    >
      <span className="text-handy-yellow font-semibold">Crediti:</span>
      <span>—</span>
    </div>
  );
}
