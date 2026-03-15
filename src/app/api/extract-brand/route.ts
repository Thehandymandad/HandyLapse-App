import { NextResponse } from "next/server";
import * as cheerio from "cheerio";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { generateAssetsTask } from "@/trigger/generate-assets";
import { GoogleGenAI } from "@google/genai";

const sceneSchema = z.object({
  scene_type: z.enum(["hook", "main_product", "call_to_action"]),
  narrator_script: z.string().describe("The script for the narrator voice-over"),
  visual_prompt: z
    .string()
    .describe(
      "Extremely detailed, cinematographic prompt for high-end AI video (e.g. Veo): photorealistic, 8K, cinematic lighting, camera movement, lens, color grading, atmosphere"
    ),
});

const scenesSchema = z.object({
  scenes: z
    .array(sceneSchema)
    .length(3)
    .describe(
      "Exactly 3 scenes in order: Hook (attention grabber), Main Product (showcase), Call to Action (CTA)"
    ),
});

export async function POST(request: Request) {
  try {
    const { projectId } = (await request.json()) as { projectId: string };

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required" },
        { status: 400 }
      );
    }

    if (!process.env.GOOGLE_GENAI_API_KEY && !process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "GOOGLE_GENAI_API_KEY or GEMINI_API_KEY is required" },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("id, target_url, status")
      .eq("id", projectId)
      .single();

    if (projectError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.status !== "pending") {
      return NextResponse.json(
        { error: "Project is not in pending status" },
        { status: 400 }
      );
    }

    await supabase
      .from("projects")
      .update({ status: "analyzing", updated_at: new Date().toISOString() })
      .eq("id", projectId);

    const url = project.target_url;
    let pageText = "";

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; CreadsBot/1.0; +https://creads.studio)",
        },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const html = await res.text();
      const $ = cheerio.load(html);

      $("script, style, nav, footer, header, aside").remove();
      const headings = $("h1, h2, h3")
        .map((_, el) => $(el).text().trim())
        .get()
        .join("\n");
      const paragraphs = $("p")
        .map((_, el) => $(el).text().trim())
        .get()
        .filter((t) => t.length > 30)
        .slice(0, 15)
        .join("\n");
      const metaDesc = $('meta[name="description"]').attr("content") || "";
      const title = $("title").text() || "";

      pageText = [title, metaDesc, headings, paragraphs]
        .filter(Boolean)
        .join("\n\n");
    } catch (fetchError) {
      console.error("Fetch error:", fetchError);
      await supabase
        .from("projects")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", projectId);
      return NextResponse.json(
        { error: "Failed to fetch or parse URL" },
        { status: 500 }
      );
    }

    if (!pageText.trim()) {
      await supabase
        .from("projects")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", projectId);
      return NextResponse.json(
        { error: "No extractable content from URL" },
        { status: 400 }
      );
    }

    const googleAi = new GoogleGenAI({
      apiKey: process.env.GOOGLE_GENAI_API_KEY ?? process.env.GEMINI_API_KEY ?? "",
    });

    const systemPrompt = `You are an expert creative director for UGC video ads. Generate exactly 3 scenes for a short video ad based on the website content. The video will be VERTICAL (9:16 portrait). Reply ONLY with a valid JSON object: { "scenes": [ { "scene_type": "hook", "narrator_script": "...", "visual_prompt": "..." }, { "scene_type": "main_product", ... }, { "scene_type": "call_to_action", ... } ] }. scene_type must be exactly "hook" | "main_product" | "call_to_action". narrator_script: 1-2 frasi in ITALIANO. visual_prompt: extremely detailed in ENGLISH, vertical/portrait 9:16, photorealistic 8K, cinematic lighting, camera movement. No markdown.`;

    const prompt = `Website: ${url}\n\nContent:\n${pageText.slice(0, 8000)}\n\nGenerate exactly 3 scenes (hook, main_product, call_to_action). Same visual aesthetic. narrator_script in Italian. visual_prompt in English, vertical 9:16, detailed. JSON only.`;

    const response = await googleAi.models.generateContent({
      model: process.env.EXTRACT_BRAND_MODEL ?? "gemini-2.5-flash",
      contents: `${systemPrompt}\n\n${prompt}`,
      config: { responseMimeType: "application/json" },
    });

    const text = response.text?.trim();
    if (!text) throw new Error("Gemini non ha restituito scene");

    const parsed = JSON.parse(text) as { scenes?: unknown[] };
    const output = scenesSchema.parse(parsed);

    const sceneTypes = ["hook", "main_product", "call_to_action"] as const;

    const scenesData = output.scenes.map((s, i) => ({
      project_id: projectId,
      hook_type: sceneTypes[i],
      order_index: i + 1,
      narrator_script: s.narrator_script,
      visual_prompt: s.visual_prompt,
    }));

    console.log("Dati da salvare:", scenesData);

    const { error: insertError } = await supabase.from("scenes").insert(scenesData);

    if (insertError) {
      console.error("Scenes insert error:", insertError);
      await supabase
        .from("projects")
        .update({ status: "failed", updated_at: new Date().toISOString() })
        .eq("id", projectId);
      return NextResponse.json(
        { error: insertError.message, details: insertError },
        { status: 500 }
      );
    }

    await generateAssetsTask.trigger({ projectId });

    await supabase
      .from("projects")
      .update({
        status: "generating_assets",
        updated_at: new Date().toISOString(),
      })
      .eq("id", projectId);

    return NextResponse.json({
      success: true,
      projectId,
      status: "generating_assets",
      scenesCount: 3,
    });
  } catch (err) {
    console.error("extract-brand error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
