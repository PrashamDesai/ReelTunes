"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useState } from "react";

import Spinner from "./Spinner";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://a19f-202-131-110-138.ngrok-free.app";

type AudioResult = {
  url: string;
  status: "ready" | "error";
  filename: string | null;
  download_url: string | null;
  error?: string | null;
};

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

function resolveDownloadUrl(value: string | null) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${API_URL}${value}`;
}

export default function QuickAudioTab() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [result, setResult] = useState<AudioResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleExtract() {
    const cleaned = url.trim();
    if (!cleaned) {
      setPhase("error");
      setErrorMessage("Paste a video link to start.");
      return;
    }

    setPhase("loading");
    setErrorMessage(null);
    setResult(null);

    try {
      const response = await fetch(`${API_URL}/extract-audio`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: cleaned }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const payload: AudioResult = await response.json();
      setResult(payload);
      if (payload.status === "ready" && payload.download_url) {
        setPhase("done");
      } else {
        setPhase("error");
        setErrorMessage(payload.error || "We couldn’t pull audio from that reel.");
      }
    } catch (requestError) {
      setPhase("error");
      setErrorMessage(
        requestError instanceof Error
          ? requestError.message
          : "The request failed before we could finish.",
      );
    }
  }

  const downloadUrl = resolveDownloadUrl(result?.download_url ?? null);

  return (
    <section className="panel w-full p-6 sm:p-8">
      <div className="flex items-start gap-4">
        <div className="hidden h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500/30 to-cyan-400/30 ring-1 ring-violet-300/30 sm:flex">
          <svg viewBox="0 0 24 24" className="h-5 w-5 text-violet-200" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3v12" />
            <path d="m8 11 4 4 4-4" />
            <path d="M5 21h14" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
            Save the video’s audio
          </h2>
          <p className="mt-1.5 text-sm leading-6 text-surface-100/65">
            Paste any short video link and we’ll send you back a clean MP3 of the
            audio it’s playing.
          </p>
        </div>
      </div>

      <div className="mt-7 space-y-3">
        <label className="block text-[11px] font-semibold uppercase tracking-[0.22em] text-surface-100/50">
          Video link
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleExtract();
            }}
            className="input-shell flex-1"
            placeholder="https://www.instagram.com/reel/... or https://youtube.com/shorts/..."
            autoComplete="off"
            spellCheck={false}
          />
          <motion.button
            type="button"
            whileHover={phase === "loading" ? undefined : { scale: 1.02 }}
            whileTap={phase === "loading" ? undefined : { scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 22 }}
            onClick={() => void handleExtract()}
            disabled={phase === "loading"}
            className="primary-button sm:w-auto"
          >
            {phase === "loading" ? (
              <>
                <Spinner className="h-4 w-4" />
                Extracting…
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12h14" />
                  <path d="m13 5 7 7-7 7" />
                </svg>
                Extract Audio
              </>
            )}
          </motion.button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "loading" && (
          <motion.div
            key="loading"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-6 overflow-hidden rounded-2xl border border-violet-300/15 bg-violet-500/5 px-4 py-3"
          >
            <div className="flex items-center gap-3 text-sm text-surface-100/80">
              <Spinner className="h-4 w-4 text-violet-200" />
              <span>Pulling audio from the video and converting to MP3…</span>
            </div>
            <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div className="shimmer-bar h-full w-full rounded-full" />
            </div>
          </motion.div>
        )}

        {phase === "error" && errorMessage && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="mt-6 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-100"
          >
            {errorMessage}
          </motion.div>
        )}

        {phase === "done" && result?.status === "ready" && downloadUrl && (
          <motion.div
            key="done"
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 overflow-hidden rounded-2xl border border-emerald-300/25 bg-gradient-to-br from-emerald-400/10 via-violet-400/5 to-cyan-400/10 p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 ring-1 ring-emerald-300/30">
                  <svg viewBox="0 0 24 24" className="h-5 w-5 text-emerald-300" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="m5 12 4 4L19 7" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200/80">
                    Ready to download
                  </p>
                  <p className="mt-1 break-all text-sm font-medium text-white">
                    {result.filename}
                  </p>
                </div>
              </div>
              <motion.a
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                href={downloadUrl}
                className="primary-button"
                download
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M12 3v12" />
                  <path d="m8 11 4 4 4-4" />
                  <path d="M5 21h14" />
                </svg>
                Download MP3
              </motion.a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
