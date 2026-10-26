"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { REEL_STYLES } from "@/lib/reel/styles";

/**
 * Reel Studio per iPhone: carichi il video (o incolli un link Drive), scegli lo stile, il cloud lo monta
 * e lo salvi nel Rullino. Si installa da Safari con Condividi → "Aggiungi alla schermata Home".
 */
type Job = {
  id: string;
  created_at: string;
  title: string | null;
  style: string;
  status: "uploading" | "queued" | "processing" | "done" | "error";
  stage: string | null;
  progress: number;
  error: string | null;
};

const CODE_KEY = "reel-studio-code";
const LIME = "#D4FF3A";

function readCode() {
  try {
    return localStorage.getItem(CODE_KEY) ?? "";
  } catch {
    return "";
  }
}

function api(code: string) {
  return async function <T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(path, { ...init, headers: { "content-type": "application/json", "x-reel-code": code, ...(init?.headers ?? {}) } });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data.error ?? `Errore ${res.status}`), { status: res.status });
    return data as T;
  };
}

/** Caricamento diretto su Supabase (URL firmato) con avanzamento. */
function putFile(url: string, file: File, onProgress: (p: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const x = new XMLHttpRequest();
    x.open("PUT", url);
    x.setRequestHeader("content-type", file.type || "video/mp4");
    x.setRequestHeader("x-upsert", "true");
    x.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    x.onload = () => {
      if (x.status < 300) return resolve();
      let msg = `Caricamento non riuscito (${x.status})`;
      try {
        const body = JSON.parse(x.responseText);
        if (body.message) msg = body.message;
      } catch {}
      if (x.status === 413 || /size|exceeded|too large/i.test(msg)) msg = "Il video è troppo grande per lo spazio file: caricalo su Google Drive e incolla il link.";
      reject(new Error(msg));
    };
    x.onerror = () => reject(new Error("Connessione persa durante il caricamento"));
    x.send(file);
  });
}

const statusLabel = (j: Job) =>
  j.status === "done" ? "Pronto" : j.status === "error" ? "Errore" : j.status === "uploading" ? "Caricamento" : j.stage ?? "In coda";

export function ReelApp() {
  const [code, setCode] = useState<string | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const [gateError, setGateError] = useState("");

  const refresh = useCallback(
    async (c: string) => {
      const { jobs } = await api(c)<{ jobs: Job[] }>("/api/reel");
      setJobs(jobs);
    },
    [],
  );

  // codice salvato sul telefono
  useEffect(() => {
    const saved = readCode();
    if (!saved) return setCode("");
    refresh(saved)
      .then(() => setCode(saved))
      .catch((e) => {
        setGateError(e.status === 401 ? "" : e.message);
        setCode("");
      });
  }, [refresh]);

  // aggiorna la lista finché c'è qualcosa in lavorazione
  const active = jobs.some((j) => j.status === "queued" || j.status === "processing");
  useEffect(() => {
    if (!code || !active) return;
    const t = setInterval(() => refresh(code).catch(() => undefined), 4000);
    return () => clearInterval(t);
  }, [code, active, refresh]);

  if (code === null) return <Shell><p className="text-white/50">Carico…</p></Shell>;
  if (!code)
    return (
      <Gate
        error={gateError}
        onSubmit={async (c) => {
          try {
            await refresh(c);
            try {
              localStorage.setItem(CODE_KEY, c);
            } catch {}
            setGateError("");
            setCode(c);
          } catch (e) {
            setGateError(e instanceof Error ? e.message : "Errore");
          }
        }}
      />
    );

  if (openId) return <JobView code={code} id={openId} onBack={() => (setOpenId(null), refresh(code).catch(() => undefined))} />;

  return (
    <Shell>
      <NewReel
        code={code}
        onCreated={(id) => {
          refresh(code).catch(() => undefined);
          setOpenId(id);
        }}
      />
      {jobs.length > 0 && (
        <section className="mt-10">
          <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/50">I tuoi reel</h2>
          <ul className="space-y-3">
            {jobs.map((j) => (
              <li key={j.id}>
                <button onClick={() => setOpenId(j.id)} className="flex w-full items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-left active:bg-white/10">
                  <div className="h-12 w-12 shrink-0 rounded-xl" style={{ background: j.status === "done" ? LIME : j.status === "error" ? "#FF2E4D" : "rgba(255,255,255,0.1)" }}>
                    {(j.status === "queued" || j.status === "processing") && (
                      <div className="flex h-full items-center justify-center text-sm font-black" style={{ color: LIME }}>{j.progress}%</div>
                    )}
                    {j.status === "done" && <div className="flex h-full items-center justify-center text-2xl font-black text-black">✓</div>}
                    {j.status === "error" && <div className="flex h-full items-center justify-center text-2xl font-black text-white">!</div>}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-bold">{j.title || new Date(j.created_at).toLocaleString("it-IT", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>
                    <div className="truncate text-sm text-white/50">
                      {REEL_STYLES.find((s) => s.id === j.style)?.name ?? j.style} · {statusLabel(j)}
                    </div>
                  </div>
                  <span className="text-white/30">›</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
      <button
        className="mt-10 text-xs text-white/30 underline"
        onClick={() => {
          try {
            localStorage.removeItem(CODE_KEY);
          } catch {}
          setCode("");
        }}
      >
        Esci
      </button>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main
      className="min-h-[100dvh] bg-[#0A0B0E] text-white"
      style={{ paddingTop: "max(env(safe-area-inset-top), 20px)", paddingBottom: "max(env(safe-area-inset-bottom), 24px)" }}
    >
      <div className="mx-auto max-w-md px-5">
        <header className="mb-8 flex items-center gap-3 pt-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/reel-icon-192.png" alt="" className="h-10 w-10 rounded-xl" />
          <div>
            <h1 className="text-xl font-black leading-none">Reel Studio</h1>
            <p className="text-xs text-white/50">tagli · sottotitoli · zoom · grafiche</p>
          </div>
        </header>
        {children}
      </div>
    </main>
  );
}

function Gate({ error, onSubmit }: { error: string; onSubmit: (code: string) => void }) {
  const [value, setValue] = useState("");
  return (
    <Shell>
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (value.trim()) onSubmit(value.trim());
        }}
      >
        <p className="text-white/70">Inserisci il codice d&apos;accesso (quello che hai messo in REEL_ACCESS_CODE su Vercel).</p>
        <input
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Codice"
          className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 text-lg outline-none focus:border-[#D4FF3A]"
        />
        {error && <p className="text-sm text-[#FF2E4D]">{error}</p>}
        <button className="w-full rounded-2xl py-4 text-lg font-black text-black" style={{ background: LIME }}>
          Entra
        </button>
      </form>
    </Shell>
  );
}

function NewReel({ code, onCreated }: { code: string; onCreated: (id: string) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [link, setLink] = useState("");
  const [style, setStyle] = useState("pulse");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState("");
  const input = useRef<HTMLInputElement>(null);

  const start = async () => {
    setError("");
    if (!file && !link.trim()) return setError("Scegli un video o incolla un link");
    setBusy(0);
    try {
      const call = api(code);
      if (file) {
        const { id, uploadUrl } = await call<{ id: string; uploadUrl: string }>("/api/reel", {
          method: "POST",
          body: JSON.stringify({ style, title: title || file.name.replace(/\.[^.]+$/, ""), fileName: file.name }),
        });
        await putFile(uploadUrl, file, (p) => setBusy(p));
        await call(`/api/reel/${id}/start`, { method: "POST" });
        onCreated(id);
      } else {
        const { id } = await call<{ id: string }>("/api/reel", { method: "POST", body: JSON.stringify({ style, title, link: link.trim() }) });
        onCreated(id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Errore");
      setBusy(null);
    }
  };

  return (
    <section className="space-y-5">
      <input ref={input} type="file" accept="video/*" className="hidden" onChange={(e) => (setFile(e.target.files?.[0] ?? null), setLink(""))} />
      <button
        onClick={() => input.current?.click()}
        className="flex w-full flex-col items-center justify-center gap-2 rounded-3xl border-2 border-dashed py-10 active:bg-white/5"
        style={{ borderColor: file ? LIME : "rgba(255,255,255,0.2)" }}
      >
        <span className="text-4xl" style={{ color: LIME }}>＋</span>
        <span className="font-bold">{file ? file.name : "Scegli il video"}</span>
        <span className="text-xs text-white/40">{file ? `${(file.size / 1024 / 1024).toFixed(0)} MB` : "dal Rullino o da File"}</span>
      </button>
      <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-white/30">
        <div className="h-px flex-1 bg-white/10" />o link Google Drive / Dropbox<div className="h-px flex-1 bg-white/10" />
      </div>
      <input
        value={link}
        onChange={(e) => (setLink(e.target.value), e.target.value && setFile(null))}
        placeholder="https://drive.google.com/…"
        inputMode="url"
        className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 outline-none focus:border-[#D4FF3A]"
      />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Nome (facoltativo)"
        className="w-full rounded-2xl border border-white/15 bg-white/5 px-5 py-4 outline-none focus:border-[#D4FF3A]"
      />
      <div>
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/50">Stile</h2>
        <div className="grid grid-cols-2 gap-3">
          {REEL_STYLES.map((s) => (
            <button
              key={s.id}
              onClick={() => setStyle(s.id)}
              className="rounded-2xl border p-3 text-left"
              style={{ borderColor: style === s.id ? LIME : "rgba(255,255,255,0.1)", background: style === s.id ? "rgba(212,255,58,0.08)" : "rgba(255,255,255,0.03)" }}
            >
              <div className="font-black" style={{ color: style === s.id ? LIME : "white" }}>{s.name}</div>
              <div className="mt-1 text-xs leading-snug text-white/50">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>
      {error && <p className="text-sm text-[#FF2E4D]">{error}</p>}
      <button
        disabled={busy !== null}
        onClick={start}
        className="relative w-full overflow-hidden rounded-2xl py-5 text-lg font-black text-black disabled:opacity-90"
        style={{ background: LIME }}
      >
        {busy !== null && <div className="absolute inset-y-0 left-0 bg-black/20" style={{ width: `${busy * 100}%` }} />}
        <span className="relative">{busy === null ? "Monta il reel" : file ? `Carico… ${Math.round(busy * 100)}%` : "Avvio…"}</span>
      </button>
      <p className="text-center text-xs text-white/30">Il montaggio richiede qualche minuto: puoi chiudere l&apos;app e tornare dopo.</p>
    </section>
  );
}

function JobView({ code, id, onBack }: { code: string; id: string; onBack: () => void }) {
  const [job, setJob] = useState<Job | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      try {
        const data = await api(code)<{ job: Job; url: string | null }>(`/api/reel/${id}`);
        if (stop) return;
        setJob(data.job);
        if (data.url) setUrl(data.url);
        if (data.job.status === "done" || data.job.status === "error") return;
      } catch (e) {
        if (!stop) setError(e instanceof Error ? e.message : "Errore");
      }
      if (!stop) setTimeout(tick, 3000);
    };
    tick();
    return () => {
      stop = true;
    };
  }, [code, id]);

  // il video si scarica in anticipo: iOS apre il foglio di condivisione solo subito dopo il tocco
  useEffect(() => {
    if (!url) return;
    fetch(url)
      .then((r) => r.blob())
      .then((b) => setFile(new File([b], `${job?.title || "reel"}.mp4`.replace(/[^\w.-]+/g, "_"), { type: "video/mp4" })))
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const save = () => {
    if (file && navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file] }).catch(() => undefined);
    } else if (url) {
      window.open(url, "_blank");
    }
  };

  return (
    <Shell>
      <button onClick={onBack} className="mb-6 text-sm font-bold" style={{ color: LIME }}>
        ‹ Indietro
      </button>
      {!job && !error && <p className="text-white/50">Carico…</p>}
      {error && <p className="text-[#FF2E4D]">{error}</p>}
      {job && job.status !== "done" && job.status !== "error" && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-6xl font-black tabular-nums" style={{ color: LIME }}>{job.progress}%</div>
          <div className="mt-2 font-bold">{statusLabel(job)}</div>
          <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${Math.max(3, job.progress)}%`, background: LIME }} />
          </div>
          <p className="mt-5 text-sm text-white/40">Ci vogliono alcuni minuti. Puoi chiudere l&apos;app: il reel ti aspetta nella lista.</p>
        </div>
      )}
      {job?.status === "error" && (
        <div className="rounded-3xl border border-[#FF2E4D]/40 bg-[#FF2E4D]/10 p-6">
          <div className="font-black text-[#FF2E4D]">Montaggio non riuscito</div>
          <pre className="mt-3 whitespace-pre-wrap break-words text-xs text-white/60">{job.error}</pre>
        </div>
      )}
      {job?.status === "done" && url && (
        <div className="space-y-4">
          <video src={url} controls playsInline className="aspect-[9/16] w-full rounded-3xl bg-black" />
          {job.stage && job.stage !== "Pronto" && <p className="text-sm text-white/50">{job.stage}</p>}
          <button onClick={save} disabled={!file} className="w-full rounded-2xl py-5 text-lg font-black text-black disabled:opacity-60" style={{ background: LIME }}>
            {file ? "Salva nel Rullino" : "Preparo il video…"}
          </button>
          <p className="text-center text-xs text-white/30">Si apre la condivisione di iPhone: tocca &quot;Salva video&quot;.</p>
        </div>
      )}
    </Shell>
  );
}
