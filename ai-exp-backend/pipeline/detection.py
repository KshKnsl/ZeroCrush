import numpy as np

from tracking import update_tracks
# It detects people, tracks them across frames.

def detect_tracks(model, frame, yolo_confidence, track_max_age):
    results = model(frame, conf=yolo_confidence, classes=[0], verbose=False)[0]
    boxes = results.boxes.xyxy.cpu().numpy()
    scores = results.boxes.conf.cpu().numpy()
    detections = [(boxes[i].tolist(), float(scores[i])) for i in range(len(boxes))]
    return update_tracks(detections, frame, track_max_age)