import { task } from "@trigger.dev/sdk/v3";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import sharp from "sharp";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

/** Risoluzione fissa 9:16 per Veo (720p verticale). Start e end image devono avere identiche dimensioni. */
const VEO_IMAGE_WIDTH = 720;
const VEO_IMAGE_HEIGHT = 1280;

let _supabase: SupabaseClient | null = null;
function getSupabase(): SupabaseClient {
  if (!_supabase) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Supabase env not configured");
    _supabase = createClient(url, key);
  }
  return _supabase;
}

let _googleAi: GoogleGenAI | null = null;
function getGoogleAi(): GoogleGenAI {
  if (!_googleAi) {
    const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY ?? "";
    _googleAi = new GoogleGenAI({ apiKey });
  }
  return _googleAi;
}

const STORAGE_BUCKET = "assets";

/** Task legacy (URL → scene + TTS): non più supportato. Usare il flusso con user_prompt e generate-single-video. */
export const generateAssetsTask = task({
  id: "generate-ad-assets",
  retry: { maxAttempts: 1 },
  run: async (_payload: { projectId: string }) => {
    throw new Error(
      "Flusso con URL e scene non più supportato. Usa la descrizione dell'idea (textarea) e l'API generate-video con storyboard."
    );
  },
});

const IMAGE_MODEL_PRIMARY = process.env.GOOGLE_IMAGE_MODEL ?? "gemini-2.5-flash-image";
const IMAGE_MODEL_FALLBACK = "imagen-4.0-generate-001";

/** Veo: verticale 9:16, 720p. */
const VEO_MODEL = process.env.VEO_MODEL ?? "veo-3.1-generate-preview";
/** Veo accetta solo 4–8 secondi. Usiamo il massimo (8). */
const VEO_DURATION_SEC = 8;

/** Stima costo in USD per 1 video (1 storyboard Gemini + 2 immagini + 1 video Veo 8s). Fonte: prezzi indicativi Google AI Studio. */
function estimateCostPerVideo(): number {
  const geminiStoryboardUsd = 0.01;
  const twoImagesUsd = 0.06;
  const veoPerSecondUsd = 0.2;
  const veoUsd = VEO_DURATION_SEC * veoPerSecondUsd;
  return Math.round((geminiStoryboardUsd + twoImagesUsd + veoUsd) * 100) / 100;
}

/**
 * Genera un'immagine con Google (Nano Banana o Imagen) e la carica su Supabase.
 * Prova prima gemini-2.5-flash-image, in caso di 404 usa imagen-4.0-generate-001. Output 9:16.
 */
async function generateImageGoogleAndUpload(
  prompt: string,
  projectId: string,
  filename: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) throw new Error("GOOGLE_GENAI_API_KEY (o GEMINI_API_KEY) richiesta per immagini");

  const config = { numberOfImages: 1 as const, aspectRatio: "9:16" as const };
  const promptSlice = prompt.slice(0, 1000);

  const googleAi = getGoogleAi();
  let response: Awaited<ReturnType<typeof googleAi.models.generateImages>>;
  try {
    response = await googleAi.models.generateImages({
      model: IMAGE_MODEL_PRIMARY,
      prompt: promptSlice,
      config,
    });
  } catch (err: unknown) {
    const is404 =
      err && typeof err === "object" && "message" in err && String((err as { message?: string }).message).includes("404");
    if (is404 && IMAGE_MODEL_PRIMARY !== IMAGE_MODEL_FALLBACK) {
      response = await googleAi.models.generateImages({
        model: IMAGE_MODEL_FALLBACK,
        prompt: promptSlice,
        config,
      });
    } else {
      throw err;
    }
  }

  const imageBytes = response.generatedImages?.[0]?.image?.imageBytes;
  if (!imageBytes) throw new Error("Google non ha restituito immagine");

  const rawBuffer = Buffer.from(imageBytes, "base64");
  // Ridimensiona a 720x1280 (9:16) identico per start e end, così Veo riceve dimensioni uniformi
  const imageBuffer = await sharp(rawBuffer)
    .resize(VEO_IMAGE_WIDTH, VEO_IMAGE_HEIGHT, { fit: "cover", position: "center" })
    .png()
    .toBuffer();

  const storagePath = `images/${projectId}/${filename}.png`;
  const { error } = await getSupabase().storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, imageBuffer, { contentType: "image/png", upsert: true });
  if (error) throw error;
  return getSupabase().storage.from(STORAGE_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

const VEO_POLL_INTERVAL_MS = 8000;

async function pollVeoAndDownload(
  operation: Awaited<ReturnType<ReturnType<typeof getGoogleAi>["models"]["generateVideos"]>>,
  projectId: string,
  sceneId: string
): Promise<Buffer> {
  const googleAi = getGoogleAi();
  let op = operation;
  while (!op.done) {
    await new Promise((r) => setTimeout(r, VEO_POLL_INTERVAL_MS));
    op = await googleAi.operations.getVideosOperation({ operation: op });
  }
  const generatedVideo = op.response?.generatedVideos?.[0]?.video;
  if (!generatedVideo) throw new Error("Veo non ha restituito video");
  const tmpPath = path.join(os.tmpdir(), `veo-${projectId}-${sceneId}-${Date.now()}.mp4`);
  await googleAi.files.download({ file: generatedVideo, downloadPath: tmpPath });
  const videoBuffer = fs.readFileSync(tmpPath);
  try {
    fs.unlinkSync(tmpPath);
  } catch {
    /* ignore */
  }
  return videoBuffer;
}

function isVeoNotSupportedError(err: unknown): boolean {
  const msg = err && typeof err === "object" && "message" in err ? String((err as { message?: string }).message) : "";
  return msg.includes("400") && msg.includes("not supported");
}

/**
 * Genera video con Veo. Prova in ordine: (1) 9:16 solo first frame, (2) 16:9 first+last frame, (3) 9:16 text-to-video.
 * L'API attualmente accetta first+last frame solo in 16:9; 9:16 funziona con solo first frame o solo prompt.
 */
async function generateVideoVeoFromImages(
  prompt: string,
  projectId: string,
  sceneId: string,
  startImageUrl: string,
  endImageUrl: string
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY;
  if (!apiKey?.trim()) throw new Error("GOOGLE_GENAI_API_KEY richiesta per Veo");

  const [startRes, endRes] = await Promise.all([fetch(startImageUrl), fetch(endImageUrl)]);
  const startBase64 = Buffer.from(await startRes.arrayBuffer()).toString("base64");
  const endBase64 = Buffer.from(await endRes.arrayBuffer()).toString("base64");

  const baseConfig = {
    numberOfVideos: 1 as const,
    durationSeconds: VEO_DURATION_SEC,
    resolution: "720p" as const,
  };

  const fullPrompt = `Vertical 9:16. Full video in smooth timelapse style so the whole process is visible. Cinematic timelapse from first frame to last frame. ${prompt}`.slice(0, 1000);
  const textOnlyPrompt = `Vertical 9:16 portrait. Entire video in smooth timelapse style. Cinematic. ${prompt}`.slice(0, 1000);

  const googleAi = getGoogleAi();
  let videoBuffer: Buffer;

  try {
    const op1 = await googleAi.models.generateVideos({
      model: VEO_MODEL,
      source: { prompt: fullPrompt, image: { imageBytes: startBase64, mimeType: "image/png" } },
      config: { ...baseConfig, aspectRatio: "9:16" },
    });
    videoBuffer = await pollVeoAndDownload(op1, projectId, sceneId);
  } catch (err1) {
    if (!isVeoNotSupportedError(err1)) throw err1;

    try {
      const op2 = await googleAi.models.generateVideos({
        model: VEO_MODEL,
        source: {
          prompt: `Cinematic 16:9. Full video in smooth timelapse style. Timelapse from first to last frame. ${prompt}`.slice(0, 1000),
          image: { imageBytes: startBase64, mimeType: "image/png" },
        },
        config: { ...baseConfig, aspectRatio: "16:9", lastFrame: { imageBytes: endBase64, mimeType: "image/png" } },
      });
      videoBuffer = await pollVeoAndDownload(op2, projectId, sceneId);
    } catch (err2) {
      if (!isVeoNotSupportedError(err2)) throw err2;

      const op3 = await googleAi.models.generateVideos({
        model: VEO_MODEL,
        source: { prompt: textOnlyPrompt },
        config: { ...baseConfig, aspectRatio: "9:16" },
      });
      videoBuffer = await pollVeoAndDownload(op3, projectId, sceneId);
    }
  }

  return uploadVideoBuffer(videoBuffer, projectId, sceneId);
}

async function uploadVideoBuffer(
  videoBuffer: Buffer,
  projectId: string,
  sceneId: string
): Promise<string> {
  const videoFileName = `video/${projectId}/${sceneId}.mp4`;
  const { error } = await getSupabase().storage
    .from(STORAGE_BUCKET)
    .upload(videoFileName, videoBuffer, {
      contentType: "video/mp4",
      upsert: true,
    });
  if (error) throw error;
  return getSupabase().storage.from(STORAGE_BUCKET).getPublicUrl(videoFileName).data.publicUrl;
}

export type StoryboardScene = {
  start_image_prompt: string;
  end_image_prompt: string;
  video_transition_prompt: string;
};
export type StoryboardPayload = { scenes: StoryboardScene[] };

/**
 * Un solo video da storyboard (solo Google):
 * Fase A: due immagini con Imagen (start_image_prompt, end_image_prompt).
 * Fase B: salvataggio su Supabase (dentro generateImageGoogleAndUpload).
 * Fase C: Veo con first/last frame e video_transition_prompt. Sempre 9:16, 720p.
 */
export const generateSingleVideoTask = task({
  id: "generate-single-video",
  retry: { maxAttempts: 1 },
  run: async (payload: { projectId: string; storyboard?: StoryboardPayload }) => {
    const { data: project, error: projectError } = await getSupabase()
      .from("projects")
      .select("id, user_prompt, status")
      .eq("id", payload.projectId)
      .single();

    if (projectError || !project) {
      throw new Error("Progetto non trovato");
    }

    const scene = payload.storyboard?.scenes?.[0];
    if (!scene) {
      throw new Error("Storyboard con almeno una scena richiesto (start_image_prompt, end_image_prompt, video_transition_prompt)");
    }

    await getSupabase()
      .from("projects")
      .update({ status: "generating_assets", updated_at: new Date().toISOString() })
      .eq("id", payload.projectId);

    const startImageUrl = await generateImageGoogleAndUpload(scene.start_image_prompt, payload.projectId, "start");
    await getSupabase()
      .from("projects")
      .update({ start_image_url: startImageUrl, updated_at: new Date().toISOString() })
      .eq("id", payload.projectId);

    const endImageUrl = await generateImageGoogleAndUpload(scene.end_image_prompt, payload.projectId, "end");
    await getSupabase()
      .from("projects")
      .update({ end_image_url: endImageUrl, updated_at: new Date().toISOString() })
      .eq("id", payload.projectId);

    const endStateShort = scene.end_image_prompt.slice(0, 280).trim();
    const fullPrompt = `Vertical 9:16, 720p. ${scene.video_transition_prompt}. The video must end clearly showing this final result: ${endStateShort}`.slice(0, 1000);
    const videoUrl = await generateVideoVeoFromImages(
      fullPrompt,
      payload.projectId,
      "video",
      startImageUrl,
      endImageUrl
    );

    const estimatedCostUsd = estimateCostPerVideo();
    await getSupabase()
      .from("projects")
      .update({
        video_url: videoUrl,
        status: "completed",
        estimated_cost_usd: estimatedCostUsd,
        updated_at: new Date().toISOString(),
      })
      .eq("id", payload.projectId);

    return { success: true, projectId: payload.projectId, video_url: videoUrl, estimated_cost_usd: estimatedCostUsd };
  },
});
