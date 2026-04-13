import numpy as np

from tracking import update_tracks


def detect_tracks(model, frame, yolo_confidence, track_max_age):
    results = model(frame, conf=yolo_confidence, classes=[0], verbose=False)[0]
    boxes = results.boxes.xyxy.cpu().numpy()
    scores = results.boxes.conf.cpu().numpy()
    detections = [(boxes[i].tolist(), float(scores[i])) for i in range(len(boxes))]
    return update_tracks(detections, frame, track_max_age)


def smooth_tracks(humans_detected, visual_state, alpha):
    if alpha <= 0 or alpha > 1:
        return

    active_ids = set()
    for track in humans_detected:
        track_id = track["track_id"]
        active_ids.add(track_id)

        bbox = np.array(track["bbox"], dtype=np.float32)
        centroid = np.array(track["centroid"], dtype=np.float32)
        prev = visual_state.get(track_id)
        if prev is None:
            smoothed_bbox = bbox
            smoothed_centroid = centroid
        else:
            smoothed_bbox = ((1.0 - alpha) * prev["bbox"]) + (alpha * bbox)
            smoothed_centroid = ((1.0 - alpha) * prev["centroid"]) + (alpha * centroid)

        visual_state[track_id] = {
            "bbox": smoothed_bbox,
            "centroid": smoothed_centroid,
        }

        track["bbox"] = [int(round(v)) for v in smoothed_bbox.tolist()]
        track["centroid"] = (int(round(smoothed_centroid[0])), int(round(smoothed_centroid[1])))

    for stale_id in list(visual_state.keys()):
        if stale_id not in active_ids:
            del visual_state[stale_id]
