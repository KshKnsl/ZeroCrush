import math
from typing import Any
from .crowd import parse_crowd_row

# It analyzes how people move (speed + direction chaos + density) and converts that into risk-based crowd events.
EVENT_SPECS = (
    ("restricted", "restricted_zone", "Restricted zone", 2),
    ("abnormal", "abnormal_activity", "Abnormal activity", 2),
    ("violence", "violence_risk", "Violence risk", 1),
)


def _track_velocity(track: list[list[int]]) -> float:
    if len(track) < 2:
        return 0.0
    return sum(math.dist(track[i], track[i + 1]) for i in range(len(track) - 1)) / max(1, len(track) - 1)


def _track_direction_chaos(track: list[list[int]]) -> float:
    if len(track) < 3:
        return 0.0
    turns = 0.0
    for i in range(1, len(track) - 1):
        ax, ay = track[i - 1]
        bx, by = track[i]
        cx, cy = track[i + 1]
        v1x, v1y = bx - ax, by - ay
        v2x, v2y = cx - bx, cy - by
        norm1 = math.hypot(v1x, v1y)
        norm2 = math.hypot(v2x, v2y)
        if not norm1 or not norm2:
            continue
        cos_theta = max(-1.0, min(1.0, (v1x * v2x + v1y * v2y) / (norm1 * norm2)))
        turns += abs(math.acos(cos_theta))
    return turns / max(1, len(track) - 2)


def _trajectory_risk(tracks: list[list[list[int]]] | None) -> int:
    if not tracks:
        return 0
    velocities = [_track_velocity(track) for track in tracks if len(track) > 1]
    chaos = [_track_direction_chaos(track) for track in tracks if len(track) > 2]
    density = min(1.0, len(tracks) / 20.0)
    velocity_score = min(1.0, (sum(velocities) / max(1, len(velocities))) / 18.0) if velocities else 0.0
    chaos_score = min(1.0, (sum(chaos) / max(1, len(chaos))) / math.pi) if chaos else 0.0
    return max(0, min(100, int(round(velocity_score * 40 + chaos_score * 35 + density * 25))))


def _severity(score: int) -> str:
    if score >= 80:
        return "critical"
    if score >= 60:
        return "high"
    if score >= 35:
        return "medium"
    return "low"


def build_events_from_rows(rows: list[list[str]], movement_tracks: list[list[list[int]]] | None = None, min_persistence: int = 3) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    streaks = {flag: 0 for flag, *_ in EVENT_SPECS}
    streaks["crowd_instability"] = 0
    trajectory_risk = _trajectory_risk(movement_tracks)
    for row in rows:
        parsed = parse_crowd_row(row)
        if parsed is None:
            continue
        risk_score = trajectory_risk
        for flag, event_type, label, persistence in EVENT_SPECS:
            streaks[flag] = streaks[flag] + 1 if parsed[flag] else 0
            if streaks[flag] == max(1, min_persistence, persistence):
                events.append({"type": event_type, "time": parsed["time"], "severity": _severity(risk_score), "label": label, "risk_score": risk_score, "trajectory_risk": trajectory_risk})
        if risk_score >= 75 and int(parsed["human_count"]) >= 10:
            streaks["crowd_instability"] += 1
            if streaks["crowd_instability"] == max(1, min_persistence):
                events.append({"type": "crowd_instability", "time": parsed["time"], "severity": _severity(risk_score), "label": "High crowd instability detected", "risk_score": risk_score, "trajectory_risk": trajectory_risk})
        else:
            streaks["crowd_instability"] = 0
    return events
