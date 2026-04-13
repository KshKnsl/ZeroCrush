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

from util import rect_distance, progress, kinetic_energy
from pipeline.artifact import end_video, initialize_artifact_state, record_crowd_data, update_artifact_state
from pipeline.detection import detect_tracks, smooth_tracks
from pipeline.overlay import (
	apply_warning_overlays,
	draw_abnormal_boxes,
	draw_crowd_count,
	draw_detection_box,
	draw_restricted_zone,
)

FIXED_YOLO_MODEL_PATH = "yolov8n.pt"


def video_process(
	cap,
	frame_size,
	movement_data_writer,
	crowd_data_writer,
	settings: Optional[dict[str, Any]] = None,
	frame_callback=None,
	stop_event=None,
	headless=False,
	status_callback=None,
	artifact_state: Optional[dict[str, Any]] = None,
):
	active_settings = settings or {}
	IS_CAM = bool(active_settings.get("IS_REALTIME", False))
	DISTANCE_THRESHOLD = float(active_settings.get("DISTANCE_THRESHOLD", 100))
	DATA_RECORD_RATE = int(active_settings.get("DATA_RECORD_RATE", 10))
	CHECK_ABNORMAL = bool(active_settings.get("CHECK_ABNORMAL", True))
	ENERGY_THRESHOLD = float(active_settings.get("ENERGY_THRESHOLD", 1500))
	ABNORMAL_RATIO_THRESHOLD = float(active_settings.get("ABNORMAL_RATIO_THRESHOLD", 0.66))
	MIN_PERSONS_ABNORMAL = int(active_settings.get("MIN_PERSONS_ABNORMAL", 5))
	YOLO_MODEL_PATH = FIXED_YOLO_MODEL_PATH
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
	initialize_artifact_state(artifact_state)

	while True:
		if stop_event is not None and stop_event.is_set():
			end_video(track_histories, frame_count, movement_data_writer)
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
			end_video(track_histories, frame_count, movement_data_writer)
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
		humans_detected = detect_tracks(model, frame, YOLO_CONFIDENCE, TRACK_MAX_AGE)
		smooth_tracks(humans_detected, track_visual_state, TRACK_SMOOTHING_ALPHA)

		for track in humans_detected:
			track_id = track["track_id"]
			if track_id not in track_histories:
				track_histories[track_id] = {"entry": record_time, "positions": []}
			track_histories[track_id]["positions"].append(track["centroid"])
		
		violate_set = set()
		violate_count = [0] * len(humans_detected)

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
			draw_restricted_zone(frame, np.array(zone_points, dtype=np.int32))

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
				draw_detection_box(frame, (x1, y1, x2, y2), violation=i in violate_set, restricted=RE, show_green=not headless)
			
			# Check for overall abnormal level, trigger notification if exceeds threshold
			if len(humans_detected) > MIN_PERSONS_ABNORMAL:
				if len(abnormal_individual) / len(humans_detected) > ABNORMAL_RATIO_THRESHOLD:
					ABNORMAL = True

		# Draw abnormal individuals; warning text is handled by apply_warning_overlays().
		if CHECK_ABNORMAL:
			if ABNORMAL:
				draw_abnormal_boxes(frame, humans_detected, abnormal_individual)

		# Display crowd count on screen
		if not headless:
			draw_crowd_count(frame, len(humans_detected))

		sd_warning_timeout, re_warning_timeout, ab_warning_timeout = apply_warning_overlays(
			frame,
			display_frame_count,
			len(violate_set),
			RE,
			ABNORMAL,
			CHECK_SOCIAL_DISTANCE,
			check_restricted_zone,
			CHECK_ABNORMAL,
			sd_warning_timeout,
			re_warning_timeout,
			ab_warning_timeout,
		)

		# Record crowd data to file
		if FRAME_SMOOTHING_ALPHA > 0 and prev_output_frame is not None and prev_output_frame.shape == frame.shape:
			alpha = float(FRAME_SMOOTHING_ALPHA)
			frame = cv2.addWeighted(prev_output_frame, 1.0 - alpha, frame, alpha, 0)
		prev_output_frame = frame.copy()

		if frame_callback is not None:
			frame_callback(frame)
		record_crowd_data(record_time, len(humans_detected), len(violate_set), RE, ABNORMAL, crowd_data_writer)
		if status_callback is not None:
			status_callback(record_time, len(humans_detected), len(violate_set), RE, ABNORMAL)
		update_artifact_state(artifact_state, frame, len(humans_detected), len(violate_set))
		if show_window:
			cv2.imshow("Processed Output", frame)
		else:
			progress(display_frame_count)

		# Press 'Q' to stop the video display
		if show_window and (cv2.waitKey(1) & 0xFF == ord('q')):
			# Record the movement when video ends
			end_video(track_histories, frame_count, movement_data_writer)
			# Compute the processing speed
			if not VID_FPS:
				_calculate_FPS()
			break
	
	cv2.destroyAllWindows()
	return VID_FPS
