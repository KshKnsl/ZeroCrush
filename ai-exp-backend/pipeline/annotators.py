from typing import Any

import cv2
import numpy as np
import supervision as sv

from pipeline.overlay import draw_abnormal_boxes, draw_crowd_count, draw_detection_box


def _annotate_with_supervision(frame, humans_detected: list[dict[str, Any]], violate_set: set[int]) -> bool:
    if not humans_detected:
        return False

    xyxy = np.array([track["bbox"] for track in humans_detected], dtype=np.float32)
    class_id = np.zeros((len(humans_detected),), dtype=int)
    tracker_id = np.array([int(track["track_id"]) for track in humans_detected], dtype=int)
    labels = [
        f"id:{track['track_id']} {'VIOL' if i in violate_set else ''}".strip()
        for i, track in enumerate(humans_detected)
    ]

    detections = sv.Detections(xyxy=xyxy, class_id=class_id, tracker_id=tracker_id)
    box_annotator = sv.BoxAnnotator()
    label_annotator = sv.LabelAnnotator()
    frame = box_annotator.annotate(scene=frame, detections=detections)
    label_annotator.annotate(scene=frame, detections=detections, labels=labels)
    return True


def annotate_detections(
    frame,
    humans_detected: list[dict[str, Any]],
    violate_set: set[int],
    restricted_detected: bool,
    show_green: bool,
) -> None:
    if not restricted_detected and show_green and _annotate_with_supervision(frame, humans_detected, violate_set):
        return

    for i, track in enumerate(humans_detected):
        x1, y1, x2, y2 = list(map(int, track["bbox"]))
        draw_detection_box(
            frame,
            (x1, y1, x2, y2),
            violation=i in violate_set,
            restricted=restricted_detected,
            show_green=show_green,
        )


def annotate_abnormal(frame, humans_detected: list[dict[str, Any]], abnormal_ids: list[int], abnormal: bool) -> None:
    if abnormal:
        draw_abnormal_boxes(frame, humans_detected, abnormal_ids)


def apply_frame_smoothing(frame, prev_output_frame, alpha: float):
    if alpha > 0 and prev_output_frame is not None and prev_output_frame.shape == frame.shape:
        return cv2.addWeighted(prev_output_frame, 1.0 - alpha, frame, alpha, 0)
    return frame


def annotate_crowd_count_if_needed(frame, crowd_count: int, headless: bool) -> None:
    if not headless:
        draw_crowd_count(frame, crowd_count)
