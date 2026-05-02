import logging
from uuid import uuid4
from fastapi import APIRouter, BackgroundTasks, HTTPException
from agents.extraction_pipeline import job_store, job_store_lock, run_full_pipeline
from models.schemas import ProcessJudgmentResponse

logger = logging.getLogger(__name__)

router = APIRouter(tags=["pipeline"])


@router.post("/process-judgment", response_model=ProcessJudgmentResponse)
async def process_judgment(
    file_id: str,
    background_tasks: BackgroundTasks,
    file_url: str = None,
):
    """
    Trigger the AI extraction pipeline for a judgment PDF.
    Returns a job_id for polling via /status/{job_id}.
    """
    if not file_id:
        raise HTTPException(status_code=400, detail="file_id is required")

    job_id = str(uuid4())

    async with job_store_lock:
        job_store[job_id] = {
            "job_id": job_id,
            "status": "queued",
            "progress": 0,
            "current_step": "Queued",
            "case_id": None,
            "error": None,
        }

    background_tasks.add_task(run_full_pipeline, job_id, file_id, file_url)

    logger.info(f"Queued job {job_id} for file_id: {file_id}")
    return ProcessJudgmentResponse(job_id=job_id, status="queued")
