import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateSingleVideoTask } from "@/trigger/generate-assets";
import { getStoryboardFromPrompt } from "@/lib/get-storyboard";

export async function POST(request: Request) {
  try {
    const { projectId } = (await request.json()) as { projectId?: string };
    if (!projectId) {
      return NextResponse.json({ error: "projectId required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, user_prompt, status")
      .eq("id", projectId)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }
    if (!project.user_prompt?.trim()) {
      return NextResponse.json(
        { error: "Project has no user_prompt" },
        { status: 400 }
      );
    }
    if (project.status !== "pending") {
      return NextResponse.json(
        { error: "Project already in progress or completed" },
        { status: 400 }
      );
    }

    const storyboard = await getStoryboardFromPrompt(project.user_prompt.trim());
    await generateSingleVideoTask.trigger({ projectId, storyboard });

    return NextResponse.json({
      success: true,
      projectId,
      status: "generating_assets",
    });
  } catch (err) {
    console.error("generate-video error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}
