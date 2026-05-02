import json
import logging
import os
from anthropic import Anthropic
from models.schemas import ExtractionResult, ActionPlan, ActionPlanItem
from prompts.action_plan import ACTION_PLAN_PROMPT

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


def _parse_action_plan_response(content: str) -> dict:
    """Parse JSON from Claude response, stripping any markdown fences."""
    content = content.strip()

    if content.startswith("```"):
        lines = content.split("\n")
        start = 1
        end = len(lines)
        for i in range(len(lines) - 1, 0, -1):
            if lines[i].strip().startswith("```"):
                end = i
                break
        content = "\n".join(lines[start:end])

    return json.loads(content)


async def generate_action_plan(
    extraction: ExtractionResult,
    similar_cases: list,
    job_id: str,
) -> ActionPlan:
    """
    Second Claude call to generate a compliance action plan.
    Uses extraction result and similar past cases as context.
    """
    langfuse = _get_langfuse()
    trace = None

    if langfuse:
        try:
            trace = langfuse.trace(
                id=f"{job_id}_action_plan",
                name="action_plan_generation",
            )
        except Exception as e:
            logger.warning(f"Langfuse trace init failed: {e}")

    extraction_json = extraction.model_dump_json(indent=2)
    similar_cases_json = json.dumps(similar_cases[:3], indent=2) if similar_cases else "[]"

    prompt = ACTION_PLAN_PROMPT.format(
        extraction_json=extraction_json,
        similar_cases=similar_cases_json,
    )

    generation = None
    if trace:
        try:
            generation = trace.generation(
                name="generate_action_plan",
                model="claude-sonnet-4-5",
                input=prompt,
            )
        except Exception:
            pass

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=3072,
            messages=[{"role": "user", "content": prompt}],
        )

        raw_content = response.content[0].text

        if generation:
            try:
                generation.end(output=raw_content)
            except Exception:
                pass

        try:
            data = _parse_action_plan_response(raw_content)
        except json.JSONDecodeError as e:
            logger.warning(f"Action plan JSON parse failed: {e}. Retrying.")

            retry_response = client.messages.create(
                model="claude-sonnet-4-5",
                max_tokens=3072,
                messages=[
                    {"role": "user", "content": prompt},
                    {"role": "assistant", "content": raw_content},
                    {
                        "role": "user",
                        "content": (
                            "Your previous response was not valid JSON. "
                            "Return ONLY the raw JSON object with no preamble, "
                            "no markdown. Start with { and end with }."
                        ),
                    },
                ],
            )

            data = _parse_action_plan_response(retry_response.content[0].text)

        # Validate and coerce checklist items
        checklist_raw = data.get("checklist_items", [])
        checklist_items = []
        for i, item in enumerate(checklist_raw):
            priority = str(item.get("priority", "medium")).lower()
            if priority not in ("high", "medium", "low"):
                priority = "medium"
            checklist_items.append(
                ActionPlanItem(
                    id=item.get("id", i + 1),
                    action=item.get("action", ""),
                    responsible=item.get("responsible", "Department Officer"),
                    deadline=item.get("deadline", "As per court order"),
                    priority=priority,
                )
            )

        action_plan = ActionPlan(
            checklist_items=checklist_items,
            context_insights=data.get("context_insights", ""),
            comply_recommendation=data.get("comply_recommendation", "comply"),
            reasoning=data.get("reasoning", ""),
            risk_if_missed=data.get("risk_if_missed", ""),
        )

        if langfuse:
            try:
                langfuse.flush()
            except Exception:
                pass

        return action_plan

    except Exception as e:
        logger.error(f"Action plan generation failed for job {job_id}: {e}")
        # Return a minimal fallback plan rather than failing the whole pipeline
        return ActionPlan(
            checklist_items=[
                ActionPlanItem(
                    id=1,
                    action="Review court order and identify required actions",
                    responsible="Department Secretary",
                    deadline=extraction.absolute_deadline or "As per court order",
                    priority="high",
                )
            ],
            context_insights="Action plan generation encountered an error. Manual review required.",
            comply_recommendation=extraction.comply_recommendation or "comply",
            reasoning="Please review the extracted court order details and determine compliance strategy.",
            risk_if_missed="Non-compliance may result in contempt of court proceedings.",
        )
