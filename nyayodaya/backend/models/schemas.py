from enum import Enum
from pydantic import BaseModel, Field
from typing import Optional
from datetime import date


class ProcessingStatus(str, Enum):
    PROCESSING = "processing"
    EXTRACTED = "extracted"
    PENDING_VERIFICATION = "pending_verification"
    VERIFIED = "verified"
    REJECTED = "rejected"
    FAILED = "failed"
    COMPLIED = "complied"


class ContemptRisk(str, Enum):
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class ComplyRecommendation(str, Enum):
    COMPLY = "comply"
    APPEAL = "appeal"
    UNCLEAR = "unclear"


class JobStatus(BaseModel):
    job_id: str
    status: str
    progress: int = Field(ge=0, le=100)
    current_step: str
    case_id: Optional[str] = None
    error: Optional[str] = None


class ConfidenceScores(BaseModel):
    case_number: float = Field(ge=0, le=100)
    department: float = Field(ge=0, le=100)
    deadline: float = Field(ge=0, le=100)
    directive: float = Field(ge=0, le=100)
    overall: float = Field(ge=0, le=100)


class SourceParagraphs(BaseModel):
    case_number: Optional[str] = None
    department: Optional[str] = None
    directive: Optional[str] = None
    deadline: Optional[str] = None


class ConfidenceIndicators(BaseModel):
    case_number_explicit: bool = False
    department_named_explicitly: bool = False
    deadline_stated_explicitly: bool = False
    contempt_explicitly_mentioned: bool = False


class ExtractionResult(BaseModel):
    case_number: str
    court: str
    order_date: str
    respondent_department: str
    key_directives: list[str]
    relative_deadline_text: str
    absolute_deadline: Optional[str] = None
    comply_recommendation: str
    comply_reasoning: str
    responsible_officer: Optional[str] = None
    contempt_risk: str
    confidence_scores: Optional[ConfidenceScores] = None
    source_paragraphs: Optional[SourceParagraphs] = None
    confidence_indicators: Optional[ConfidenceIndicators] = None


class ActionPlanItem(BaseModel):
    id: int
    action: str
    responsible: str
    deadline: str
    priority: str = Field(pattern="^(high|medium|low)$")


class ActionPlan(BaseModel):
    checklist_items: list[ActionPlanItem]
    context_insights: str
    comply_recommendation: str
    reasoning: str
    risk_if_missed: str


class ProcessJudgmentRequest(BaseModel):
    file_id: str


class ProcessJudgmentResponse(BaseModel):
    job_id: str
    status: str


class DepartmentInfo(BaseModel):
    id: str
    name: str
    code: str


class CaseRecord(BaseModel):
    id: str
    case_number: str
    court: str
    order_date: Optional[str] = None
    judgment_pdf_url: Optional[str] = None
    respondent_department_id: Optional[str] = None
    key_directives: list[str] = []
    absolute_deadline: Optional[str] = None
    relative_deadline_text: Optional[str] = None
    comply_recommendation: Optional[str] = None
    comply_reasoning: Optional[str] = None
    responsible_officer: Optional[str] = None
    contempt_risk: Optional[str] = None
    confidence_case_number: Optional[float] = None
    confidence_department: Optional[float] = None
    confidence_deadline: Optional[float] = None
    confidence_directive: Optional[float] = None
    confidence_overall: Optional[float] = None
    status: str
    processing_job_id: Optional[str] = None
    extraction_raw: Optional[dict] = None
    created_at: str
    updated_at: str
