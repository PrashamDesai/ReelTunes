from __future__ import annotations

import re
from pathlib import Path
from urllib.parse import quote_plus, urlparse, urlunparse

INVALID_FILENAME_CHARS = re.compile(r'[\\/:*?"<>|]+')

INSTAGRAM_HOSTS = {
    "instagram.com",
    "www.instagram.com",
    "m.instagram.com",
    "instagr.am",
    "www.instagr.am",
}

INSTAGRAM_MEDIA_PATH = re.compile(r"^/(?:p|reel|reels|tv)/[^/?#]+/?$", re.IGNORECASE)

SUPPORTED_HOSTS = {
    # Instagram
    "instagram.com", "www.instagram.com", "m.instagram.com",
    "instagr.am", "www.instagr.am",
    # YouTube
    "youtube.com", "www.youtube.com", "m.youtube.com",
    "youtu.be",
    # Facebook
    "facebook.com", "www.facebook.com", "m.facebook.com",
    "fb.watch", "fb.com",
    # TikTok
    "tiktok.com", "www.tiktok.com", "vm.tiktok.com",
    # Pinterest
    "pinterest.com", "www.pinterest.com", "pin.it",
    # Reddit
    "reddit.com", "www.reddit.com", "old.reddit.com", "redd.it",
    # Twitter / X
    "twitter.com", "www.twitter.com", "x.com", "www.x.com",
    # Snapchat
    "snapchat.com", "www.snapchat.com",
    # Vimeo
    "vimeo.com", "www.vimeo.com",
    # Twitch
    "twitch.tv", "www.twitch.tv", "clips.twitch.tv",
}

# Hosts where we can auto-prepend https:// if missing scheme
_SCHEME_OPTIONAL_PREFIXES = tuple(SUPPORTED_HOSTS)


def normalize_url(raw_url: str) -> str:
    cleaned = (raw_url or "").strip()
    if not cleaned:
        raise ValueError("A URL is required.")

    if "://" not in cleaned:
        cleaned = f"https://{cleaned}"

    parsed = urlparse(cleaned)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(
            "Please provide a valid video URL from Instagram, YouTube, Facebook, "
            "Pinterest, Reddit, TikTok, Twitter/X, or another supported platform."
        )

    return urlunparse(parsed._replace(fragment=""))


def ensure_valid_url(raw_url: str) -> str:
    """Validate that a URL is a proper HTTP/HTTPS URL. Accepts any platform."""
    return normalize_url(raw_url)


def ensure_supported_media_url(raw_url: str) -> str:
    """Normalize and return the URL. Accepts any supported or unknown platform."""
    return normalize_url(raw_url)


def is_instagram_page_url(value: str) -> bool:
    """True if value is a direct Instagram post/reel/tv URL.

    Used by the Instagram collection extractor to validate scraped entries.
    """
    try:
        normalized = normalize_url(value)
    except ValueError:
        return False
    parsed = urlparse(normalized)
    host = parsed.netloc.lower()
    if host not in INSTAGRAM_HOSTS:
        return False
    return bool(INSTAGRAM_MEDIA_PATH.match(parsed.path or "/"))


def safe_filename(value: str, fallback: str = "song") -> str:
    cleaned = INVALID_FILENAME_CHARS.sub("_", value).strip(" ._")
    return (cleaned[:120] or fallback).strip()


def next_available_stem(directory: str | Path, stem: str) -> str:
    target_dir = Path(directory)
    safe_stem = safe_filename(stem)
    candidate = safe_stem
    suffix = 2

    while any(target_dir.glob(f"{candidate}.*")):
        candidate = f"{safe_stem}-{suffix}"
        suffix += 1

    return candidate


def build_download_query(query: str) -> str:
    return f"{query} official audio".strip()


def build_song_search_query(title: str, artist: str) -> str:
    return build_download_query(f"{title} {artist}".strip())


def build_youtube_search_url(query: str) -> str:
    return f"https://www.youtube.com/results?search_query={quote_plus(query)}"
