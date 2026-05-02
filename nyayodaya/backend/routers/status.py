import logging
from fastapi import APIRouter, HTTPException
from agents.extraction_pipeline import job_store
from models.schemas import JobStatus

logger = logging.getLogger(__name__)

router = APIRouter(tags=["status"])


@router.get("/status/{job_id}", response_model=JobStatus)
async def get_job_status(job_id: str):
    """Get the current status of a processing job."""
    if job_id not in job_store:
        raise HTTPException(status_code=404, detail=f"Job '{job_id}' not found")

    job = job_store[job_id]
    return JobStatus(
        job_id=job["job_id"],
        status=job["status"],
        progress=job["progress"],
        current_step=job["current_step"],
        case_id=job.get("case_id"),
        error=job.get("error"),
    )


@router.get("/status")
async def list_jobs():
    """List all jobs (for debugging — disable in production)."""
    return {
        "total": len(job_store),
        "jobs": [
            {
                "job_id": j["job_id"],
                "status": j["status"],
                "progress": j["progress"],
                "current_step": j["current_step"],
            }
            for j in job_store.values()
        ],
    }
