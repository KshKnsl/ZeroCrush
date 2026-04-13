import base64
import os
from typing import Any

import cv2

def safe_stem(path: Any) -> str:
    stem = os.path.splitext(os.path.basename(str(path)))[0]
    return "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in stem)


def encode_image_base64(path: str) -> str | None:
    if not os.path.isfile(path):
        return None
    with open(path, "rb") as image_file:
        return "data:image/png;base64," + base64.b64encode(image_file.read()).decode("ascii")


def open_video_capture(video_source: Any, is_cam: bool) -> cv2.VideoCapture:
    cap = cv2.VideoCapture(video_source)
    if not cap.isOpened() and is_cam:
        for backend in (cv2.CAP_DSHOW, cv2.CAP_MSMF):
            cap = cv2.VideoCapture(video_source, backend)
            if cap.isOpened():
                break
    if not cap.isOpened():
        raise RuntimeError(f"Unable to open video source: {video_source}")
    return cap


def resolve_start_source(payload: dict[str, Any]) -> tuple[Any, bool]:
    source = str(payload.get("source", "")).strip().lower()
    if source == "webcam":
        return 0, True
    if source in {"file", "video", "mp4"}:
        value = payload.get("path") or payload.get("value")
        if not value:
            raise ValueError("Missing uploaded video path")
        return str(value), False
    if source in {"rtsp", "url"}:
        value = payload.get("url") or payload.get("value")
        if not value:
            raise ValueError("Missing RTSP url")
        return str(value), False
    raise ValueError(f"Unsupported source type: {source}")
