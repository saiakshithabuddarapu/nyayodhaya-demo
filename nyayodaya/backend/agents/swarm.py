import logging
from typing import Annotated, Dict, List, Optional, TypedDict, Union
from typing_extensions import Literal

from langchain_core.messages import BaseMessage, HumanMessage
from langchain_openai import ChatOpenAI
from langgraph.graph import StateGraph, END
from langgraph.prebuilt import ToolNode

from services.pdf_parser import parse_pdf, extract_text_for_ai
from services.extractor import extract_from_judgment
from services.confidence import compute_confidence_scores
from services.deadline_engine import compute_absolute_deadline
from services.action_plan import generate_action_plan
from services.storage import download_pdf, get_similar_cases, save_case_to_db, upload_annotated_pdf

logger = logging.getLogger(__name__)

# --- State Definition ---

class AgentState(TypedDict):
    # Input data
    job_id: str
    file_id: str
    file_url: Optional[str]
    
    # Intermediate data
    pdf_bytes: Optional[bytes]
    raw_text: Optional[str]
    metadata: Dict
    
    # Processed data
    extraction: Optional[Dict]
    confidence_scores: Optional[Dict]
    absolute_deadline: Optional[str]
    similar_cases: List[Dict]
    action_plan: Optional[Dict]
    
    # Status tracking
    current_step: str
    progress: int
    status: str
    error: Optional[str]
    case_id: Optional[str]

# --- Agent Nodes ---

async def ingestion_node(state: AgentState) -> Dict:
    """Parses PDF and extracts text, handling unstructured content."""
    job_id = state["job_id"]
    file_id = state["file_id"]
    
    logger.info(f"[{job_id}] Ingestion Node: Starting")
    try:
        pdf_bytes = await download_pdf(file_id)
        parsed = parse_pdf(pdf_bytes)
        text_info = extract_text_for_ai(parsed)
        
        if not text_info["text"].strip():
            raise ValueError("PDF appears empty or fully scanned (no extractable text).")
            
        return {
            "pdf_bytes": pdf_bytes,
            "raw_text": text_info["text"],
            "metadata": {
                "pages_read": text_info["pages_read"],
                "total_pages": text_info["total_pages"],
                "is_fully_read": text_info["is_fully_read"]
            },
            "current_step": "Extraction",
            "progress": 20
        }
    except Exception as e:
        return {"status": "failed", "error": f"Ingestion failed: {str(e)}"}

async def extraction_node(state: AgentState) -> Dict:
    """Uses AI to extract legal entities and directives."""
    job_id = state["job_id"]
    text = state["raw_text"]
    metadata = state.get("metadata", {})
    retry_count = metadata.get("retry_count", 0)
    
    logger.info(f"[{job_id}] Extraction Node: Starting (Attempt {retry_count + 1})")
    try:
        extraction = await extract_from_judgment(text, job_id)
        # Convert Pydantic model to dict for state storage
        extraction_dict = extraction.model_dump()
        
        # Update metadata to track retries
        new_metadata = metadata.copy()
        if state.get("current_step") == "Validation": # If coming back from validation
            new_metadata["retry_count"] = retry_count + 1

        return {
            "extraction": extraction_dict,
            "metadata": new_metadata,
            "current_step": "Validation",
            "progress": 50
        }
    except Exception as e:
        return {"status": "failed", "error": f"Extraction failed: {str(e)}"}

async def validation_node(state: AgentState) -> Dict:
    """Validates extraction quality and computes confidence."""
    job_id = state["job_id"]
    extraction = state["extraction"]
    text = state["raw_text"]
    
    logger.info(f"[{job_id}] Validation Node: Starting")
    try:
        deadline_parsed = extraction.get("absolute_deadline") is not None
        confidence_scores = compute_confidence_scores(extraction, text, deadline_parsed)
        
        # Logic to decide if we need to re-extract could go here
        # For now, we just proceed
        return {
            "confidence_scores": confidence_scores,
            "current_step": "Research & Strategy",
            "progress": 70
        }
    except Exception as e:
        return {"status": "failed", "error": f"Validation failed: {str(e)}"}

async def research_node(state: AgentState) -> Dict:
    """Fetches similar cases based on directives."""
    job_id = state["job_id"]
    extraction = state["extraction"]
    
    logger.info(f"[{job_id}] Research Node: Starting")
    try:
        directives = extraction.get("key_directives", [])
        directive_keywords = []
        for directive in directives[:3]:
            directive_keywords.extend(directive.split()[:5])
            
        similar_cases = await get_similar_cases(
            extraction.get("respondent_department", ""),
            directive_keywords
        )
        return {"similar_cases": similar_cases}
    except Exception as e:
        logger.warning(f"Research failed: {e}")
        return {"similar_cases": []}

async def strategist_node(state: AgentState) -> Dict:
    """Generates action plan and deadlines."""
    job_id = state["job_id"]
    extraction = state["extraction"]
    similar_cases = state.get("similar_cases", [])
    
    logger.info(f"[{job_id}] Strategist Node: Starting")
    try:
        # Re-parse to Pydantic if needed by service
        from models.schemas import JudgmentExtraction
        ext_obj = JudgmentExtraction(**extraction)
        
        # Deadline calculation
        absolute_deadline = ext_obj.absolute_deadline
        if not absolute_deadline and ext_obj.relative_deadline_text:
            absolute_deadline = compute_absolute_deadline(
                ext_obj.relative_deadline_text,
                ext_obj.order_date
            )
        
        ext_obj.absolute_deadline = absolute_deadline
        action_plan = await generate_action_plan(ext_obj, similar_cases, job_id)
        
        return {
            "action_plan": action_plan.model_dump(),
            "absolute_deadline": absolute_deadline,
            "current_step": "Persistence",
            "progress": 90
        }
    except Exception as e:
        return {"status": "failed", "error": f"Strategy generation failed: {str(e)}"}

async def persistence_node(state: AgentState) -> Dict:
    """Saves everything to DB and completes the job."""
    job_id = state["job_id"]
    
    logger.info(f"[{job_id}] Persistence Node: Starting")
    try:
        case_id = await save_case_to_db(
            state["extraction"],
            state["action_plan"],
            state["confidence_scores"],
            state["absolute_deadline"],
            job_id,
            state["file_url"]
        )
        return {
            "case_id": case_id,
            "status": "complete",
            "current_step": "Complete",
            "progress": 100
        }
    except Exception as e:
        return {"status": "failed", "error": f"Persistence failed: {str(e)}"}

# --- Graph Construction ---

def create_swarm_graph():
    workflow = StateGraph(AgentState)
    
    # Add Nodes
    workflow.add_node("ingestion", ingestion_node)
    workflow.add_node("extraction", extraction_node)
    workflow.add_node("validation", validation_node)
    workflow.add_node("research", research_node)
    workflow.add_node("strategist", strategist_node)
    workflow.add_node("persistence", persistence_node)
    
    # Define Edges
    workflow.set_entry_point("ingestion")
    
    workflow.add_edge("ingestion", "extraction")
    workflow.add_edge("extraction", "validation")
    
    # Conditional edge to handle failures
    def route_after_node(state: AgentState):
        if state.get("status") == "failed":
            return END
        return "next"

    workflow.add_conditional_edges(
        "ingestion",
        route_after_node,
        {"next": "extraction", END: END}
    )
    
    workflow.add_conditional_edges(
        "extraction",
        route_after_node,
        {"next": "validation", END: END}
    )

    def route_validation(state: AgentState):
        if state.get("status") == "failed":
            return END
        
        # Swarm logic: If confidence is very low, try extraction again (max once)
        conf = state.get("confidence_scores", {})
        avg_conf = conf.get("overall_confidence", 1.0)
        
        # Check if we've already retried
        if avg_conf < 0.4 and state.get("metadata", {}).get("retry_count", 0) < 1:
            logger.warning(f"Low confidence ({avg_conf}), triggering re-extraction")
            return "re-extract"
        
        return "next"

    workflow.add_conditional_edges(
        "validation",
        route_validation,
        {
            "next": "research",
            "re-extract": "extraction",
            END: END
        }
    )
    
    workflow.add_edge("research", "strategist")
    
    workflow.add_conditional_edges(
        "strategist",
        route_after_node,
        {"next": "persistence", END: END}
    )
    
    workflow.add_edge("persistence", END)
    
    return workflow.compile()

# --- Execution Wrapper ---

async def run_swarm_pipeline(job_id: str, file_id: str, file_url: str = None):
    from agents.extraction_pipeline import update_job
    
    app = create_swarm_graph()
    
    initial_state = {
        "job_id": job_id,
        "file_id": file_id,
        "file_url": file_url,
        "pdf_bytes": None,
        "raw_text": None,
        "metadata": {},
        "extraction": None,
        "confidence_scores": None,
        "absolute_deadline": None,
        "similar_cases": [],
        "action_plan": None,
        "current_step": "Ingestion",
        "progress": 0,
        "status": "processing",
        "error": None,
        "case_id": None
    }
    
    async for output in app.astream(initial_state):
        # The output is a dict where keys are node names and values are their return dicts
        for node_name, state_update in output.items():
            # Update the central job store for UI feedback
            await update_job(job_id, **state_update)
            
            if state_update.get("status") == "failed":
                logger.error(f"Swarm failed at {node_name}: {state_update.get('error')}")
                return
