import { NextResponse } from "next/server";
import { hasGeminiKey, transcribeChunk } from "@/lib/reel/gemini";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST con body = WAV mono (un blocco da ~30s), query ?duration=..&lang=it.
 * Restituisce { words: [{ text, start, end }] } con tempi relativi all'inizio del blocco.
 */
export async function POST(request: Request) {
  if (!hasGeminiKey()) {
    return NextResponse.json({ error: "GOOGLE_GENAI_API_KEY o GEMINI_API_KEY mancante" }, { status: 500 });
  }
  try {
    const url = new URL(request.url);
    const duration = Number(url.searchParams.get("duration")) || 30;
    const lang = (url.searchParams.get("lang") ?? "").slice(0, 20);
    const wav = Buffer.from(await request.arrayBuffer());
    if (wav.length < 100) return NextResponse.json({ words: [] });
    if (wav.length > 4_200_000) return NextResponse.json({ error: "Blocco audio troppo grande" }, { status: 413 });
    const words = await transcribeChunk(wav, duration, lang);
    return NextResponse.json({ words });
  } catch (err) {
    console.error("reel/transcribe error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore trascrizione" }, { status: 500 });
  }
}
