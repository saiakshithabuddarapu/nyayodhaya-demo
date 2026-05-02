import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { VerificationPayload } from '@/types'

export async function POST(req: NextRequest) {
  try {
    const body: VerificationPayload = await req.json()
    const { case_id, action, edited_fields, rejection_reason, feedback_notes } = body

    if (!case_id || !action) {
      return NextResponse.json(
        { error: 'case_id and action are required' },
        { status: 400 }
      )
    }

    if (!['approved', 'edited', 'rejected'].includes(action)) {
      return NextResponse.json(
        { error: 'action must be approved, edited, or rejected' },
        { status: 400 }
      )
    }

    const userClient = await createClient()
    const { data: { user } } = await userClient.auth.getUser()

    const supabase = await createServiceClient()

    // Determine new case status
    const newStatus = action === 'rejected' ? 'rejected' : 'verified'

    // Build case update payload
    const caseUpdate: Record<string, unknown> = { status: newStatus }

    if (action === 'edited' && edited_fields) {
      const allowedEdits = [
        'key_directives', 'absolute_deadline', 'relative_deadline_text',
        'comply_recommendation', 'comply_reasoning', 'responsible_officer',
        'contempt_risk',
      ]
      for (const field of allowedEdits) {
        if (field in edited_fields) {
          caseUpdate[field] = (edited_fields as Record<string, unknown>)[field]
        }
      }
    }

    const { data: updatedCase, error: updateError } = await supabase
      .from('cases')
      .update(caseUpdate)
      .eq('id', case_id)
      .select('*')
      .single()

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Insert verification record
    await supabase.from('verifications').insert({
      case_id,
      verified_by: user?.id ?? null,
      action,
      edited_fields: edited_fields ?? {},
      rejection_reason: rejection_reason ?? null,
      feedback_notes: feedback_notes ?? null,
    })

    // Insert audit log
    await supabase.from('audit_logs').insert({
      case_id,
      user_id: user?.id ?? null,
      action: `verification_${action}`,
      details: {
        previous_status: 'pending_verification',
        new_status: newStatus,
        action,
        rejection_reason: rejection_reason ?? null,
        edited_fields_count: edited_fields ? Object.keys(edited_fields).length : 0,
      },
    })

    return NextResponse.json({ case: updatedCase, action, new_status: newStatus })
  } catch (err) {
    console.error('Verify route error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Verification failed' },
      { status: 500 }
    )
  }
}
