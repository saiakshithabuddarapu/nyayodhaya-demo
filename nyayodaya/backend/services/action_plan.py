import json
import logging
import os
import google.generativeai as genai
from models.schemas import ExtractionResult, ActionPlan, ActionPlanItem
from prompts.action_plan import ACTION_PLAN_PROMPT

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


async def generate_action_plan(
    extraction: ExtractionResult,
    similar_cases: list,
    job_id: str,
) -> ActionPlan:
    """
    Second Gemini call to generate a compliance action plan.
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

    logger.info(f"🤖 [PLANNER] Generating compliance steps for Case: {extraction.case_number}")
    
    prompt = ACTION_PLAN_PROMPT.format(
        extraction_json=extraction_json,
        similar_cases=similar_cases_json,
    )

    generation = None
    if trace:
        try:
            generation = trace.generation(
                name="generate_action_plan",
                model="gemini-2.5-flash",
                input=prompt,
            )
        except Exception:
            pass

    try:
        # Gemini call
        response = model.generate_content(prompt)
        
        raw_content = response.text

        if generation:
            try:
                generation.end(output=raw_content)
            except Exception:
                pass

        try:
            data = json.loads(raw_content)
        except json.JSONDecodeError as e:
            logger.error(f"Action plan JSON parse failed: {e}. Output: {raw_content[:200]}")
            raise ValueError("Gemini returned invalid JSON for action plan")

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
            compliance_summary=data.get("compliance_summary", ""),
            comply_recommendation=data.get("comply_recommendation", "comply"),
            reasoning=data.get("reasoning", ""),
            risk_if_missed=data.get("risk_if_missed", ""),
            nature_of_action=data.get("nature_of_action"),
            consideration_for_appeal=data.get("consideration_for_appeal"),
            source_citations=data.get("source_citations"),
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
