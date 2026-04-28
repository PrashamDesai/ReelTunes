from __future__ import annotations

import asyncio
import shutil
import uuid
from pathlib import Path

from detector import DetectionError, detect_song
from downloader import DownloadError, download_full_song, download_reel_audio
from extractor import extract_post_links
from media_tools import MediaToolError, transcode_audio_to_mp3
from url_processor import (
    build_download_query,
    build_youtube_search_url,
    normalize_url,
    next_available_stem,
    safe_filename,
)


def _build_result(
    *,
    url: str,
    status: str,
    title: str | None = None,
    artist: str | None = None,
    query: str | None = None,
    filename: str | None = None,
    youtube_url: str | None = None,
    error: str | None = None,
) -> dict[str, object]:
    return {
        "url": url,
        "status": status,
        "title": title,
        "artist": artist,
        "query": query,
        "filename": filename,
        "download_url": f"/results/{filename}" if filename else None,
        "youtube_url": youtube_url,
        "error": error,
    }


async def process_single_url(
    raw_url: str, uploads_dir: str | Path, results_dir: str | Path
) -> dict[str, object]:
    source_url = normalize_url(raw_url)
    working_dir = Path(uploads_dir) / uuid.uuid4().hex
    working_dir.mkdir(parents=True, exist_ok=True)

    try:
        audio_file = await download_reel_audio(source_url, working_dir)
    except DownloadError as exc:
        shutil.rmtree(working_dir, ignore_errors=True)
        return _build_result(url=source_url, status="not_found", error=str(exc))

    try:
        detected = await detect_song(audio_file)
    except DetectionError as exc:
        return _build_result(url=source_url, status="not_found", error=str(exc))
    except Exception as exc:
        return _build_result(
            url=source_url,
            status="not_found",
            error=f"Song detection failed: {exc}",
        )
    finally:
        shutil.rmtree(working_dir, ignore_errors=True)

    title = str(detected["title"])
    artist = str(detected["artist"])
    query = str(detected["query"])
    youtube_search_query = build_download_query(query)

    try:
        song_file = await download_full_song(
            query,
            results_dir,
            filename_hint=f"{title} - {artist}",
        )
    except DownloadError as exc:
        return _build_result(
            url=source_url,
            status="found",
            title=title,
            artist=artist,
            query=query,
            youtube_url=build_youtube_search_url(youtube_search_query),
            error=str(exc),
        )

    return _build_result(
        url=source_url,
        status="found",
        title=title,
        artist=artist,
        query=query,
        filename=song_file["filename"],
        youtube_url=song_file.get("youtube_url")
        or build_youtube_search_url(youtube_search_query),
    )


async def extract_reel_audio_to_mp3(
    raw_url: str, uploads_dir: str | Path, results_dir: str | Path
) -> dict[str, object]:
    source_url = normalize_url(raw_url)
    working_dir = Path(uploads_dir) / uuid.uuid4().hex
    working_dir.mkdir(parents=True, exist_ok=True)
    results_path = Path(results_dir)
    results_path.mkdir(parents=True, exist_ok=True)

    try:
        try:
            audio_file = await download_reel_audio(source_url, working_dir)
        except DownloadError as exc:
            return {
                "url": source_url,
                "status": "error",
                "filename": None,
                "download_url": None,
                "error": str(exc),
            }

        stem = next_available_stem(results_path, safe_filename("reel_audio"))
        target_path = results_path / f"{stem}.mp3"

        try:
            await asyncio.to_thread(transcode_audio_to_mp3, audio_file, target_path)
        except MediaToolError as exc:
            return {
                "url": source_url,
                "status": "error",
                "filename": None,
                "download_url": None,
                "error": str(exc),
            }
    finally:
        shutil.rmtree(working_dir, ignore_errors=True)

    return {
        "url": source_url,
        "status": "ready",
        "filename": target_path.name,
        "download_url": f"/results/{target_path.name}",
        "error": None,
    }


async def process_batch_url(
    raw_url: str,
    uploads_dir: str | Path,
    results_dir: str | Path,
    *,
    concurrency: int = 6,
) -> list[dict[str, object]]:
    source_url = normalize_url(raw_url)
    post_links = await extract_post_links(source_url)
    semaphore = asyncio.Semaphore(max(1, concurrency))

    async def _run(post_url: str) -> dict[str, object]:
        async with semaphore:
            return await process_single_url(post_url, uploads_dir, results_dir)

    return await asyncio.gather(*(_run(post_url) for post_url in post_links))
