# Video source and runtime mode.
VIDEO_SOURCE = 'video/1.mp4'
IS_REALTIME = False
CAMERA_ELEVATED = True

# Frame dimensions and output preview toggle.
FRAME_WIDTH = 640

# YOLOv8 model path and confidence threshold.
YOLO_MODEL_PATH = 'yolov8n.pt'
YOLO_CONFIDENCE = 0.4

# Deep SORT max track age in frames.
TRACK_MAX_AGE = 30

# Crowd analysis thresholds and region of interest.
DISTANCE_THRESHOLD = 100
MIN_CROWD_FOR_ANALYSIS = 3
RESTRICTED_ZONE = [[200, 150], [400, 150], [400, 350], [200, 350]]

# Abnormal activity detection controls.
CHECK_ABNORMAL = True
MIN_PERSONS_ABNORMAL = 5
ENERGY_THRESHOLD = 1500
ABNORMAL_RATIO_THRESHOLD = 0.66

# Violence model integration settings.
VIOLENCE_MODEL_PATH = 'models/violence_model.h5'
VIOLENCE_FRAME_BUFFER = 16
VIOLENCE_CONFIDENCE = 0.7
VIOLENCE_CHECK_STRIDE = 8

# Data logging and timeline settings.
DATA_RECORD_RATE = 10
LOG_DIR = 'processed_data'
START_TIME = '2025:1:1:0:0:0:0'

# Alert and Telegram notification settings.
ALERT_ENABLED = False
TELEGRAM_BOT_TOKEN = ''
TELEGRAM_CHAT_ID = ''
ALERT_COOLDOWN_SECONDS = 30
API_HOST = '0.0.0.0'
API_PORT = 8000
