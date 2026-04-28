"use client";

import { AnimatePresence, motion } from "framer-motion";
import { shareContent, triggerDownload } from "@/lib/mobileActions";

export type ResultItem = {
  url: string;
  status: "found" | "not_found";
  title: string | null;
  artist: string | null;
  query: string | null;
  filename: string | null;
  download_url: string | null;
  youtube_url: string | null;
  error?: string | null;
};

function resolveApiUrl(apiUrl: string, value: string | null) {
  if (!value) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return `${apiUrl}${value}`;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.06, delayChildren: 0.05 },
  },
};

const rowVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32, ease: [0.22, 1, 0.36, 1] } },
};

export default function ResultsTable({
  results,
  apiUrl,
  selectedUrls,
  onToggleSelect,
}: {
  results: ResultItem[];
  apiUrl: string;
  selectedUrls?: Set<string>;
  onToggleSelect?: (url: string) => void;
}) {
  if (!results.length) {
    return (
      <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-6 py-12 text-center text-sm text-surface-100/55">
        Run a single reel or a collection to see your songs here.
      </div>
    );
  }

  return (
    <motion.ul
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-3"
    >
      <AnimatePresence initial={false}>
        {results.map((result) => {
          const downloadUrl = resolveApiUrl(apiUrl, result.download_url);
          const youtubeUrl = resolveApiUrl(apiUrl, result.youtube_url);
          const isFound = result.status === "found";
          const isChecked = selectedUrls?.has(result.url) ?? false;
          const selectionEnabled = Boolean(onToggleSelect) && isFound;

          return (
            <motion.li
              key={`${result.url}-${result.filename ?? result.query ?? "pending"}`}
              variants={rowVariants}
              layout
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 320, damping: 24 }}
              className="group relative overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.03] p-4 backdrop-blur-xl"
            >
              <div
                className={`absolute inset-y-0 left-0 w-[3px] ${
                  isFound
                    ? "bg-gradient-to-b from-violet-400 via-pink-400 to-cyan-400"
                    : "bg-rose-400/60"
                }`}
                aria-hidden
              />

              <div className="flex flex-col gap-4 pl-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3.5">
                  {onToggleSelect && (
                    <label className="mt-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-xl border border-white/[0.09] bg-white/[0.04] transition hover:bg-white/[0.07]">
                      <input
                        type="checkbox"
                        checked={selectionEnabled ? isChecked : false}
                        disabled={!selectionEnabled}
                        onChange={() => onToggleSelect(result.url)}
                        className="h-4 w-4 accent-emerald-500"
                        aria-label={`Select ${result.title || result.url}`}
                      />
                    </label>
                  )}

                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${
                      isFound
                        ? "bg-gradient-to-br from-violet-500/25 to-pink-500/20 ring-1 ring-violet-300/30"
                        : "bg-rose-500/10 ring-1 ring-rose-300/25"
                    }`}
                  >
                    {isFound ? (
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-violet-200" fill="currentColor" aria-hidden>
                        <path d="M9 17.5a3 3 0 1 1-2-2.83V7.5l11-2.5v9.83A3 3 0 1 1 16 12V7.79l-7 1.59V17.5z" />
                      </svg>
                    ) : (
                      <svg viewBox="0 0 24 24" className="h-5 w-5 text-rose-300" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                        <circle cx="12" cy="12" r="9" />
                        <path d="M9 9l6 6" />
                        <path d="M15 9l-6 6" />
                      </svg>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {isFound ? (
                        <span className="status-chip-found">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                          Found
                        </span>
                      ) : (
                        <span className="status-chip-missing">Not found</span>
                      )}
                      {result.filename && (
                        <span className="text-[10px] font-mono text-surface-100/40">
                          {result.filename}
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 truncate text-base font-semibold text-white">
                      {result.title || "No song detected"}
                    </p>
                    <p className="text-sm text-surface-100/65">
                      {result.artist || (isFound ? "Unknown artist" : "—")}
                    </p>
                    <p className="mt-1.5 truncate text-xs text-surface-100/35">
                      {result.url}
                    </p>
                    {result.error && (
                      <p className="mt-1.5 text-xs text-rose-300/85">{result.error}</p>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 sm:flex-nowrap">
                  <button
                    type="button"
                    onClick={() => {
                      if (!downloadUrl) return;
                      window.dispatchEvent(
                        new CustomEvent("reeltunes-toast", { detail: { message: "Download started" } }),
                      );
                      triggerDownload(downloadUrl, result.filename);
                    }}
                    className="table-link"
                    disabled={!downloadUrl}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M12 3v12" />
                      <path d="m8 11 4 4 4-4" />
                      <path d="M5 21h14" />
                    </svg>
                    MP3
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void shareContent({
                        title: result.title || "ReelTunes song",
                        text: result.artist ? `${result.title || "Song"} by ${result.artist}` : (result.title || "ReelTunes song"),
                        url: result.url,
                      }).catch(() => {
                        window.dispatchEvent(
                          new CustomEvent("reeltunes-toast", { detail: { message: "Copy link ready to share" } }),
                        );
                      });
                    }}
                    className="table-link"
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M4 12v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8" />
                      <path d="m8 8 4-4 4 4" />
                      <path d="M12 4v11" />
                    </svg>
                    Share
                  </button>
                  <a
                    href={youtubeUrl || undefined}
                    target="_blank"
                    rel="noreferrer"
                    className="table-link"
                    aria-disabled={!youtubeUrl}
                  >
                    <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M14 3h7v7" />
                      <path d="M10 14 21 3" />
                      <path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" />
                    </svg>
                    YouTube
                  </a>
                </div>
              </div>
            </motion.li>
          );
        })}
      </AnimatePresence>
    </motion.ul>
  );
}
