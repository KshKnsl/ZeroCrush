from typing import Any

RUNTIME_SETTINGS: dict[str, Any] = {
    "API_HOST": "0.0.0.0",
    "API_PORT": 8000,
    "DATA_RECORD_RATE": 10,
    "FRAME_WIDTH": 960,
    "START_TIME": "2025:1:1:0:0:0:0",
    "TRACK_MAX_AGE": 15,
    "STREAM_JPEG_QUALITY": 60,
    "IS_REALTIME": True,
    "CHECK_ABNORMAL": False,
    "ENERGY_THRESHOLD": 0.5,
    "ABNORMAL_RATIO_THRESHOLD": 0.3,
    "MIN_PERSONS_ABNORMAL": 5,
    "YOLO_CONFIDENCE": 0.65,
    "RESTRICTED_ZONE": [],
}


def is_json_value(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, (str, int, float, bool)):
        return True
    if isinstance(value, list):
        return all(is_json_value(v) for v in value)
    if isinstance(value, dict):
        return all(isinstance(k, str) and is_json_value(v) for k, v in value.items())
    return False


def get_setting(key: str) -> Any:
    if key not in RUNTIME_SETTINGS:
        raise KeyError(f"Missing runtime setting: {key}")
    return RUNTIME_SETTINGS[key]


def update_runtime_settings(patch: dict[str, Any]) -> dict[str, Any]:
    updated: dict[str, Any] = {}
    for key, value in patch.items():
        if not isinstance(key, str) or not key.isupper() or key not in RUNTIME_SETTINGS:
            continue
        if isinstance(value, tuple):
            value = list(value)
        if not is_json_value(value):
            continue
        RUNTIME_SETTINGS[key] = value
        updated[key] = value
    return updated


def get_api_host() -> str:
    return str(get_setting("API_HOST"))


def get_api_port() -> int:
    return int(get_setting("API_PORT"))


def get_log_dir() -> str:
    return "assets/processed_data"
