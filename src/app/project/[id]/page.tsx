import { createClient, getServiceRoleClientSafe } from "@/lib/supabase/server";
import Link from "next/link";
import { ProjectAnalyzer } from "@/components/project-analyzer";
import { ProjectScenesPreview } from "@/components/project-scenes-preview";
import { SingleVideoGenerator } from "@/components/single-video-generator";
import { CreditsBadge } from "@/components/credits-badge";

export const dynamic = "force-dynamic";

interface ProjectPageProps {
  params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  const { id } = await params;
  // Service role bypassa RLS; se non configurata usa anon (serve policy "Allow public read" su projects)
  const supabase = getServiceRoleClientSafe() ?? (await createClient());

  const { data: project, error } = await supabase
    .from("projects")
    .select("id, target_url, user_prompt, status, video_url, start_image_url, end_image_url, estimated_cost_usd, created_at")
    .eq("id", id)
    .single();

  if (error || !project) {
    return (
      <div className="min-h-screen bg-grid-pattern flex flex-col items-center justify-center px-4">
        <div className="max-w-md w-full p-6 rounded-2xl border-2 border-border bg-card shadow-3d space-y-4">
          <h1 className="text-xl font-semibold text-foreground">Progetto non trovato</h1>
          <p className="text-sm text-muted-foreground">Id richiesto: <code className="bg-muted px-1 rounded">{id}</code></p>
          {error != null && (
            <p className="text-sm text-destructive break-all">Errore Supabase: {error.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Se vedi &quot;row-level security&quot; o &quot;policy&quot;: in Supabase SQL Editor esegui la migration{" "}
            <code className="bg-muted px-1 rounded">20240319000000_allow_public_read_projects.sql</code>.
            Oppure imposta <code className="bg-muted px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> su Vercel.
          </p>
          <Link
            href="/"
            className="inline-flex items-center text-sm font-semibold text-handy-yellow hover:underline"
          >
            ← Torna alla home
          </Link>
        </div>
      </div>
    );
  }

  const isPromptOnly = !!project.user_prompt?.trim();
  const showScenes =
    !isPromptOnly &&
    (project.status === "completed" || project.status === "generating_assets");
  const scenesResult = showScenes
    ? await supabase
        .from("scenes")
        .select("id, order_index, hook_type, video_url, audio_url, narrator_script")
        .eq("project_id", id)
        .order("order_index", { ascending: true })
    : { data: [] };
  const scenes = scenesResult.data ?? [];

  return (
    <div className="min-h-screen bg-grid-pattern flex flex-col">
      <header className="flex items-center justify-between px-4 py-4 sm:px-6 shadow-3d-sm bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <Link href="/" className="text-lg font-bold text-handy-yellow hover:underline drop-shadow-[0_2px_4px_rgba(255,210,0,0.3)] hover:-translate-y-0.5 transition-transform">
          HandyLapse
        </Link>
        <CreditsBadge />
      </header>
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-12">
        <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl border-2 border-border bg-card shadow-3d hover:shadow-3d-lg transition-shadow duration-300 space-y-6">
          <>
          <h1 className="text-2xl font-semibold text-foreground">
            {isPromptOnly ? "Il tuo video" : "Project"}
          </h1>
        <dl className="space-y-3 text-sm">
          {isPromptOnly && (
            <div>
              <dt className="text-muted-foreground">Prompt</dt>
              <dd className="text-foreground mt-0.5 whitespace-pre-wrap">
                {project.user_prompt}
              </dd>
            </div>
          )}
          {!isPromptOnly && project.target_url && (
            <div>
              <dt className="text-muted-foreground">URL</dt>
              <dd className="text-foreground mt-0.5 break-all">{project.target_url}</dd>
            </div>
          )}
          {project.status !== "pending" && project.status !== "generating_assets" && (
          <div>
            <dt className="text-muted-foreground">Status</dt>
            <dd>
              <span
                className={`inline-flex px-2 py-1 rounded-md text-xs font-medium ${
                  project.status === "analyzing"
                    ? "bg-blue-500/20 text-blue-600"
                    : project.status === "completed"
                      ? "bg-green-500/20 text-green-700"
                      : project.status === "failed"
                        ? "bg-red-500/20 text-red-600"
                        : "bg-handy-yellow/20 text-neutral-800"
                }`}
              >
                {project.status.replace(/_/g, " ")}
              </span>
            </dd>
          </div>
          )}
          {isPromptOnly ? (
            <SingleVideoGenerator
              projectId={project.id}
              status={project.status}
              userPrompt={project.user_prompt}
              videoUrl={project.video_url}
              startImageUrl={project.start_image_url}
              endImageUrl={project.end_image_url}
            />
          ) : (
            <>
              <ProjectAnalyzer projectId={project.id} status={project.status} />
              {showScenes && scenes.length > 0 ? (
                <div>
                  <ProjectScenesPreview scenes={scenes} />
                </div>
              ) : null}
            </>
          )}
          {project.status === "completed" && project.estimated_cost_usd != null && (
            <div>
              <dt className="text-muted-foreground">Costo stimato (questo video)</dt>
              <dd className="text-foreground mt-0.5 font-medium">
                ~${Number(project.estimated_cost_usd).toFixed(2)} USD
              </dd>
              <dd className="text-muted-foreground text-xs mt-0.5">
                Stima: Gemini + 2 immagini + Veo 8s. Prezzi indicativi Google AI Studio.
              </dd>
            </div>
          )}
          <div>
            <dt className="text-muted-foreground">Created</dt>
            <dd className="text-foreground mt-0.5">
              {new Date(project.created_at).toLocaleString()}
            </dd>
          </div>
          <div className="pt-4 border-t border-border">
            <Link
              href="/"
              className="inline-flex items-center text-sm font-semibold text-handy-yellow hover:underline hover:-translate-x-1 transition-transform duration-200"
            >
              ← Crea altro video
            </Link>
          </div>
        </dl>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
