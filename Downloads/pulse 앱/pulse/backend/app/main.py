"""
Pulse Backend - FastAPI Application
Main entry point for the API server
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routers import health, auth, sites, connections, dev, home, pages, actions

app = FastAPI(
    title="Pulse API",
    description="Revenue Dashboard API for Ad-driven Sites",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

# CORS origins from environment (comma-separated)
default_frontend_urls = [
    "http://localhost:3000",
    "http://localhost",
    "http://127.0.0.1",
    "capacitor://localhost",
]
frontend_urls = os.getenv("FRONTEND_URL", ",".join(default_frontend_urls))
allow_origins = [url.strip() for url in frontend_urls.split(",") if url.strip()]

for origin in default_frontend_urls:
    if origin not in allow_origins:
        allow_origins.append(origin)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(health.router, prefix="/api/v1", tags=["Health"])
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(sites.router, tags=["Sites"])
app.include_router(connections.router, tags=["Connections"])
app.include_router(home.router, tags=["Home"])
app.include_router(pages.router, tags=["Pages"])
app.include_router(actions.router, tags=["Actions"])
app.include_router(dev.router, tags=["Dev"])


@app.get("/")
async def root():
    """Root endpoint - redirects to docs"""
    return {
        "message": "Pulse API",
        "version": "1.0.0",
        "docs": "/api/docs"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )
