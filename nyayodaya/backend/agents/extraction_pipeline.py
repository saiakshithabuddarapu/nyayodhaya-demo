import asyncio
import logging
from typing import Dict

from services.pdf_parser import parse_pdf, extract_text_for_ai, annotate_pdf_with_citations
from services.extractor import extract_from_judgment
from services.confidence import compute_confidence_scores
from services.deadline_engine import compute_absolute_deadline
from services.action_plan import generate_action_plan
from services.storage import download_pdf, get_similar_cases, save_case_to_db, upload_annotated_pdf

logger = logging.getLogger(__name__)

# Thread-safe in-memory job store
job_store: Dict[str, dict] = {}
job_store_lock = asyncio.Lock()


async def update_job(job_id: str, **kwargs) -> None:
    async with job_store_lock:
        if job_id in job_store:
            job_store[job_id].update(kwargs)


async def run_full_pipeline(job_id: str, file_id: str, file_url: str = None) -> None:
    """
    Full AI pipeline executed as a BackgroundTask.
    Never raises — all exceptions are caught and stored in job_store.
    """
    try:
        # Step 1: Download PDF
        await update_job(job_id, progress=5, current_step="Downloading PDF from storage")
        pdf_bytes = await download_pdf(file_id)

        # Step 2: Parse PDF
        await update_job(job_id, progress=15, current_step="Parsing document structure")
        parsed = parse_pdf(pdf_bytes)
        text_info = extract_text_for_ai(parsed)
        text = text_info["text"]

        if not text.strip():
            raise ValueError(
                "PDF appears empty or fully scanned (no extractable text). "
                "OCR support not available in this version."
            )

        # Step 3: Extract with AI
        await update_job(job_id, progress=30, current_step="Extracting with AI")
        extraction = await extract_from_judgment(text, job_id)
        
        # Populate coverage info
        extraction.pages_read = text_info["pages_read"]
        extraction.total_pages = text_info["total_pages"]
        extraction.is_fully_read = text_info["is_fully_read"]

        # Step 4: Compute confidence scores
        await update_job(job_id, progress=55, current_step="Computing confidence scores")
        deadline_parsed = extraction.absolute_deadline is not None

        confidence_scores = compute_confidence_scores(
            extraction.model_dump(),
            text,
            deadline_parsed,
        )

        # Step 5: Compute absolute deadline if not already done by Claude
        await update_job(job_id, progress=65, current_step="Computing absolute deadline")
        absolute_deadline = extraction.absolute_deadline

        if not absolute_deadline and extraction.relative_deadline_text:
            absolute_deadline = compute_absolute_deadline(
                extraction.relative_deadline_text,
                extraction.order_date,
            )

        # Attach computed deadline back to extraction for action plan
        extraction_dict = extraction.model_dump()
        extraction_dict["absolute_deadline"] = absolute_deadline
        extraction.absolute_deadline = absolute_deadline

        # Step 6: Fetch similar cases
        await update_job(job_id, progress=75, current_step="Fetching similar cases")
        directive_keywords = []
        for directive in extraction.key_directives[:3]:
            directive_keywords.extend(directive.split()[:5])

        similar_cases = await get_similar_cases(
            extraction.respondent_department,
            directive_keywords,
        )

        # Step 7: Generate action plan
        await update_job(job_id, progress=85, current_step="Generating action plan")
        action_plan = await generate_action_plan(extraction, similar_cases, job_id)

        # Step 8: Annotate PDF with citations
        await update_job(job_id, progress=88, current_step="Generating annotated PDF")
        try:
            source_para_dict = extraction.source_paragraphs.model_dump() if extraction.source_paragraphs else {}
            annotated_pdf = annotate_pdf_with_citations(pdf_bytes, source_para_dict)
            annotated_url = await upload_annotated_pdf(file_id, annotated_pdf)
            if annotated_url:
                file_url = annotated_url # Use annotated version for the case record
        except Exception as e:
            logger.warning(f"PDF annotation failed: {e}")

        # Step 9: Save to database
        await update_job(job_id, progress=92, current_step="Saving to database")
        case_id = await save_case_to_db(
            extraction_dict,
            action_plan.model_dump(),
            confidence_scores,
            absolute_deadline,
            job_id,
            file_url,
        )

        # Complete
        await update_job(
            job_id,
            progress=100,
            current_step="Complete",
            status="complete",
            case_id=case_id,
        )

        logger.info(f"Pipeline complete for job {job_id} → case {case_id}")

    except Exception as e:
        logger.error(f"Pipeline failed for job {job_id}: {e}", exc_info=True)
        await update_job(
            job_id,
            status="failed",
            current_step="Failed",
            error=str(e),
        )
