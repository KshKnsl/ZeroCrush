from typing import Any, Optional

from fastapi import APIRouter
from fastapi.responses import JSONResponse

from core.crowd import parse_crowd_row, read_crowd_tail
from core.events import build_events_from_rows
from services.logs_service import find_latest_crowd_csv
from services import pipeline_runtime
from services.runtime_settings import get_log_dir

router = APIRouter(prefix="/api/logs", tags=["logs"])


@router.get("/crowd")
async def api_logs_crowd(session: Optional[str] = None, limit: int = 100) -> JSONResponse:
    if session:
        path = f"{get_log_dir()}/{session}/crowd_data.csv"
    else:
        path = find_latest_crowd_csv()

    if not path:
        return JSONResponse(content={"rows": []})

    rows = read_crowd_tail(path, limit)
    header = ["Time", "Human Count", "Alerts", "Restricted Entry", "Abnormal Activity"]
    parsed_rows: list[dict[str, Any]] = []
    for row in rows:
        parsed = parse_crowd_row(row)
        if parsed is not None:
            parsed_rows.append(parsed)

    return JSONResponse(content={"rows": parsed_rows, "header": header, "path": path})


@router.get("/events")
async def api_logs_events() -> JSONResponse:
    path = find_latest_crowd_csv()
    if not path:
        return JSONResponse(content={"events": []})

    rows = read_crowd_tail(path, 200)
    events = build_events_from_rows(rows)
    events.reverse()
    return JSONResponse(content={"events": events, "session_start": pipeline_runtime.session_start_time})
