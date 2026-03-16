import { NextResponse } from "next/server";
import { createClient, getServiceRoleClientSafe } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

    const supabase = getServiceRoleClientSafe() ?? (await createClient());
    const { data: project, error } = await supabase
      .from("projects")
      .select("status, video_url, start_image_url, end_image_url")
      .eq("id", id)
      .single();

    if (error || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    return NextResponse.json({
      status: project.status,
      video_url: project.video_url ?? null,
      start_image_url: project.start_image_url ?? null,
      end_image_url: project.end_image_url ?? null,
    });
  } catch (e) {
    console.error("[project status]", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
