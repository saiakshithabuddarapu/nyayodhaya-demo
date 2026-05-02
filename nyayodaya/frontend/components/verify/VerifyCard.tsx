'use client'

import { useState } from 'react'
import { Case, VerificationPayload } from '@/types'
import { ConfidenceBar } from './ConfidenceBar'
import { AuditTrail } from './AuditTrail'
import { StatusBadge, RiskBadge } from '@/components/shared'
import { Button, Input, Textarea, Progress } from '@/components/ui'
import { formatDate, formatDeadlineLabel, getDaysUntilDeadline } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface VerifyCardProps {
  caseData: Case
  onVerified: () => void
}

type Mode = 'view' | 'edit' | 'reject' | 'confirmed'

export function VerifyCard({ caseData, onVerified }: VerifyCardProps) {
  const [mode, setMode] = useState<Mode>('view')
  const [loading, setLoading] = useState(false)
  const [rejectionReason, setRejectionReason] = useState('')
  const [feedbackNotes, setFeedbackNotes] = useState('')
  const [confirmedAction, setConfirmedAction] = useState<string>('')
  const [editedFields, setEditedFields] = useState<Partial<Case>>({})

  const days = getDaysUntilDeadline(caseData.absolute_deadline)

  const submit = async (payload: VerificationPayload) => {
    setLoading(true)
    try {
      const res = await fetch('/api/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Verification failed')
      }
      const data = await res.json()
      setConfirmedAction(data.action)
      setMode('confirmed')
      setTimeout(onVerified, 1800)
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Verification failed')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = () => {
    submit({ case_id: caseData.id, action: 'approved', feedback_notes: feedbackNotes })
  }

  const handleEdit = () => {
    if (Object.keys(editedFields).length === 0) {
      alert('No changes made. Edit at least one field or Approve as-is.')
      return
    }
    submit({
      case_id: caseData.id,
      action: 'edited',
      edited_fields: editedFields,
      feedback_notes: feedbackNotes,
    })
  }

  const handleReject = () => {
    if (!rejectionReason.trim()) {
      alert('Please provide a rejection reason.')
      return
    }
    submit({
      case_id: caseData.id,
      action: 'rejected',
      rejection_reason: rejectionReason,
      feedback_notes: feedbackNotes,
    })
  }

  if (mode === 'confirmed') {
    const bg = confirmedAction === 'approved' || confirmedAction === 'edited' ? 'bg-green-50 border-green-200' : 'bg-slate-50 border-slate-200'
    return (
      <div className={cn('border rounded-lg p-6 text-center', bg)}>
        <div className="text-2xl mb-2">{confirmedAction === 'rejected' ? '✗' : '✓'}</div>
        <p className="font-semibold text-slate-900">
          {confirmedAction === 'approved' ? 'Approved and verified' : confirmedAction === 'edited' ? 'Edits saved and verified' : 'Rejected and logged'}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          This action has been recorded in the audit trail. Case {caseData.case_number} is now {confirmedAction === 'rejected' ? 'rejected' : 'verified'}.
        </p>
      </div>
    )
  }

  const overall = caseData.confidence_scores?.overall ?? 0

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-sm">
      {/* Header */}
      <div className={cn(
        'px-5 py-4 border-b border-slate-200',
        caseData.contempt_risk === 'high' ? 'bg-red-50' : 'bg-white'
      )}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-lg font-bold text-slate-900">{caseData.case_number}</h3>
              <StatusBadge status={caseData.status} />
              <RiskBadge risk={caseData.contempt_risk} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{caseData.court} &mdash; Order: {formatDate(caseData.order_date)}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xs text-slate-400">Overall confidence</div>
            <div className={cn(
              'text-xl font-bold',
              overall >= 80 ? 'text-green-700' : overall >= 60 ? 'text-amber-700' : 'text-red-600'
            )}>
              {Math.round(overall)}%
            </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
        {/* LEFT: AI extraction + confidence */}
        <div className="p-5 space-y-5">
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
              AI Extraction — verify each field
            </h4>

            {/* Deadline */}
            <div className={cn(
              'rounded-lg p-3 mb-3 border',
              days !== null && days <= 3 ? 'bg-red-50 border-red-200' : days !== null && days <= 14 ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'
            )}>
              <div className="text-xs text-slate-500 uppercase tracking-wide mb-0.5">Deadline</div>
              {mode === 'edit' ? (
                <Input
                  type="date"
                  defaultValue={caseData.absolute_deadline ?? ''}
                  onChange={(e) => setEditedFields((f) => ({ ...f, absolute_deadline: e.target.value }))}
                />
              ) : (
                <>
                  <div className="font-semibold text-slate-900">{formatDate(caseData.absolute_deadline)}</div>
                  <div className={cn(
                    'text-xs mt-0.5',
                    days !== null && days <= 3 ? 'text-red-700' : days !== null && days <= 14 ? 'text-amber-700' : 'text-green-700'
                  )}>
                    {formatDeadlineLabel(caseData.absolute_deadline)}
                  </div>
                </>
              )}
              {caseData.relative_deadline_text && (
                <blockquote className="mt-1.5 text-xs italic text-slate-500 border-l-2 border-slate-300 pl-2">
                  &ldquo;{caseData.relative_deadline_text}&rdquo;
                </blockquote>
              )}
            </div>

            {/* Department */}
            <div className="mb-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Respondent Department</div>
              {mode === 'edit' ? (
                <Input
                  type="text"
                  defaultValue={caseData.respondent_department?.name ?? ''}
                  onChange={(e) => setEditedFields((f) => ({ ...f, responsible_officer: e.target.value }))}
                />
              ) : (
                <div className="font-medium text-slate-900">{caseData.respondent_department?.name ?? '—'}</div>
              )}
            </div>

            {/* Officer */}
            <div className="mb-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Responsible Officer</div>
              {mode === 'edit' ? (
                <Input
                  type="text"
                  defaultValue={caseData.responsible_officer ?? ''}
                  onChange={(e) => setEditedFields((f) => ({ ...f, responsible_officer: e.target.value }))}
                />
              ) : (
                <div className="text-sm text-slate-700">{caseData.responsible_officer ?? '—'}</div>
              )}
            </div>

            {/* Directives */}
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Court Directives</div>
              {caseData.key_directives?.map((d, i) => (
                <div key={i} className="flex gap-2 text-sm text-slate-800 mb-1.5">
                  <span className="text-teal-600 font-bold shrink-0">{i + 1}.</span>
                  <span>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Confidence breakdown */}
          {caseData.confidence_scores && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Confidence Breakdown
              </h4>
              <div className="space-y-3">
                <ConfidenceBar
                  label="Case Number"
                  value={caseData.confidence_scores.case_number}
                  sourceText={caseData.source_paragraphs?.case_number}
                />
                <ConfidenceBar
                  label="Department"
                  value={caseData.confidence_scores.department}
                  sourceText={caseData.source_paragraphs?.department}
                />
                <ConfidenceBar
                  label="Deadline"
                  value={caseData.confidence_scores.deadline}
                  sourceText={caseData.source_paragraphs?.deadline}
                />
                <ConfidenceBar
                  label="Directive"
                  value={caseData.confidence_scores.directive}
                  sourceText={caseData.source_paragraphs?.directive}
                />
              </div>
            </div>
          )}

          {/* Audit trail */}
          <div>
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Audit Trail</h4>
            <AuditTrail caseId={caseData.id} />
          </div>
        </div>

        {/* RIGHT: action plan + actions */}
        <div className="p-5 space-y-5">
          {caseData.action_plan && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                Compliance Action Plan
              </h4>

              {/* Recommendation */}
              <div className={cn(
                'rounded p-3 mb-3 border',
                caseData.action_plan.comply_recommendation === 'comply'
                  ? 'bg-green-50 border-green-200'
                  : 'bg-amber-50 border-amber-200'
              )}>
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn(
                    'text-xs font-bold px-2 py-0.5 rounded uppercase',
                    caseData.action_plan.comply_recommendation === 'comply'
                      ? 'bg-green-700 text-white'
                      : 'bg-amber-700 text-white'
                  )}>
                    {caseData.action_plan.comply_recommendation}
                  </span>
                  <span className="text-xs font-medium text-slate-600">recommended</span>
                </div>
                <p className="text-xs text-slate-700">{caseData.action_plan.reasoning}</p>
              </div>

              {/* Checklist */}
              <div className="space-y-2 mb-3">
                {caseData.action_plan.checklist_items.map((item) => (
                  <div key={item.id} className="flex gap-2.5 p-2.5 bg-slate-50 rounded border border-slate-100">
                    <input type="checkbox" className="mt-0.5 accent-teal-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-800">{item.action}</p>
                      <div className="flex gap-3 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400">{item.responsible}</span>
                        <span className="text-xs text-slate-400">Due: {item.deadline}</span>
                        <span className={cn(
                          'text-xs font-medium px-1.5 rounded',
                          item.priority === 'high' ? 'bg-red-100 text-red-700'
                          : item.priority === 'medium' ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                        )}>
                          {item.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Risk */}
              {caseData.action_plan.risk_if_missed && (
                <div className="p-3 bg-red-50 border border-red-100 rounded text-xs text-red-700">
                  <strong>Risk if missed:</strong> {caseData.action_plan.risk_if_missed}
                </div>
              )}

              {/* Context */}
              {caseData.action_plan.context_insights && (
                <div className="p-3 bg-slate-50 rounded text-xs text-slate-600 mt-2">
                  <strong>Context:</strong> {caseData.action_plan.context_insights}
                </div>
              )}
            </div>
          )}

          {/* Feedback notes (always visible) */}
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1">
              Notes (optional — stored in audit trail)
            </label>
            <Textarea
              value={feedbackNotes}
              onChange={(e) => setFeedbackNotes(e.target.value)}
              rows={2}
              placeholder="Add any notes for the record…"
            />
          </div>

          {/* Rejection reason */}
          {mode === 'reject' && (
            <div>
              <label className="block text-xs font-medium text-red-600 mb-1">
                Rejection reason (required)
              </label>
              <Textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="Explain why this extraction is being rejected…"
                className="border-red-300 focus:ring-red-400"
              />
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs text-slate-400 mb-2">
              Your verification is permanent and will be recorded with a timestamp.
            </p>

            {mode === 'view' && (
              <div className="flex gap-2">
                <Button onClick={handleApprove} disabled={loading} className="flex-1 h-10">
                  {loading ? 'Submitting…' : 'Approve'}
                </Button>
                <Button variant="outline" onClick={() => setMode('edit')} disabled={loading} className="flex-1 h-10">
                  Edit
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setMode('reject')}
                  disabled={loading}
                  className="flex-1 h-10 border-red-300 text-red-600 hover:bg-red-50"
                >
                  Reject
                </Button>
              </div>
            )}

            {mode === 'edit' && (
              <div className="flex gap-2">
                <Button onClick={handleEdit} disabled={loading} className="flex-1 h-10">
                  {loading ? 'Saving…' : 'Save edits & verify'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setMode('view'); setEditedFields({}) }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            )}

            {mode === 'reject' && (
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={loading || !rejectionReason.trim()}
                  className="flex-1 h-10"
                >
                  {loading ? 'Submitting…' : 'Confirm rejection'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => { setMode('view'); setRejectionReason('') }}
                  disabled={loading}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
