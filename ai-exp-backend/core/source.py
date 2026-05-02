import base64
import os
import re
from pathlib import Path
from typing import Any
import cv2

# It validates inputs, opens video sources, and converts media (images/videos) into formats your system can process or display.

def safe_stem(path: Any) -> str:
    return re.sub(r"[^\w-]", "_", Path(str(path)).stem)

def _require_payload_value(payload: dict[str, Any], key: str, message: str) -> str:
    if key not in payload or not payload[key]:
        raise ValueError(message)
    return str(payload[key])

def encode_image_base64(path: str) -> str | None:
    if not os.path.isfile(path):
        return None
    with open(path, "rb") as image_file:
        return "data:image/png;base64," + base64.b64encode(image_file.read()).decode("ascii")

def open_video_capture(video_source: Any) -> cv2.VideoCapture:
    cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open video source: {video_source}")
    return cap

def resolve_start_source(payload: dict[str, Any]) -> tuple[Any, bool]:
    source = str(payload.get("source", "")).strip().lower()
    if not source:
        raise ValueError("Missing source type")
    source_map = {
        "file": ("path", "Missing uploaded video path"),
        "video": ("path", "Missing uploaded video path"),
        "mp4": ("path", "Missing uploaded video path"),
        "rtsp": ("url", "Missing RTSP url"),
        "url": ("url", "Missing RTSP url"),
    }
    if source in source_map:
        key, message = source_map[source]
        return _require_payload_value(payload, key, message), source in {"rtsp", "url"}
    raise ValueError(f"Unsupported source type: {source}")