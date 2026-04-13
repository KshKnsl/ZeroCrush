import numpy as np


def record_movement_data(movement_data_writer, track_id, entry_time, exit_time, positions):
    data = [track_id, entry_time, exit_time, *list(np.array(positions).flatten())]
    movement_data_writer.writerow(data)


def record_crowd_data(record_time, human_count, violate_count, restricted_entry, abnormal_activity, crowd_data_writer):
    crowd_data_writer.writerow([record_time, human_count, violate_count, int(restricted_entry), int(abnormal_activity)])


def end_video(track_histories, frame_count, movement_data_writer):
    for track_id, history in track_histories.items():
        if len(history["positions"]) > 0:
            record_movement_data(
                movement_data_writer,
                track_id,
                history["entry"],
                frame_count,
                history["positions"],
            )


def initialize_artifact_state(artifact_state):
    if artifact_state is None:
        return
    artifact_state["last_frame"] = None
    artifact_state["max_crowd_frame"] = None
    artifact_state["max_violation_frame"] = None
    artifact_state["max_crowd"] = -1
    artifact_state["max_violations"] = -1


def update_artifact_state(artifact_state, frame, crowd_count, violation_count):
    if artifact_state is None:
        return
    artifact_state["last_frame"] = frame.copy()
    if crowd_count > int(artifact_state.get("max_crowd", -1)):
        artifact_state["max_crowd"] = crowd_count
        artifact_state["max_crowd_frame"] = frame.copy()
    if violation_count > int(artifact_state.get("max_violations", -1)):
        artifact_state["max_violations"] = violation_count
        artifact_state["max_violation_frame"] = frame.copy()
