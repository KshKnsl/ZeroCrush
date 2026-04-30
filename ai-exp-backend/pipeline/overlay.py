import cv2
import numpy as np

RED = (0, 0, 255)
GREEN = (0, 255, 0)
YELLOW = (0, 255, 255)
BLUE = (255, 0, 0)


def _blend_color(risk_percent: int) -> tuple[int, int, int]:
    risk_percent = max(0, min(100, int(risk_percent)))
    green = int(max(0, 255 - (risk_percent * 2.55)))
    red = int(min(255, risk_percent * 2.55))
    return (0, green, red)


def _dominant_direction(track_histories: dict | None, track_ids: set[int] | None = None) -> str:
    if not track_histories:
        return "->"

    vectors: list[tuple[float, float]] = []
    for track_id, data in track_histories.items():
        if track_ids is not None and track_id not in track_ids:
            continue
        pts = data.get("positions", [])
        if len(pts) < 2:
            continue
        (px, py), (cx, cy) = pts[-2], pts[-1]
        vectors.append((float(cx - px), float(cy - py)))

    if not vectors:
        return "->"

    dx = sum(vec[0] for vec in vectors) / len(vectors)
    dy = sum(vec[1] for vec in vectors) / len(vectors)
    if abs(dx) >= abs(dy):
        return "->" if dx >= 0 else "<-"
    return "v" if dy >= 0 else "^"


def _draw_panel(frame, x: int, y: int, w: int, h: int, color=(0, 0, 0), alpha: float = 0.45) -> None:
    overlay = frame.copy()
    cv2.rectangle(overlay, (x, y), (x + w, y + h), color, -1)
    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)


def draw_restricted_zone(frame, zone_points):
    if len(zone_points) >= 3:
        cv2.polylines(frame, [zone_points], True, RED, 2)


def draw_detection_box(frame, bbox, restricted=False, show_green=True):
    x1, y1, x2, y2 = bbox
    if restricted:
        cv2.rectangle(frame, (x1 + 5, y1 + 5), (x2 - 5, y2 - 5), RED, 2)
    elif show_green:
        cv2.rectangle(frame, (x1, y1), (x2, y2), GREEN, 1)


def draw_abnormal_boxes(frame, humans_detected, abnormal_ids):
    for track in humans_detected:
        if track["track_id"] in abnormal_ids:
            x1, y1, x2, y2 = [int(v) for v in track["bbox"]]
            cv2.rectangle(frame, (x1, y1), (x2, y2), BLUE, 2)


def apply_warning_overlays(
    frame,
    display_frame_count,
    restricted_detected,
    abnormal_detected,
    check_restricted_zone,
    check_abnormal,
    re_warning_timeout,
    ab_warning_timeout,
    humans_detected=None,
    abnormal_ids=None,
    track_histories=None,
):
    if check_restricted_zone:
        re_warning_timeout = 10 if restricted_detected else re_warning_timeout - 1
        if re_warning_timeout > 0 and display_frame_count % 3 != 0:
            arrow = _dominant_direction(track_histories)
            text = f"RESTRICTED ENTRY {arrow}"
            _draw_panel(frame, 180, 58, 320, 58, (15, 15, 15), 0.65)
            cv2.putText(frame, text, (200, 96), cv2.FONT_HERSHEY_SIMPLEX, 1.0, RED, 3)
            cv2.arrowedLine(frame, (190, 112), (490, 112), RED, 2, tipLength=0.06)

    if check_abnormal:
        ab_warning_timeout = 10 if abnormal_detected else ab_warning_timeout - 1
        if ab_warning_timeout > 0 and display_frame_count % 3 != 0:
            abnormal_ids_set = set(abnormal_ids or [])
            arrow = _dominant_direction(track_histories, abnormal_ids_set if abnormal_ids_set else None)
            text = f"ABNORMAL ACTIVITY {arrow}"
            _draw_panel(frame, 110, 192, 420, 76, (18, 18, 18), 0.68)
            cv2.putText(frame, text, (128, 242), cv2.FONT_HERSHEY_SIMPLEX, 1.15, BLUE, 4)
            cv2.arrowedLine(frame, (124, 257), (504, 257), BLUE, 2, tipLength=0.05)

    # Draw blinking outlines and direction arrows for abnormal tracks
    if abnormal_ids and ab_warning_timeout > 0 and humans_detected:
        for track in humans_detected:
            if track["track_id"] in abnormal_ids:
                x1, y1, x2, y2 = [int(v) for v in track["bbox"]]
                thickness = 2 if (display_frame_count % 2 == 0) else 4
                cv2.rectangle(frame, (x1, y1), (x2, y2), RED, thickness)
                # draw direction arrow using last two positions if available
                if track_histories and track["track_id"] in track_histories:
                    pts = track_histories[track["track_id"]]["positions"]
                    if len(pts) >= 2:
                        (px, py) = pts[-2]
                        (cx, cy) = pts[-1]
                        cv2.arrowedLine(frame, (int(px), int(py)), (int(cx), int(cy)), YELLOW, 2, tipLength=0.3)

    return re_warning_timeout, ab_warning_timeout


def draw_motion_trails(frame, track_histories: dict | None, max_points: int = 30):
    if not track_histories:
        return
    overlay = frame.copy()
    for tid, data in track_histories.items():
        pts = data.get("positions", [])[-max_points:]
        if len(pts) < 2:
            continue
        pts_int = [(int(x), int(y)) for (x, y) in pts]
        color = (40, 220, 120)
        cv2.polylines(overlay, [np.array(pts_int, dtype=np.int32)], False, color, 2)
        cv2.arrowedLine(overlay, pts_int[-2], pts_int[-1], YELLOW, 2, tipLength=0.25)
        cv2.circle(overlay, pts_int[-1], 4, (255, 255, 255), -1)
        cv2.circle(overlay, pts_int[-1], 2, YELLOW, -1)
    cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)


def draw_risk_meter(frame, risk_percent: int):
    # Draw a vertical risk meter on the right side
    h, w = frame.shape[:2]
    meter_h = 150
    meter_w = 28
    pad = 10
    x0 = w - pad - meter_w
    y0 = pad
    # background
    cv2.rectangle(frame, (x0, y0), (x0 + meter_w, y0 + meter_h), (50, 50, 50), -1)
    # filled portion
    filled_h = int((risk_percent / 100.0) * meter_h)
    y_fill = y0 + meter_h - filled_h
    # color gradient green->red
    color = _blend_color(risk_percent)
    cv2.rectangle(frame, (x0, y_fill), (x0 + meter_w, y0 + meter_h), color, -1)
    for tick in (25, 50, 75):
        tick_y = y0 + meter_h - int((tick / 100.0) * meter_h)
        cv2.line(frame, (x0, tick_y), (x0 + meter_w, tick_y), (255, 255, 255), 1)
    # border and text
    cv2.rectangle(frame, (x0, y0), (x0 + meter_w, y0 + meter_h), (200, 200, 200), 1)
    label = "LOW" if risk_percent < 35 else "MID" if risk_percent < 70 else "HIGH"
    cv2.putText(frame, "Risk", (x0 - 42, y0 + meter_h + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
    cv2.putText(frame, f"{risk_percent}%", (x0 - 48, y0 + 18), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
    cv2.putText(frame, label, (x0 - 48, y0 + meter_h + 36), cv2.FONT_HERSHEY_SIMPLEX, 0.45, color, 1)


def draw_crowd_count(frame, crowd_count):
    text = f"Crowd count: {crowd_count}"
    cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)
