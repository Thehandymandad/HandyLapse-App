import { NextResponse } from "next/server";
import { hasGeminiKey, planEdit } from "@/lib/reel/gemini";
import type { Word } from "@/lib/reel/types";

export const runtime = "nodejs";
export const maxDuration = 60;

/** POST { words, duration, zoomEvery, graphicsEvery, hookTitle } → piano di montaggio grezzo (validato dal client). */
export async function POST(request: Request) {
  if (!hasGeminiKey()) {
    return NextResponse.json({ error: "GOOGLE_GENAI_API_KEY o GEMINI_API_KEY mancante" }, { status: 500 });
  }
  try {
    const body = (await request.json()) as {
      words?: Word[];
      duration?: number;
      zoomEvery?: number;
      graphicsEvery?: number;
      hookTitle?: boolean;
    };
    const words = Array.isArray(body.words) ? body.words.slice(0, 3000) : [];
    if (!words.length) return NextResponse.json({ error: "Trascrizione vuota" }, { status: 400 });
    const plan = await planEdit({
      words: words.map((w) => ({ text: String(w.text).slice(0, 40), start: Number(w.start) || 0, end: Number(w.end) || 0 })),
      duration: Number(body.duration) || words[words.length - 1].end,
      zoomEvery: Number(body.zoomEvery) || 4,
      graphicsEvery: Number(body.graphicsEvery) || 6,
      hookTitle: body.hookTitle !== false,
    });
    return NextResponse.json({ plan });
  } catch (err) {
    console.error("reel/plan error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore piano di montaggio" }, { status: 500 });
  }
}
