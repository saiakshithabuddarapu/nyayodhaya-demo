import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from dotenv import load_dotenv

load_dotenv()

from routers import health, pipeline, status

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup checks for required service connections."""
    logger.info("Starting Nyayodaya backend...")

    # Check Supabase
    try:
        from db.supabase_client import get_supabase_client
        client = get_supabase_client()
        client.table("departments").select("id").limit(1).execute()
        logger.info("✓ Supabase connection verified")
    except Exception as e:
        logger.error(f"✗ Supabase connection failed: {e}")

    # Check Gemini
    if os.environ.get("GOOGLE_API_KEY"):
        logger.info("✓ Google API key present")
    else:
        logger.warning("✗ GOOGLE_API_KEY not set — extraction will fail")

    # Check Langfuse (optional)
    if os.environ.get("LANGFUSE_PUBLIC_KEY"):
        logger.info("✓ Langfuse configured for AI observability")
    else:
        logger.info("  Langfuse not configured — AI observability disabled")

    yield

    logger.info("Nyayodaya backend shutting down.")


app = FastAPI(
    title="Nyayodaya API",
    description="AI-powered legal intelligence for Karnataka High Court judgments",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
allowed_origins_env = os.environ.get("ALLOWED_ORIGINS", "http://localhost:3000")
allowed_origins = [origin.strip() for origin in allowed_origins_env.split(",")]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(health.router)
app.include_router(pipeline.router, prefix="/api")
app.include_router(status.router, prefix="/api")


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception on {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "detail": str(exc),
            "path": str(request.url),
        },
    )


@app.get("/")
async def root():
    return {
        "service": "Nyayodaya Backend",
        "description": "AI-powered legal intelligence for Karnataka High Court judgments",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "health": "/health",
            "process": "/api/process-judgment",
            "status": "/api/status/{job_id}",
            "docs": "/docs",
        },
    }
