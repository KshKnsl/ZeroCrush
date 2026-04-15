from typing import Any

from .crowd import parse_crowd_row

EVENT_SPECS = (
    ("restricted", "restricted_zone", "Restricted zone"),
    ("abnormal", "abnormal_activity", "Abnormal activity"),
)


def build_events_from_rows(rows: list[list[str]]) -> list[dict[str, Any]]:
    events: list[dict[str, Any]] = []
    for row in rows:
        parsed = parse_crowd_row(row)
        if parsed is None:
            continue
        for flag, event_type, label in EVENT_SPECS:
            if parsed[flag]:
                events.append({"type": event_type, "time": parsed["time"], "severity": "medium", "label": label})
    return events
