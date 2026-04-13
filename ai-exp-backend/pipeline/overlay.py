import cv2

RED = (0, 0, 255)
GREEN = (0, 255, 0)
YELLOW = (0, 255, 255)
BLUE = (255, 0, 0)


def draw_restricted_zone(frame, zone_points):
    if len(zone_points) >= 3:
        cv2.polylines(frame, [zone_points], True, RED, 2)


def draw_detection_box(frame, bbox, violation=False, restricted=False, show_green=True):
    x1, y1, x2, y2 = bbox
    if restricted:
        cv2.rectangle(frame, (x1 + 5, y1 + 5), (x2 - 5, y2 - 5), RED, 2)
    if violation:
        cv2.rectangle(frame, (x1, y1), (x2, y2), YELLOW, 1)
    elif show_green and not restricted:
        cv2.rectangle(frame, (x1, y1), (x2, y2), GREEN, 1)


def draw_abnormal_boxes(frame, humans_detected, abnormal_ids):
    for track in humans_detected:
        if track["track_id"] in abnormal_ids:
            x1, y1, x2, y2 = [int(v) for v in track["bbox"]]
            cv2.rectangle(frame, (x1, y1), (x2, y2), BLUE, 2)


def apply_warning_overlays(
    frame,
    display_frame_count,
    violate_count,
    restricted_detected,
    abnormal_detected,
    check_social_distance,
    check_restricted_zone,
    check_abnormal,
    sd_warning_timeout,
    re_warning_timeout,
    ab_warning_timeout,
):
    if check_social_distance:
        sd_warning_timeout = 10 if violate_count > 0 else sd_warning_timeout - 1
        if sd_warning_timeout > 0:
            text = f"Violation count: {violate_count}"
            cv2.putText(frame, text, (200, frame.shape[0] - 30), cv2.FONT_HERSHEY_SIMPLEX, 1, RED, 3)

    if check_restricted_zone:
        re_warning_timeout = 10 if restricted_detected else re_warning_timeout - 1
        if re_warning_timeout > 0 and display_frame_count % 3 != 0:
            cv2.putText(frame, "RESTRICTED ENTRY", (200, 100), cv2.FONT_HERSHEY_SIMPLEX, 1, RED, 3)

    if check_abnormal:
        ab_warning_timeout = 10 if abnormal_detected else ab_warning_timeout - 1
        if ab_warning_timeout > 0 and display_frame_count % 3 != 0:
            cv2.putText(frame, "ABNORMAL ACTIVITY", (130, 250), cv2.FONT_HERSHEY_SIMPLEX, 1.5, BLUE, 5)

    return sd_warning_timeout, re_warning_timeout, ab_warning_timeout


def draw_crowd_count(frame, crowd_count):
    text = f"Crowd count: {crowd_count}"
    cv2.putText(frame, text, (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)
