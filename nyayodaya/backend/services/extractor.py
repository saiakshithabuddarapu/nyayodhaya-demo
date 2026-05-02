import json
import logging
import os
from anthropic import Anthropic
from models.schemas import ExtractionResult, ConfidenceScores, SourceParagraphs, ConfidenceIndicators
from prompts.extraction import EXTRACTION_PROMPT

logger = logging.getLogger(__name__)

client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


def _get_langfuse():
    try:
        from langfuse import Langfuse
        return Langfuse(
            public_key=os.environ.get("LANGFUSE_PUBLIC_KEY"),
            secret_key=os.environ.get("LANGFUSE_SECRET_KEY"),
        )
    except Exception:
        return None


def _parse_extraction_response(content: str) -> dict:
    """Parse JSON from Claude response, stripping any markdown fences."""
    content = content.strip()

    if content.startswith("```"):
        lines = content.split("\n")
        # Remove opening fence (```json or ```)
        start = 1
        end = len(lines)
        for i in range(len(lines) - 1, 0, -1):
            if lines[i].strip().startswith("```"):
                end = i
                break
        content = "\n".join(lines[start:end])

    return json.loads(content)


async def extract_from_judgment(
    text: str,
    job_id: str,
) -> ExtractionResult:
    """
    Call Claude with EXTRACTION_PROMPT to extract structured data from judgment text.
    Retries once on JSON parse failure with explicit JSON instruction.
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
                model="claude-sonnet-4-5",
                input=prompt,
            )
        except Exception:
            pass

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=4096,
            messages=[{"role": "user", "content": prompt}],
        )

        raw_content = response.content[0].text

        if generation:
            try:
                generation.end(output=raw_content)
            except Exception:
                pass

        try:
            data = _parse_extraction_response(raw_content)
        except json.JSONDecodeError as e:
            logger.warning(f"First JSON parse failed: {e}. Retrying with explicit JSON instruction.")

            retry_response = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=4096,
                messages=[
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": raw_content},
                    {
                        "role": "user",
                        "content": (
                            "Your previous response was not valid JSON. "
                            "Return ONLY the raw JSON object with no preamble, "
                            "no explanation, and no markdown code blocks. "
                            "Start your response with { and end with }."
                        ),
                    },
                ],
            )

            retry_content = retry_response.content[0].text
            try:
                data = _parse_extraction_response(retry_content)
            except json.JSONDecodeError:
                raise ValueError(
                    "Claude returned invalid JSON on both attempts. "
                    f"Response snippet: {retry_content[:200]}"
                )

        # Build nested objects
        raw_confidence = data.pop("confidence_indicators", {}) or {}
        raw_source = data.pop("source_paragraphs", {}) or {}

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

    except ValueError:
        raise
    except Exception as e:
        logger.error(f"Extraction failed for job {job_id}: {e}")
        raise ValueError(f"Extraction failed: {str(e)}")
