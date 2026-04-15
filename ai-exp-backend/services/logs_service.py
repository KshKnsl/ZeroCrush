import os
from typing import Optional

from fastapi import HTTPException

from .runtime_settings import get_log_dir


def find_latest_crowd_csv(log_dir: Optional[str] = None) -> Optional[str]:
    base_dir = log_dir or get_log_dir()
    if not os.path.isdir(base_dir):
        return None

    best_path = None
    best_mtime = 0.0
    for dirpath, _, filenames in os.walk(base_dir):
        if "crowd_data.csv" not in filenames:
            continue
        path = os.path.join(dirpath, "crowd_data.csv")
        mtime = os.path.getmtime(path)
        if mtime > best_mtime:
            best_mtime = mtime
            best_path = path
    return best_path


def session_output_dir(session: Optional[str]) -> str:
    if not session:
        raise HTTPException(status_code=400, detail="Session id is required")
    return os.path.join(get_log_dir(), session)
