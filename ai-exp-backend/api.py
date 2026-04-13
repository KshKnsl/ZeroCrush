"""
FastAPI bridge for SmartWatch dashboard and pipeline control.
Run from project root: uvicorn api:app --reload --host 0.0.0.0 --port 8000
"""

import asyncio
import csv
import datetime
import json
import os
import threading
import time
from typing import Any, Optional

import cv2
from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse

from core.crowd import parse_crowd_row, read_crowd_tail
from core.energy import build_energy_buckets
from core.session_summary import build_session_summary
from core.source import open_video_capture, resolve_start_source, safe_stem

os.chdir(os.path.dirname(os.path.abspath(__file__)))

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
latest_session_summary: Optional[dict[str, Any]] = None
latest_session_summary_lock = threading.Lock()

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
		if key not in RUNTIME_SETTINGS:
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


def _process_single_video(
	video_source: Any,
	is_realtime: Optional[bool] = None,
	frame_callback=None,
	stop_event=None,
	headless: bool = False,
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
	cap = open_video_capture(video_source, is_cam)

	video_stem = safe_stem(video_source)
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

		artifact_state: dict[str, Any] = {}
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
			artifact_state=artifact_state,
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

	session_summary = build_session_summary(
		video_log_dir,
		video_source,
		is_cam,
		start_dt,
		end_dt,
		float(vid_fps or 1.0),
		FRAME_WIDTH,
		int(active_settings.get("TRACK_MAX_AGE", TRACK_MAX_AGE)),
	)
	global latest_session_summary
	with latest_session_summary_lock:
		latest_session_summary = session_summary

	for artifact_name, artifact_key in (
		("processed_preview.png", "last_frame"),
		("crowd_peak.png", "max_crowd_frame"),
		("violation_peak.png", "max_violation_frame"),
	):
		artifact_frame = artifact_state.get(artifact_key)
		if artifact_frame is not None:
			cv2.imwrite(os.path.join(video_log_dir, artifact_name), artifact_frame)


def _start_pipeline(source: Any, is_realtime: bool) -> None:
	global pipeline_thread, session_start_time, latest_frame
	with status_lock:
		if status_state == "running":
			raise RuntimeError("Pipeline already running")

	stop_event.clear()
	with latest_frame_lock:
		latest_frame = None
	with latest_session_summary_lock:
		global latest_session_summary
		latest_session_summary = None
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
				headless=False,
				status_callback=_set_metrics,
				settings=settings_snapshot,
			)
		except Exception as e:
			_set_status("error", str(e))
		else:
			_set_status("idle", None)

	pipeline_thread = threading.Thread(target=run, daemon=True)
	pipeline_thread.start()

@app.get("/api/status")
async def api_status() -> dict[str, Any]:
	return _snapshot_status()


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


@app.post("/api/start")
async def api_start(body: dict[str, Any]) -> dict[str, Any]:
	try:
		source_value, is_realtime = resolve_start_source(body)
		_start_pipeline(source_value, is_realtime)
		return {"message": "start requested", **_snapshot_status()}
	except Exception as exc:
		raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.get("/api/logs/crowd")
async def api_logs_crowd(session: Optional[str] = None, limit: int = 100) -> JSONResponse:
	log_dir = str(_get_setting("LOG_DIR", LOG_DIR))
	if session:
		path = os.path.join(log_dir, session, "crowd_data.csv")
	else:
		path = _find_latest_crowd_csv()
	if not path or not os.path.isfile(path):
		return JSONResponse(content={"rows": []})
	rows = read_crowd_tail(path, limit)
	header = ["Time", "Human Count", "Social Distance violate", "Restricted Entry", "Abnormal Activity"]
	out: list[dict[str, Any]] = []
	for r in rows:
		parsed = parse_crowd_row(r)
		if parsed is not None:
			out.append(parsed)
	return JSONResponse(content={"rows": out, "header": header, "path": path})


@app.get("/api/logs/events")
async def api_logs_events() -> JSONResponse:
	path = _find_latest_crowd_csv()
	if not path:
		return JSONResponse(content={"events": []})
	rows = read_crowd_tail(path, 200)
	events: list[dict[str, Any]] = []
	for r in rows:
		parsed = parse_crowd_row(r)
		if parsed is None:
			continue
		if parsed["restricted"]:
			events.append({"type": "restricted_zone", "time": parsed["time"], "severity": "medium", "label": "Restricted zone"})
		if parsed["abnormal"]:
			events.append({"type": "abnormal_activity", "time": parsed["time"], "severity": "medium", "label": "Abnormal activity"})
	events.reverse()
	return JSONResponse(content={"events": events, "session_start": session_start_time})


@app.get("/api/session-summary")
async def api_session_summary() -> dict[str, Any]:
	global latest_session_summary
	with latest_session_summary_lock:
		session_summary = latest_session_summary
		latest_session_summary = None
	return {"sessionData": session_summary}





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


@app.get("/api/analytics/processed-image")
async def api_processed_image(session: Optional[str] = None, kind: str = "preview") -> FileResponse:
	base = _session_output_dir(session)
	kind_map = {
		"preview": "processed_preview.png",
		"crowd": "crowd_peak.png",
		"violation": "violation_peak.png",
	}
	filename = kind_map.get(kind, "processed_preview.png")
	path = os.path.join(base, filename)
	if not os.path.isfile(path):
		raise HTTPException(status_code=404, detail=f"{filename} not found")
	return FileResponse(path, media_type="image/png")


@app.get("/api/analytics/energy")
async def api_analytics_energy(session: Optional[str] = None) -> dict[str, Any]:
	log_dir = _session_output_dir(session)

	if not os.path.isdir(log_dir):
		raise HTTPException(status_code=404, detail="Session not found")
	return {"buckets": build_energy_buckets(log_dir)}


def _session_output_dir(session: Optional[str]) -> str:
	log_dir = str(_get_setting("LOG_DIR", LOG_DIR))
	if not session:
		raise HTTPException(status_code=400, detail="Session id is required")
	return os.path.join(log_dir, session)


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
