"""
FastAPI bridge for SmartWatch dashboard and pipeline control.
Run from project root: uvicorn api:app --reload --host 0.0.0.0 --port 8000
"""

import asyncio
import csv
import datetime
import io
import json
import os
import threading
import time
from collections import deque
from typing import Any, Optional

import cv2
from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
import numpy as np
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

os.chdir(os.path.dirname(os.path.abspath(__file__)))

import queue
class VirtualVideoCapture:
	def __init__(self):
		self.frame_queue = queue.Queue(maxsize=1)
		self.fps = 30.0
		self.opened = True

	def get(self, propId):
		if propId == cv2.CAP_PROP_FPS:
			return self.fps
		if propId == cv2.CAP_PROP_FRAME_COUNT:
			return -1
		return 0

	def read(self):
		try:
			frame = self.frame_queue.get(timeout=2.0)
			return True, frame
		except queue.Empty:
			return False, None

	def release(self):
		self.opened = False

	def isOpened(self):
		return self.opened


virtual_caps = {}

latest_frame: Optional[bytes] = None
latest_frame_lock = threading.Lock()
latest_metrics: dict[str, Any] = {
	"human_count": 0,
	"violations": 0,
	"restricted": False,
	"abnormal": False,
}
latest_metrics_lock = threading.Lock()
pipeline_thread: Optional[threading.Thread] = None
stop_event = threading.Event()
status_state = "idle"
status_lock = threading.Lock()
error_message: Optional[str] = None
session_start_time: Optional[float] = None

app = FastAPI(title="SmartWatch API")
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)

RUNTIME_SETTINGS: dict[str, Any] = {
	"API_HOST": "0.0.0.0",
	"API_PORT": 8000,
	"DATA_RECORD_RATE": 10,
	"FRAME_WIDTH": 640,
	"LOG_DIR": "processed_data",
	"START_TIME": "2025:1:1:0:0:0:0",
	"TRACK_MAX_AGE": 30,
	"STREAM_JPEG_QUALITY": 90,
	"IS_REALTIME": False,
}


def _is_json_value(value: Any) -> bool:
	if value is None:
		return True
	if isinstance(value, (str, int, float, bool)):
		return True
	if isinstance(value, list):
		return all(_is_json_value(v) for v in value)
	if isinstance(value, dict):
		return all(isinstance(k, str) and _is_json_value(v) for k, v in value.items())
	return False


def _get_setting(key: str, default: Any = None) -> Any:
	return RUNTIME_SETTINGS.get(key, default)


def _update_runtime_settings(patch: dict[str, Any]) -> dict[str, Any]:
	updated: dict[str, Any] = {}
	for key, value in patch.items():
		if not isinstance(key, str) or not key.isupper():
			continue
		if isinstance(value, tuple):
			value = list(value)
		if not _is_json_value(value):
			continue
		RUNTIME_SETTINGS[key] = value
		updated[key] = value

	if updated:
		_refresh_runtime_constants()

	return updated


def _refresh_runtime_constants() -> None:
	global API_HOST, API_PORT, DATA_RECORD_RATE, FRAME_WIDTH, LOG_DIR, START_TIME, TRACK_MAX_AGE, STREAM_JPEG_QUALITY
	settings = RUNTIME_SETTINGS
	API_HOST = str(settings["API_HOST"])
	API_PORT = int(settings["API_PORT"])
	DATA_RECORD_RATE = int(settings["DATA_RECORD_RATE"])
	FRAME_WIDTH = int(settings["FRAME_WIDTH"])
	LOG_DIR = str(settings["LOG_DIR"])
	START_TIME = str(settings["START_TIME"])
	TRACK_MAX_AGE = int(settings["TRACK_MAX_AGE"])
	STREAM_JPEG_QUALITY = int(settings["STREAM_JPEG_QUALITY"])


_refresh_runtime_constants()


def _set_status(s: str, err: Optional[str] = None) -> None:
	global status_state, error_message
	with status_lock:
		status_state = s
		error_message = err


def _frame_callback(frame) -> None:
	global latest_frame
	quality = int(max(1, min(100, int(_get_setting("STREAM_JPEG_QUALITY", STREAM_JPEG_QUALITY)))))
	ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
	if not ok:
		return
	with latest_frame_lock:
		latest_frame = buf.tobytes()


def _set_metrics(*args) -> None:
	"""Accept metrics callbacks with or without record_time.

	Expected forms:
	- (human_count, violations, restricted, abnormal)
	- (record_time, human_count, violations, restricted, abnormal)
	"""
	if len(args) == 4:
		human_count, violations, restricted, abnormal = args
	elif len(args) == 5:
		_, human_count, violations, restricted, abnormal = args
	else:
		return

	with latest_metrics_lock:
		latest_metrics["human_count"] = int(human_count)
		latest_metrics["violations"] = int(violations)
		latest_metrics["restricted"] = bool(restricted)
		latest_metrics["abnormal"] = bool(abnormal)


def _snapshot_status() -> dict[str, Any]:
	with status_lock:
		s = status_state
		err = error_message
	with latest_frame_lock:
		stream_ready = latest_frame is not None
	with latest_metrics_lock:
		metrics = dict(latest_metrics)
	return {"status": s, "error": err, "stream_ready": stream_ready, **metrics}


def _find_latest_crowd_csv() -> Optional[str]:
	if not os.path.isdir(LOG_DIR):
		return None
	best_path = None
	best_mtime = 0.0
	for dirpath, _, filenames in os.walk(LOG_DIR):
		if "crowd_data.csv" not in filenames:
			continue
		p = os.path.join(dirpath, "crowd_data.csv")
		try:
			m = os.path.getmtime(p)
		except OSError:
			continue
		if m > best_mtime:
			best_mtime = m
			best_path = p
	return best_path


def _read_crowd_tail(path: str, n: int = 100) -> list[list[str]]:
	if not os.path.isfile(path):
		return []
	rows: deque[list[str]] = deque(maxlen=n)
	with open(path, newline="", encoding="utf-8") as f:
		reader = csv.reader(f)
		next(reader, None)
		for row in reader:
			rows.append(row)
	return list(rows)


def _safe_stem(path: Any) -> str:
	stem = os.path.splitext(os.path.basename(str(path)))[0]
	return "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in stem)


def _process_single_video(
	video_source: Any,
	is_realtime: Optional[bool] = None,
	frame_callback=None,
	stop_event=None,
	headless: bool = False,
	graph_headless: bool = True,
	status_callback=None,
	settings: Optional[dict[str, Any]] = None,
) -> None:
	from graph_grid_present import load_movement_tracks, render_movement_images
	from video_process import video_process
	active_settings = settings if settings is not None else dict(RUNTIME_SETTINGS)

	if is_realtime is None:
		is_realtime = bool(active_settings.get("IS_REALTIME", False))

	if FRAME_WIDTH > 1920:
		raise ValueError("Frame width is too large!")
	if FRAME_WIDTH < 480:
		raise ValueError("Frame width is too small! You won't see anything")

	is_cam = is_realtime
	
	if video_source == "browser":
		cap = virtual_caps.get("browser")
		if cap is None:
			cap = VirtualVideoCapture()
			virtual_caps["browser"] = cap
	else:
		cap = cv2.VideoCapture(video_source)
		if not cap.isOpened() and is_cam:
			# Try common Windows camera backends if the default fails
			cap = cv2.VideoCapture(video_source, cv2.CAP_DSHOW)
		if not cap.isOpened() and is_cam:
			cap = cv2.VideoCapture(video_source, cv2.CAP_MSMF)
		if not cap.isOpened():
			raise RuntimeError(f"Unable to open video source: {video_source}")

	video_stem = _safe_stem(video_source)
	log_dir = str(active_settings.get("LOG_DIR", LOG_DIR))
	video_log_dir = os.path.join(log_dir, video_stem)
	os.makedirs(video_log_dir, exist_ok=True)

	movement_data_path = os.path.join(video_log_dir, "movement_data.csv")
	crowd_data_path = os.path.join(video_log_dir, "crowd_data.csv")

	with open(movement_data_path, "w", newline="", encoding="utf-8") as movement_data_file, open(
		crowd_data_path, "w", newline="", encoding="utf-8"
	) as crowd_data_file:
		movement_data_writer = csv.writer(movement_data_file)
		crowd_data_writer = csv.writer(crowd_data_file)
		movement_data_writer.writerow(["Track ID", "Entry time", "Exit Time", "Movement Tracks"])
		crowd_data_writer.writerow(
			["Time", "Human Count", "Social Distance violate", "Restricted Entry", "Abnormal Activity"]
		)

		start_wall_time = time.time()
		processing_fps = video_process(
			cap,
			FRAME_WIDTH,
			movement_data_writer,
			crowd_data_writer,
			settings=active_settings,
			frame_callback=frame_callback,
			stop_event=stop_event,
			headless=headless,
			status_callback=status_callback,
		)
		end_wall_time = time.time()

	process_time = max(end_wall_time - start_wall_time, 1e-6)
	print(f"\nFinished {video_source}")
	print("Time elapsed:", round(process_time, 2), "seconds")

	if is_cam:
		vid_fps = processing_fps
		data_record_frame = 1
		start_dt = datetime.datetime.now()
		end_dt = start_dt
		print("Processed FPS:", round(processing_fps, 2) if processing_fps else 0)
	else:
		frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
		vid_fps = cap.get(cv2.CAP_PROP_FPS) or 1.0
		data_record_rate = int(active_settings.get("DATA_RECORD_RATE", DATA_RECORD_RATE))
		data_record_frame = max(1, int(vid_fps / data_record_rate))
		processed_fps = frame_count / process_time
		print("Processed FPS:", round(processed_fps, 2))

		start_time = str(active_settings.get("START_TIME", START_TIME))
		parts = [int(p) for p in start_time.split(":")]
		start_dt = datetime.datetime(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6] * 1000)
		time_elapsed = round(frame_count / vid_fps)
		end_dt = start_dt + datetime.timedelta(seconds=time_elapsed)

	cap.release()

	video_data = {
		"IS_CAM": is_cam,
		"DATA_RECORD_FRAME": data_record_frame,
		"VID_FPS": vid_fps,
		"PROCESSED_FRAME_SIZE": FRAME_WIDTH,
		"TRACK_MAX_AGE": int(active_settings.get("TRACK_MAX_AGE", TRACK_MAX_AGE)),
		"START_TIME": start_dt.strftime("%d/%m/%Y, %H:%M:%S"),
		"END_TIME": end_dt.strftime("%d/%m/%Y, %H:%M:%S"),
	}

	with open(os.path.join(video_log_dir, "video_data.json"), "w", encoding="utf-8") as video_data_file:
		json.dump(video_data, video_data_file)

	tracks = load_movement_tracks(video_log_dir)
	tracks_img, heatmap_img = render_movement_images(
		video_source=video_source,
		tracks=tracks,
		frame_size=FRAME_WIDTH,
		vid_fps=float(vid_fps or 1.0),
		data_record_frame=max(1, int(data_record_frame)),
	)
	cv2.imwrite(os.path.join(video_log_dir, "tracks.png"), cv2.cvtColor(tracks_img, cv2.COLOR_RGB2BGR))
	cv2.imwrite(os.path.join(video_log_dir, "heatmap.png"), cv2.cvtColor(heatmap_img, cv2.COLOR_RGB2BGR))


def _start_pipeline(source: Any, is_realtime: bool) -> None:
	global pipeline_thread, session_start_time, latest_frame
	with status_lock:
		if status_state == "running":
			raise RuntimeError("Pipeline already running")

	stop_event.clear()
	with latest_frame_lock:
		latest_frame = None
	_set_metrics(0, 0, False, False)
	_set_status("running", None)

	def run() -> None:
		global session_start_time
		try:
			session_start_time = time.time()
			settings_snapshot = dict(RUNTIME_SETTINGS)
			_process_single_video(
				source,
				is_realtime=is_realtime,
				frame_callback=_frame_callback,
				stop_event=stop_event,
				headless=True,
				graph_headless=True,
				status_callback=_set_metrics,
				settings=settings_snapshot,
			)
		except Exception as e:
			_set_status("error", str(e))
		else:
			_set_status("idle", None)

	pipeline_thread = threading.Thread(target=run, daemon=True)
	pipeline_thread.start()


class StartBody(BaseModel):
	source: str


@app.get("/api/status")
async def api_status() -> dict[str, Any]:
	return _snapshot_status()

@app.post("/api/start")
async def api_start(body: StartBody) -> dict[str, str]:
	global pipeline_thread, session_start_time, latest_frame

	with status_lock:
		if status_state == "running":
			raise HTTPException(status_code=409, detail="Pipeline already running")

	stop_event.clear()
	with latest_frame_lock:
		latest_frame = None
	_set_status("running", None)
	source = body.source.strip()
	
	if "browser" in virtual_caps:
		virtual_caps["browser"].opened = False
		virtual_caps.pop("browser", None)
	
	if source == "browser":
		virtual_caps["browser"] = VirtualVideoCapture()

	def run() -> None:
		global session_start_time
		try:
			session_start_time = time.time()
			if source.lower() == "webcam":
				_process_single_video(
					0,
					is_realtime=True,
					frame_callback=_frame_callback,
					stop_event=stop_event,
					headless=True,
					graph_headless=True,
				)
			elif source.lower() == "browser":
				_process_single_video(
					"browser",
					is_realtime=True,
					frame_callback=_frame_callback,
					stop_event=stop_event,
					headless=True,
					graph_headless=True,
				)
			else:
				if not os.path.isfile(source):
					# Maybe an RTSP url
					pass
				_process_single_video(
					source,
					is_realtime=False,
					frame_callback=_frame_callback,
					stop_event=stop_event,
					headless=True,
					graph_headless=True,
				)
		except Exception as e:
			_set_status("error", str(e))
		else:
			_set_status("idle", None)

	pipeline_thread = threading.Thread(target=run, daemon=True)
	pipeline_thread.start()
	return {"message": "started"}


@app.post("/api/upload")
async def api_upload(file: UploadFile = File(...)) -> dict[str, str]:
	if not file.filename.endswith('.mp4'):
		raise HTTPException(status_code=400, detail="Only .mp4 files are supported")
	
	upload_dir = os.path.join(LOG_DIR, "uploads")
	os.makedirs(upload_dir, exist_ok=True)
	file_path = os.path.join(upload_dir, f"{int(time.time())}_{file.filename}")
	
	with open(file_path, "wb") as f:
		f.write(await file.read())
	
	return {"file_path": file_path}


@app.post("/api/stop")
async def api_stop() -> dict[str, str]:
	stop_event.set()
	return {"message": "stop requested"}


@app.get("/api/logs/crowd")
async def api_logs_crowd(session: Optional[str] = None, limit: int = 100) -> JSONResponse:
	log_dir = str(_get_setting("LOG_DIR", LOG_DIR))
	if session:
		path = os.path.join(log_dir, session, "crowd_data.csv")
	else:
		path = _find_latest_crowd_csv()
	if not path or not os.path.isfile(path):
		return JSONResponse(content={"rows": []})
	rows = _read_crowd_tail(path, limit)
	header = ["Time", "Human Count", "Social Distance violate", "Restricted Entry", "Abnormal Activity"]
	out: list[dict[str, Any]] = []
	for r in rows:
		if len(r) < 5:
			continue
		try:
			hc = int(r[1])
		except (ValueError, TypeError):
			hc = r[1]
		try:
			vio = int(r[2])
		except (ValueError, TypeError):
			vio = r[2]
		row_obj: dict[str, Any] = {
			"time": r[0],
			"human_count": hc,
			"violations": vio,
			"restricted": bool(int(r[3])) if len(r) > 3 and str(r[3]).strip().lstrip("-").isdigit() else False,
			"abnormal": bool(int(r[4])) if len(r) > 4 and str(r[4]).strip().lstrip("-").isdigit() else False,
		}
		out.append(row_obj)
	return JSONResponse(content={"rows": out, "header": header, "path": path})


@app.get("/api/logs/events")
async def api_logs_events() -> JSONResponse:
	path = _find_latest_crowd_csv()
	if not path:
		return JSONResponse(content={"events": []})
	rows = _read_crowd_tail(path, 200)
	events: list[dict[str, Any]] = []
	for r in rows:
		if len(r) < 5:
			continue
		t = r[0]
		try:
			restricted = bool(int(r[3]))
			abnormal = bool(int(r[4]))
		except (ValueError, IndexError):
			continue
		if restricted:
			events.append({"type": "restricted_zone", "time": t, "severity": "medium", "label": "Restricted zone"})
		if abnormal:
			events.append({"type": "abnormal_activity", "time": t, "severity": "medium", "label": "Abnormal activity"})
	events.reverse()
	return JSONResponse(content={"events": events, "session_start": session_start_time})





@app.get("/api/stream")
async def api_stream() -> StreamingResponse:
	async def gen():
		while True:
			with latest_frame_lock:
				data = latest_frame
			if data:
				yield (
					b"--frame\r\nContent-Type: image/jpeg\r\n\r\n" + data + b"\r\n"
				)
			await asyncio.sleep(0.05)

	return StreamingResponse(
		gen(),
		media_type="multipart/x-mixed-replace; boundary=frame",
	)


@app.websocket("/api/ws/stream")
async def websocket_stream(websocket: WebSocket):
	await websocket.accept()
	session_source: Optional[str] = None
	last_sent_frame: Optional[bytes] = None
	last_status_payload: Optional[str] = None
	stop_sender = asyncio.Event()

	async def sender() -> None:
		nonlocal last_sent_frame, last_status_payload
		while not stop_sender.is_set():
			status_payload = json.dumps({"type": "status", **_snapshot_status()})
			if status_payload != last_status_payload:
				try:
					await websocket.send_text(status_payload)
				except Exception:
					break
				last_status_payload = status_payload

			with latest_frame_lock:
				frame = latest_frame
			if frame and frame != last_sent_frame:
				try:
					await websocket.send_bytes(frame)
				except Exception:
					break
				last_sent_frame = frame
			await asyncio.sleep(0.08)

	sender_task = asyncio.create_task(sender())
	try:
		while True:
			message = await websocket.receive()
			if message.get("type") == "websocket.disconnect":
				break

			if message.get("text") is not None:
				try:
					payload = json.loads(message["text"])
				except Exception:
					await websocket.send_text(json.dumps({"type": "error", "message": "Invalid control message"}))
					continue

				action = payload.get("type")
				if action == "start":
					try:
						source = str(payload.get("source", "")).strip().lower()
						if source == "browser":
							if "browser" in virtual_caps:
								virtual_caps["browser"].opened = False
								virtual_caps.pop("browser", None)
							virtual_caps["browser"] = VirtualVideoCapture()
							_start_pipeline("browser", True)
							session_source = "browser"
						elif source == "webcam":
							_start_pipeline(0, True)
							session_source = "webcam"
						elif source in {"file", "video", "mp4"}:
							value = payload.get("path") or payload.get("value")
							if not value:
								raise ValueError("Missing uploaded video path")
							_start_pipeline(str(value), False)
							session_source = "file"
						elif source in {"rtsp", "url"}:
							value = payload.get("url") or payload.get("value")
							if not value:
								raise ValueError("Missing RTSP url")
							_start_pipeline(str(value), False)
							session_source = "rtsp"
						else:
							raise ValueError(f"Unsupported source type: {source}")
						await websocket.send_text(json.dumps({"type": "status", **_snapshot_status()}))
					except Exception as exc:
						await websocket.send_text(json.dumps({"type": "error", "message": str(exc)}))
				elif action == "stop":
					stop_event.set()
					session_source = None
					await websocket.send_text(json.dumps({"type": "status", **_snapshot_status()}))
				elif action == "set_restricted_zone":
					points = payload.get("points")
					if not isinstance(points, list):
						raise ValueError("'points' must be a list")
					normalized: list[list[int]] = []
					for item in points:
						if not isinstance(item, (list, tuple)) or len(item) != 2:
							raise ValueError("Each point must be [x, y]")
						x = int(item[0])
						y = int(item[1])
						normalized.append([x, y])
					if len(normalized) not in (0, 1, 2) and len(normalized) < 3:
						raise ValueError("Restricted zone needs at least 3 points, or 0 to clear")
					_update_runtime_settings({"RESTRICTED_ZONE": normalized})
					await websocket.send_text(json.dumps({"type": "zone_updated", "restricted_zone": normalized}))
					await websocket.send_text(json.dumps({"type": "status", **_snapshot_status()}))
				elif action == "clear_restricted_zone":
					_update_runtime_settings({"RESTRICTED_ZONE": []})
					await websocket.send_text(json.dumps({"type": "zone_updated", "restricted_zone": []}))
					await websocket.send_text(json.dumps({"type": "status", **_snapshot_status()}))
				elif action == "status":
					await websocket.send_text(json.dumps({"type": "status", **_snapshot_status()}))

			elif message.get("bytes") is not None:
				data = message["bytes"]
				if session_source == "browser" and status_state == "running" and "browser" in virtual_caps:
					np_arr = np.frombuffer(data, np.uint8)
					frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
					if frame is not None:
						try:
							if not virtual_caps["browser"].frame_queue.full():
								virtual_caps["browser"].frame_queue.put_nowait(frame)
						except queue.Empty:
							pass
	except WebSocketDisconnect:
		pass
	except Exception as e:
		print("WS Error:", str(e))
	finally:
		stop_sender.set()
		sender_task.cancel()


@app.get("/api/sessions")
async def api_sessions() -> dict[str, list[str]]:
	if not os.path.isdir(LOG_DIR):
		return {"sessions": []}
	names = [
		name
		for name in sorted(os.listdir(LOG_DIR), reverse=True)
		if os.path.isdir(os.path.join(LOG_DIR, name))
	]
	return {"sessions": names}


@app.get("/api/analytics/tracks-image")
async def api_tracks_image(session: Optional[str] = None) -> FileResponse:
	base = _session_output_dir(session)
	path = os.path.join(base, "tracks.png")
	if not os.path.isfile(path):
		raise HTTPException(status_code=404, detail="tracks.png not found")
	return FileResponse(path, media_type="image/png")


@app.get("/api/analytics/heatmap-image")
async def api_heatmap_image(session: Optional[str] = None) -> FileResponse:
	base = _session_output_dir(session)
	path = os.path.join(base, "heatmap.png")
	if not os.path.isfile(path):
		raise HTTPException(status_code=404, detail="heatmap.png not found")
	return FileResponse(path, media_type="image/png")


@app.get("/api/analytics/energy")
async def api_analytics_energy(session: Optional[str] = None) -> dict[str, Any]:
	from graph_grid_present import build_energy_series, load_movement_tracks, load_video_data

	log_dir = _session_output_dir(session)

	if not os.path.isdir(log_dir):
		raise HTTPException(status_code=404, detail="Session not found")

	try:
		data = load_video_data(log_dir)
	except Exception:
		raise HTTPException(status_code=404, detail="video_data.json missing")
	tracks = load_movement_tracks(log_dir)
	vid_fps = float(data.get("VID_FPS", 1.0) or 1.0)
	data_record_frame = max(1, int(data.get("DATA_RECORD_FRAME", 1)))
	frame_size = int(data.get("PROCESSED_FRAME_SIZE", 640))
	track_max_age = int(data.get("TRACK_MAX_AGE", 30))
	time_steps = data_record_frame / vid_fps
	energies = build_energy_series(tracks, frame_size, time_steps, track_max_age)
	if not energies:
		return {"buckets": []}
	e_min, e_max = min(energies), max(energies)
	if e_min == e_max:
		return {"buckets": [{"bucket": str(e_min), "count": len(energies)}]}
	n_bins = min(20, max(5, len(energies) // 10 + 1))
	width = max(1, (e_max - e_min) / n_bins)
	buckets_map: dict[int, int] = {}
	for e in energies:
		bin_i = int((e - e_min) / width) if width else 0
		bin_i = min(bin_i, n_bins - 1)
		buckets_map[bin_i] = buckets_map.get(bin_i, 0) + 1
	out = []
	for i in range(n_bins):
		lo = e_min + i * width
		hi = lo + width
		out.append({"bucket": f"{int(lo)}–{int(hi)}", "count": buckets_map.get(i, 0)})
	return {"buckets": out}


def _session_output_dir(session: Optional[str]) -> str:
	log_dir = str(_get_setting("LOG_DIR", LOG_DIR))
	if session:
		return os.path.join(log_dir, session)
	p = _find_latest_crowd_csv()
	return os.path.dirname(p) if p else log_dir


@app.get("/api/config")
async def api_get_config() -> dict[str, Any]:
	return dict(RUNTIME_SETTINGS)


@app.post("/api/config")
async def api_post_config(body: dict[str, Any]) -> dict[str, Any]:
	updated = _update_runtime_settings(body)
	return {"message": "saved", "updated": len(updated)}


if __name__ == "__main__":
	import uvicorn

	uvicorn.run("api:app", host=API_HOST, port=API_PORT, reload=True)
