from typing import Any


def build_energy_buckets(log_dir: str) -> list[dict[str, Any]]:
    from graph_grid_present import build_energy_series, load_movement_tracks, load_video_data

    if not log_dir:
        raise ValueError("Missing log directory")

    data = load_video_data(log_dir)

    vid_fps = float(data["VID_FPS"])
    data_record_frame = max(1, int(data["DATA_RECORD_FRAME"]))
    energies = build_energy_series(
        load_movement_tracks(log_dir),
        int(data["PROCESSED_FRAME_SIZE"]),
        data_record_frame / vid_fps,
        int(data["TRACK_MAX_AGE"]),
    )
    if not energies:
        return []

    e_min, e_max = min(energies), max(energies)
    if e_min == e_max:
        return [{"bucket": str(e_min), "count": len(energies)}]

    n_bins = min(20, max(5, len(energies) // 10 + 1))
    width = max(1, (e_max - e_min) / n_bins)
    buckets_map: dict[int, int] = {i: 0 for i in range(n_bins)}
    for e in energies:
        bin_i = int((e - e_min) / width) if width else 0
        bin_i = min(bin_i, n_bins - 1)
        buckets_map[bin_i] += 1

    return [
        {
            "bucket": f"{int(e_min + i * width)}-{int(e_min + (i + 1) * width)}",
            "count": buckets_map[i],
        }
        for i in range(n_bins)
    ]
