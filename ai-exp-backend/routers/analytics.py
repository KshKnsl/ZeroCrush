import asyncio
import os
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse, StreamingResponse

from core.energy import build_energy_buckets
from services.logs_service import session_output_dir
from services import pipeline_runtime

router = APIRouter(prefix="/api", tags=["analytics"])


@router.get("/session-summary")
async def api_session_summary() -> dict[str, Any]:
    return {"sessionData": pipeline_runtime.consume_latest_session_summary()}


@router.get("/stream")
async def api_stream() -> StreamingResponse:
    async def gen():
        while True:
            with pipeline_runtime.latest_frame_lock:
                data = pipeline_runtime.latest_frame
            if data:
                yield b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + data + b"\r\n"
            await asyncio.sleep(0.05)

    return StreamingResponse(gen(), media_type="multipart/x-mixed-replace; boundary=frame")


@router.get("/analytics/tracks-image")
async def api_tracks_image(session: Optional[str] = None) -> FileResponse:
    base = session_output_dir(session)
    path = os.path.join(base, "tracks.png")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="tracks.png not found")
    return FileResponse(path, media_type="image/png")


@router.get("/analytics/heatmap-image")
async def api_heatmap_image(session: Optional[str] = None) -> FileResponse:
    base = session_output_dir(session)
    path = os.path.join(base, "heatmap.png")
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail="heatmap.png not found")
    return FileResponse(path, media_type="image/png")


@router.get("/analytics/processed-image")
async def api_processed_image(session: Optional[str] = None, kind: str = "preview") -> FileResponse:
    base = session_output_dir(session)
    kind_map = {
        "preview": "processed_preview.png",
        "crowd": "crowd_peak.png",
        "alert": "violation_peak.png",
        "violation": "violation_peak.png",
    }
    if kind not in kind_map:
        raise HTTPException(status_code=400, detail=f"Unsupported kind: {kind}")
    filename = kind_map[kind]
    path = os.path.join(base, filename)
    if not os.path.isfile(path):
        raise HTTPException(status_code=404, detail=f"{filename} not found")
    return FileResponse(path, media_type="image/png")


@router.get("/analytics/energy")
async def api_analytics_energy(session: Optional[str] = None) -> dict[str, Any]:
    log_dir = session_output_dir(session)
    if not os.path.isdir(log_dir):
        raise HTTPException(status_code=404, detail="Session not found")
    return {"buckets": build_energy_buckets(log_dir)}
