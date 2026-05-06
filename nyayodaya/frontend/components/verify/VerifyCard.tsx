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
              {caseData.total_pages && (
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase tracking-wider",
                  caseData.is_fully_read ? "bg-teal-50 text-teal-700 border-teal-200" : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {caseData.is_fully_read ? `Full Doc (${caseData.total_pages}pgs)` : `Partial (${caseData.pages_read}/${caseData.total_pages}pgs)`}
                </span>
              )}
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

            {/* Connected Matters */}
            <div className="mb-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Connected Matters</div>
              {mode === 'edit' ? (
                <Input
                  type="text"
                  defaultValue={caseData.connected_matters ?? ''}
                  onChange={(e) => setEditedFields((f) => ({ ...f, connected_matters: e.target.value }))}
                  placeholder="e.g. W.P. No. 100655/2019, 100656/2019"
                />
              ) : (
                <div className="text-sm text-slate-700">{caseData.connected_matters ?? 'None'}</div>
              )}
            </div>

            {/* Petitioners */}
            <div className="mb-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Petitioners</div>
              {mode === 'edit' ? (
                <Input
                  type="text"
                  defaultValue={caseData.petitioners?.join(', ') ?? ''}
                  onChange={(e) => setEditedFields((f) => ({ ...f, petitioners: e.target.value.split(',').map(s => s.trim()) }))}
                  placeholder="Comma separated names"
                />
              ) : (
                <div className="text-sm text-slate-700">{caseData.petitioners?.join(', ') || '—'}</div>
              )}
            </div>

            {/* Appointment Year */}
            <div className="mb-3">
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Appointment Year</div>
              {mode === 'edit' ? (
                <Input
                  type="text"
                  defaultValue={caseData.appointment_year ?? ''}
                  onChange={(e) => setEditedFields((f) => ({ ...f, appointment_year: e.target.value }))}
                />
              ) : (
                <div className="text-sm text-slate-700">{caseData.appointment_year ?? '—'}</div>
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
                  sourcePage={caseData.source_paragraphs?.case_number_page}
                />
                <ConfidenceBar
                  label="Department"
                  value={caseData.confidence_scores.department}
                  sourceText={caseData.source_paragraphs?.department}
                  sourcePage={caseData.source_paragraphs?.department_page}
                />
                <ConfidenceBar
                  label="Deadline"
                  value={caseData.confidence_scores.deadline}
                  sourceText={caseData.source_paragraphs?.deadline}
                  sourcePage={caseData.source_paragraphs?.deadline_page}
                />
                <ConfidenceBar
                  label="Directive"
                  value={caseData.confidence_scores.directive}
                  sourceText={caseData.source_paragraphs?.directive}
                  sourcePage={caseData.source_paragraphs?.directive_page}
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
              
              {/* Key Timeline Summary */}
              <div className="mb-4 bg-slate-50 border border-slate-100 rounded-lg p-2.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Key Timelines (Inferred)</div>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 text-center">
                    <div className="text-[9px] text-slate-400 uppercase font-medium mb-0.5">Order Date</div>
                    <div className="text-xs font-mono font-semibold text-slate-600">{formatDate(caseData.order_date)}</div>
                  </div>
                  <div className="text-slate-300">→</div>
                  <div className="flex-1 text-center">
                    <div className="text-[9px] text-slate-400 uppercase font-medium mb-0.5">Final Deadline</div>
                    <div className="text-xs font-mono font-bold text-teal-700">{formatDate(caseData.absolute_deadline)}</div>
                  </div>
                </div>
              </div>

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
                  {caseData.action_plan.source_citations?.risk_if_missed && (
                    <div className="mt-2 text-[10px] italic border-l-2 border-red-200 pl-2 text-red-600/80">
                      &ldquo;{caseData.action_plan.source_citations.risk_if_missed.quote}&rdquo;
                      <span className="ml-1 font-bold">— Pg {caseData.action_plan.source_citations.risk_if_missed.page}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Context */}
              {caseData.action_plan.context_insights && (
                <div className="p-3 bg-slate-50 rounded text-xs text-slate-600 mt-2">
                  <strong>Context:</strong> {caseData.action_plan.context_insights}
                </div>
              )}

              {/* Consideration for Appeal */}
              {caseData.action_plan.consideration_for_appeal && (
                <div className="p-3 bg-amber-50 border border-amber-100 rounded text-xs text-amber-800 mt-2">
                  <strong>Consideration for Appeal:</strong> {caseData.action_plan.consideration_for_appeal}
                  {caseData.action_plan.source_citations?.consideration_for_appeal && (
                    <div className="mt-2 text-[10px] italic border-l-2 border-amber-200 pl-2 text-amber-700/80">
                      &ldquo;{caseData.action_plan.source_citations.consideration_for_appeal.quote}&rdquo;
                      <span className="ml-1 font-bold">— Pg {caseData.action_plan.source_citations.consideration_for_appeal.page}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Nature of Action */}
              {caseData.action_plan.nature_of_action && Object.keys(caseData.action_plan.nature_of_action).length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Nature of Action</div>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(caseData.action_plan.nature_of_action).map(([key, value]) => (
                      <div key={key} className="p-2.5 bg-white border border-slate-100 rounded shadow-sm">
                        <div className="text-[10px] font-bold text-teal-700 uppercase tracking-tight mb-0.5">{key}</div>
                        <p className="text-xs text-slate-600 leading-relaxed">{value}</p>
                        {key === 'administrative' && caseData.action_plan.source_citations?.nature_of_action && (
                          <div className="mt-1.5 text-[9px] italic border-l border-slate-200 pl-1.5 text-slate-400 leading-tight">
                            &ldquo;{caseData.action_plan.source_citations.nature_of_action.quote}&rdquo;
                            <span className="ml-1 font-bold">— Pg {caseData.action_plan.source_citations.nature_of_action.page}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Consolidated Evidence Section */}
          {caseData.action_plan?.source_citations && (
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-3">
              <div className="flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-teal-500" />
                <h5 className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Audit Evidence & PDF Citations</h5>
              </div>
              <div className="space-y-2.5">
                {Object.entries(caseData.action_plan.source_citations).map(([key, cite]) => (
                  <div key={key} className="text-[10px] text-slate-500 leading-normal">
                    <span className="font-bold text-slate-400 uppercase mr-1">{key.replace(/_/g, ' ')}:</span>
                    <span className="italic">&ldquo;{cite.quote}&rdquo;</span>
                    <span className="ml-1.5 text-teal-600 font-bold bg-teal-50 px-1 rounded">Page {cite.page}</span>
                  </div>
                ))}
              </div>
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
