import csv
import datetime
import json
import os
import threading
import time
from typing import Any, Optional

import cv2

from core.session_summary import build_session_summary
from core.source import open_video_capture, safe_stem
from services.runtime_settings import get_setting

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


def set_status(status: str, err: Optional[str] = None) -> None:
    global status_state, error_message
    with status_lock:
        status_state = status
        error_message = err


def set_metrics(*args) -> None:
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


def snapshot_status() -> dict[str, Any]:
    with status_lock:
        status = status_state
        err = error_message
    with latest_frame_lock:
        stream_ready = latest_frame is not None
    with latest_metrics_lock:
        metrics = dict(latest_metrics)
    return {"status": status, "error": err, "stream_ready": stream_ready, **metrics}


def frame_callback(frame) -> None:
    global latest_frame
    quality = int(max(1, min(100, int(get_setting("STREAM_JPEG_QUALITY")))))
    ok, buf = cv2.imencode(".jpg", frame, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not ok:
        raise RuntimeError("Failed to encode frame as JPEG")
    with latest_frame_lock:
        latest_frame = buf.tobytes()


def request_stop() -> None:
    stop_event.set()


def consume_latest_session_summary() -> Optional[dict[str, Any]]:
    global latest_session_summary
    with latest_session_summary_lock:
        summary = latest_session_summary
        latest_session_summary = None
    return summary


def _process_single_video(
    video_source: Any,
    is_realtime: Optional[bool] = None,
    settings: Optional[dict[str, Any]] = None,
) -> None:
    from graph_grid_present import load_movement_tracks, render_movement_images
    from video_process import video_process

    if settings is None:
        raise ValueError("Missing settings")
    active_settings = settings

    frame_width = int(active_settings["FRAME_WIDTH"])
    if frame_width > 1920:
        raise ValueError("Frame width is too large")
    if frame_width < 480:
        raise ValueError("Frame width is too small")

    if is_realtime is None:
        is_realtime = bool(active_settings["IS_REALTIME"])

    cap = open_video_capture(video_source, is_realtime)

    video_stem = safe_stem(video_source)
    log_dir = str(active_settings["LOG_DIR"])
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
            frame_width,
            movement_data_writer,
            crowd_data_writer,
            settings=active_settings,
            frame_callback=frame_callback,
            stop_event=stop_event,
            headless=False,
            status_callback=set_metrics,
            artifact_state=artifact_state,
        )
        end_wall_time = time.time()

    process_time = max(end_wall_time - start_wall_time, 1e-6)

    if is_realtime:
        vid_fps = processing_fps
        data_record_frame = 1
        start_dt = datetime.datetime.now()
        end_dt = start_dt
    else:
        frame_count = cap.get(cv2.CAP_PROP_FRAME_COUNT)
        vid_fps = float(cap.get(cv2.CAP_PROP_FPS))
        if vid_fps <= 0:
            raise ValueError("Invalid source FPS")
        data_record_rate = int(active_settings["DATA_RECORD_RATE"])
        data_record_frame = max(1, int(vid_fps / data_record_rate))

        start_time = str(active_settings["START_TIME"])
        parts = [int(p) for p in start_time.split(":")]
        start_dt = datetime.datetime(parts[0], parts[1], parts[2], parts[3], parts[4], parts[5], parts[6] * 1000)
        time_elapsed = round(frame_count / vid_fps)
        end_dt = start_dt + datetime.timedelta(seconds=time_elapsed)

    cap.release()

    video_data = {
        "IS_CAM": is_realtime,
        "DATA_RECORD_FRAME": data_record_frame,
        "VID_FPS": vid_fps,
        "PROCESSED_FRAME_SIZE": frame_width,
        "TRACK_MAX_AGE": int(active_settings["TRACK_MAX_AGE"]),
        "START_TIME": start_dt.strftime("%d/%m/%Y, %H:%M:%S"),
        "END_TIME": end_dt.strftime("%d/%m/%Y, %H:%M:%S"),
        "PROCESS_SECONDS": process_time,
    }

    with open(os.path.join(video_log_dir, "video_data.json"), "w", encoding="utf-8") as video_data_file:
        json.dump(video_data, video_data_file)

    tracks = load_movement_tracks(video_log_dir)
    tracks_img, heatmap_img = render_movement_images(
        video_source=video_source,
        tracks=tracks,
        frame_size=frame_width,
        vid_fps=float(vid_fps),
        data_record_frame=max(1, int(data_record_frame)),
    )
    cv2.imwrite(os.path.join(video_log_dir, "tracks.png"), cv2.cvtColor(tracks_img, cv2.COLOR_RGB2BGR))
    cv2.imwrite(os.path.join(video_log_dir, "heatmap.png"), cv2.cvtColor(heatmap_img, cv2.COLOR_RGB2BGR))

    summary = build_session_summary(
        video_log_dir,
        video_source,
        is_realtime,
        start_dt,
        end_dt,
        float(vid_fps),
        frame_width,
        int(active_settings["TRACK_MAX_AGE"]),
    )

    global latest_session_summary
    with latest_session_summary_lock:
        latest_session_summary = summary

    for artifact_name, artifact_key in (
        ("processed_preview.png", "last_frame"),
        ("crowd_peak.png", "max_crowd_frame"),
        ("violation_peak.png", "max_violation_frame"),
    ):
        artifact_frame = artifact_state[artifact_key]
        if artifact_frame is not None:
            cv2.imwrite(os.path.join(video_log_dir, artifact_name), artifact_frame)


def start_pipeline(source: Any, is_realtime: bool) -> None:
    global pipeline_thread, session_start_time, latest_frame, latest_session_summary

    with status_lock:
        if status_state == "running":
            raise RuntimeError("Pipeline already running")

    stop_event.clear()
    with latest_frame_lock:
        latest_frame = None
    with latest_session_summary_lock:
        latest_session_summary = None

    set_metrics(0, 0, False, False)
    set_status("running", None)

    def run() -> None:
        global session_start_time
        session_start_time = time.time()
        settings_snapshot = {
            "FRAME_WIDTH": int(get_setting("FRAME_WIDTH")),
            "LOG_DIR": str(get_setting("LOG_DIR")),
            "DATA_RECORD_RATE": int(get_setting("DATA_RECORD_RATE")),
            "START_TIME": str(get_setting("START_TIME")),
            "TRACK_MAX_AGE": int(get_setting("TRACK_MAX_AGE")),
            "STREAM_JPEG_QUALITY": int(get_setting("STREAM_JPEG_QUALITY")),
            "IS_REALTIME": bool(get_setting("IS_REALTIME")),
            "DISTANCE_THRESHOLD": float(get_setting("DISTANCE_THRESHOLD")),
            "CHECK_ABNORMAL": bool(get_setting("CHECK_ABNORMAL")),
            "ENERGY_THRESHOLD": float(get_setting("ENERGY_THRESHOLD")),
            "ABNORMAL_RATIO_THRESHOLD": float(get_setting("ABNORMAL_RATIO_THRESHOLD")),
            "MIN_PERSONS_ABNORMAL": int(get_setting("MIN_PERSONS_ABNORMAL")),
            "YOLO_CONFIDENCE": float(get_setting("YOLO_CONFIDENCE")),
            "TRACK_SMOOTHING_ALPHA": float(get_setting("TRACK_SMOOTHING_ALPHA")),
            "FRAME_SMOOTHING_ALPHA": float(get_setting("FRAME_SMOOTHING_ALPHA")),
            "RESTRICTED_ZONE": get_setting("RESTRICTED_ZONE"),
            "CAMERA_ELEVATED": bool(get_setting("CAMERA_ELEVATED")),
        }
        _process_single_video(source, is_realtime=is_realtime, settings=settings_snapshot)
        set_status("idle", None)

    pipeline_thread = threading.Thread(target=run, daemon=True)
    pipeline_thread.start()
