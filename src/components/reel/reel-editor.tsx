"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Clapperboard, Download, Film, Music, Scissors, Share2, Sparkles, Type, Wand2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { autoThreshold, computeEnvelope, decodeAudio, detectSpeech, ENVELOPE_HOP, padRanges } from "@/lib/reel/audio";
import { exportRealtime, exportWithWebCodecs, supportsWebCodecsExport } from "@/lib/reel/export";
import { loadFont } from "@/lib/reel/fonts";
import { mixAudio } from "@/lib/reel/mix";
import { distributeText, requestPlan, transcribeAll } from "@/lib/reel/pipeline";
import type { ReelPlayer } from "@/lib/reel/player";
import { loadCustomStyles, PRESETS, saveCustomStyles } from "@/lib/reel/presets";
import { buildTimeline, outToSrc, removedWordSet, srcToOut } from "@/lib/reel/timeline";
import type { EditPlan, Range, ReelStyle, Word } from "@/lib/reel/types";
import { cn } from "@/lib/utils";
import { ProgressBar, Section, Select, Slider, Toggle } from "./controls";
import { GraphicsPanel } from "./graphics-panel";
import { ReelPreview } from "./preview";
import { StylePanel } from "./style-panel";
import { TranscriptPanel } from "./transcript-panel";

const EMPTY_PLAN: EditPlan = { hook: "", emphasis: [], zooms: [], graphics: [], removals: [], source: "local" };
type Meta = { duration: number; width: number; height: number };
type Tab = "text" | "style" | "graphics" | "export";

function loadVideoMeta(url: string): Promise<Meta> {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    v.muted = true;
    v.onloadedmetadata = () => {
      if (!v.videoWidth || !isFinite(v.duration)) reject(new Error("Video non leggibile"));
      else resolve({ duration: v.duration, width: v.videoWidth, height: v.videoHeight });
    };
    v.onerror = () =>
      reject(new Error("Questo browser non riesce ad aprire il video. Se è un .mov HEVC dell'iPhone prova con Safari o Chrome aggiornato, oppure esportalo come MP4 H.264."));
    v.src = url;
  });
}

export function ReelEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState("");
  const [meta, setMeta] = useState<Meta | null>(null);
  const [stage, setStage] = useState<"upload" | "processing" | "edit">("upload");
  const [progress, setProgress] = useState({ p: 0, label: "" });
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [voice, setVoice] = useState<AudioBuffer | null>(null);
  const [env, setEnv] = useState<Float32Array | null>(null);
  const [words, setWords] = useState<Word[]>([]);
  const [plan, setPlan] = useState<EditPlan>(EMPTY_PLAN);
  const [style, setStyle] = useState<ReelStyle>(PRESETS[0]);
  const [customStyles, setCustomStyles] = useState<ReelStyle[]>([]);
  const [captionOffset, setCaptionOffset] = useState(0);
  const [trim, setTrim] = useState<Range>({ start: 0, end: 0 });
  const [framingX, setFramingX] = useState(0.5);
  const [language, setLanguage] = useState("it");
  const [music, setMusic] = useState<{ name: string; buffer: AudioBuffer } | null>(null);
  const [mix, setMix] = useState<AudioBuffer | null>(null);
  const [tab, setTab] = useState<Tab>("text");
  const [currentWord, setCurrentWord] = useState(-1);
  const [regenerating, setRegenerating] = useState(false);
  const [exporting, setExporting] = useState<{ p: number; label: string } | null>(null);
  const [result, setResult] = useState<{ url: string; ext: string; size: number; codec: string } | null>(null);
  const playerRef = useRef<ReelPlayer | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => setCustomStyles(loadCustomStyles()), []);

  const saveCustom = useCallback((s: ReelStyle) => {
    setCustomStyles((list) => {
      const next = [...list.filter((x) => x.id !== s.id), s];
      saveCustomStyles(next);
      return next;
    });
  }, []);

  // Font dello stile
  useEffect(() => {
    Promise.all([loadFont(style.captions.fontFamily), loadFont(style.motion.fontFamily)]).then(() => {
      const p = playerRef.current;
      if (p && !p.playing) p.draw();
    });
  }, [style.captions.fontFamily, style.motion.fontFamily]);

  // ---------- timeline ----------
  const autoThr = useMemo(() => (env ? autoThreshold(env) : -40), [env]);
  const thr = style.cuts.silenceThresholdDb ?? autoThr;
  const rawSpeech = useMemo(() => (env ? detectSpeech(env, thr, style.cuts.minSilence) : null), [env, thr, style.cuts.minSilence]);
  const speech = useMemo(
    () => (rawSpeech && meta ? padRanges(rawSpeech, style.cuts.paddingBefore, style.cuts.paddingAfter, meta.duration) : null),
    [rawSpeech, meta, style.cuts.paddingBefore, style.cuts.paddingAfter],
  );
  const tl = useMemo(
    () =>
      meta
        ? buildTimeline({ duration: meta.duration, speech: speech && speech.length ? speech : null, words, plan, style, captionOffset, trim })
        : null,
    [meta, speech, words, plan, style, captionOffset, trim],
  );
  const removed = useMemo(() => removedWordSet(plan, style, words.length), [plan, style, words.length]);
  const tlRef = useRef(tl);
  tlRef.current = tl;
  const wordsRef = useRef(words);
  wordsRef.current = words;

  // Audio finale (voce tagliata + effetti + musica), ricalcolato con un piccolo debounce
  useEffect(() => {
    if (!tl || tl.duration <= 0) return;
    let cancelled = false;
    const id = setTimeout(() => {
      mixAudio({
        tl,
        style,
        voice,
        music: music?.buffer ?? null,
        isSpeaking: env ? (src) => (env[Math.floor(src / ENVELOPE_HOP)] ?? -100) > thr : undefined,
      })
        .then((m) => !cancelled && setMix(m))
        .catch(() => undefined);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [tl, style, voice, music, env, thr]);

  const onTime = useCallback((t: number) => {
    const tl = tlRef.current;
    if (!tl) return;
    const src = outToSrc(tl, t).src;
    const ws = wordsRef.current;
    let idx = -1;
    for (let i = 0; i < ws.length && ws[i].start <= src + 0.01; i++) idx = i;
    setCurrentWord((prev) => (prev === idx ? prev : idx));
  }, []);

  const seekSource = (src: number) => {
    if (!tl) return;
    playerRef.current?.seek(srcToOut(tl.segments, tl.offsets, src));
  };

  // ---------- processing ----------
  function pickFile(f: File | undefined) {
    if (!f) return;
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|m4v|webm|mkv)$/i.test(f.name)) {
      setError("Seleziona un file video");
      return;
    }
    setError(null);
    setFile(f);
  }

  async function processVideo() {
    if (!file) return;
    setError(null);
    setWarnings([]);
    setStage("processing");
    const warn: string[] = [];
    try {
      const url = URL.createObjectURL(file);
      setProgress({ p: 0.03, label: "Apro il video…" });
      const m = await loadVideoMeta(url);
      setVideoUrl(url);
      setMeta(m);
      setTrim({ start: 0, end: m.duration });
      setFramingX(0.5);

      setProgress({ p: 0.08, label: "Estraggo l'audio…" });
      const buf = await decodeAudio(file);
      setVoice(buf);
      let detected: Range[] = [];
      if (buf) {
        setProgress({ p: 0.15, label: "Cerco le pause da tagliare…" });
        const e = computeEnvelope(buf);
        setEnv(e);
        detected = detectSpeech(e, style.cuts.silenceThresholdDb ?? autoThreshold(e), style.cuts.minSilence);
      } else {
        warn.push("Il video non ha audio: niente taglio delle pause né sottotitoli automatici.");
      }

      let ws: Word[] = [];
      if (buf && detected.length) {
        setProgress({ p: 0.2, label: "Trascrivo quello che dici…" });
        try {
          ws = await transcribeAll(buf, detected, language, (p) => setProgress({ p: 0.2 + p * 0.55, label: "Trascrivo quello che dici…" }));
        } catch (e) {
          warn.push(
            `Trascrizione AI non riuscita (${e instanceof Error ? e.message : "errore"}). Puoi incollare il testo a mano nella scheda "Testo & tagli".`,
          );
        }
      }
      setWords(ws);

      setProgress({ p: 0.8, label: "Creo il montaggio: hook, zoom, grafiche…" });
      const { plan: p, warning } = await requestPlan(ws, style, m.duration);
      if (warning && ws.length) warn.push(warning);
      setPlan(p);
      setProgress({ p: 1, label: "Pronto!" });
      setWarnings(warn);
      setTab(ws.length ? "text" : "text");
      setStage("edit");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Qualcosa è andato storto");
      setStage("upload");
    }
  }

  async function regeneratePlan() {
    if (!meta) return;
    setRegenerating(true);
    const manual = plan.removals.filter((r) => r.reason === "manual");
    const { plan: p, warning } = await requestPlan(words, style, meta.duration);
    setPlan({ ...p, removals: [...p.removals, ...manual] });
    if (warning) setWarnings((w) => [...w, warning]);
    setRegenerating(false);
  }

  async function applyManualText(text: string) {
    if (!meta) return;
    const ws = distributeText(text, rawSpeech ?? [], meta.duration);
    setWords(ws);
    setPlan(EMPTY_PLAN);
    setRegenerating(true);
    const { plan: p } = await requestPlan(ws, style, meta.duration);
    setPlan(p);
    setRegenerating(false);
  }

  async function onMusic(f: File | undefined) {
    if (!f) return;
    const buffer = await decodeAudio(f);
    if (buffer) setMusic({ name: f.name, buffer });
    else setWarnings((w) => [...w, "File musicale non leggibile"]);
  }

  // ---------- export ----------
  async function doExport() {
    if (!tl || !file || !meta) return;
    playerRef.current?.pause();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    setExporting({ p: 0, label: "Preparo l'audio…" });
    try {
      const finalMix =
        mix && Math.abs(mix.duration - tl.duration) < 0.05
          ? mix
          : await mixAudio({ tl, style, voice, music: music?.buffer ?? null });
      const onProgress = (p: number, label: string) => setExporting({ p, label });
      let res;
      if (await supportsWebCodecsExport()) {
        try {
          res = await exportWithWebCodecs({ file, tl, style, framingX, mix: finalMix, onProgress, signal: ctrl.signal });
        } catch (e) {
          if (ctrl.signal.aborted) throw e;
          console.warn("WebCodecs export failed, fallback realtime", e);
          res = await exportRealtime({ videoUrl, tl, style, framingX, mix: finalMix, onProgress, signal: ctrl.signal });
        }
      } else {
        res = await exportRealtime({ videoUrl, tl, style, framingX, mix: finalMix, onProgress, signal: ctrl.signal });
      }
      setResult({ url: URL.createObjectURL(res.blob), ext: res.ext, size: res.blob.size, codec: res.codec });
    } catch (e) {
      if (!ctrl.signal.aborted) setError(e instanceof Error ? e.message : "Export non riuscito");
    } finally {
      setExporting(null);
      abortRef.current = null;
    }
  }

  async function share() {
    if (!result) return;
    const blob = await fetch(result.url).then((r) => r.blob());
    const f = new File([blob], `reel.${result.ext}`, { type: blob.type });
    if (navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f] }).catch(() => undefined);
  }

  function reset() {
    playerRef.current?.pause();
    if (videoUrl) URL.revokeObjectURL(videoUrl);
    if (result) URL.revokeObjectURL(result.url);
    setFile(null);
    setVideoUrl("");
    setMeta(null);
    setVoice(null);
    setEnv(null);
    setWords([]);
    setPlan(EMPTY_PLAN);
    setMix(null);
    setResult(null);
    setWarnings([]);
    setStage("upload");
  }

  // ---------- UI ----------
  if (stage !== "edit" || !tl || !meta) {
    return (
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
        <div className="mb-8 space-y-2">
          <p className="inline-flex items-center gap-1.5 rounded-full border-2 border-handy-yellow/60 bg-handy-yellow/15 px-3 py-1 text-sm font-semibold">
            <Wand2 className="h-4 w-4" /> Reel Editor AI
          </p>
          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Carica il girato. <span className="text-handy-yellow drop-shadow-[0_3px_6px_rgba(255,210,0,0.4)]">Esce il reel.</span>
          </h1>
          <p className="max-w-2xl text-muted-foreground">
            Taglio automatico delle pause e degli “ehm”, sottotitoli animati parola per parola, zoom, motion graphics ed effetti sonori. Lo stile lo
            scegli tu o lo copiamo da un reel di riferimento.
          </p>
        </div>

        {stage === "processing" ? (
          <div className="mx-auto max-w-lg space-y-4 rounded-2xl border border-border bg-white p-6 shadow-3d">
            <div className="flex items-center gap-3">
              <Clapperboard className="h-6 w-6 animate-pulse text-handy-yellow" />
              <p className="font-semibold">Sto montando il tuo reel…</p>
            </div>
            <ProgressBar value={progress.p} label={progress.label} />
            <p className="text-xs text-muted-foreground">Il video resta nel tuo browser: all&apos;AI mandiamo solo l&apos;audio a pezzi per la trascrizione.</p>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
            <div className="space-y-4">
              <label
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  pickFile(e.dataTransfer.files?.[0]);
                }}
                className={cn(
                  "flex min-h-[260px] cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed bg-white p-6 text-center shadow-3d-sm transition hover:shadow-3d",
                  file ? "border-handy-yellow" : "border-border",
                )}
              >
                <input type="file" accept="video/*,.mov,.mp4,.m4v,.webm" className="hidden" onChange={(e) => pickFile(e.target.files?.[0])} />
                <Film className="h-10 w-10 text-handy-yellow" />
                {file ? (
                  <>
                    <p className="font-semibold">{file.name}</p>
                    <p className="text-sm text-muted-foreground">{(file.size / 1024 / 1024).toFixed(1)} MB · clicca per cambiare</p>
                  </>
                ) : (
                  <>
                    <p className="font-semibold">Trascina qui il tuo video grezzo</p>
                    <p className="text-sm text-muted-foreground">o clicca per sceglierlo (MP4, MOV dall&apos;iPhone…)</p>
                  </>
                )}
              </label>
              <div className="flex flex-wrap items-end gap-3">
                <div className="w-44">
                  <Select
                    label="Lingua del parlato"
                    value={language}
                    onChange={setLanguage}
                    options={[
                      { value: "it", label: "Italiano" },
                      { value: "en", label: "Inglese" },
                      { value: "es", label: "Spagnolo" },
                      { value: "fr", label: "Francese" },
                      { value: "de", label: "Tedesco" },
                      { value: "", label: "Automatica" },
                    ]}
                  />
                </div>
                <Button size="lg" disabled={!file} onClick={processVideo} className="shadow-3d-yellow hover:shadow-3d-yellow-hover">
                  <Sparkles className="h-4 w-4" /> Crea il reel
                </Button>
              </div>
              {error && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}
            </div>
            <StylePanel style={style} onChange={setStyle} customStyles={customStyles} onSaveCustom={saveCustom} compact />
          </div>
        )}
      </div>
    );
  }

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "text", label: "Testo & tagli", icon: <Scissors className="h-4 w-4" /> },
    { id: "style", label: "Stile", icon: <Type className="h-4 w-4" /> },
    { id: "graphics", label: "Grafiche & zoom", icon: <Sparkles className="h-4 w-4" /> },
    { id: "export", label: "Musica & export", icon: <Download className="h-4 w-4" /> },
  ];
  const wider = meta.width / meta.height > 9 / 16 + 0.01;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-bold">Reel Editor</h1>
        <span className="truncate text-sm text-muted-foreground">{file?.name}</span>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={reset}>
          <X className="h-4 w-4" /> Nuovo video
        </Button>
      </div>
      {warnings.length > 0 && (
        <div className="mb-4 space-y-1 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
          {warnings.map((w, i) => (
            <p key={i}>⚠️ {w}</p>
          ))}
        </div>
      )}
      {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{error}</p>}

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="lg:sticky lg:top-4 lg:self-start">
          <ReelPreview videoUrl={videoUrl} tl={tl} style={style} framingX={framingX} mix={mix} playerRef={playerRef} onTime={onTime} />
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex gap-1 overflow-x-auto rounded-xl bg-neutral-100 p-1">
            {tabs.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition",
                  tab === t.id ? "bg-white shadow-3d-sm" : "text-muted-foreground hover:text-foreground",
                )}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          {tab === "text" && (
            <TranscriptPanel
              words={words}
              setWords={setWords}
              plan={plan}
              setPlan={setPlan}
              style={style}
              setStyle={setStyle}
              removed={removed}
              autoThresholdDb={autoThr}
              sourceDuration={meta.duration}
              outDuration={tl.duration}
              captionOffset={captionOffset}
              setCaptionOffset={setCaptionOffset}
              trim={trim}
              setTrim={setTrim}
              onManualText={applyManualText}
              onSeekSource={seekSource}
            />
          )}
          {tab === "style" && <StylePanel style={style} onChange={setStyle} customStyles={customStyles} onSaveCustom={saveCustom} />}
          {tab === "graphics" && (
            <GraphicsPanel
              plan={plan}
              setPlan={setPlan}
              words={words}
              removed={removed}
              currentWord={currentWord}
              onSeekWord={(i) => words[i] && seekSource(words[i].start)}
              onRegenerate={regeneratePlan}
              regenerating={regenerating}
            />
          )}
          {tab === "export" && (
            <div className="space-y-4">
              <Section title="Musica di sottofondo">
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border p-3 text-sm hover:bg-neutral-50">
                  <Music className="h-4 w-4 text-handy-yellow" />
                  <span className="flex-1 truncate">{music ? music.name : "Carica una traccia audio (MP3, M4A, WAV…)"}</span>
                  <input type="file" accept="audio/*" className="hidden" onChange={(e) => onMusic(e.target.files?.[0])} />
                </label>
                {music && (
                  <>
                    <Slider
                      label="Volume musica"
                      value={style.music.volume}
                      min={0}
                      max={1}
                      onChange={(v) => setStyle({ ...style, music: { ...style.music, volume: v } })}
                      format={(v) => `${Math.round(v * 100)}%`}
                    />
                    <Toggle
                      label="Abbassa la musica quando parli"
                      checked={style.music.ducking}
                      onChange={(v) => setStyle({ ...style, music: { ...style.music, ducking: v } })}
                    />
                    <Button variant="ghost" size="sm" onClick={() => setMusic(null)}>
                      Rimuovi musica
                    </Button>
                  </>
                )}
              </Section>
              {wider && (
                <Section title="Inquadratura 9:16">
                  <Slider label="Posizione orizzontale" value={framingX} min={0} max={1} onChange={setFramingX} format={(v) => `${Math.round(v * 100)}%`} />
                </Section>
              )}
              <Section title="Esporta">
                <p className="text-sm text-muted-foreground">
                  MP4 verticale 1080×1920, 30 fps, pronto per Instagram e TikTok. Durata: {tl.duration.toFixed(1)}s.
                </p>
                {exporting ? (
                  <div className="space-y-2">
                    <ProgressBar value={exporting.p} label={exporting.label} />
                    <Button variant="ghost" size="sm" onClick={() => abortRef.current?.abort()}>
                      Annulla
                    </Button>
                  </div>
                ) : (
                  <Button size="lg" onClick={doExport} className="w-full shadow-3d-yellow hover:shadow-3d-yellow-hover">
                    <Download className="h-4 w-4" /> Esporta il reel
                  </Button>
                )}
                {result && (
                  <div className="space-y-3 rounded-xl border border-border p-3">
                    <video src={result.url} controls playsInline className="mx-auto max-h-[420px] rounded-lg bg-black" />
                    <p className="text-center text-xs text-muted-foreground">
                      {(result.size / 1024 / 1024).toFixed(1)} MB · {result.codec}
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={result.url}
                        download={`reel-${Date.now()}.${result.ext}`}
                        className="flex flex-1 items-center justify-center gap-2 rounded-md bg-handy-yellow px-4 py-2 text-sm font-semibold"
                      >
                        <Download className="h-4 w-4" /> Scarica
                      </a>
                      <Button variant="outline" onClick={share} className="flex-1">
                        <Share2 className="h-4 w-4" /> Condividi
                      </Button>
                    </div>
                  </div>
                )}
              </Section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
