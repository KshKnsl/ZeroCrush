import time
import datetime
import numpy as np
import imutils
import cv2
import pathlib
from typing import Any, Optional
from scipy.spatial.distance import euclidean


_original_path_exists = pathlib.Path.exists


def _safe_path_exists(path_obj):
	try:
		return _original_path_exists(path_obj)
	except OSError:
		return False


pathlib.Path.exists = _safe_path_exists
try:
	from ultralytics import YOLO
finally:
	pathlib.Path.exists = _original_path_exists

from tracking import update_tracks
from util import rect_distance, progress, kinetic_energy

RED = (0, 0, 255)
GREEN = (0, 255, 0)
YELLOW = (0, 255, 255)
BLUE = (255, 0, 0)

def _record_movement_data(movement_data_writer, track_id, entry_time, exit_time, positions):
	positions = np.array(positions).flatten()
	positions = list(positions)
	data = [track_id] + [entry_time] + [exit_time] + positions
	movement_data_writer.writerow(data)

def _record_crowd_data(time, human_count, violate_count, restricted_entry, abnormal_activity, crowd_data_writer):
	data = [time, human_count, violate_count, int(restricted_entry), int(abnormal_activity)]
	crowd_data_writer.writerow(data)

def _end_video(track_histories, frame_count, movement_data_writer):
	for track_id, history in track_histories.items():
		if len(history["positions"]) > 0:
			_record_movement_data(
				movement_data_writer,
				track_id,
				history["entry"],
				frame_count,
				history["positions"],
			)
		


def _smooth_tracks(humans_detected, visual_state, alpha):
	"""Smooth bounding boxes/centroids across frames to reduce visual jitter."""
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


def video_process(cap, frame_size, movement_data_writer, crowd_data_writer, settings: Optional[dict[str, Any]] = None, frame_callback=None, stop_event=None, headless=False, status_callback=None):
	active_settings = settings or {}
	IS_CAM = bool(active_settings.get("IS_REALTIME", False))
	DISTANCE_THRESHOLD = float(active_settings.get("DISTANCE_THRESHOLD", 100))
	DATA_RECORD_RATE = int(active_settings.get("DATA_RECORD_RATE", 10))
	CHECK_ABNORMAL = bool(active_settings.get("CHECK_ABNORMAL", True))
	ENERGY_THRESHOLD = float(active_settings.get("ENERGY_THRESHOLD", 1500))
	ABNORMAL_RATIO_THRESHOLD = float(active_settings.get("ABNORMAL_RATIO_THRESHOLD", 0.66))
	MIN_PERSONS_ABNORMAL = int(active_settings.get("MIN_PERSONS_ABNORMAL", 5))
	YOLO_MODEL_PATH = str(active_settings.get("YOLO_MODEL_PATH", "yolov8n.pt"))
	YOLO_CONFIDENCE = float(active_settings.get("YOLO_CONFIDENCE", 0.4))
	TRACK_SMOOTHING_ALPHA = float(active_settings.get("TRACK_SMOOTHING_ALPHA", 0.6))
	FRAME_SMOOTHING_ALPHA = float(active_settings.get("FRAME_SMOOTHING_ALPHA", 0.85))
	TRACK_MAX_AGE = int(active_settings.get("TRACK_MAX_AGE", 30))
	CHECK_SOCIAL_DISTANCE = DISTANCE_THRESHOLD > 0
	model = YOLO(YOLO_MODEL_PATH)
	show_window = not headless
	# Some sources (especially RTSP) need a short warm-up before first frame.
	startup_deadline = time.time() + 15
	def _calculate_FPS():
		nonlocal VID_FPS
		t1 = time.time() - t0
		VID_FPS = frame_count / t1

	if IS_CAM:
		VID_FPS = None
		DATA_RECORD_FRAME = 1
		TIME_STEP = 1
		t0 = time.time()
	else:
		VID_FPS = cap.get(cv2.CAP_PROP_FPS) or 0.0
		DATA_RECORD_FRAME = max(1, int(VID_FPS / DATA_RECORD_RATE)) if VID_FPS > 0 else 1
		TIME_STEP = DATA_RECORD_FRAME / (VID_FPS if VID_FPS > 0 else float(DATA_RECORD_RATE))

	frame_count = 0
	display_frame_count = 0
	re_warning_timeout = 0
	sd_warning_timeout = 0
	ab_warning_timeout = 0
	track_histories = {}
	track_visual_state = {}
	prev_output_frame = None

	while True:
		if stop_event is not None and stop_event.is_set():
			_end_video(track_histories, frame_count, movement_data_writer)
			if not VID_FPS:
				_calculate_FPS()
			break

		(ret, frame) = cap.read()

		# Allow source warm-up before declaring startup timeout.
		if not ret and frame_count == 0 and time.time() < startup_deadline:
			time.sleep(0.05)
			continue

		if not ret and frame_count == 0:
			raise RuntimeError("Timeout starting video source")

		# Stop the loop when video ends
		if not ret:
			_end_video(track_histories, frame_count, movement_data_writer)
			if not VID_FPS:
				_calculate_FPS()
			break

		# Update frame count
		if frame_count > 1000000:
			if not VID_FPS:
				_calculate_FPS()
			frame_count = 0
			display_frame_count = 0
		frame_count += 1
		
		# Skip frames according to given rate
		if frame_count % DATA_RECORD_FRAME != 0:
			continue

		display_frame_count += 1

		# Resize Frame to given size
		frame = imutils.resize(frame, width=frame_size)

		# Get current time
		current_datetime = datetime.datetime.now()

		# Run detection algorithm
		if IS_CAM:
			record_time = current_datetime
		else:
			record_time = frame_count

		# Run detection with YOLOv8 and update Deep SORT tracks.
		results = model(frame, conf=YOLO_CONFIDENCE, classes=[0], verbose=False)[0]
		boxes = results.boxes.xyxy.cpu().numpy()
		scores = results.boxes.conf.cpu().numpy()
		detections = [(boxes[i].tolist(), float(scores[i])) for i in range(len(boxes))]
		humans_detected = update_tracks(detections, frame, TRACK_MAX_AGE)
		_smooth_tracks(humans_detected, track_visual_state, TRACK_SMOOTHING_ALPHA)

		for track in humans_detected:
			track_id = track["track_id"]
			if track_id not in track_histories:
				track_histories[track_id] = {"entry": record_time, "positions": []}
			track_histories[track_id]["positions"].append(track["centroid"])
		
		violate_set = set()
		violate_count = np.zeros(len(humans_detected))

		# Check for restricted entry (centroid inside polygon)
		restricted_zone = active_settings.get("RESTRICTED_ZONE", [])
		zone_points = list(restricted_zone) if isinstance(restricted_zone, list) else []
		check_restricted_zone = len(zone_points) >= 3
		high_cam = bool(active_settings.get("CAMERA_ELEVATED", True))

		if check_restricted_zone:
			RE = False
			zone_pts = np.array(zone_points, dtype=np.int32)
			for track in humans_detected:
				cx, cy = track["centroid"]
				if cv2.pointPolygonTest(zone_pts, (float(cx), float(cy)), False) >= 0:
					RE = True
					break
		else:
			RE = False

		if check_restricted_zone:
			cv2.polylines(frame, [np.array(zone_points, dtype=np.int32)], True, RED, 2)

		abnormal_individual = []
		ABNORMAL = False

		# Initiate video process loop
		if (not headless) or CHECK_SOCIAL_DISTANCE or check_restricted_zone or CHECK_ABNORMAL:
			for i, track in enumerate(humans_detected):
				# Get object bounding box (ltrb)
				x1, y1, x2, y2 = list(map(int, track["bbox"]))
				# Get object centroid
				[cx, cy] = list(map(int, track["centroid"]))
				# Get object id
				idx = track["track_id"]
				# Check for social distance violation
				if CHECK_SOCIAL_DISTANCE:
					if len(humans_detected) >= 2:
						# Check the distance between current loop object with the rest of the object in the list
						for j, track_2 in enumerate(humans_detected[i+1:], start=i+1):
							if high_cam:
								[cx_2, cy_2] = list(map(int, track_2["centroid"]))
								distance = euclidean((cx, cy), (cx_2, cy_2))
							else:
								x1b, y1b, x2b, y2b = list(map(int, track_2["bbox"]))
								distance = rect_distance((x1, y1, x2, y2), (x1b, y1b, x2b, y2b))
							if distance < DISTANCE_THRESHOLD:
								# Distance between detection less than minimum social distance 
								violate_set.add(i)
								violate_count[i] += 1
								violate_set.add(j)
								violate_count[j] += 1

				# Compute energy level for each detection
				if CHECK_ABNORMAL:
					track_positions = track_histories[idx]["positions"]
					if len(track_positions) >= 2:
						ke = kinetic_energy(track_positions[-1], track_positions[-2], TIME_STEP)
						if ke > ENERGY_THRESHOLD:
							abnormal_individual.append(idx)

				# If restricted entry is on, draw red boxes around each detection
				if RE:
					cv2.rectangle(frame, (x1 + 5, y1 + 5), (x2 - 5, y2 - 5), RED, 2)

				# Draw yellow boxes for detection with social distance violation, green boxes for no violation
				# Place a number of violation count on top of the box
				if i in violate_set:
					cv2.rectangle(frame, (x1, y1), (x2, y2), YELLOW, 1)
				elif (not headless) and not RE:
					cv2.rectangle(frame, (x1, y1), (x2, y2), GREEN, 1)
			
			# Check for overall abnormal level, trigger notification if exceeds threshold
			if len(humans_detected) > MIN_PERSONS_ABNORMAL:
				if len(abnormal_individual) / len(humans_detected) > ABNORMAL_RATIO_THRESHOLD:
					ABNORMAL = True

		# Place violation count on frames
		if CHECK_SOCIAL_DISTANCE:
			# Warning stays on screen for 10 frames
			if (len(violate_set) > 0):
				sd_warning_timeout = 10
			else:
				sd_warning_timeout -= 1
			# Display violation warning and count on screen
			if sd_warning_timeout > 0:
				text = "Violation count: {}".format(len(violate_set))
				cv2.putText(frame, text, (200, frame.shape[0] - 30),
					cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3)

		# Place restricted entry warning
		if check_restricted_zone:
			# Warning stays on screen for 10 frames
			if RE:
				re_warning_timeout = 10
			else:
				re_warning_timeout -= 1
			# Display restricted entry warning and count on screen
			if re_warning_timeout > 0:
				if display_frame_count % 3 != 0:
					cv2.putText(frame, "RESTRICTED ENTRY", (200, 100),
						cv2.FONT_HERSHEY_SIMPLEX, 1, RED, 3)

		# Place abnormal activity warning
		if CHECK_ABNORMAL:
			if ABNORMAL:
				# Warning stays on screen for 10 frames
				ab_warning_timeout = 10
				# Draw blue boxes over the the abnormally behave detection if abnormal activity detected
				for track in humans_detected:
					if track["track_id"] in abnormal_individual:
						x1, y1, x2, y2 = list(map(int, track["bbox"]))
						cv2.rectangle(frame, (x1, y1), (x2, y2), BLUE, 2)
			else:
				ab_warning_timeout -= 1
			if ab_warning_timeout > 0:
				if display_frame_count % 3 != 0:
					cv2.putText(frame, "ABNORMAL ACTIVITY", (130, 250),
						cv2.FONT_HERSHEY_SIMPLEX, 1.5, BLUE, 5)

		# Display crowd count on screen
		if not headless:
			text = "Crowd count: {}".format(len(humans_detected))
			cv2.putText(frame, text, (10, 30),
				cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 3)

		# Record crowd data to file
		if FRAME_SMOOTHING_ALPHA > 0 and prev_output_frame is not None and prev_output_frame.shape == frame.shape:
			alpha = float(FRAME_SMOOTHING_ALPHA)
			frame = cv2.addWeighted(prev_output_frame, 1.0 - alpha, frame, alpha, 0)
		prev_output_frame = frame.copy()

		if frame_callback is not None:
			frame_callback(frame)
		_record_crowd_data(record_time, len(humans_detected), len(violate_set), RE, ABNORMAL, crowd_data_writer)
		if status_callback is not None:
			status_callback(record_time, len(humans_detected), len(violate_set), RE, ABNORMAL)
		if show_window:
			cv2.imshow("Processed Output", frame)
		else:
			progress(display_frame_count)

		# Press 'Q' to stop the video display
		if show_window and (cv2.waitKey(1) & 0xFF == ord('q')):
			# Record the movement when video ends
			_end_video(track_histories, frame_count, movement_data_writer)
			# Compute the processing speed
			if not VID_FPS:
				_calculate_FPS()
			break
	
	cv2.destroyAllWindows()
	return VID_FPS
