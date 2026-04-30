# ZeroCrush / SmartMonitor - Full Technical Audit

## 1. Project Understanding and Problem Statement
The project, referred to interchangeably as **ZeroCrush** or **SmartMonitor**, aims to provide an AI-driven, real-time video surveillance and crowd monitoring system. The core user problem it addresses is **automated operational oversight of physical spaces**: keeping track of how many people are in an area, whether they are maintaining social distancing, if they enter restricted zones, or if sudden/abnormal movements (like panic or running) occur.

Currently, it acts more like a monolithic prototype than a scalable product. It provides a polished React-based dashboard that connects directly to a Python AI engine running on localhost, executing YOLOv8 inference frame-by-frame on a single video source at a time.

## 2. Current Concept
At its core, the project is a **Full-Stack AI Surveillance Dashboard**. 
- It uses a **Next.js frontend** to display a rich GUI with live video feed, real-time metrics (crowd size, violations), and historical session logs.
- It uses a **FastAPI + YOLO Python backend** that accepts a video source (RTSP link, webcam, or an uploaded MP4), runs object detection frame-by-frame, continuously calculates crowd statistics, streams the annotated video back using MJPEG, and stores the session's analytical data (heatmaps, tracks, and CSV logs).

## 3. End-to-End Flow
* **Frontend Flow:** The user authenticates into the Next.js app via NextAuth. The `LiveMonitoring` tab handles User Interactions, saving/drawing restricted zones, and picking a video source.
* **AI Backend Flow:** The FastAPI application receives the `start` command. It instantiates an OpenCV `VideoCapture`, loops through frames, and runs the `YOLOv8` model. For each frame, it extracts bounding boxes and human centroids, updates Deep SORT trackers, and computes Euclidean distances, polygon intersections (restricted zones), and kinetic energy (abnormal activity). 
* **Data Flow:** The Python API stores the real-time frame into a global `latest_frame` buffer. It also writes metrics into local CSV files (`crowd_data.csv`, `movement_data.csv`).
* **User Interaction Flow:** The React UI constantly polls `/api/status` for real-time metrics and points an `<img>` tag to the MJPEG streaming endpoint (`/api/stream`) to display the live feed.
* **Database Usage:** When a session ends, the Next.js frontend fetches the backend summary, formats the imagery as Base64, and pushes a complete JSON blob to a local PostgreSQL database using Prisma.
* **Architecture:** Completely Local/On-Premise. The backend acts as a singleton (processing only one video at a time).

## 4. File and Folder Structure

### Frontend Structure
```
frontend/
├── app/                  # Next.js App Router root
│   ├── api/              # API routes (Auth, Sessions, Users)
│   ├── dashboard/        # Dashboard layout and page
│   ├── layout.tsx        # Root layout, theme providers
│   └── page.tsx          # Landing / Login page
├── components/           # React Components (Shadcn UI + Custom)
│   ├── dashboard-tabs/   # Core tab interfaces (LiveMonitoring, Settings, etc.)
│   └── ui/               # Reusable Shadcn UI atoms
├── lib/                  # Utilities (Prisma setup, NextAuth config)
├── prisma/               # Prisma ORM Schema & migrations
├── public/               # Static assets
└── package.json          # Node dependencies
```

### AI Backend Structure
```
There are currently two backends reflecting an uncompleted migration:
zero-crush-backend/       # The active, monolithic backend
├── api.py                # Massive 600+ line FastAPI orchestration file
├── video_process.py      # Core loop: YOLO, OpenCV drawing, analytics logic
├── graph_grid_present.py # Generates heatmaps and tracks post-session
├── tracking.py           # Deep SORT object tracker
└── yolov8n.pt            # Pre-trained YOLO weight model

ai-exp-backend/           # An experimental, structurally cleaner backend (Inactive)
├── api.py                # Clean entry point integrating routers
├── routers/              # Controller layer for endpoints
├── core/                 # Core AI configurations
├── services/             # Business logic
└── video/                # Video processing modularized
```

## 5. In-Depth File Explanations

### Frontend
- **`frontend/app/dashboard/page.tsx`**: 
  - **Purpose**: Creates the dashboard shell containing navigation tabs, role checks, and standard layouts.
  - **Function**: Handles the logic to render the four main tabs (`LiveMonitoring`, `AnalyticsDashboard`, `SettingsPanel`, `UsersManagement`).
  - **Design**: Good layout but relies heavily on client-side state for routing (`?activeTab`).

- **`frontend/components/dashboard-tabs/LiveMonitoring.tsx`**:
  - **Purpose**: The main control center the user interacts with to start a live surveillance session.
  - **Function**: Connects to the FastAPI backend, lets users upload files or link RTSP, and manages the drawing of polygons for "Restricted Zones". It aggressively polls the backend every 1.2s for status.
  - **Design Status**: Very complex. Holds almost 800 lines of UI and networking logic. Saving sessions relies on the frontend coordinating the process rather than the backend directly talking to the DB.

- **`frontend/prisma/schema.prisma`**:
  - **Purpose**: Database schema definition.
  - **Function**: Defines the `User` accounts and the `Session` logs.
  - **Design Status**: The `Session` model contains fields like `tracksImageBase64` and `heatmapImageBase64`. Storing images directly as Base64 strings in a relational database is a major scalability anti-pattern.

### Backend (`zero-crush-backend`)
- **`zero-crush-backend/api.py`**:
  - **Purpose**: Serve as the sole communication medium between the frontend and the AI.
  - **Function**: Defines all FastAPI endpoints. It stores the live stream state using global variables and locks (`latest_frame_lock`, `status_lock`, `pipeline_thread`).
  - **Design Status**: Poorly designed. Because it uses global variables, it can strictly process only **one camera/video stream at a time** continuously across the entire server. 

- **`zero-crush-backend/video_process.py`**:
  - **Purpose**: The heavy lifter for the AI.
  - **Function**: Iterates through each video frame, invokes the YOLOv8 model for human detection, tracks objects across frames frame, calculates Euclidean distances (for social distancing), checks polygons (restricted areas), and measures kinetic energy metrics for anomalous behavior. 
  - **Design Status**: Operates synchronously in a single massive `while True` loop. While effective for a university prototype, it creates immense bottlenecks and lacks modularity if you ever add new AI models.

## 6. Identification of Problems

1. **Singleton Backend (Architectural Flaw)**: The backend relies heavily on `global` states in Python. If an admin monitors "Camera A", nobody else can monitor "Camera B". A scalable surveillance platform must support a multi-camera pipeline concurrently.
2. **Database Abuse (Bad Design Decision)**: Storing large image heatmaps as raw Base64 strings inside a PostgreSQL database row will quickly degrade query performance and balloon DB size.
3. **Double Backend Confusion (Maintainability)**: The repository contains both `zero-crush-backend` and `ai-exp-backend`. This makes continuous integration confusing and duplicates AI models (taking double the space).
4. **Bandwidth Inefficient Streaming (Scalability Issue)**: The stream uses MJPEG over a direct `<img>` HTTP response. While easy to code, MJPEG sends a full JPEG buffer continuously, destroying network bandwidth.
5. **Coupled Business Logic**: `LiveMonitoring.tsx` in the frontend fetches data from the AI API and then saves it to Next.js API. If a user closes the browser during a "session save", the session database write fails entirely.

## 7. Refinement Strategy & Vision 

To transform this from a toy prototype to a production-ready system:

- **Strong Product Vision**: Brand it as a specific tool—either "Automated Construction Site Monitor" or "Smart Retail Analytics Dash". Generic surveillance is too broad. Pick a niche to sell it to.
- **Architectural Shift**: 
  - Delete `ai-exp-backend` or rename it, porting over whatever structural improvements were made out of `zero-crush-backend`.
  - Shift to a **Job Queue implementation** (like Celery/Redis) in Python. Streams must be independent workers, pushing their live frames to an edge server via WebRTC, not blocking the main FastAPI thread.
- **Improved Storage Setup**: Store heatmaps and images in an S3-compatible object bucket (like MinIO or AWS S3). The Prisma database should only hold `URLs` referencing those bucket items, not Base64 data.
- **Backend-to-Database Independence**: The Python backend should handle writing its finalized sessions securely to PostgreSQL. The Next.js frontend should simply be a UI reading that data, removing the risk of a user closing their tab and missing logging.
- **Containerization**: Offer a `docker-compose.yml` that cleanly orchestrates the PostgreSQL + Next.js Server + FastAPI Python Engine + Redis so users can deploy the ecosystem perfectly everywhere.
