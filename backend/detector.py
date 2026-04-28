from __future__ import annotations

import asyncio
import uuid
import warnings
from pathlib import Path
from typing import Any

from media_tools import (
    MediaToolError,
    configure_ffmpeg_environment,
    transcode_audio_for_detection,
)

configure_ffmpeg_environment()

with warnings.catch_warnings():
    warnings.filterwarnings(
        "ignore",
        message="Couldn't find ffmpeg or avconv - defaulting to ffmpeg, but may not work",
        category=RuntimeWarning,
    )
    from shazamio import Shazam


class DetectionError(Exception):
    """Raised when a song cannot be identified from the source audio."""


def _safe_get(payload: dict[str, Any] | None, *keys: str) -> Any:
    current: Any = payload or {}
    for key in keys:
        if not isinstance(current, dict):
            return None
        current = current.get(key)
        if current is None:
            return None
    return current


async def detect_song(file_path: str | Path) -> dict[str, str | None]:
    path = Path(file_path)
    if not path.exists():
        raise DetectionError(f"Audio file not found: {path}")

    shazam_input = path
    cleanup_file: Path | None = None

    if path.suffix.lower() != ".wav":
        cleanup_file = path.with_name(f"{path.stem}-{uuid.uuid4().hex[:8]}.wav")
        try:
            shazam_input = await asyncio.to_thread(
                transcode_audio_for_detection, path, cleanup_file
            )
        except MediaToolError as exc:
            raise DetectionError(str(exc)) from exc

    shazam = Shazam()
    try:
        response: dict[str, Any] = await shazam.recognize(str(shazam_input))
    except Exception as exc:
        if "Unrecognized format" in str(exc):
            raise DetectionError(
                "Could not decode the Instagram audio for Shazam recognition."
            ) from exc
        raise
    finally:
        if cleanup_file:
            cleanup_file.unlink(missing_ok=True)

    track = response.get("track")

    if not track:
        raise DetectionError("No song was detected from this reel.")

    title = track.get("title") or "Unknown Title"
    artist = track.get("subtitle") or "Unknown Artist"
    cover_art = (
        _safe_get(track, "images", "coverarthq")
        or _safe_get(track, "images", "coverart")
        or _safe_get(track, "images", "background")
    )

    return {
        "title": title,
        "artist": artist,
        "query": f"{title} {artist}".strip(),
        "cover_art": cover_art,
        "shazam_url": track.get("url"),
    }
