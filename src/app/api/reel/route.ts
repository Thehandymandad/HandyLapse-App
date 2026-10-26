import { NextResponse } from "next/server";
import { adminClient, checkAccess, REEL_BUCKET, type ReelJob } from "@/lib/reel/server";
import { REEL_STYLES } from "@/lib/reel/styles";
import { reelEditTask } from "@/trigger/reel-edit";

export const dynamic = "force-dynamic";

/** Ultimi lavori (per la lista nell'app). */
export async function GET(request: Request) {
  const denied = checkAccess(request);
  if (denied) return denied;
  const { data, error } = await adminClient()
    .from("reel_jobs")
    .select("id, created_at, title, style, status, stage, progress, error")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ jobs: data });
}

/**
 * Nuovo lavoro. Con `link` (Drive/Dropbox) parte subito; con `fileName` restituisce un URL firmato
 * su cui il telefono carica il video direttamente su Supabase (Vercel non accetta upload grandi), poi si chiama /start.
 */
export async function POST(request: Request) {
  const denied = checkAccess(request);
  if (denied) return denied;
  try {
    const body = (await request.json()) as { style?: string; title?: string; link?: string; fileName?: string };
    const style = REEL_STYLES.some((s) => s.id === body.style) ? body.style! : "pulse";
    const link = body.link?.trim();
    if (link && !/^https:\/\//i.test(link)) return NextResponse.json({ error: "Il link deve iniziare con https://" }, { status: 400 });
    if (!link && !body.fileName) return NextResponse.json({ error: "Manca il video" }, { status: 400 });

    const sb = adminClient();
    const { data: job, error } = await sb
      .from("reel_jobs")
      .insert({ style, title: body.title?.slice(0, 80) || null, source_link: link || null, status: link ? "queued" : "uploading" })
      .select()
      .single<ReelJob>();
    if (error || !job) throw new Error(error?.message ?? "Impossibile creare il lavoro");

    if (link) {
      const handle = await reelEditTask.trigger({ jobId: job.id });
      await sb.from("reel_jobs").update({ run_id: handle.id }).eq("id", job.id);
      return NextResponse.json({ id: job.id });
    }

    const ext = (body.fileName!.split(".").pop() ?? "mp4").toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 5) || "mp4";
    const path = `${job.id}/source.${ext}`;
    const { data: up, error: upErr } = await sb.storage.from(REEL_BUCKET).createSignedUploadUrl(path);
    if (upErr || !up) throw new Error(upErr?.message ?? "Impossibile preparare il caricamento");
    await sb.from("reel_jobs").update({ source_path: path }).eq("id", job.id);
    return NextResponse.json({ id: job.id, uploadUrl: up.signedUrl });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Errore" }, { status: 500 });
  }
}
