import { CreateProjectForm } from "@/components/create-project-form";
import { CreditsBadge } from "@/components/credits-badge";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-grid-pattern flex flex-col">
      {/* Header: logo + crediti con profondità */}
      <header className="flex items-center justify-between px-4 py-4 sm:px-6 shadow-3d-sm bg-white/80 backdrop-blur-sm sticky top-0 z-10 border-b border-border/50">
        <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "0ms", animationFillMode: "forwards" }}>
          <h2 className="text-xl font-bold text-handy-yellow drop-shadow-[0_2px_4px_rgba(255,210,0,0.3)]">HandyLapse</h2>
          <p className="text-xs text-muted-foreground">by Thehandymandad</p>
        </div>
        <CreditsBadge />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 pt-10 sm:pt-16 pb-12">
        <div className="w-full max-w-xl space-y-8">
          {/* Tag pill 3D – staccato dall'header */}
          <p
            className="inline-flex items-center gap-1.5 rounded-full border-2 border-handy-yellow/60 bg-handy-yellow/15 px-3 py-1.5 text-sm font-medium text-neutral-800 shadow-3d-sm hover:shadow-3d hover:-translate-y-0.5 transition-all duration-200 opacity-0 animate-fade-in-up"
            style={{ animationDelay: "100ms", animationFillMode: "forwards" }}
          >
            <span className="text-handy-yellow font-semibold">Un&apos;idea, un video</span>
          </p>

          {/* Titolo con leggero 3D */}
          <div className="space-y-2 opacity-0 animate-fade-in-up" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground [text-shadow:0_2px_0_rgba(0,0,0,0.05)]">
              Scrivi.
            </h1>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-handy-yellow drop-shadow-[0_3px_6px_rgba(255,210,0,0.4)]">
              Guarda il video.
            </h1>
          </div>
          <p className="text-muted-foreground max-w-lg opacity-0 animate-fade-in-up" style={{ animationDelay: "300ms", animationFillMode: "forwards" }}>
            Descrivi cosa vuoi vedere: inizio, processo e fine. Un video timelapse, senza audio.
          </p>

          {/* Form con depth */}
          <div className="opacity-0 animate-fade-in-up" style={{ animationDelay: "400ms", animationFillMode: "forwards" }}>
            <CreateProjectForm />
          </div>

          <p className="text-sm text-muted-foreground/80 text-center italic opacity-0 animate-fade-in-up" style={{ animationDelay: "500ms", animationFillMode: "forwards" }}>
            Es: &quot;Una casa che si crea nel bosco: prima il bosco vuoto, poi scavi e costruzione, alla fine la casa finita.&quot;
          </p>
        </div>
      </main>
    </div>
  );
}
