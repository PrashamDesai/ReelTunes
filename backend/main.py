from __future__ import annotations

import io
import zipfile
from pathlib import Path

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel

from extractor import ExtractionError
from processor import (
    extract_reel_audio_to_mp3,
    process_batch_url,
    process_single_url,
)

BASE_DIR = Path(__file__).resolve().parent
UPLOADS_DIR = BASE_DIR / "uploads"
RESULTS_DIR = BASE_DIR / "results"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
RESULTS_DIR.mkdir(parents=True, exist_ok=True)

app = FastAPI(title="Reel Song Extractor", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


class UrlRequest(BaseModel):
    url: str


@app.get("/")
async def root() -> dict[str, str]:
    return {"status": "ok", "service": "Reel Song Extractor"}


@app.post("/process-single")
async def process_single(request: UrlRequest) -> dict[str, object]:
    try:
        return await process_single_url(request.url, UPLOADS_DIR, RESULTS_DIR)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/extract-audio")
async def extract_audio(request: UrlRequest) -> dict[str, object]:
    try:
        return await extract_reel_audio_to_mp3(request.url, UPLOADS_DIR, RESULTS_DIR)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/process-batch")
async def process_batch(request: UrlRequest) -> list[dict[str, object]]:
    try:
        return await process_batch_url(request.url, UPLOADS_DIR, RESULTS_DIR)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except ExtractionError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@app.get("/results/{filename}")
async def get_result(filename: str) -> FileResponse:
    safe_name = Path(filename).name
    target = RESULTS_DIR / safe_name
    if not target.exists() or not target.is_file():
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(target, media_type="audio/mpeg", filename=safe_name)


@app.get("/results/archive")
async def download_archive(file: list[str] = Query(default=[])) -> StreamingResponse:
    if not file:
        raise HTTPException(status_code=400, detail="Provide at least one file.")

    archive = io.BytesIO()
    added_files = 0

    with zipfile.ZipFile(archive, "w", compression=zipfile.ZIP_DEFLATED) as bundle:
        for item in file:
            safe_name = Path(item).name
            target = RESULTS_DIR / safe_name
            if target.exists() and target.is_file():
                bundle.write(target, arcname=safe_name)
                added_files += 1

    if not added_files:
        raise HTTPException(status_code=404, detail="No matching files were found.")

    archive.seek(0)
    headers = {
        "Content-Disposition": 'attachment; filename="reel-song-extractor-results.zip"'
    }
    return StreamingResponse(archive, media_type="application/zip", headers=headers)
