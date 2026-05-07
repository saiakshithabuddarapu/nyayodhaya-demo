export type CaseStatus =
  | 'processing'
  | 'extracted'
  | 'pending_verification'
  | 'verified'
  | 'rejected'
  | 'complied'

export type ContemptRisk = 'high' | 'medium' | 'low'
export type DeadlineUrgency = 'critical' | 'soon' | 'ok'
export type ComplyRecommendation = 'comply' | 'appeal' | 'unclear'

export interface Department {
  id: string
  name: string
  code: string
  secretary_name?: string
  contact_email?: string
}

export interface ConfidenceScores {
  case_number: number
  department: number
  deadline: number
  directive: number
  overall: number
}

export interface SourceParagraphs {
  case_number?: string
  case_number_page?: number
  department?: string
  department_page?: number
  directive?: string
  directive_page?: number
  deadline?: string
  deadline_page?: number
}

export interface ActionPlanItem {
  id: number
  action: string
  responsible: string
  deadline: string
  priority: 'high' | 'medium' | 'low'
}

export interface ActionPlan {
  checklist_items: ActionPlanItem[]
  context_insights: string
  compliance_summary: string
  comply_recommendation: ComplyRecommendation
  reasoning: string
  risk_if_missed: string
  nature_of_action?: Record<string, string>
  consideration_for_appeal?: string
  source_citations?: Record<string, { quote: string; page: number }>
}

export interface Case {
  id: string
  case_number: string
  court: string
  order_date: string
  judgment_pdf_url?: string
  respondent_department?: Department
  respondent_department_id?: string
  respondents?: string[]
  claimants?: string[]
  connected_matters?: string
  petitioners?: string[]
  appointment_year?: string
  key_directives: string[]
  absolute_deadline?: string
  relative_deadline_text?: string
  comply_recommendation?: ComplyRecommendation
  comply_reasoning?: string
  responsible_officer?: string
  contempt_risk?: ContemptRisk
  confidence_scores?: ConfidenceScores
  source_paragraphs?: SourceParagraphs
  status: CaseStatus
  action_plan?: ActionPlan
  pages_read?: number
  total_pages?: number
  is_fully_read?: boolean
  created_at: string
  updated_at?: string
}

export interface JobStatus {
  job_id: string
  status: 'queued' | 'running' | 'complete' | 'failed'
  progress: number
  current_step: string
  case_id?: string
  error?: string
}

export interface VerificationPayload {
  case_id: string
  action: 'approved' | 'edited' | 'rejected'
  edited_fields?: Partial<Case>
  rejection_reason?: string
  feedback_notes?: string
}

export interface VerificationRecord {
  id: string
  case_id: string
  verified_by: string
  action: 'approved' | 'edited' | 'rejected'
  edited_fields?: Partial<Case>
  rejection_reason?: string
  feedback_notes?: string
  verified_at: string
}

export interface AuditLog {
  id: string
  case_id: string
  user_id: string
  action: string
  details: Record<string, unknown>
  langfuse_trace_id?: string
  created_at: string
}

export interface DashboardMetrics {
  total_cases: number
  pending_verification: number
  verified_today: number
  critical_deadlines: number
  compliance_rate: number
}

export interface PaginatedCases {
  cases: Case[]
  total: number
  limit: number
  offset: number
}
