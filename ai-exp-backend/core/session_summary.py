import os
import datetime
from typing import Any

from .crowd import parse_crowd_row, read_crowd_all
from .energy import build_energy_buckets
from .source import encode_image_base64


def build_session_summary(
    video_log_dir: str,
    video_source: Any,
    is_cam: bool,
    start_dt: datetime.datetime,
    end_dt: datetime.datetime,
    vid_fps: float,
    frame_size: int,
    track_max_age: int,
) -> dict[str, Any]:
    crowd_rows = read_crowd_all(os.path.join(video_log_dir, "crowd_data.csv"))
    crowd_data: list[dict[str, Any]] = []
    log_events: list[dict[str, Any]] = []

    for row in crowd_rows:
        parsed = parse_crowd_row(row)
        if parsed is None:
            continue
        crowd_data.append(parsed)
        if parsed["restricted"]:
            log_events.append({"type": "restricted_zone", "time": parsed["time"], "severity": "medium", "label": "Restricted zone"})
        if parsed["abnormal"]:
            log_events.append({"type": "abnormal_activity", "time": parsed["time"], "severity": "medium", "label": "Abnormal activity"})

    return {
        "source": "webcam" if is_cam else str(video_source),
        "startTime": start_dt.isoformat(),
        "endTime": end_dt.isoformat(),
        "videoFps": float(vid_fps or 1.0),
        "processedFrameSize": int(frame_size),
        "trackMaxAge": int(track_max_age),
        "tracksImageBase64": encode_image_base64(os.path.join(video_log_dir, "tracks.png")),
        "heatmapImageBase64": encode_image_base64(os.path.join(video_log_dir, "heatmap.png")),
        "previewImageBase64": encode_image_base64(os.path.join(video_log_dir, "processed_preview.png")),
        "crowdPeakBase64": encode_image_base64(os.path.join(video_log_dir, "crowd_peak.png")),
        "violationPeakBase64": encode_image_base64(os.path.join(video_log_dir, "violation_peak.png")),
        "crowdData": crowd_data,
        "energyBuckets": build_energy_buckets(video_log_dir),
        "logEvents": log_events,
    }
