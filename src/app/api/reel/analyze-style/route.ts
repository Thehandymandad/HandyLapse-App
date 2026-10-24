import { NextResponse } from "next/server";
import { analyzeStyle, hasGeminiKey } from "@/lib/reel/gemini";
import type { ReferenceStats } from "@/lib/reel/types";

export const runtime = "nodejs";
export const maxDuration = 120;

/** POST { frames: [{ t, dataUrl }], stats } → { style, notes } ricavati dalla reel di riferimento. */
export async function POST(request: Request) {
  if (!hasGeminiKey()) {
    return NextResponse.json({ error: "GOOGLE_GENAI_API_KEY o GEMINI_API_KEY mancante" }, { status: 500 });
  }
  try {
    const body = (await request.json()) as { frames?: { t: number; dataUrl: string }[]; stats?: ReferenceStats };
    const frames = Array.isArray(body.frames) ? body.frames.filter((f) => typeof f?.dataUrl === "string") : [];
    if (!frames.length || !body.stats) return NextResponse.json({ error: "Fotogrammi mancanti" }, { status: 400 });
    const result = await analyzeStyle(frames, body.stats);
    return NextResponse.json(result);
  } catch (err) {
    console.error("reel/analyze-style error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore analisi stile" }, { status: 500 });
  }
}
