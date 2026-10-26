import { NextResponse } from "next/server";
import { adminClient, checkAccess, type ReelJob } from "@/lib/reel/server";
import { reelEditTask } from "@/trigger/reel-edit";

/** Dopo il caricamento del video: fa partire il montaggio nel cloud (Trigger.dev). */
export async function POST(request: Request, { params }: { params: { id: string } }) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const sb = adminClient();
  const { data: job } = await sb.from("reel_jobs").select("*").eq("id", params.id).single<ReelJob>();
  if (!job) return NextResponse.json({ error: "Lavoro non trovato" }, { status: 404 });
  if (job.status !== "uploading") return NextResponse.json({ id: job.id });
  try {
    await sb.from("reel_jobs").update({ status: "queued", stage: "In coda", updated_at: new Date().toISOString() }).eq("id", job.id);
    const handle = await reelEditTask.trigger({ jobId: job.id });
    await sb.from("reel_jobs").update({ run_id: handle.id }).eq("id", job.id);
    return NextResponse.json({ id: job.id });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Errore";
    await sb.from("reel_jobs").update({ status: "error", error: `Avvio non riuscito: ${msg}` }).eq("id", job.id);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
