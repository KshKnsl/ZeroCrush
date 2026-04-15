import base64
import os
from typing import Any

import cv2


def safe_stem(path: Any) -> str:
    return "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in os.path.splitext(os.path.basename(str(path)))[0])


def _require_payload_value(payload: dict[str, Any], key: str, message: str) -> str:
    if key not in payload or not payload[key]:
        raise ValueError(message)
    return str(payload[key])


def encode_image_base64(path: str) -> str | None:
    if not os.path.isfile(path):
        return None
    with open(path, "rb") as image_file:
        return "data:image/png;base64," + base64.b64encode(image_file.read()).decode("ascii")


def open_video_capture(video_source: Any, is_cam: bool) -> cv2.VideoCapture:
    cap = cv2.VideoCapture(video_source)
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open video source: {video_source}")
    return cap


def resolve_start_source(payload: dict[str, Any]) -> tuple[Any, bool]:
    if "source" not in payload:
        raise ValueError("Missing source type")
    source = str(payload["source"]).strip().lower()
    if source == "webcam":
        return 0, True
    if source in {"file", "video", "mp4"}:
        return _require_payload_value(payload, "path", "Missing uploaded video path"), False
    if source in {"rtsp", "url"}:
        return _require_payload_value(payload, "url", "Missing RTSP url"), False
    raise ValueError(f"Unsupported source type: {source}")
