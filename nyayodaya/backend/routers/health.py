import os
import logging
from fastapi import APIRouter

logger = logging.getLogger(__name__)

router = APIRouter(tags=["health"])


@router.get("/health")
async def health_check():
    """Health check endpoint for Railway deployment."""
    checks = {
        "status": "healthy",
        "service": "nyayodaya-backend",
        "version": "1.0.0",
    }

    # Check Supabase connectivity
    try:
        from db.supabase_client import get_supabase_client
        client = get_supabase_client()
        client.table("departments").select("id").limit(1).execute()
        checks["supabase"] = "connected"
    except Exception as e:
        checks["supabase"] = f"error: {str(e)[:100]}"
        checks["status"] = "degraded"

    # Check Anthropic key present
    if os.environ.get("ANTHROPIC_API_KEY"):
        checks["anthropic"] = "configured"
    else:
        checks["anthropic"] = "missing_key"
        checks["status"] = "degraded"

    return checks
