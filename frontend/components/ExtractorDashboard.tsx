"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";

import QuickAudioTab from "./QuickAudioTab";
import SongFinderTab from "./SongFinderTab";

type TabKey = "audio" | "song";

const TABS: Array<{
  key: TabKey;
  label: string;
  description: string;
  icon: JSX.Element;
}> = [
  {
    key: "audio",
    label: "Quick Audio",
    description: "Save the reel’s audio as MP3",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M12 3v12" />
        <path d="m8 11 4 4 4-4" />
        <path d="M5 21h14" />
      </svg>
    ),
  },
  {
    key: "song",
    label: "Find Original Song",
    description: "Detect the track and grab the full version",
    icon: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
        <path d="M11 8v6" />
        <path d="M8.5 11h5" />
      </svg>
    ),
  },
];

type ExtractorDashboardProps = {
  sharedUrl?: string;
};

export default function ExtractorDashboard({
  sharedUrl = "",
}: ExtractorDashboardProps) {
  const [tab, setTab] = useState<TabKey>(sharedUrl ? "song" : "audio");

  useEffect(() => {
    if (sharedUrl) {
      setTab("song");
    }
  }, [sharedUrl]);

  return (
    <div className="space-y-6">
      <div
        className="panel-soft mx-auto flex w-full max-w-xl items-center gap-1 p-1.5"
        role="tablist"
        aria-label="Extraction mode"
      >
        {TABS.map((entry) => {
          const isActive = entry.key === tab;
          return (
            <button
              key={entry.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setTab(entry.key)}
              className={`tab-pill flex-1 ${isActive ? "tab-pill-active" : "tab-pill-idle"}`}
            >
              {isActive && (
                <motion.span
                  layoutId="tab-glow"
                  transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  className="absolute inset-0 -z-0 rounded-2xl bg-gradient-to-br from-violet-500/35 via-pink-500/25 to-cyan-400/25 ring-1 ring-violet-300/30"
                />
              )}
              <span className="relative flex items-center gap-2">
                {entry.icon}
                <span>{entry.label}</span>
              </span>
            </button>
          );
        })}
      </div>

      <p className="text-center text-sm text-surface-100/55">
        {TABS.find((t) => t.key === tab)?.description}
      </p>

      <div className="relative">
        <AnimatePresence mode="wait">
          {tab === "audio" ? (
            <motion.div
              key="audio"
              initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <QuickAudioTab />
            </motion.div>
          ) : (
            <motion.div
              key="song"
              initial={{ opacity: 0, y: 18, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -12, filter: "blur(6px)" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            >
              <SongFinderTab sharedUrl={sharedUrl} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
