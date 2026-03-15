"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type CreateProjectResult = { error?: string } | void;

export async function createProject(formData: FormData): Promise<CreateProjectResult> {
  try {
    const prompt = formData.get("prompt") as string;

    if (!prompt?.trim()) {
      return { error: "Descrivi cosa vuoi vedere nel video" };
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from("projects")
      .insert({
        user_prompt: prompt.trim(),
        target_url: "", // flusso "solo idea": nessun URL; colonna può essere NOT NULL nel DB
        status: "pending",
        updated_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[createProject] Supabase error:", error);
      return { error: error.message };
    }

    redirect(`/project/${data.id}`);
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "digest" in err &&
      typeof (err as { digest?: string }).digest === "string" &&
      (err as { digest: string }).digest.startsWith("NEXT_REDIRECT")
    ) {
      throw err;
    }
    console.error("[createProject] Unhandled error:", err);
    return {
      error: err instanceof Error ? err.message : "Failed to create project. Please try again.",
    };
  }
}
