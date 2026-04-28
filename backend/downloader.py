from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.request import Request, urlopen

from yt_dlp import YoutubeDL

from extractor import extract_media_source_from_html
from media_tools import get_ffmpeg_executable
from url_processor import build_download_query, next_available_stem, safe_filename


class DownloadError(Exception):
    """Raised when yt-dlp or ffmpeg cannot complete a download."""


_SPEED_OPTIONS: dict[str, Any] = {
    "noplaylist": True,
    "quiet": True,
    "no_warnings": True,
    "nocheckcertificate": True,
    "concurrent_fragment_downloads": 5,
    "http_chunk_size": 10 * 1024 * 1024,
    "socket_timeout": 15,
    "retries": 1,
    "fragment_retries": 1,
    "extractor_retries": 1,
    "skip_unavailable_fragments": True,
}


def _mp3_options(output_template: str) -> dict[str, Any]:
    options: dict[str, Any] = {
        **_SPEED_OPTIONS,
        "format": "bestaudio/best",
        "outtmpl": output_template,
        "prefer_ffmpeg": True,
        "final_ext": "mp3",
        "postprocessors": [
            {
                "key": "FFmpegExtractAudio",
                "preferredcodec": "mp3",
                "preferredquality": "160",
            }
        ],
    }
    ffmpeg_executable = get_ffmpeg_executable()
    if ffmpeg_executable:
        options["ffmpeg_location"] = ffmpeg_executable
    return options


def _raw_source_options(output_template: str) -> dict[str, Any]:
    return {
        **_SPEED_OPTIONS,
        "format": "bestaudio[ext=m4a]/bestaudio/best/best",
        "outtmpl": output_template,
    }


def _find_generated_file(directory: Path, stem: str) -> Path:
    exact_match = directory / f"{stem}.mp3"
    if exact_match.exists():
        return exact_match

    candidates = sorted(
        directory.glob(f"{stem}.*"),
        key=lambda item: item.stat().st_mtime,
        reverse=True,
    )
    if not candidates:
        raise DownloadError("Downloaded audio file was not created.")
    return candidates[0]


def _download_direct_media(source_url: str, destination: Path) -> Path:
    request = Request(
        source_url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            )
        },
    )

    with urlopen(request, timeout=30) as response:
        content_type = response.headers.get_content_type()
        parsed_path = Path(urlparse(source_url).path)
        suffix = parsed_path.suffix or {
            "video/mp4": ".mp4",
            "audio/mp4": ".m4a",
            "audio/mpeg": ".mp3",
            "audio/webm": ".webm",
        }.get(content_type, ".bin")

        target = destination.with_suffix(suffix)
        with target.open("wb") as output_file:
            output_file.write(response.read())
    return target


def _download_reel_audio_sync(source_url: str, output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    stem = "source_audio"
    output_template = str(output_dir / f"{stem}.%(ext)s")

    try:
        with YoutubeDL(_raw_source_options(output_template)) as ydl:
            info = ydl.extract_info(source_url, download=True)
    except Exception as exc:
        media_url = extract_media_source_from_html(source_url)
        if not media_url:
            raise DownloadError(f"Failed to extract reel audio: {exc}") from exc
        return _download_direct_media(media_url, output_dir / stem)

    file_path = _find_generated_file(output_dir, stem)
    if file_path.suffix.lower() not in {".mp4", ".m4a", ".mp3", ".aac", ".wav", ".webm", ".ogg"}:
        media_url = None
        if isinstance(info, dict):
            media_url = info.get("url")
            if isinstance(info.get("requested_downloads"), list) and info["requested_downloads"]:
                first_download = info["requested_downloads"][0]
                if isinstance(first_download, dict) and first_download.get("url"):
                    media_url = first_download["url"]

        if isinstance(media_url, str) and media_url.startswith(("http://", "https://")):
            file_path.unlink(missing_ok=True)
            downloaded_media = _download_direct_media(media_url, output_dir / stem)
            if downloaded_media.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                scraped_media_url = extract_media_source_from_html(source_url)
                if scraped_media_url:
                    downloaded_media.unlink(missing_ok=True)
                    downloaded_media = _download_direct_media(
                        scraped_media_url, output_dir / stem
                    )
                if downloaded_media.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}:
                    raise DownloadError(
                        "This post appears to be image-only. No playable audio/video track was available."
                    )
            return downloaded_media

        raise DownloadError("No playable audio/video source was found for this post.")

    return file_path


def _download_full_song_sync(
    query: str, results_dir: Path, filename_hint: str | None = None
) -> dict[str, str | None]:
    results_dir.mkdir(parents=True, exist_ok=True)
    stem = next_available_stem(results_dir, safe_filename(filename_hint or query))
    output_template = str(results_dir / f"{stem}.%(ext)s")
    search_query = f"ytsearch1:{build_download_query(query)}"

    try:
        with YoutubeDL(_mp3_options(output_template)) as ydl:
            info = ydl.extract_info(search_query, download=True)
    except Exception as exc:
        message = str(exc)
        if "ffprobe and ffmpeg not found" not in message and "ffmpeg not found" not in message:
            raise

        with YoutubeDL(_raw_source_options(output_template)) as ydl:
            info = ydl.extract_info(search_query, download=True)

    if info and "entries" in info:
        entries = info.get("entries") or []
        if not entries:
            raise DownloadError("No YouTube results were found for the detected song.")
        info = entries[0]

    if not info:
        raise DownloadError("yt-dlp did not return metadata for the detected song.")

    final_file = _find_generated_file(results_dir, stem)
    return {
        "filename": final_file.name,
        "path": str(final_file),
        "youtube_url": info.get("webpage_url"),
    }


async def download_reel_audio(source_url: str, output_dir: str | Path) -> Path:
    try:
        return await asyncio.to_thread(
            _download_reel_audio_sync, source_url, Path(output_dir)
        )
    except DownloadError:
        raise
    except Exception as exc:
        raise DownloadError(f"Failed to extract reel audio: {exc}") from exc


async def download_full_song(
    query: str, results_dir: str | Path, filename_hint: str | None = None
) -> dict[str, str | None]:
    try:
        return await asyncio.to_thread(
            _download_full_song_sync, query, Path(results_dir), filename_hint
        )
    except DownloadError:
        raise
    except Exception as exc:
        raise DownloadError(f"Failed to download full song: {exc}") from exc
