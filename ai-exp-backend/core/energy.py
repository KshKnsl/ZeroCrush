from typing import Any


def build_energy_buckets(log_dir: str) -> list[dict[str, Any]]:
    from graph_grid_present import build_energy_series, load_movement_tracks, load_video_data

    if not log_dir:
        return []

    try:
        data = load_video_data(log_dir)
    except Exception:
        return []

    tracks = load_movement_tracks(log_dir)
    vid_fps = float(data.get("VID_FPS", 1.0) or 1.0)
    data_record_frame = max(1, int(data.get("DATA_RECORD_FRAME", 1)))
    frame_size = int(data.get("PROCESSED_FRAME_SIZE", 640))
    track_max_age = int(data.get("TRACK_MAX_AGE", 30))
    time_steps = data_record_frame / vid_fps
    energies = build_energy_series(tracks, frame_size, time_steps, track_max_age)
    if not energies:
        return []

    e_min, e_max = min(energies), max(energies)
    if e_min == e_max:
        return [{"bucket": str(e_min), "count": len(energies)}]

    n_bins = min(20, max(5, len(energies) // 10 + 1))
    width = max(1, (e_max - e_min) / n_bins)
    buckets_map: dict[int, int] = {}
    for e in energies:
        bin_i = int((e - e_min) / width) if width else 0
        bin_i = min(bin_i, n_bins - 1)
        buckets_map[bin_i] = buckets_map.get(bin_i, 0) + 1

    out = []
    for i in range(n_bins):
        lo = e_min + i * width
        hi = lo + width
        out.append({"bucket": f"{int(lo)}–{int(hi)}", "count": buckets_map.get(i, 0)})
    return out
