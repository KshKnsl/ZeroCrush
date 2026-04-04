"""
FastAPI bridge for SmartWatch dashboard and pipeline control.
Run from project root: uvicorn api:app --reload --host 0.0.0.0 --port 8000
"""
import asyncio
import csv
import io
import json
import os
import re
import threading
import time
from collections import deque
from typing import Any, Optional

import cv2
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from pydantic import BaseModel

os.chdir(os.path.dirname(os.path.abspath(__file__)))

import config
from config import API_HOST, API_PORT, LOG_DIR

from main import _process_single_video

latest_frame: Optional[bytes] = None
latest_frame_lock = threading.Lock()
pipeline_thread: Optional[threading.Thread] = None
stop_event = threading.Event()
status_state = "idle"
status_lock = threading.Lock()
error_message: Optional[str] = None
session_start_time: Optional[float] = None
current_log_dir: Optional[str] = None

app = FastAPI(title="SmartWatch API")
app.add_middleware(
	CORSMiddleware,
	allow_origins=["*"],
	allow_credentials=True,
	allow_methods=["*"],
	allow_headers=["*"],
)


def _set_status(s: str, err: Optional[str] = None) -> None:
	global status_state, error_message
	with status_lock:
		status_state = s
		error_message = err


def _frame_callback(frame) -> None:
	global latest_frame
	ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), 85])
	if not ok:
		return
	with latest_frame_lock:
		latest_frame = buf.tobytes()


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


def _read_crowd_rows(path: str, max_rows: int) -> list[list[str]]:
	if not os.path.isfile(path):
		return []
	out: list[list[str]] = []
	with open(path, newline="", encoding="utf-8") as f:
		reader = csv.reader(f)
		next(reader, None)
		for i, row in enumerate(reader):
			if i >= max_rows:
				break
			out.append(row)
	return out


class StartBody(BaseModel):
	source: str


@app.get("/api/status")
async def api_status() -> dict[str, Any]:
	with status_lock:
		s = status_state
		err = error_message
	return {"status": s, "error": err}


@app.post("/api/start")
async def api_start(body: StartBody) -> dict[str, str]:
	global pipeline_thread, session_start_time, current_log_dir

	with status_lock:
		if status_state == "running":
			raise HTTPException(status_code=409, detail="Pipeline already running")

	stop_event.clear()
	_set_status("running", None)
	source = body.source.strip()

	def run() -> None:
		global session_start_time, current_log_dir
		try:
			from violence_detector import reset_violence_state

			reset_violence_state()
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
			else:
				if not os.path.isfile(source):
					raise FileNotFoundError(f"Video file not found: {source}")
				stem = os.path.splitext(os.path.basename(source))[0]
				safe = "".join(ch if ch.isalnum() or ch in ("-", "_") else "_" for ch in stem)
				current_log_dir = os.path.join(LOG_DIR, safe)
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


@app.post("/api/stop")
async def api_stop() -> dict[str, str]:
	stop_event.set()
	return {"message": "stop requested"}


@app.get("/api/logs/crowd")
async def api_logs_crowd(session: Optional[str] = None, limit: int = 100) -> JSONResponse:
	if session:
		path = os.path.join(LOG_DIR, session, "crowd_data.csv")
	else:
		path = _find_latest_crowd_csv()
	if not path or not os.path.isfile(path):
		return JSONResponse(content={"rows": []})
	if limit >= 100000:
		rows = _read_crowd_rows(path, max_rows=min(limit, 200000))
	else:
		rows = _read_crowd_tail(path, limit)
	header = ["Time", "Human Count", "Social Distance violate", "Restricted Entry", "Abnormal Activity", "Violence"]
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
		if len(r) > 5 and str(r[5]).isdigit():
			row_obj["violence"] = bool(int(r[5]))
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
		violence = False
		if len(r) > 5:
			try:
				violence = bool(int(r[5]))
			except ValueError:
				pass
		if violence:
			events.append({"type": "violence", "time": t, "severity": "high", "label": "Violence"})
		if restricted:
			events.append({"type": "restricted_zone", "time": t, "severity": "medium", "label": "Restricted zone"})
		if abnormal:
			events.append({"type": "abnormal_activity", "time": t, "severity": "medium", "label": "Abnormal activity"})
	events.reverse()
	return JSONResponse(content={"events": events, "session_start": session_start_time})


@app.get("/api/alerts/history")
async def api_alerts_history() -> dict[str, Any]:
	out: list[dict[str, Any]] = []
	if not os.path.isdir(LOG_DIR):
		return {"alerts": []}
	for name in sorted(os.listdir(LOG_DIR), reverse=True):
		d = os.path.join(LOG_DIR, name)
		if not os.path.isdir(d):
			continue
		p = os.path.join(d, "crowd_data.csv")
		if not os.path.isfile(p):
			continue
		with open(p, newline="", encoding="utf-8") as f:
			reader = csv.reader(f)
			next(reader, None)
			for row in reader:
				if len(row) < 5:
					continue
				t = row[0]
				try:
					restricted = bool(int(row[3]))
					abnormal = bool(int(row[4]))
				except (ValueError, IndexError):
					continue
				violence = False
				if len(row) > 5:
					try:
						violence = bool(int(row[5]))
					except ValueError:
						pass
				if violence:
					out.append(
						{
							"session": name,
							"time": t,
							"type": "violence",
							"severity": "high",
							"snapshot": None,
						}
					)
				if restricted:
					out.append(
						{
							"session": name,
							"time": t,
							"type": "restricted_zone",
							"severity": "medium",
							"snapshot": None,
						}
					)
				if abnormal:
					out.append(
						{
							"session": name,
							"time": t,
							"type": "abnormal_activity",
							"severity": "medium",
							"snapshot": None,
						}
					)
	return {"alerts": out[:2000]}


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
	if session:
		return os.path.join(LOG_DIR, session)
	p = _find_latest_crowd_csv()
	return os.path.dirname(p) if p else LOG_DIR


def _load_config_module():
	import importlib

	importlib.reload(config)
	return config


@app.get("/api/config")
async def api_get_config() -> dict[str, Any]:
	mod = _load_config_module()
	out = {}
	for key in dir(mod):
		if key.startswith("_"):
			continue
		val = getattr(mod, key)
		if callable(val):
			continue
		if isinstance(val, tuple):
			out[key] = list(val)
		elif isinstance(val, (str, int, float, bool)) or val is None:
			out[key] = val
		elif isinstance(val, (list, dict)):
			try:
				json.dumps(val)
				out[key] = val
			except (TypeError, ValueError):
				out[key] = repr(val)
		else:
			out[key] = repr(val)
	return out


@app.post("/api/config")
async def api_post_config(body: dict[str, Any]) -> dict[str, str]:
	path = os.path.join(os.path.dirname(__file__), "config.py")
	with open(path, encoding="utf-8") as f:
		lines = f.readlines()
	pattern = re.compile(r"^([A-Z][A-Z0-9_]*)\s*=")
	new_lines: list[str] = []
	seen: set[str] = set()
	for line in lines:
		m = pattern.match(line.strip())
		if m and m.group(1) in body:
			key = m.group(1)
			val = body[key]
			seen.add(key)
			new_lines.append(f"{key} = {repr(val)}\n")
		else:
			new_lines.append(line)
	with open(path, "w", encoding="utf-8") as f:
		f.writelines(new_lines)
	return {"message": "saved"}


if __name__ == "__main__":
	import uvicorn

	uvicorn.run("api:app", host=API_HOST, port=API_PORT, reload=True)
