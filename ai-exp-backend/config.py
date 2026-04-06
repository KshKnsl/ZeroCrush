# Video source and runtime mode.
VIDEO_SOURCE = 'video/1.mp4'
IS_REALTIME = False
CAMERA_ELEVATED = True

# Frame dimensions and output preview toggle.
FRAME_WIDTH = 640

# YOLOv8 model path and confidence threshold.
YOLO_MODEL_PATH = 'yolov8n.pt'
YOLO_CONFIDENCE = 0.4

# Output smoothing controls.
# TRACK_SMOOTHING_ALPHA: closer to 1 follows detections more tightly, lower is smoother.
TRACK_SMOOTHING_ALPHA = 0.6
# FRAME_SMOOTHING_ALPHA: 0 disables temporal blending. Recommended range: 0.7-0.95.
FRAME_SMOOTHING_ALPHA = 0.85
# MJPEG quality for /api/stream (1-100).
STREAM_JPEG_QUALITY = 90

# Deep SORT max track age in frames.
TRACK_MAX_AGE = 30

# Crowd analysis thresholds and region of interest.
DISTANCE_THRESHOLD = 100
MIN_CROWD_FOR_ANALYSIS = 3
RESTRICTED_ZONE = []

# Abnormal activity detection controls.
CHECK_ABNORMAL = True
MIN_PERSONS_ABNORMAL = 5
ENERGY_THRESHOLD = 1500
ABNORMAL_RATIO_THRESHOLD = 0.66

# Data logging and timeline settings.
DATA_RECORD_RATE = 10
LOG_DIR = 'processed_data'
START_TIME = '2025:1:1:0:0:0:0'

API_HOST = '0.0.0.0'
API_PORT = 8000
