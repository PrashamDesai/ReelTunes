from __future__ import annotations

import os
import shutil
import subprocess
from functools import lru_cache
from pathlib import Path

try:
    import imageio_ffmpeg
except ImportError:  # pragma: no cover - handled at runtime when dependency is missing
    imageio_ffmpeg = None


class MediaToolError(Exception):
    """Raised when ffmpeg is required but unavailable or fails."""


@lru_cache(maxsize=1)
def get_ffmpeg_executable() -> str | None:
    system_ffmpeg = shutil.which("ffmpeg")
    if system_ffmpeg:
        return system_ffmpeg

    if imageio_ffmpeg is None:
        return None

    try:
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


def configure_ffmpeg_environment() -> str | None:
    ffmpeg_executable = get_ffmpeg_executable()
    if not ffmpeg_executable:
        return None

    ffmpeg_dir = str(Path(ffmpeg_executable).parent)
    current_path = os.environ.get("PATH", "")
    path_entries = current_path.split(os.pathsep) if current_path else []
    if ffmpeg_dir not in path_entries:
        os.environ["PATH"] = (
            f"{ffmpeg_dir}{os.pathsep}{current_path}" if current_path else ffmpeg_dir
        )

    return ffmpeg_executable


def require_ffmpeg() -> str:
    ffmpeg_executable = get_ffmpeg_executable()
    if ffmpeg_executable:
        return ffmpeg_executable

    raise MediaToolError(
        "ffmpeg is required to decode Instagram audio and create MP3 files."
    )


def transcode_audio_for_detection(
    source_path: str | Path,
    target_path: str | Path,
    duration_seconds: int = 12,
) -> Path:
    """Produce a tiny mono 16kHz WAV clip — all Shazam needs to fingerprint."""
    ffmpeg_executable = require_ffmpeg()
    source = Path(source_path)
    target = Path(target_path)
    target.parent.mkdir(parents=True, exist_ok=True)

    command = [
        ffmpeg_executable,
        "-y",
        "-threads", "0",
        "-i", str(source),
        "-t", str(duration_seconds),
        "-vn",
        "-acodec", "pcm_s16le",
        "-ar", "16000",
        "-ac", "1",
        str(target),
    ]

    completed = subprocess.run(command, capture_output=True, text=True)
    if completed.returncode != 0:
        stderr = (completed.stderr or "").strip().splitlines()
        detail = stderr[-1] if stderr else "ffmpeg could not convert the source audio."
        raise MediaToolError(detail)

    return target


def transcode_audio_to_mp3(
    source_path: str | Path,
    target_path: str | Path,
    bitrate: str = "160k",
) -> Path:
    ffmpeg_executable = require_ffmpeg()
    source = Path(source_path)
    target = Path(target_path)
    target.parent.mkdir(parents=True, exist_ok=True)

    command = [
        ffmpeg_executable,
        "-y",
        "-threads", "0",
        "-i", str(source),
        "-vn",
        "-acodec", "libmp3lame",
        "-b:a", bitrate,
        "-compression_level", "2",
        str(target),
    ]

    completed = subprocess.run(command, capture_output=True, text=True)
    if completed.returncode != 0:
        stderr = (completed.stderr or "").strip().splitlines()
        detail = stderr[-1] if stderr else "ffmpeg could not convert the source audio to MP3."
        raise MediaToolError(detail)

    return target
