import csv
from collections import deque
from typing import Any, Optional


def read_crowd_tail(path: str, n: int = 100) -> list[list[str]]:
    if not path:
        return []
    try:
        rows: deque[list[str]] = deque(maxlen=n)
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader, None)
            for row in reader:
                rows.append(row)
        return list(rows)
    except OSError:
        return []


def read_crowd_all(path: str) -> list[list[str]]:
    if not path:
        return []
    rows: list[list[str]] = []
    try:
        with open(path, newline="", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader, None)
            for row in reader:
                rows.append(row)
    except OSError:
        return []
    return rows


def parse_bool_cell(value: Any) -> bool:
    cell = str(value).strip()
    return bool(int(cell)) if cell.lstrip("-").isdigit() else False


def parse_crowd_row(row: list[str]) -> Optional[dict[str, Any]]:
    if len(row) < 5:
        return None
    try:
        human_count: Any = int(row[1])
    except (ValueError, TypeError):
        human_count = row[1]
    try:
        violations: Any = int(row[2])
    except (ValueError, TypeError):
        violations = row[2]

    return {
        "time": row[0],
        "human_count": human_count,
        "violations": violations,
        "restricted": parse_bool_cell(row[3]),
        "abnormal": parse_bool_cell(row[4]),
    }
