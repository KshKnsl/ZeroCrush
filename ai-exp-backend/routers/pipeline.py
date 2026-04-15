import os
import time
from typing import Any

from fastapi import APIRouter, File, HTTPException, UploadFile

from core.source import resolve_start_source
from services.pipeline_runtime import request_stop, snapshot_status, start_pipeline
from services.runtime_settings import get_log_dir

router = APIRouter(prefix="/api", tags=["pipeline"])


@router.post("/upload")
async def api_upload(file: UploadFile = File(...)) -> dict[str, str]:
    if not file.filename or not file.filename.endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Only .mp4 files are supported")

    upload_dir = os.path.join(get_log_dir(), "uploads")
    os.makedirs(upload_dir, exist_ok=True)
    file_path = os.path.join(upload_dir, f"{int(time.time())}_{file.filename}")

    with open(file_path, "wb") as local_file:
        local_file.write(await file.read())

    return {"file_path": file_path}


@router.post("/stop")
async def api_stop() -> dict[str, str]:
    request_stop()
    return {"message": "stop requested"}


@router.post("/start")
async def api_start(body: dict[str, Any]) -> dict[str, Any]:
    source_value, is_realtime = resolve_start_source(body)
    start_pipeline(source_value, is_realtime)
    return {"message": "start requested", **snapshot_status()}
