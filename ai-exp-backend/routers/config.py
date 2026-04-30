from typing import Any
from fastapi import APIRouter
from services.runtime_settings import RUNTIME_SETTINGS, update_runtime_settings
router = APIRouter(prefix="/api", tags=["config"])

@router.get("/config")
async def api_get_config() -> dict[str, Any]:
    return dict(RUNTIME_SETTINGS)

@router.post("/config")
async def api_post_config(body: dict[str, Any]) -> dict[str, Any]:
    updated = update_runtime_settings(body)
    return {"message": "saved", "updated": len(updated)}
