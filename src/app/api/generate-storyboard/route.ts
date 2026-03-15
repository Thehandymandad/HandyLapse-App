import { NextResponse } from "next/server";
import { getStoryboardFromPrompt } from "@/lib/get-storyboard";

/**
 * POST con { "prompt": "testo utente" } (es. "costruisci una casa").
 * Restituisce JSON con per ogni scena: start_image_prompt, end_image_prompt, video_transition_prompt.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { prompt?: string };
    const prompt = body?.prompt?.trim();
    if (!prompt) {
      return NextResponse.json(
        { error: "prompt is required" },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_GENAI_API_KEY or GEMINI_API_KEY required" },
        { status: 500 }
      );
    }

    const storyboard = await getStoryboardFromPrompt(prompt);
    return NextResponse.json(storyboard);
  } catch (err) {
    console.error("generate-storyboard error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
