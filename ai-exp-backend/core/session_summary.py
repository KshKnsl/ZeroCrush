import os
import datetime
from typing import Any

from .crowd import parse_crowd_row, read_crowd_all
from .energy import build_energy_buckets
from .events import build_events_from_rows
from .source import encode_image_base64

IMAGE_FILES = {
    "tracksImageBase64": "tracks.png",
    "heatmapImageBase64": "heatmap.png",
    "previewImageBase64": "processed_preview.png",
    "crowdPeakBase64": "crowd_peak.png",
    "violationPeakBase64": "violation_peak.png",
}


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
    crowd_data = [parsed for row in crowd_rows if (parsed := parse_crowd_row(row)) is not None]
    image_data = {
        key: encode_image_base64(os.path.join(video_log_dir, filename))
        for key, filename in IMAGE_FILES.items()
    }

    return {
        "source": "webcam" if is_cam else str(video_source),
        "startTime": start_dt.isoformat(),
        "endTime": end_dt.isoformat(),
        "videoFps": float(vid_fps),
        "processedFrameSize": int(frame_size),
        "trackMaxAge": int(track_max_age),
        **image_data,
        "crowdData": crowd_data,
        "energyBuckets": build_energy_buckets(video_log_dir),
        "logEvents": build_events_from_rows(crowd_rows),
    }
