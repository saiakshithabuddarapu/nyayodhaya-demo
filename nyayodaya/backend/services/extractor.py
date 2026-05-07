import json
import logging
import os
import google.generativeai as genai
from models.schemas import ExtractionResult, ConfidenceScores, SourceParagraphs, ConfidenceIndicators
from prompts.extraction import EXTRACTION_PROMPT

logger = logging.getLogger(__name__)

# Configure Gemini
genai.configure(api_key=os.environ.get("GOOGLE_API_KEY"))
model = genai.GenerativeModel(
    model_name="gemini-2.5-flash",
    generation_config={"response_mime_type": "application/json"}
)


def _get_langfuse():
    try:
        from langfuse import Langfuse
        return Langfuse(
            public_key=os.environ.get("LANGFUSE_PUBLIC_KEY"),
            secret_key=os.environ.get("LANGFUSE_SECRET_KEY"),
        )
    except Exception:
        return None


async def extract_from_judgment(
    text: str,
    job_id: str,
) -> ExtractionResult:
    """
    Call Gemini with EXTRACTION_PROMPT to extract structured data from judgment text.
    Uses Gemini's native JSON mode for high reliability.
    """
    langfuse = _get_langfuse()
    trace = None

    if langfuse:
        try:
            trace = langfuse.trace(
                id=job_id,
                name="judgment_extraction",
                metadata={"text_length": len(text)},
            )
        except Exception as e:
            logger.warning(f"Langfuse trace init failed: {e}")

    prompt = EXTRACTION_PROMPT.format(judgment_text=text)

    generation = None
    if trace:
        try:
            generation = trace.generation(
                name="extract_from_judgment",
                model="gemini-2.5-flash",
                input=prompt,
            )
        except Exception:
            pass

    logger.info(f"🤖 [EXTRACTOR] Starting Gemini 2.5 Flash extraction for {len(text)} chars...")
    
    try:
        response = model.generate_content(
            prompt,
            generation_config={"response_mime_type": "application/json"}
        )
        
        raw_content = response.text
        print(f"\n--- [AGENT: EXTRACTOR RAW RESPONSE] ---\n{raw_content}\n--------------------------------------\n")

        if generation:
            try:
                generation.end(output=raw_content)
            except Exception:
                pass

        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError as e:
            logger.error(f"JSON parse failed for Gemini response: {e}")
            raise ValueError(f"Gemini returned invalid JSON: {raw_content[:200]}")

        # CLEANUP: Gemini 2.5 sometimes returns lists for single-string fields
        for field in ["respondent_department", "responsible_officer", "court", "case_number", "order_date", "relative_deadline_text", "connected_matters"]:
            if field in data and isinstance(data[field], list):
                data[field] = ", ".join(str(x) for x in data[field])

        # Robust page number parsing
        if "source_paragraphs" in data and isinstance(data["source_paragraphs"], dict):
            sp = data["source_paragraphs"]
            for page_field in ["case_number_page", "department_page", "directive_page", "deadline_page"]:
                if page_field in sp and sp[page_field]:
                    val = sp[page_field]
                    if isinstance(val, str):
                        import re
                        match = re.search(r'\d+', val)
                        sp[page_field] = int(match.group()) if match else None

        # Build nested objects
        raw_confidence = data.pop("confidence_indicators", {}) or {}
        raw_source = data.pop("source_paragraphs", {}) or {}

        # Ensure claimants and respondents are lists
        if "claimants" not in data or not isinstance(data["claimants"], list):
            data["claimants"] = []
        if "respondents" not in data or not isinstance(data["respondents"], list):
            data["respondents"] = []

        extraction = ExtractionResult(
            **{k: v for k, v in data.items() if k not in ("confidence_indicators", "source_paragraphs")},
            source_paragraphs=SourceParagraphs(**raw_source) if raw_source else None,
            confidence_indicators=ConfidenceIndicators(**raw_confidence) if raw_confidence else None,
        )

        if langfuse:
            try:
                langfuse.flush()
            except Exception:
                pass

        return extraction

    except Exception as e:
        logger.error(f"Extraction failed for job {job_id}: {e}")
        raise ValueError(f"Extraction failed: {str(e)}")
