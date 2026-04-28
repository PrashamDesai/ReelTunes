# Reel Song Extractor

Reel Song Extractor is a web app for turning Instagram reel links or collection-style URLs into detected songs and downloadable MP3 files.

Live deployment:

- Frontend: https://reeltunes.onrender.com
- Backend API: https://a19f-202-131-110-138.ngrok-free.app

- Frontend: Next.js App Router + Tailwind CSS
- Backend: FastAPI + yt-dlp + ffmpeg + ShazamIO
- Flow: extract links -> pull audio -> detect song -> download full track -> return results

## Project structure

```text
backend/
  main.py
  detector.py
  downloader.py
  extractor.py
  processor.py
  url_processor.py
  uploads/
  results/
  requirements.txt

frontend/
  app/
  components/
  .env.local.example
  package.json
```

## Prerequisites

- Python 3.10+
- Node.js 18+
- ffmpeg installed and available on `PATH`

Check ffmpeg:

```bash
ffmpeg -version
```

## Backend setup

```bash
cd backend
python -m venv .venv
```

Activate the virtual environment:

- Windows PowerShell: `.venv\Scripts\Activate.ps1`
- macOS/Linux: `source .venv/bin/activate`

Install dependencies and start FastAPI:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Backend runs on `http://localhost:8000` for local development.

## Frontend setup

```bash
cd frontend
copy .env.local.example .env.local
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` in `.env.local` to your backend URL. For the deployed backend, use:

```bash
NEXT_PUBLIC_API_URL=https://a19f-202-131-110-138.ngrok-free.app
```

If you are not on Windows, replace `copy` with:

```bash
cp .env.local.example .env.local
```

Frontend runs on `http://localhost:3000`.

## Mobile Web Share Target Setup

ReelTunes supports sharing directly from Instagram and other apps on Android and iOS!

### Installation Instructions

#### Android (Chrome, Edge, Samsung Internet)

1. Visit https://reeltunes.onrender.com
2. Look for an install prompt at the bottom of the screen (or tap the menu → "Install app")
3. Tap **Install** and confirm
4. The app will be added to your home screen

#### iOS (Safari)

1. Visit https://reeltunes.onrender.com in Safari
2. Tap the Share button (box with arrow)
3. Scroll down and tap **Add to Home Screen**
4. Enter the name and tap **Add**

### Using the Share Feature

Once installed:

1. **Android**: Open a reel or video link in Instagram, tap Share → Select ReelTunes
2. **iOS**: Open a reel or video link in Instagram, tap Share → Scroll and tap ReelTunes
3. The app will open and automatically:
   - Switch to "Find Original Song" mode
   - Prefill the shared link
   - Begin processing immediately

### Troubleshooting

- **App won't appear in share menu**: The app must be installed (added to home screen) first. Install the app and try again.
- **Install prompt not showing**: You may have dismissed it. Try visiting on a fresh browser tab or clearing browser data.
- **Share isn't working**: 
  - Ensure you're installing from https://reeltunes.onrender.com (not localhost)
  - Uninstall the old PWA and reinstall if you previously installed from localhost
  - Check that your browser supports Web Share Target API (Android Chrome/Edge/Samsung Internet)
  - iOS support requires iOS 13.2+ with Safari

### Testing the Share Target

- **Important**: Install the PWA from the **deployed URL** (https://reeltunes.onrender.com), not from localhost. The app will remember which origin it was installed from.
- If you previously installed from localhost, you must uninstall the PWA first, then visit the deployed URL and install again.
- After updating `manifest.json`, reinstall the app: uninstall the existing PWA, then visit the site and choose "Install" / "Add to Home screen" again.
- To test: open a reel (or a browser with the reel URL), tap Share → choose "ReelTunes" (the installed app). The app should open, automatically switch to "Find Original Song" (single video mode), and prefill the shared reel link.
- Note: the share target is only available on platforms/browsers that support the Web Share Target API (primarily Android Chromium browsers, iOS 13.2+ Safari).

## API endpoints

### `POST /process-single`

Request:

```json
{
  "url": "https://www.instagram.com/reel/..."
}
```

Response:

```json
{
  "url": "https://www.instagram.com/reel/...",
  "status": "found",
  "title": "Song Title",
  "artist": "Artist Name",
  "query": "Song Title Artist Name",
  "filename": "Song Title - Artist Name.mp3",
  "download_url": "/results/Song Title - Artist Name.mp3",
  "youtube_url": "https://www.youtube.com/watch?v=...",
  "error": null
}
```

### `POST /process-batch`

Request:

```json
{
  "url": "https://www.instagram.com/..."
}
```

Response:

```json
[
  {
    "url": "https://www.instagram.com/reel/one/",
    "status": "found",
    "title": "Song One",
    "artist": "Artist One",
    "query": "Song One Artist One",
    "filename": "Song One - Artist One.mp3",
    "download_url": "/results/Song One - Artist One.mp3",
    "youtube_url": "https://www.youtube.com/watch?v=...",
    "error": null
  },
  {
    "url": "https://www.instagram.com/reel/two/",
    "status": "not_found",
    "title": null,
    "artist": null,
    "query": null,
    "filename": null,
    "download_url": null,
    "youtube_url": null,
    "error": "No song was detected from this reel."
  }
]
```

### `GET /results/{filename}`

Downloads a single saved MP3 from `backend/results`.

### `GET /results/archive?file=a.mp3&file=b.mp3`

Downloads a ZIP archive of multiple found songs.

## How the pipeline works

### Single link

1. Validate the Instagram URL.
2. Download reel audio with `yt-dlp`.
3. Convert audio to MP3 with `ffmpeg`.
4. Detect the song with `ShazamIO`.
5. Search YouTube with `ytsearch1:<title> <artist> official audio`.
6. Save the full song into `backend/results`.

### Collection link

1. Validate the Instagram URL.
2. Use `yt-dlp` to extract individual post links when available.
3. Process each extracted link in parallel with a bounded concurrency limit.
4. Return a result object for every processed item.

## Notes

- The backend accepts Instagram URLs only.
- Batch extraction depends on what `yt-dlp` can read from the provided URL.
- If Instagram content is private, region-locked, or unsupported by yt-dlp, extraction can fail.
- Download failures, invalid URLs, and no-match detections return meaningful error messages in the response.

## Local output

- Temporary source audio: `backend/uploads`
- Final MP3 downloads: `backend/results`
