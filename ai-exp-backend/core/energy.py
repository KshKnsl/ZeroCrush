import numpy as np
from typing import Any

from graph_grid_present import build_energy_series, load_movement_tracks, load_video_data
# This function converts crowd movement into a statistical energy distribution, which helps detect abnormal or panic-like behavior.
def build_energy_buckets(log_dir: str) -> list[dict[str, Any]]:
    data = load_video_data(log_dir)
    vid_fps = float(data["VID_FPS"])
    energies = build_energy_series(
        load_movement_tracks(log_dir),
        int(data["PROCESSED_FRAME_SIZE"]),
        max(1, int(data["DATA_RECORD_FRAME"])) / vid_fps,
        int(data["TRACK_MAX_AGE"]),
    )
    if not energies:
        return []
    e_min, e_max = min(energies), max(energies)
    if e_min == e_max:
        return [{"bucket": str(e_min), "count": len(energies)}]
    counts, edges = np.histogram(energies, bins=min(20, max(5, len(energies) // 10 + 1)))
    return [{"bucket": f"{int(left)}-{int(right)}", "count": int(count)} for left, right, count in zip(edges[:-1], edges[1:], counts)]
