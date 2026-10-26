import { NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export const REEL_BUCKET = "reels";

export type ReelJob = {
  id: string;
  created_at: string;
  title: string | null;
  style: string;
  source_path: string | null;
  source_link: string | null;
  status: "uploading" | "queued" | "processing" | "done" | "error";
  stage: string | null;
  progress: number;
  output_path: string | null;
  error: string | null;
};

/**
 * Le API del Reel Studio sono protette da un codice d'accesso (REEL_ACCESS_CODE nelle env di Vercel):
 * ogni montaggio consuma crediti (ElevenLabs, Trigger.dev), quindi non deve poterlo usare chiunque trovi l'URL.
 * Restituisce una risposta d'errore, oppure null se la richiesta è autorizzata.
 */
export function checkAccess(request: Request): NextResponse | null {
  const expected = process.env.REEL_ACCESS_CODE?.trim();
  if (!expected) {
    return NextResponse.json({ error: "REEL_ACCESS_CODE non configurato su Vercel" }, { status: 503 });
  }
  if (request.headers.get("x-reel-code")?.trim() !== expected) {
    return NextResponse.json({ error: "Codice d'accesso sbagliato" }, { status: 401 });
  }
  return null;
}

/** Client con service role (la tabella reel_jobs non ha policy pubbliche). */
export function adminClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url?.trim() || !key?.trim()) throw new Error("Supabase non configurato (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)");
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Link firmato (24 h) per vedere/scaricare il reel montato. */
export async function outputUrl(path: string | null) {
  if (!path) return null;
  const { data } = await adminClient().storage.from(REEL_BUCKET).createSignedUrl(path, 60 * 60 * 24, { download: false });
  return data?.signedUrl ?? null;
}
