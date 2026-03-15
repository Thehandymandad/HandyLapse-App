import { GoogleGenAI } from "@google/genai";

export type StoryboardScene = {
  start_image_prompt: string;
  end_image_prompt: string;
  video_transition_prompt: string;
};

export type Storyboard = {
  scenes: StoryboardScene[];
};

const googleAi = new GoogleGenAI({
  apiKey: process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY ?? "",
});

const STORYBOARD_MODEL = process.env.STORYBOARD_MODEL ?? "gemini-2.5-flash";

/**
 * Da un testo utente (es. "una casa che si costruisce nel bosco") restituisce uno storyboard con
 * start_image_prompt, end_image_prompt, video_transition_prompt. Max 3 scene. Solo Gemini.
 */
export async function getStoryboardFromPrompt(userText: string): Promise<Storyboard> {
  const systemPrompt = `You are an expert storyboard writer for AI-generated video. From the user's idea you must output exactly ONE scene (or max 3 if they describe multiple moments) as JSON.

CRITICAL RULES:

1) start_image_prompt (English, photorealistic, vertical 9:16):
   - The VERY BEGINNING: empty land, untouched place, or situation BEFORE any action. One clear moment.
   - Example for "house in the woods": "Empty forest clearing with trees, morning light, no construction, vertical 9:16, photorealistic."

2) end_image_prompt (English, photorealistic, vertical 9:16):
   - The FINAL RESULT the user wants to see. The completed outcome. NOT an intermediate step.
   - If the user says "a house" or "building a house", the end MUST show the FINISHED HOUSE, not excavation, not foundation, not construction in progress.
   - Same framing/style as start. Be specific: "Completed modern house in forest clearing, trees around, daylight, vertical 9:16, photorealistic."
   - NEVER use end_image_prompt for: digging, foundation only, construction site, half-built thing. End = completed, final state.

3) video_transition_prompt (English, for the video model):
   - What happens FROM start TO end: the process (timelapse, construction, growth, etc.).
   - Include that the video MUST END showing the final result clearly. E.g. "Timelapse of house construction from empty clearing to finished house. Excavation, foundation, walls, roof. Video ends on the completed house in the same frame."

From the user message, identify: (A) initial state, (B) final state (the completed thing they want), (C) the process. Write start = (A), end = (B), transition = (C) with clear "ends on (B)".

Output ONLY valid JSON, no markdown: { "scenes": [ { "start_image_prompt": "...", "end_image_prompt": "...", "video_transition_prompt": "..." } ] }`;

  const prompt = `${systemPrompt}\n\nUser request: ${userText.slice(0, 2000)}`;
  const response = await googleAi.models.generateContent({
    model: STORYBOARD_MODEL,
    contents: prompt,
    config: { responseMimeType: "application/json" },
  });

  const text = response.text?.trim();
  if (!text) throw new Error("Storyboard non generato");

  const parsed = JSON.parse(text) as { scenes?: StoryboardScene[] };
  const scenes = Array.isArray(parsed.scenes) ? parsed.scenes.slice(0, 3) : [];
  if (scenes.length === 0) throw new Error("Storyboard senza scene");

  return { scenes };
}
