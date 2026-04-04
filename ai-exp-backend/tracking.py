from deep_sort_realtime.deepsort_tracker import DeepSort
from config import TRACK_MAX_AGE

tracker = DeepSort(max_age=TRACK_MAX_AGE)

def update_tracks(detections, frame):
	"""Update tracker and return confirmed tracks.

	Args:
		detections: list of ([x1, y1, x2, y2], confidence)
		frame: current BGR frame
	"""
	bbs = []
	for bbox_xyxy, confidence in detections:
		x1, y1, x2, y2 = bbox_xyxy
		w = max(1, int(x2 - x1))
		h = max(1, int(y2 - y1))
		bbs.append(([int(x1), int(y1), w, h], float(confidence), "person"))

	tracks = tracker.update_tracks(bbs, frame=frame)

	confirmed_tracks = []
	for track in tracks:
		if not track.is_confirmed():
			continue
		x1, y1, x2, y2 = track.to_ltrb()
		x1, y1, x2, y2 = int(x1), int(y1), int(x2), int(y2)
		cx = int((x1 + x2) / 2)
		cy = int((y1 + y2) / 2)
		confirmed_tracks.append({
			"track_id": int(track.track_id),
			"bbox": [x1, y1, x2, y2],
			"centroid": (cx, cy),
		})

	return confirmed_tracks

