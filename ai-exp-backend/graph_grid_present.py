import csv
import json
import math
import os

import cv2
import numpy as np


def _euclidean(p1, p2):
    return float(np.linalg.norm(np.array(p1, dtype=np.float32) - np.array(p2, dtype=np.float32)))


def _resize_by_width(frame, width):
    h, w = frame.shape[:2]
    if w == width:
        return frame
    ratio = float(width) / float(max(w, 1))
    height = max(1, int(round(h * ratio)))
    return cv2.resize(frame, (width, height), interpolation=cv2.INTER_LINEAR)


def _to_int(value):
    return int(value)

def _iter_csv_rows(path, min_columns=0):
    with open(path, "r") as file:
        reader = csv.reader(file, delimiter=",")
        next(reader, None)
        for row in reader:
            if len(row) >= min_columns:
                yield row


def gradient_color_rgb(color1, color2, steps, current):
    if steps <= 0:
        return color1
    return tuple(int(color1[i] + current * ((color2[i] - color1[i]) / steps)) for i in range(3))


def load_video_data(log_dir):
    with open(os.path.join(log_dir, "video_data.json"), "r") as file:
        return json.load(file)


def load_crowd_data(log_dir):
    human_count = []
    violate_count = []
    restricted_entry = []
    abnormal_activity = []

    for row in _iter_csv_rows(os.path.join(log_dir, "crowd_data.csv"), min_columns=5):
        human_count.append(_to_int(row[1]))
        violate_count.append(_to_int(row[2]))
        restricted_entry.append(bool(_to_int(row[3])))
        abnormal_activity.append(bool(_to_int(row[4])))

    return human_count, violate_count, restricted_entry, abnormal_activity


def load_movement_tracks(log_dir):
    tracks = []
    for row in _iter_csv_rows(os.path.join(log_dir, "movement_data.csv"), min_columns=7):
        temp = []
        data = row[3:]
        if len(data) % 2 != 0:
            raise ValueError("Invalid movement track row: odd number of coordinates")
        for i in range(0, len(data), 2):
            temp.append([int(data[i]), int(data[i + 1])])
        if temp:
            tracks.append(temp)
    return tracks


def render_movement_images(video_source, tracks, frame_size, vid_fps, data_record_frame):
    cap = cv2.VideoCapture(video_source)
    cap.set(cv2.CAP_PROP_POS_FRAMES, 100)
    ret, tracks_frame = cap.read()
    cap.release()

    if not ret:
        raise RuntimeError("Unable to read frame for movement rendering")

    tracks_frame = _resize_by_width(tracks_frame, frame_size)
    heatmap_frame = np.copy(tracks_frame)

    stationary_threshold_seconds = 2
    stationary_threshold_frame = round(vid_fps * stationary_threshold_seconds / max(1, data_record_frame))
    stationary_distance = frame_size * 0.05
    max_stationary_time = 120
    blob_layer = 50
    max_blob_size = frame_size * 0.1
    layer_size = max_blob_size / blob_layer
    color_start = 210
    color_end = 0
    color_steps = int((color_start - color_end) / blob_layer)
    scale = 1.5

    stationary_points = []
    movement_points = []
    for movement in tracks:
        if not movement:
            continue
        temp_movement_point = [movement[0]]
        stationary = movement[0]
        stationary_time = 0
        for point in movement[1:]:
            if _euclidean(stationary, point) < stationary_distance:
                stationary_time += 1
            else:
                temp_movement_point.append(point)
                if stationary_time > stationary_threshold_frame:
                    stationary_points.append([stationary, stationary_time])
                stationary = point
                stationary_time = 0
        movement_points.append(temp_movement_point)

    color1 = (255, 96, 0)
    color2 = (0, 28, 255)
    for track in movement_points:
        for i in range(len(track) - 1):
            color = gradient_color_rgb(color1, color2, len(track) - 1, i)
            cv2.line(tracks_frame, tuple(track[i]), tuple(track[i + 1]), color, 2)

    def draw_blob(frame, coordinates, dwell_time):
        if dwell_time >= max_stationary_time:
            layer = blob_layer
        else:
            layer = math.ceil(dwell_time * scale / layer_size)
        for x in reversed(range(layer)):
            color = color_start - (color_steps * x)
            size = x * layer_size
            cv2.circle(frame, coordinates, int(size), (color, color, color), -1)

    heatmap = np.zeros((heatmap_frame.shape[0], heatmap_frame.shape[1]), dtype=np.uint8)
    for points in stationary_points:
        draw_heatmap = np.zeros((heatmap_frame.shape[0], heatmap_frame.shape[1]), dtype=np.uint8)
        draw_blob(draw_heatmap, tuple(points[0]), points[1])
        heatmap = cv2.add(heatmap, draw_heatmap)

    lo = np.array([color_start])
    hi = np.array([255])
    mask = cv2.inRange(heatmap, lo, hi)
    heatmap[mask > 0] = color_start

    heatmap = cv2.applyColorMap(heatmap, cv2.COLORMAP_JET)
    lo = np.array([128, 0, 0])
    hi = np.array([136, 0, 0])
    mask = cv2.inRange(heatmap, lo, hi)
    heatmap[mask > 0] = (0, 0, 0)

    black_mask = np.all(heatmap == np.array([0, 0, 0]), axis=2)
    heatmap[black_mask] = heatmap_frame[black_mask]

    heatmap_frame = cv2.addWeighted(heatmap, 0.75, heatmap_frame, 0.25, 1)

    tracks_frame_rgb = cv2.cvtColor(tracks_frame, cv2.COLOR_BGR2RGB)
    heatmap_frame_rgb = cv2.cvtColor(heatmap_frame, cv2.COLOR_BGR2RGB)
    return tracks_frame_rgb, heatmap_frame_rgb


def build_energy_series(tracks, frame_size, time_steps, track_max_age):
    safe_time_step = max(time_steps, 1e-6)
    stationary_time = math.ceil(track_max_age / safe_time_step)
    stationary_distance = frame_size * 0.01

    useful_tracks = []
    for movement in tracks:
        if len(movement) <= stationary_time:
            continue
        check_index = stationary_time
        start_point = 0
        track = movement[:check_index]
        while check_index < len(movement):
            for point in movement[check_index:]:
                if _euclidean(movement[start_point], point) > stationary_distance:
                    track.append(point)
                    start_point += 1
                    check_index += 1
                else:
                    start_point += 1
                    check_index += 1
                    break
            useful_tracks.append(track)
            track = movement[start_point:check_index]

    energies = []
    for movement in useful_tracks:
        for i in range(len(movement) - 1):
            speed = _euclidean(movement[i], movement[i + 1]) / safe_time_step
            energy = int(0.5 * speed**2)
            energies.append(energy)
    return energies
