"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState, useTransition } from "react";

import ResultsTable, { type ResultItem } from "./ResultsTable";
import Spinner from "./Spinner";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://a19f-202-131-110-138.ngrok-free.app";

const PIPELINE_STEPS = {
  single: [
    "Checking the link",
    "Listening to the video",
    "Identifying the song",
    "Fetching the full track",
  ],
  collection: [
    "Opening the collection",
    "Finding every video",
    "Listening to each one",
    "Saving every song we find",
  ],
} as const;

type Mode = keyof typeof PIPELINE_STEPS;
type Phase = "idle" | "loading" | "done" | "error";

async function readApiError(response: Response) {
  try {
    const payload = await response.json();
    if (typeof payload?.detail === "string") return payload.detail;
  } catch {
    return `Request failed with status ${response.status}.`;
  }
  return `Request failed with status ${response.status}.`;
}

async function processUrl(mode: Mode, url: string): Promise<ResultItem[]> {
  const endpoint = mode === "single" ? "/process-single" : "/process-batch";
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = await response.json();
  return Array.isArray(payload) ? payload : [payload];
}

type SongFinderTabProps = {
  sharedUrl?: string;
};

export default function SongFinderTab({
  sharedUrl = "",
}: SongFinderTabProps) {
  const [mode, setMode] = useState<Mode>("single");
  const [singleUrl, setSingleUrl] = useState(sharedUrl);
  const [collectionUrl, setCollectionUrl] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [activeMode, setActiveMode] = useState<Mode>("single");
  const [error, setError] = useState<string | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (phase !== "loading") return;
    setStepIndex(0);
    const interval = window.setInterval(() => {
      setStepIndex((current) => current + 1);
    }, 1500);
    return () => window.clearInterval(interval);
  }, [phase, activeMode]);

  useEffect(() => {
    if (!sharedUrl) return;
    setMode("single");
    setSingleUrl(sharedUrl);

    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [sharedUrl]);

  const foundResults = results.filter((item) => item.status === "found" && item.filename);
  const failedResults = results.filter((item) => item.status !== "found");
  const steps = PIPELINE_STEPS[activeMode];
  const currentStep = steps[Math.min(stepIndex, steps.length - 1)];

  async function runPipeline() {
    const source = (mode === "single" ? singleUrl : collectionUrl).trim();
    if (!source) {
      setPhase("error");
      setError("Paste a video link to start.");
      return;
    }

    setActiveMode(mode);
    setPhase("loading");
    setError(null);
    setResults([]);

    try {
      const next = await processUrl(mode, source);
      startTransition(() => {
        setResults(next);
        setPhase("done");
      });
    } catch (requestError) {
      setPhase("error");
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Something broke before we could finish.",
      );
    }
  }

  async function retryFailed() {
    if (!failedResults.length) return;
    setPhase("loading");
    setError(null);
    setActiveMode("collection");

    const retried = await Promise.all(
      failedResults.map(async (item) => {
        try {
          const [next] = await processUrl("single", item.url);
          return next;
        } catch (requestError) {
          return {
            ...item,
            error:
              requestError instanceof Error ? requestError.message : "Retry failed.",
          };
        }
      }),
    );

    const replacements = new Map(retried.map((item) => [item.url, item]));
    startTransition(() => {
      setResults((current) =>
        current.map((item) => replacements.get(item.url) ?? item),
      );
      setPhase("done");
    });
  }

  function downloadAll() {
    if (!foundResults.length) return;
    const params = new URLSearchParams();
    foundResults.forEach((item) => {
      if (item.filename) params.append("file", item.filename);
    });
    const link = document.createElement("a");
    link.href = `${API_URL}/results/archive?${params.toString()}`;
    link.click();
  }

  const isLoading = phase === "loading";
  const activeUrl = mode === "single" ? singleUrl : collectionUrl;

  return (
    <div className="space-y-6">
      <section className="panel w-full p-6 sm:p-8">
        <div className="flex items-start gap-4">
          <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-pink-500/30 to-violet-500/30 ring-1 ring-pink-300/30 sm:flex">
            <svg viewBox="0 0 24 24" className="h-5 w-5 text-pink-200" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </div>
          <div className="flex-1">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
              Find the original song
            </h2>
            <p className="mt-1.5 text-sm leading-6 text-surface-100/65">
              We listen to the video, identify the track, and download the full
              version for you.
            </p>
          </div>
        </div>

        <div
          className="mt-6 inline-flex w-full items-center gap-1 rounded-2xl border border-white/[0.07] bg-white/[0.03] p-1"
          role="tablist"
          aria-label="Source type"
        >
          {(["single", "collection"] as const).map((option) => {
            const isActive = option === mode;
            return (
              <button
                key={option}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setMode(option)}
                className={`relative flex-1 rounded-xl px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition ${
                  isActive ? "text-white" : "text-surface-100/55 hover:text-white"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="finder-mode-glow"
                    transition={{ type: "spring", stiffness: 360, damping: 30 }}
                    className="absolute inset-0 -z-0 rounded-xl bg-gradient-to-br from-violet-500/30 to-pink-500/25 ring-1 ring-violet-300/25"
                  />
                )}
                <span className="relative">
                  {option === "single" ? "Single Video" : "Collection"}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 space-y-3">
          <label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-surface-100/50">
            {mode === "single" ? "Video link" : "Collection or saved-folder link"}
          </label>
          <AnimatePresence mode="wait">
            <motion.input
              key={mode}
              ref={inputRef}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.18 }}
              value={activeUrl}
              onChange={(event) =>
                mode === "single"
                  ? setSingleUrl(event.target.value)
                  : setCollectionUrl(event.target.value)
              }
              onKeyDown={(event) => {
                if (event.key === "Enter") void runPipeline();
              }}
              className="input-shell"
              placeholder={
                mode === "single"
                  ? "https://www.instagram.com/reel/... or https://youtube.com/shorts/..."
                  : "https://www.instagram.com/<user>/saved/..."
              }
              autoComplete="off"
              spellCheck={false}
            />
          </AnimatePresence>

          <motion.button
            type="button"
            whileHover={isLoading ? undefined : { scale: 1.01 }}
            whileTap={isLoading ? undefined : { scale: 0.99 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            onClick={() => void runPipeline()}
            disabled={isLoading}
            className="primary-button mt-2 w-full"
          >
            {isLoading ? (
              <>
                <Spinner className="h-4 w-4" />
                Working on it…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M9 18V5l12-2v13" />
                  <circle cx="6" cy="18" r="3" />
                  <circle cx="18" cy="16" r="3" />
                </svg>
                {mode === "single" ? "Find this song" : "Process collection"}

              </>
            )}
          </motion.button>
        </div>
      </section>

      <AnimatePresence mode="wait">
        {isLoading && (
          <motion.section
            key="progress"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            className="panel p-6 sm:p-7"
          >
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/15 ring-1 ring-violet-300/30">
                  <Spinner className="h-4 w-4 text-violet-200" />
                </div>
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-surface-100/50">
                    Step {Math.min(stepIndex + 1, steps.length)} of {steps.length}
                  </p>
                  <h3 className="mt-0.5 text-lg font-semibold text-white">
                    {currentStep}
                  </h3>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                {steps.map((step, index) => {
                  const active = index === Math.min(stepIndex, steps.length - 1);
                  const complete = index < Math.min(stepIndex, steps.length - 1);
                  return (
                    <motion.div
                      key={step}
                      layout
                      initial={false}
                      animate={{
                        scale: active ? 1.02 : 1,
                        opacity: active || complete ? 1 : 0.6,
                      }}
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                      className={`rounded-2xl border px-3.5 py-2.5 text-xs leading-5 transition ${
                        active
                          ? "border-violet-300/55 bg-violet-500/15 text-white"
                          : complete
                            ? "border-emerald-300/35 bg-emerald-400/10 text-emerald-100"
                            : "border-white/[0.07] bg-white/[0.03] text-surface-100/55"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {complete ? (
                          <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                            <path d="m5 12 4 4L19 7" />
                          </svg>
                        ) : (
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              active ? "animate-pulse bg-violet-300" : "bg-white/20"
                            }`}
                          />
                        )}
                        <span>{step}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {phase === "error" && error && (
          <motion.section
            key="finder-error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          >
            {error}
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.section
            key="results"
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="panel p-6 sm:p-7"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-surface-100/55">
                  Results
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight text-white">
                  Your songs
                </h2>
              </div>
              <div className="flex flex-wrap gap-2.5">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={downloadAll}
                  disabled={!foundResults.length || isLoading}
                  className="secondary-button"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <path d="M7 10l5 5 5-5" />
                    <path d="M12 15V3" />
                  </svg>
                  Download all ({foundResults.length})
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => void retryFailed()}
                  disabled={!failedResults.length || isLoading}
                  className="secondary-button"
                >
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M3 12a9 9 0 0 1 15.6-6.2L21 8" />
                    <path d="M21 3v5h-5" />
                    <path d="M21 12a9 9 0 0 1-15.6 6.2L3 16" />
                    <path d="M3 21v-5h5" />
                  </svg>
                  Retry failed ({failedResults.length})
                </motion.button>
              </div>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {[
                { label: "Processed", value: results.length },
                { label: "Found", value: foundResults.length, accent: "emerald" },
                { label: "Needs review", value: failedResults.length, accent: "rose" },
              ].map((stat) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  className="metric-card"
                >
                  <span className="metric-label">{stat.label}</span>
                  <strong
                    className={`mt-2 block text-2xl font-bold ${
                      stat.accent === "emerald"
                        ? "text-emerald-300"
                        : stat.accent === "rose"
                          ? "text-rose-300"
                          : "text-white"
                    }`}
                  >
                    {stat.value}
                  </strong>
                </motion.div>
              ))}
            </div>

            <div className="mt-6">
              <ResultsTable results={results} apiUrl={API_URL} />
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  );
}
