import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get('status')
    const department_id = searchParams.get('department_id')
    const limit = parseInt(searchParams.get('limit') || '50', 10)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const supabase = await createServiceClient()

    let query = supabase
      .from('cases')
      .select(
        `
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
    const shaped = (cases || []).map((c) => {
      const actionPlan = c.action_plans?.[0] || null
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { action_plans, ...rest } = c
      return {
        ...rest,
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
              comply_recommendation: rest.comply_recommendation || 'comply',
              reasoning: rest.comply_reasoning || '',
              risk_if_missed: '',
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
