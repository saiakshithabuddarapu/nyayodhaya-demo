import logging
import os
from typing import Optional

logger = logging.getLogger(__name__)


async def upload_annotated_pdf(file_id: str, pdf_bytes: bytes) -> str:
    """
    Upload annotated PDF bytes to Supabase Storage.
    Returns the public URL of the uploaded file.
    """
    from db.supabase_client import get_supabase_client

    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "judgments")
    client = get_supabase_client()

    # Append _annotated to the filename before the extension
    base, ext = os.path.splitext(file_id)
    annotated_file_id = f"{base}_annotated{ext}"

    try:
        # Upload the file (upsert=True to overwrite if exists)
        client.storage.from_(bucket).upload(
            path=annotated_file_id,
            file=pdf_bytes,
            file_options={"content-type": "application/pdf", "upsert": "true"}
        )
        
        # Get public URL
        url_response = client.storage.from_(bucket).get_public_url(annotated_file_id)
        logger.info(f"Uploaded annotated PDF to: {annotated_file_id}")
        return url_response
    except Exception as e:
        logger.error(f"Failed to upload annotated PDF {annotated_file_id}: {e}")
        # Fallback to returning None or raising, but we don't want to crash the pipeline
        return None


async def download_pdf(file_id: str) -> bytes:
    """
    Download PDF bytes from Supabase Storage.
    file_id is the storage path e.g. "judgments/uuid/filename.pdf"
    """
    from db.supabase_client import get_supabase_client

    bucket = os.environ.get("SUPABASE_STORAGE_BUCKET", "judgments")
    client = get_supabase_client()

    try:
        response = client.storage.from_(bucket).download(file_id)
        logger.info(f"Downloaded {len(response)} bytes for file_id: {file_id}")
        return response
    except Exception as e:
        logger.error(f"Failed to download PDF {file_id}: {e}")
        raise ValueError(f"Could not download PDF from storage: {str(e)}")


async def get_similar_cases(
    department: str,
    directive_keywords: list[str],
) -> list:
    """
    Fetch last 3 verified cases from the same department.
    Simple department-match similarity — pgvector RAG is the upgrade path.
    """
    from db.supabase_client import get_supabase_client

    client = get_supabase_client()

    try:
        # Find department ID by name or partial match
        print(f"🔍 [DB: SIMILARITY] Searching for similar cases in department: {department}")
        dept_response = (
            client.table("departments")
            .select("id, name, code")
            .ilike("name", f"%{department}%")
            .limit(1)
            .execute()
        )

        if not dept_response.data:
            # Try matching by code
            dept_code = department.upper().replace(" ", "")[:10]
            dept_response = (
                client.table("departments")
                .select("id, name, code")
                .ilike("code", f"%{dept_code}%")
                .limit(1)
                .execute()
            )

        if not dept_response.data:
            logger.info(f"No matching department found for: {department}")
            return []

        dept_id = dept_response.data[0]["id"]

        cases_response = (
            client.table("cases")
            .select(
                "id, case_number, order_date, key_directives, "
                "absolute_deadline, comply_recommendation, status"
            )
            .eq("respondent_department_id", dept_id)
            .eq("status", "verified")
            .order("created_at", desc=True)
            .limit(3)
            .execute()
        )

        return cases_response.data or []

    except Exception as e:
        logger.warning(f"Could not fetch similar cases: {e}")
        return []


async def save_case_to_db(
    extraction: dict,
    action_plan: dict,
    confidence_scores: dict,
    absolute_deadline: Optional[str],
    job_id: str,
    file_url: Optional[str] = None,
) -> str:
    """
    Insert a new case and its action plan into Supabase.
    Returns the new case ID.
    """
    from db.supabase_client import get_supabase_client
    from datetime import datetime, timezone

    client = get_supabase_client()

    # Resolve department ID
    dept_id = await _resolve_department_id(
        client, extraction.get("respondent_department", "")
    )

    now = datetime.now(timezone.utc).isoformat()

    # Check for existing case and its status
    print(f"🔍 [DB: CHECK] Looking for existing case: {extraction.get('case_number')}")
    existing_case = (
        client.table("cases")
        .select("id, status")
        .eq("case_number", extraction.get("case_number", "UNKNOWN"))
        .execute()
    )

    if existing_case.data:
        current_status = existing_case.data[0]["status"]
        print(f"⚠️ [DB: CONFLICT] Found existing case with status: {current_status}")
        if current_status not in ["pending_verification", "processing", "rejected", "failed"]:
            raise ValueError(
                f"Case {extraction.get('case_number')} is already {current_status}. "
                "Re-uploading verified cases is not allowed to preserve audit integrity."
            )
        print(f"✅ [DB: RESOLVE] Overwriting pending case...")
    else:
        print(f"✨ [DB: NEW] No existing case found. Creating new record.")

    case_data = {
        "case_number": extraction.get("case_number", "UNKNOWN"),
        "court": extraction.get("court", "Karnataka High Court"),
        "order_date": extraction.get("order_date") or None,
        "judgment_pdf_url": file_url,
        "respondent_department_id": dept_id,
        "claimants": extraction.get("claimants", []),
        "respondents": extraction.get("respondents", []),
        "key_directives": extraction.get("key_directives", []),
        "absolute_deadline": absolute_deadline,
        "relative_deadline_text": extraction.get("relative_deadline_text", ""),
        "comply_recommendation": extraction.get("comply_recommendation", "unclear"),
        "comply_reasoning": extraction.get("comply_reasoning", ""),
        "responsible_officer": extraction.get("responsible_officer"),
        "contempt_risk": extraction.get("contempt_risk", "low"),
        "confidence_case_number": confidence_scores.get("case_number"),
        "confidence_department": confidence_scores.get("department"),
        "confidence_deadline": confidence_scores.get("deadline"),
        "confidence_directive": confidence_scores.get("directive"),
        "confidence_overall": confidence_scores.get("overall"),
        "status": "pending_verification",
        "processing_job_id": job_id,
        "processing_completed_at": now,
        "extraction_raw": extraction,
    }

    case_response = (
        client.table("cases")
        .upsert(case_data, on_conflict="case_number")
        .execute()
    )

    if not case_response.data:
        raise ValueError("Failed to insert case into database")

    case_id = case_response.data[0]["id"]

    # Insert action plan
    action_plan_data = {
        "case_id": case_id,
        "checklist_items": action_plan.get("checklist_items", []),
        "context_insights": action_plan.get("context_insights", ""),
        "compliance_summary": action_plan.get("compliance_summary", ""),
        "risk_if_missed": action_plan.get("risk_if_missed", ""),
        "nature_of_action": action_plan.get("nature_of_action", {}),
        "consideration_for_appeal": action_plan.get("consideration_for_appeal", ""),
        "source_citations": action_plan.get("source_citations", {}),
        "similar_cases": [],
    }

    client.table("action_plans").upsert(action_plan_data, on_conflict="case_id").execute()

    logger.info(f"Saved case {case_id} with job_id {job_id}")
    return case_id


async def _resolve_department_id(client, department_name: str) -> Optional[str]:
    """Try to match department name to a known department."""
    if not department_name:
        return None

    try:
        response = (
            client.table("departments")
            .select("id")
            .ilike("name", f"%{department_name}%")
            .limit(1)
            .execute()
        )
        if response.data:
            return response.data[0]["id"]
    except Exception as e:
        logger.warning(f"Department resolution failed: {e}")

    return None
