import csv
import json
import math
import os

import cv2
import imutils
import numpy as np
from scipy.spatial.distance import euclidean


def gradient_color_rgb(color1, color2, steps, current):
    if steps <= 0:
        return color1
    step1 = (color2[0] - color1[0]) / steps
    step2 = (color2[1] - color1[1]) / steps
    step3 = (color2[2] - color1[2]) / steps
    color_1 = int(color1[0] + current * step1)
    color_2 = int(color1[1] + current * step2)
    color_3 = int(color1[2] + current * step3)
    return (color_1, color_2, color_3)


def load_video_data(log_dir):
    with open(os.path.join(log_dir, "video_data.json"), "r") as file:
        return json.load(file)


def load_crowd_data(log_dir):
    human_count = []
    violate_count = []
    restricted_entry = []
    abnormal_activity = []

    with open(os.path.join(log_dir, "crowd_data.csv"), "r") as file:
        reader = csv.reader(file, delimiter=",")
        next(reader, None)
        for row in reader:
            if len(row) < 5:
                continue
            human_count.append(int(row[1]))
            violate_count.append(int(row[2]))
            restricted_entry.append(bool(int(row[3])))
            abnormal_activity.append(bool(int(row[4])))

    return human_count, violate_count, restricted_entry, abnormal_activity


def load_movement_tracks(log_dir):
    tracks = []
    with open(os.path.join(log_dir, "movement_data.csv"), "r") as file:
        reader = csv.reader(file, delimiter=",")
        next(reader, None)
        for row in reader:
            if len(row[3:]) > 4:
                temp = []
                data = row[3:]
                for i in range(0, len(data), 2):
                    try:
                        temp.append([int(data[i]), int(data[i + 1])])
                    except (ValueError, IndexError):
                        break
                if temp:
                    tracks.append(temp)
    return tracks


def render_movement_images(video_source, tracks, frame_size, vid_fps, data_record_frame):
    cap = cv2.VideoCapture(video_source)
    cap.set(1, 100)
    ret, tracks_frame = cap.read()
    cap.release()

    if not ret:
        # Fallback blank frame if source cannot be read
        tracks_frame = np.zeros((frame_size, frame_size, 3), dtype=np.uint8)

    tracks_frame = imutils.resize(tracks_frame, width=frame_size)
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
        temp_movement_point = [movement[0]]
        stationary = movement[0]
        stationary_time = 0
        for point in movement[1:]:
            if euclidean(stationary, point) < stationary_distance:
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

    for row in range(heatmap.shape[0]):
        for col in range(heatmap.shape[1]):
            if (heatmap[row][col] == np.array([0, 0, 0])).all():
                heatmap[row][col] = heatmap_frame[row][col]

    heatmap_frame = cv2.addWeighted(heatmap, 0.75, heatmap_frame, 0.25, 1)

    tracks_frame_rgb = cv2.cvtColor(tracks_frame, cv2.COLOR_BGR2RGB)
    heatmap_frame_rgb = cv2.cvtColor(heatmap_frame, cv2.COLOR_BGR2RGB)
    return tracks_frame_rgb, heatmap_frame_rgb


def build_energy_series(tracks, frame_size, time_steps, track_max_age):
    stationary_time = math.ceil(track_max_age / max(time_steps, 1e-6))
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
                if euclidean(movement[start_point], point) > stationary_distance:
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
            speed = euclidean(movement[i], movement[i + 1]) / max(time_steps, 1e-6)
            energy = int(0.5 * speed**2)
            energies.append(energy)
    return energies
