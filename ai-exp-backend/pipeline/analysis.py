from typing import Any

import cv2
import numpy as np
from util import kinetic_energy
# A low-level behavior analysis module that converts tracked human motion into signals like restricted entry and abnormal activity.

def update_track_histories(track_histories: dict[int, dict[str, Any]], humans_detected: list[dict[str, Any]], record_time: Any) -> None:
    for track in humans_detected:
        track_id = track["track_id"]
        if track_id not in track_histories:
            track_histories[track_id] = {"entry": record_time, "positions": []}
        track_histories[track_id]["positions"].append(track["centroid"])


def detect_restricted_entry(humans_detected: list[dict[str, Any]], zone_points: list[list[int]]) -> bool:
    if len(zone_points) < 3:
        return False

    zone_pts = np.array(zone_points, dtype=np.int32)
    for track in humans_detected:
        cx, cy = track["centroid"]
        if cv2.pointPolygonTest(zone_pts, (float(cx), float(cy)), False) >= 0:
            return True
    return False


def evaluate_abnormal(
    humans_detected: list[dict[str, Any]],
    track_histories: dict[int, dict[str, Any]],
    check_abnormal: bool,
    energy_threshold: float,
    min_persons_abnormal: int,
    abnormal_ratio_threshold: float,
    time_step: float,
) -> tuple[list[int], bool]:
    if not check_abnormal:
        return [], False

    abnormal_individual: list[int] = []
    for track in humans_detected:
        idx = track["track_id"]
        track_positions = track_histories[idx]["positions"]
        if len(track_positions) < 2:
            continue
        ke = kinetic_energy(track_positions[-1], track_positions[-2], time_step)
        if ke > energy_threshold:
            abnormal_individual.append(idx)

    abnormal = False
    if len(humans_detected) > min_persons_abnormal:
        abnormal = (len(abnormal_individual) / len(humans_detected)) > abnormal_ratio_threshold

    return abnormal_individual, abnormal


def resize_frame_by_width(frame, width: int):
    h, w = frame.shape[:2]
    if w == width:
        return frame
    ratio = float(width) / float(max(w, 1))
    height = max(1, int(round(h * ratio)))
    return cv2.resize(frame, (width, height), interpolation=cv2.INTER_LINEAR)
