import csv
from collections import deque
from typing import Any
# This file is your data bridge — it converts raw CSV logs into structured input for your AI logic.
def _read_rows(path: str, maxlen: int | None = None) -> list[list[str]]:
    if not path:
        raise ValueError("Missing crowd CSV path")
    with open(path, newline="", encoding="utf-8") as f:
        reader = csv.reader(f)
        next(reader, None)
        rows = deque(reader, maxlen=maxlen) if maxlen is not None else list(reader)
    return list(rows)


def read_crowd_tail(path: str, n: int = 100) -> list[list[str]]:
    return _read_rows(path, maxlen=n)


def read_crowd_all(path: str) -> list[list[str]]:
    return _read_rows(path)


def parse_bool_cell(value: Any) -> bool:
    cell = str(value).strip()
    return cell.lstrip("-").isdigit() and bool(int(cell))


def parse_crowd_row(row: list[str]) -> dict[str, Any] | None:
    if len(row) < 5:
        return None
    return {
        "time": row[0],
        "human_count": int(row[1]),
        "violations": int(row[2]),
        "restricted": parse_bool_cell(row[3]),
        "abnormal": parse_bool_cell(row[4]),
        "violence": parse_bool_cell(row[5]) if len(row) > 5 else False,
    }
