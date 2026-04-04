import io
import time

import cv2
import requests

from config import (
	ALERT_ENABLED,
	TELEGRAM_BOT_TOKEN,
	TELEGRAM_CHAT_ID,
	ALERT_COOLDOWN_SECONDS,
)

_last_sent: dict[str, float] = {}


def send_alert(event_type: str, message: str, frame=None) -> None:
	"""Send Telegram alert for violence, restricted_zone, or abnormal_activity."""
	if not ALERT_ENABLED:
		return
	if event_type not in ("violence", "restricted_zone", "abnormal_activity"):
		return
	if not TELEGRAM_BOT_TOKEN or not TELEGRAM_CHAT_ID:
		return
	now = time.time()
	last = _last_sent.get(event_type, 0.0)
	if now - last < ALERT_COOLDOWN_SECONDS:
		return
	_last_sent[event_type] = now
	base = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}"
	if frame is not None:
		ok, buf = cv2.imencode(".jpg", frame)
		if not ok:
			return
		bio = io.BytesIO(buf.tobytes())
		bio.seek(0)
		files = {"photo": ("alert.jpg", bio, "image/jpeg")}
		data = {"chat_id": TELEGRAM_CHAT_ID, "caption": message}
		try:
			requests.post(f"{base}/sendPhoto", data=data, files=files, timeout=30)
		except requests.RequestException:
			return
		return
	try:
		requests.post(
			f"{base}/sendMessage",
			json={"chat_id": TELEGRAM_CHAT_ID, "text": message},
			timeout=15,
		)
	except requests.RequestException:
		return
