import { NextResponse } from "next/server";
import { adminClient, checkAccess, outputUrl, type ReelJob } from "@/lib/reel/server";

export const dynamic = "force-dynamic";

/** Stato di un lavoro (l'app lo interroga ogni pochi secondi) + link al video finito. */
export async function GET(request: Request, { params }: { params: { id: string } }) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const { data: job, error } = await adminClient().from("reel_jobs").select("*").eq("id", params.id).single<ReelJob>();
  if (error || !job) return NextResponse.json({ error: "Lavoro non trovato" }, { status: 404 });
  return NextResponse.json({ job, url: job.status === "done" ? await outputUrl(job.output_path) : null });
}
