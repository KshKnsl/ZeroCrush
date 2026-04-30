from typing import Any
from fastapi import APIRouter
from services.pipeline_runtime import snapshot_status

router = APIRouter(prefix="/api", tags=["status"])

@router.get("/status")
async def api_status() -> dict[str, Any]:
    return snapshot_status()