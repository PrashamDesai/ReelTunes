"use client";

import { useState } from "react";
import ResultsTable, { type ResultItem } from "./ResultsTable";
import { processUrl } from "@/lib/processUrl";

// Accept both post and reel links, with or without www.
const INSTAGRAM_LINK_PATTERN =
  /https?:\/\/(?:www\.)?instagram\.com\/(?:p|reel|reels)\/[a-zA-Z0-9_-]+(?:\/?[^\s\t]*)?/gi;

function normalizeInstagramLink(rawUrl: string) {
  try {
    const parsed = new URL(rawUrl.trim());
    const segments = parsed.pathname.split("/").filter(Boolean);

    if (segments.length < 2) return "";

    const kind = segments[0]?.toLowerCase();
    const id = segments[1];

    if (!["p", "reel", "reels"].includes(kind) || !id) return "";

    return `https://www.instagram.com/${kind}/${id}/`;
  } catch {
    return "";
  }
}

export default function CollectionUploader() {
  const [results, setResults] = useState<ResultItem[]>([]);
  const [filteredLinks, setFilteredLinks] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [invalidCount, setInvalidCount] = useState(0);

  async function handleFile(file: File | null) {
    if (!file) return;
    setError(null);
    setResults([]);
    setFilteredLinks([]);
    setInvalidCount(0);
    setFileName(file.name);

    const text = await file.text();
    const lines = text.split(/\r?\n/);

    // Parse tab-separated format and extract Instagram post/reel URLs.
    const extracted: string[] = [];
    for (const line of lines) {
      const cols = line.split("\t");
      for (const col of cols) {
        const trimmed = col.trim();
        const matches = trimmed.match(INSTAGRAM_LINK_PATTERN);
        if (matches) {
          for (const match of matches) {
            const normalized = normalizeInstagramLink(match);
            if (normalized && !extracted.includes(normalized)) {
              extracted.push(normalized);
            }
          }
        }
      }
    }

    if (!extracted.length) {
      setError("No valid Instagram post links found in the file.");
      return;
    }

    setFilteredLinks(extracted);
    setInvalidCount(lines.length - extracted.length); // rough estimate
  }

  async function startProcessing() {
    if (!filteredLinks.length) {
      setError("No links to process.");
      return;
    }

    setProcessing(true);
    setResults([]);
    setProgress(0);
    setTotal(filteredLinks.length);
    setError(null);

    for (let i = 0; i < filteredLinks.length; i++) {
      const url = filteredLinks[i];
      try {
        const [res] = await processUrl("single", url);
        setResults((prev) => [...prev, res]);
      } catch (e) {
        setResults((prev) => [
          ...prev,
          {
            url,
            status: "not_found",
            title: null,
            artist: null,
            query: null,
            filename: null,
            download_url: null,
            youtube_url: null,
            error: (e as Error)?.message ?? String(e),
          },
        ]);
      }
      setProgress(i + 1);
    }

    setProcessing(false);
  }

  return (
    <div className="space-y-4">
      {/* File Upload Section */}
      <div className="panel p-6">
        <h3 className="font-semibold text-white">Upload collection (.txt)</h3>
        <p className="text-sm text-surface-100/65 mt-1">
          Select a scraped links file to extract Instagram post URLs.
        </p>
        <div className="mt-4">
          <input
            type="file"
            accept=".txt"
            onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            className="text-sm"
            disabled={processing || filteredLinks.length > 0}
          />
        </div>
        {error && <p className="mt-3 text-sm text-rose-300">{error}</p>}
      </div>

      {/* Parsed Links Preview */}
      {filteredLinks.length > 0 && (
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-white">
                Valid Links Found: {filteredLinks.length}
              </h3>
              <p className="text-sm text-surface-100/65 mt-1">
                File: {fileName} | {invalidCount} lines could not be parsed
              </p>
            </div>
            <button
              onClick={() => {
                setFilteredLinks([]);
                setFileName(null);
                setInvalidCount(0);
              }}
              className="px-3 py-1 text-sm bg-surface-700 hover:bg-surface-600 rounded text-white"
            >
              Clear
            </button>
          </div>

          {/* Links List */}
          <div className="max-h-48 overflow-y-auto bg-surface-800/50 rounded border border-surface-700/50 p-3 mb-4">
            <div className="space-y-1">
              {filteredLinks.slice(0, 10).map((link, idx) => (
                <div
                  key={idx}
                  className="text-xs text-surface-100/65 font-mono break-all hover:text-surface-100 transition"
                >
                  {link}
                </div>
              ))}
              {filteredLinks.length > 10 && (
                <div className="text-xs text-surface-100/50 italic pt-2">
                  ... and {filteredLinks.length - 10} more
                </div>
              )}
            </div>
          </div>

          {/* Start Processing Button */}
          <button
            onClick={startProcessing}
            disabled={processing}
            className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-white font-semibold transition"
          >
            {processing ? `Processing ${progress}/${total}` : "Start Processing"}
          </button>
        </div>
      )}

      {/* Results */}
      {results.length > 0 && (
        <div>
          <ResultsTable
            results={results}
            apiUrl={process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
          />
        </div>
      )}
    </div>
  );
}
