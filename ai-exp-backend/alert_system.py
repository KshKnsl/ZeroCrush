import requests
import time
from config import ALERT_ENABLED, ALERT_EMAIL, FRONTEND_URL, ALERT_COOLDOWN_SECONDS

_last_sent: dict[str, float] = {}

def send_alert(event_type: str, message: str, frame=None) -> None:
	if not ALERT_ENABLED or event_type not in ("violence", "restricted_zone", "abnormal_activity") or not ALERT_EMAIL or not FRONTEND_URL:
		return
	now = time.time()
	last = _last_sent.get(event_type, 0.0)
	if now - last < ALERT_COOLDOWN_SECONDS:
		return
	_last_sent[event_type] = now
	try:
		requests.post(f"{FRONTEND_URL}/api/alerts", json={"email": ALERT_EMAIL, "type": event_type, "message": message}, timeout=15)
	except requests.RequestException:
		pass
