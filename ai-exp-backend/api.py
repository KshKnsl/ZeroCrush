"""
FastAPI bridge for SmartWatch dashboard and pipeline control.
Run from project root: uvicorn api:app --reload --host 0.0.0.0 --port 8000
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routers.analytics import router as analytics_router
from routers.config import router as config_router
from routers.logs import router as logs_router
from routers.pipeline import router as pipeline_router
from routers.status import router as status_router
from services.runtime_settings import get_api_host, get_api_port

os.chdir(os.path.dirname(os.path.abspath(__file__)))

app = FastAPI(title="SmartWatch API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(status_router)
app.include_router(pipeline_router)
app.include_router(logs_router)
app.include_router(analytics_router)
app.include_router(config_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("api:app", host=get_api_host(), port=get_api_port(), reload=True)
