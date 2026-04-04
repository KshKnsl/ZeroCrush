import os
from collections import deque
from typing import Deque, Optional

import cv2
import numpy as np

from config import (
	VIOLENCE_MODEL_PATH,
	VIOLENCE_FRAME_BUFFER,
	VIOLENCE_CONFIDENCE,
)

_model = None
_frame_buffer: Optional[Deque[np.ndarray]] = None


def reset_violence_state() -> None:
	global _frame_buffer
	_frame_buffer = None


def _load_model():
	global _model
	if _model is not None:
		return _model
	path = VIOLENCE_MODEL_PATH
	if not path or not os.path.isfile(path):
		return None
	try:
		from tensorflow import keras

		_model = keras.models.load_model(path)
	except Exception:
		_model = None
	return _model


def detect_violence(frame) -> bool:
	"""
	Feed one frame at a time. Returns True if violence is detected
	in the current rolling window. Returns False if model not loaded
	or insufficient frames collected yet.
	"""
	global _frame_buffer
	model = _load_model()
	if model is None:
		return False
	if _frame_buffer is None:
		_frame_buffer = deque(maxlen=VIOLENCE_FRAME_BUFFER)
	if frame is None or frame.size == 0:
		return False
	rgb = frame[:, :, ::-1] if frame.ndim == 3 else frame
	small = cv2.resize(rgb, (64, 64), interpolation=cv2.INTER_AREA)
	x = small.astype(np.float32) / 255.0
	_frame_buffer.append(x)
	if len(_frame_buffer) < VIOLENCE_FRAME_BUFFER:
		return False
	batch = np.expand_dims(np.array(_frame_buffer), axis=0)
	try:
		pred = model.predict(batch, verbose=0)
		conf = float(np.max(pred))
	except Exception:
		return False
	return conf >= VIOLENCE_CONFIDENCE
