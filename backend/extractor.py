from __future__ import annotations

import asyncio
import json
import re
from typing import Any
from urllib.request import Request, urlopen

from yt_dlp import YoutubeDL

from url_processor import is_instagram_page_url


class ExtractionError(Exception):
    """Raised when a collection URL cannot be expanded into post URLs."""


def _extract_info_sync(source_url: str) -> dict[str, Any]:
    options = {
        "skip_download": True,
        "quiet": True,
        "no_warnings": True,
        "extract_flat": False,
    }

    with YoutubeDL(options) as ydl:
        info = ydl.extract_info(source_url, download=False)

    if not info:
        raise ExtractionError("yt-dlp could not read this URL.")
    return info


def _entry_url(entry: dict[str, Any]) -> str | None:
    for key in ("webpage_url", "original_url"):
        value = entry.get(key)
        if isinstance(value, str) and is_instagram_page_url(value):
            return value
    return None


def _extract_instagram_urls_from_html(source_url: str) -> list[str]:
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
    with urlopen(request, timeout=20) as response:
        html = response.read().decode("utf-8", errors="ignore")

    canonical_matches = re.findall(
        r'https://(?:www\.)?instagram\.com/(?:p|reel|reels|tv)/[^"\'<\s]+',
        html,
    )

    if canonical_matches:
        deduped: list[str] = []
        seen: set[str] = set()
        for value in canonical_matches:
            cleaned = value.replace("\\u0026", "&")
            if cleaned not in seen:
                seen.add(cleaned)
                deduped.append(cleaned)
        return deduped

    script_matches = re.findall(r"<script[^>]+type=\"application/ld\+json\"[^>]*>(.*?)</script>", html, re.DOTALL)
    for raw_script in script_matches:
        try:
            payload = json.loads(raw_script.strip())
        except json.JSONDecodeError:
            continue

        if isinstance(payload, dict):
            candidate = payload.get("mainEntityOfPage") or payload.get("url")
            if isinstance(candidate, str) and is_instagram_page_url(candidate):
                return [candidate]

    return []


def extract_media_source_from_html(source_url: str) -> str | None:
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
    with urlopen(request, timeout=20) as response:
        html = response.read().decode("utf-8", errors="ignore")

    meta_patterns = [
        r'<meta[^>]+property="og:video"[^>]+content="([^"]+)"',
        r'<meta[^>]+property="og:video:url"[^>]+content="([^"]+)"',
        r'<meta[^>]+name="twitter:player:stream"[^>]+content="([^"]+)"',
        r'"video_url":"(https:[^"]+)"',
    ]

    for pattern in meta_patterns:
        match = re.search(pattern, html)
        if not match:
            continue
        value = match.group(1).replace("\\u0026", "&").replace("\\/", "/")
        if value.startswith("https://"):
            return value

    return None


def _flatten_entries(entries: list[dict[str, Any]]) -> list[str]:
    urls: list[str] = []
    for entry in entries:
        nested_entries = entry.get("entries")
        if isinstance(nested_entries, list) and nested_entries:
            urls.extend(_flatten_entries(nested_entries))
            continue

        candidate = _entry_url(entry)
        if candidate:
            urls.append(candidate)
    return urls


async def extract_post_links(source_url: str) -> list[str]:
    try:
        info = await asyncio.to_thread(_extract_info_sync, source_url)
    except ExtractionError:
        raise
    except Exception as exc:
        raise ExtractionError(f"Failed to extract post links: {exc}") from exc

    entries = info.get("entries") or []
    if not entries:
        single_url = _entry_url(info) or source_url
        return [single_url]

    urls = _flatten_entries(entries)
    deduped: list[str] = []
    seen: set[str] = set()
    for url in urls:
        if url not in seen:
            seen.add(url)
            deduped.append(url)

    if not deduped:
        scraped_urls = await asyncio.to_thread(_extract_instagram_urls_from_html, source_url)
        if scraped_urls:
            return scraped_urls
        raise ExtractionError("No individual post links were found for this URL.")

    return deduped
