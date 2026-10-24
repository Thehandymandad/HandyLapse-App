import { GoogleGenAI, Type } from "@google/genai";
import { REEL_FONTS } from "./fonts";
import type { ReferenceStats, Word } from "./types";

let client: GoogleGenAI | null = null;

export function hasGeminiKey() {
  return !!(process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY);
}

function ai() {
  if (!client) client = new GoogleGenAI({ apiKey: process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY ?? "" });
  return client;
}

const TRANSCRIBE_MODEL = process.env.REEL_TRANSCRIBE_MODEL ?? "gemini-2.5-flash";
const PLAN_MODEL = process.env.REEL_PLAN_MODEL ?? "gemini-2.5-flash";
const STYLE_MODEL = process.env.REEL_STYLE_MODEL ?? "gemini-2.5-pro";

/** Trascrizione parola per parola di un blocco WAV. Tempi relativi all'inizio del blocco. */
export async function transcribeChunk(wav: Buffer, duration: number, language: string): Promise<Word[]> {
  const res = await ai().models.generateContent({
    model: TRANSCRIBE_MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType: "audio/wav", data: wav.toString("base64") } },
          {
            text: `Transcribe this ${duration.toFixed(1)}s audio clip verbatim (language: ${language || "auto-detect, most likely Italian"}).
Rules:
- Keep EVERY spoken word exactly as said, including filler words (ehm, uhm, eh, cioè…), false starts and repetitions. Do not clean up or summarize.
- Attach punctuation to the word it follows (e.g. "casa," "fatto!"). Use normal capitalization.
- For every word give start "s" and end "e" in seconds from the beginning of this clip, with 0.01 precision. Times must be increasing and within 0..${duration.toFixed(2)}.
- If there is no speech, return an empty list.`,
          },
        ],
      },
    ],
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          words: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { w: { type: Type.STRING }, s: { type: Type.NUMBER }, e: { type: Type.NUMBER } },
              required: ["w", "s", "e"],
            },
          },
        },
        required: ["words"],
      },
      thinkingConfig: { thinkingBudget: 0 },
      temperature: 0,
    },
  });
  const parsed = JSON.parse(res.text ?? "{}") as { words?: { w?: string; s?: number; e?: number }[] };
  const words: Word[] = [];
  let prev = 0;
  for (const x of parsed.words ?? []) {
    const text = String(x.w ?? "").trim();
    if (!text) continue;
    const start = Math.min(duration, Math.max(prev, Number(x.s) || prev));
    const end = Math.min(duration, Math.max(start + 0.05, Number(x.e) || start + 0.3));
    words.push({ text, start, end });
    prev = start;
  }
  return words;
}

type PlanRequest = {
  words: Word[];
  duration: number;
  zoomEvery: number;
  graphicsEvery: number;
  hookTitle: boolean;
};

/** Piano di montaggio: hook, parole chiave, zoom, grafiche e tagli suggeriti, tutto ancorato agli indici delle parole. */
export async function planEdit({ words, duration, zoomEvery, graphicsEvery, hookTitle }: PlanRequest): Promise<unknown> {
  const transcript = words.map((w, i) => `${i}|${w.start.toFixed(2)}|${w.text}`).join("\n");
  const prompt = `You are a top short-form video editor (Instagram Reels / TikTok). Plan the edit of a talking-head reel.
Transcript, one word per line as "index|startSeconds|word" (total ${duration.toFixed(1)}s):
${transcript}

Return JSON with:
- hook: ${hookTitle ? "a punchy on-screen title for the first seconds, max 6 words, same language as the speaker, UPPERCASE" : 'empty string ""'}.
- emphasis: the key words to highlight in the captions (about one every 2-3 seconds: numbers, strong verbs, nouns that carry the message). Optional "emoji" (one emoji) only when it really fits.
- zooms: about one every ${zoomEvery}s, on punchlines, sentence starts or important moments. kind "punch" (instant jump, for emphasis) or "smooth" (slow push-in, for storytelling). strength 0..1.
- graphics: on-screen motion graphics, about one every ${graphicsEvery}s, never in the first 3 seconds. kind: "keyword" (short card, 1-3 words), "stat" (a number/price/percentage with 1 word), "list" (a step or tip when the speaker enumerates), "emoji" (a big reaction emoji, text may be empty). text max 4 words, same language, UPPERCASE. startWord = index where it appears, endWord = index where it should disappear (1-3 s later).
- removals: word ranges to CUT: filler words (ehm, uhm, eh…) as reason "filler"; false starts or repeated takes where the speaker restarts a sentence, cutting the failed attempt and keeping the last good one, as reason "retake"; obvious off-topic chatter as "off-topic". Be conservative: never cut meaningful content.
Use only indices that exist in the transcript.`;

  const idx = { type: Type.INTEGER };
  const res = await ai().models.generateContent({
    model: PLAN_MODEL,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          hook: { type: Type.STRING },
          emphasis: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { wordIndex: idx, emoji: { type: Type.STRING } }, required: ["wordIndex"] },
          },
          zooms: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: { wordIndex: idx, kind: { type: Type.STRING, enum: ["punch", "smooth"] }, strength: { type: Type.NUMBER } },
              required: ["wordIndex", "kind"],
            },
          },
          graphics: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                kind: { type: Type.STRING, enum: ["keyword", "stat", "list", "emoji"] },
                startWord: idx,
                endWord: idx,
                text: { type: Type.STRING },
                emoji: { type: Type.STRING },
              },
              required: ["kind", "startWord", "endWord", "text"],
            },
          },
          removals: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                startWord: idx,
                endWord: idx,
                reason: { type: Type.STRING, enum: ["filler", "retake", "off-topic"] },
              },
              required: ["startWord", "endWord", "reason"],
            },
          },
        },
        required: ["hook", "emphasis", "zooms", "graphics", "removals"],
      },
      temperature: 0.4,
    },
  });
  return JSON.parse(res.text ?? "{}");
}

const STYLE_SHAPE = `{
  "name": string,                      // short name for this style
  "description": string,               // 1-2 sentences in Italian describing the editing style
  "captions": {
    "enabled": boolean,
    "fontFamily": one of [${REEL_FONTS.map((f) => `"${f.family}"`).join(", ")}],
    "fontWeight": number,              // 400-900
    "fontSize": number,                // px on a 1080x1920 canvas (frames you see are 360px wide: multiply by 3)
    "uppercase": boolean,
    "letterSpacing": number,           // px
    "color": "#RRGGBB",                // normal word color
    "highlightColor": "#RRGGBB",       // color of the word currently being spoken
    "highlightMode": "color" | "box" | "scale" | "underline" | "none",
    "keywordColor": "#RRGGBB",         // color used for emphasized key words
    "strokeColor": "#RRGGBB", "strokeWidth": number,   // outline thickness in px at 1080 width (0 = none)
    "shadowColor": "rgba(...)", "shadowBlur": number, "shadowOffsetY": number,
    "background": "none" | "box" | "pill", "backgroundColor": "rgba(...)",
    "positionY": number,               // vertical center of captions, 0 = top, 1 = bottom
    "maxWordsPerCaption": number,      // how many words are on screen at once
    "maxCharsPerLine": number,
    "animation": "pop" | "bounce" | "fade" | "slide-up" | "typewriter" | "none",
    "emojis": boolean,                 // emojis appear next to captions
    "tilt": number                     // degrees of random rotation of caption blocks (0 = straight)
  },
  "cuts": { "minSilence": number, "paddingBefore": number, "paddingAfter": number, "removeFillers": boolean, "removeRetakes": boolean },
  "zoom": {
    "enabled": boolean, "mode": "punch" | "smooth" | "mixed",
    "intensity": number,               // 1.0-1.6 max zoom scale
    "every": number,                   // average seconds between zooms
    "alternateOnCuts": boolean,        // framing alternates wide/tight on each jump cut
    "alternateScale": number,          // 1.0-1.3
    "focusX": number, "focusY": number,// 0..1 where the face is
    "shake": boolean
  },
  "motion": {
    "accentColor": "#RRGGBB", "secondaryColor": "#RRGGBB", "textColor": "#RRGGBB",
    "fontFamily": one of the fonts above,
    "hookTitle": boolean,              // a big title card in the first seconds
    "hookDuration": number,
    "keywordPops": boolean,            // text cards / stats popping on screen
    "emojiPops": boolean,              // big emojis popping on screen
    "progressBar": boolean, "progressBarPosition": "top" | "bottom",
    "flashOnCut": boolean,             // white flash on cuts
    "density": number                  // seconds between motion graphics
  },
  "grade": { "brightness": number, "contrast": number, "saturation": number, "warmth": number /* -1..1 */, "vignette": number /* 0..1 */ },
  "sfx": { "enabled": boolean, "volume": number, "whooshOnZoom": boolean, "popOnGraphics": boolean }
}`;

/** Analizza i fotogrammi della reference e restituisce lo stile (parziale) da applicare. */
export async function analyzeStyle(frames: { t: number; dataUrl: string }[], stats: ReferenceStats): Promise<{ style: unknown; notes: string }> {
  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [];
  parts.push({
    text: `You are reverse-engineering the editing style of a reference Instagram Reel so it can be replicated exactly on new videos.
Measured facts: duration ${stats.duration.toFixed(1)}s, source ${stats.width}x${stats.height}, about ${stats.cutsPerMinute} hard cuts per minute (average shot ${stats.avgShotLength}s).
Below are frames with their timestamp. The burst of frames 0.1s apart shows how captions animate.
Study captions (font look, weight, case, size, colors, outline, shadow, the highlighted active word, how many words at once, position, animation), motion graphics (title cards, keyword cards, emojis, progress bars, colors), zooms/reframing between frames, color grading and pacing.`,
  });
  for (const f of frames.slice(0, 30)) {
    const m = f.dataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
    if (!m) continue;
    parts.push({ text: `t=${f.t}s` });
    parts.push({ inlineData: { mimeType: m[1], data: m[2] } });
  }
  parts.push({
    text: `Return ONLY JSON: { "style": <object with this shape>, "notes": "<Italian, what you noticed and anything this app cannot replicate>" }
Shape:
${STYLE_SHAPE}
Pick the closest font from the list. Estimate numbers carefully from the frames. If a feature is absent in the reference, disable it.`,
  });

  const res = await ai().models.generateContent({
    model: STYLE_MODEL,
    contents: [{ role: "user", parts }],
    config: { responseMimeType: "application/json", temperature: 0.2 },
  });
  const parsed = JSON.parse(res.text ?? "{}") as { style?: unknown; notes?: unknown };
  return { style: parsed.style ?? parsed, notes: typeof parsed.notes === "string" ? parsed.notes : "" };
}
