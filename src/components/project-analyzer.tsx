"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface ProjectAnalyzerProps {
  projectId: string;
  status: string;
}

export function ProjectAnalyzer({ projectId, status }: ProjectAnalyzerProps) {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "pending" || isAnalyzing) return;

    setIsAnalyzing(true);
    setError(null);

    fetch("/api/extract-brand", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ projectId }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Extraction failed");
        router.refresh();
      })
      .catch((err) => {
        setError(err.message || "Failed to analyze website");
      })
      .finally(() => {
        setIsAnalyzing(false);
      });
  }, [projectId, status, router]);

  if (status !== "pending") return null;

  return (
    <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 space-y-2">
      {isAnalyzing ? (
        <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
          <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm font-medium">Analyzing website...</span>
        </div>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
