"use client";

import { useState } from "react";
import ResultsTable, { type ResultItem } from "./ResultsTable";
import { processUrl } from "@/lib/processUrl";

const URL_PATTERN = /https?:\/\/[^
"'<>\s]+/gi;

export default function CollectionUploader() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const candidates: string[] = [];
    for (const l of lines) {
      const m = l.match(URL_PATTERN);
      if (m) candidates.push(m[0]);
    }

    if (!candidates.length) {
      setError("No valid links found in the file.");
      return;
    }

    setProcessing(true);
    setResults([]);
    setProgress(0);
    setTotal(candidates.length);

    for (let i = 0; i < candidates.length; i++) {
      const url = candidates[i];
      try {
        const [res] = await processUrl("single", url);
        setResults((prev) => [...prev, res]);
      } catch (e) {
        setResults((prev) => [...prev, { url, status: "not_found", title: null, artist: null, query: null, filename: null, download_url: null, youtube_url: null, error: (e as Error)?.message ?? String(e) }]);
      }
      setProgress(i + 1);
    }

    setProcessing(false);
  }

  return (
    <div className="space-y-4">
      <div className="panel p-6">
        <h3 className="font-semibold text-white">Upload collection (.txt)</h3>
        <p className="text-sm text-surface-100/65 mt-1">Drop a newline-separated list of reel URLs (one per line).</p>
        <div className="mt-4 flex items-center gap-3">
          <input
            type="file"
            accept=".txt"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="text-sm"
            disabled={processing}
          />
          {processing && (
            <div className="text-sm text-surface-100/65">Processing {progress}/{total}</div>
          )}
        </div>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </div>

      <div>
        <ResultsTable results={results} apiUrl={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"} />
      </div>
    </div>
  );
}
