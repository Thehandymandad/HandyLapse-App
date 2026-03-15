"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProject } from "@/app/actions";
import { Button } from "@/components/ui/button";

export function CreateProjectForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    setIsLoading(true);
    setError(null);

    try {
      const result = await createProject(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      if (result?.id) {
        router.push(`/project/${result.id}`);
        return;
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Qualcosa è andato storto. Riprova.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-3">
        <label htmlFor="prompt" className="text-sm font-medium text-foreground">
          Descrivi la tua idea
        </label>
        <textarea
          id="prompt"
          name="prompt"
          placeholder="Es: Una casa che si crea nel bosco. Inizio: bosco vuoto. Fine: casa finita. Transizione: scavi e costruzione."
          required
          disabled={isLoading}
          rows={4}
          className="w-full min-h-[120px] rounded-xl border-2 border-border bg-white px-4 py-3 text-base placeholder:text-muted-foreground shadow-3d-sm focus-visible:outline-none focus-visible:border-handy-yellow focus-visible:ring-2 focus-visible:ring-handy-yellow/30 focus-visible:shadow-3d focus-visible:-translate-y-0.5 transition-all duration-200"
        />
        <Button
          type="submit"
          size="lg"
          disabled={isLoading}
          className="h-14 px-8 text-base font-semibold w-full sm:w-auto rounded-xl bg-handy-yellow text-neutral-900 border-0 shadow-3d-yellow hover:shadow-3d-yellow-hover hover:-translate-y-1 active:translate-y-0 active:shadow-3d-sm transition-all duration-200"
        >
          {isLoading ? "Creazione in corso..." : "Genera video →"}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-destructive text-center">{error}</p>
      )}
    </form>
  );
}
