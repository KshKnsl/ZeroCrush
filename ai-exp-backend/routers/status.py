from typing import Any
from fastapi import APIRouter
from services.pipeline_runtime import snapshot_all_statuses, snapshot_status

router = APIRouter(prefix="/api", tags=["status"])

@router.get("/status")
async def api_status(session_id: str | None = None) -> dict[str, Any]:
    return snapshot_status(session_id)

@router.get("/status/all")
async def api_status_all() -> dict[str, Any]:
    return {"sessions": snapshot_all_statuses()}