import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const department_id = searchParams.get('department_id')
    const summary = searchParams.get('summary') === 'true'
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const supabase = await createServiceClient()

    // 1. Build Query (Selective fetch for speed)
    let query = supabase
      .from('cases')
      .select(
        summary ? `
          id, case_number, court, order_date, status, claimants, respondents, key_directives, absolute_deadline, comply_recommendation, contempt_risk, created_at,
          respondent_department:departments(id, name, code)
        ` : `
          *,
          respondent_department:departments(id, name, code),
          action_plans(*)
        `,
        { count: 'exact' }
      )
      .order('absolute_deadline', { ascending: true, nullsFirst: false })
      .range(offset, offset + limit - 1)

    if (status) {
      query = query.eq('status', status)
    }

    if (department_id) {
      query = query.eq('respondent_department_id', department_id)
    }

    const { data: cases, error, count } = await query

    if (error) {
      console.error('Cases fetch error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Reshape confidence scores and action_plan
    const shaped = (cases || []).map((c: any) => {
      // If summary mode, return early with minimal processing
      if (summary) {
        return {
          ...c,
          claimants: c.claimants || [],
          respondents: c.respondents || [],
          action_plan: null,
          confidence_scores: null,
          source_paragraphs: null,
        }
      }

      const actionPlan = c.action_plans?.[0] || null
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { action_plans, ...rest } = c
      return {
        ...rest,
        // Pull missing fields from extraction_raw
        // Map new party lists with fallbacks
        claimants: c.claimants && c.claimants.length > 0 ? c.claimants : (c.extraction_raw?.claimants ?? []),
        respondents: c.respondents && c.respondents.length > 0 ? c.respondents : (c.extraction_raw?.respondents ?? []),
        
        petitioners: c.petitioners && c.petitioners.length > 0 ? c.petitioners : (c.extraction_raw?.petitioners ?? []),
        appointment_year: c.appointment_year || c.extraction_raw?.appointment_year || null,
        connected_matters: c.connected_matters || c.extraction_raw?.connected_matters || null,
        
        // Fallback for respondent department if linking failed
        respondent_department: c.respondent_department || (c.extraction_raw?.respondent_department ? { name: c.extraction_raw.respondent_department } : null),
        
        pages_read: c.extraction_raw?.pages_read ?? 0,
        total_pages: c.extraction_raw?.total_pages ?? 0,
        is_fully_read: c.extraction_raw?.is_fully_read ?? true,
        source_paragraphs: c.extraction_raw?.source_paragraphs ?? null,
        confidence_scores: c.confidence_case_number != null
          ? {
              case_number: c.confidence_case_number,
              department: c.confidence_department,
              deadline: c.confidence_deadline,
              directive: c.confidence_directive,
              overall: c.confidence_overall,
            }
          : null,
        action_plan: actionPlan
          ? {
              checklist_items: actionPlan.checklist_items || [],
              context_insights: actionPlan.context_insights || '',
              compliance_summary: actionPlan.compliance_summary || '',
              comply_recommendation: rest.comply_recommendation || 'comply',
              reasoning: rest.comply_reasoning || '',
              risk_if_missed: actionPlan.risk_if_missed || '',
              nature_of_action: actionPlan.nature_of_action || {},
              consideration_for_appeal: actionPlan.consideration_for_appeal || '',
              source_citations: actionPlan.source_citations || {},
            }
          : null,
      }
    })

    return NextResponse.json({
      cases: shaped,
      total: count ?? 0,
      limit,
      offset,
    })
  } catch (err) {
    console.error('Cases route error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch cases' },
      { status: 500 }
    )
  }
}
