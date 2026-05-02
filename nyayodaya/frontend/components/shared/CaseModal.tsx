'use client'

import { Case } from '@/types'
import { StatusBadge, RiskBadge } from './StatusBadge'
import { formatDate, formatDeadlineLabel, getDaysUntilDeadline } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface CaseModalProps {
  caseData: Case
  onClose: () => void
}

export function CaseModal({ caseData, onClose }: CaseModalProps) {
  const days = getDaysUntilDeadline(caseData.absolute_deadline)
  const isOverdue = days !== null && days < 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-200 px-6 py-4 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-semibold text-slate-900">
                {caseData.case_number}
              </h2>
              <StatusBadge status={caseData.status} />
              <RiskBadge risk={caseData.contempt_risk} />
            </div>
            <p className="text-sm text-slate-500 mt-0.5">{caseData.court}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 ml-4 shrink-0"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Deadline */}
          <div
            className={cn(
              'rounded-lg p-4 border',
              isOverdue
                ? 'bg-red-50 border-red-200'
                : days !== null && days <= 3
                ? 'bg-red-50 border-red-200'
                : days !== null && days <= 14
                ? 'bg-amber-50 border-amber-200'
                : 'bg-green-50 border-green-200'
            )}
          >
            <div className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-1">
              Compliance Deadline
            </div>
            <div className="flex items-baseline gap-3">
              <span className="text-xl font-bold text-slate-900">
                {formatDate(caseData.absolute_deadline)}
              </span>
              <span className={cn(
                'text-sm font-semibold',
                isOverdue ? 'text-red-700' : days !== null && days <= 14 ? 'text-amber-700' : 'text-green-700'
              )}>
                {formatDeadlineLabel(caseData.absolute_deadline)}
              </span>
            </div>
            {caseData.relative_deadline_text && (
              <p className="text-xs text-slate-500 mt-1 italic">
                &ldquo;{caseData.relative_deadline_text}&rdquo;
              </p>
            )}
          </div>

          {/* Key info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Department</div>
              <div className="font-medium text-slate-900">
                {caseData.respondent_department?.name ?? '—'}
              </div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Order Date</div>
              <div className="font-medium text-slate-900">{formatDate(caseData.order_date)}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Responsible Officer</div>
              <div className="font-medium text-slate-900">{caseData.responsible_officer ?? '—'}</div>
            </div>
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Recommendation</div>
              <div className={cn(
                'inline-flex px-2 py-0.5 rounded text-xs font-semibold border',
                caseData.comply_recommendation === 'comply'
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : caseData.comply_recommendation === 'appeal'
                  ? 'bg-amber-50 text-amber-800 border-amber-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200'
              )}>
                {caseData.comply_recommendation?.toUpperCase() ?? 'UNCLEAR'}
              </div>
            </div>
          </div>

          {/* Directives */}
          {caseData.key_directives?.length > 0 && (
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Court Directives</div>
              <ul className="space-y-2">
                {caseData.key_directives.map((d, i) => (
                  <li key={i} className="flex gap-2 text-sm text-slate-800">
                    <span className="text-teal-600 font-bold shrink-0">{i + 1}.</span>
                    <span>{d}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Reasoning */}
          {caseData.comply_reasoning && (
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">AI Reasoning</div>
              <p className="text-sm text-slate-700 bg-slate-50 rounded p-3 border border-slate-100">
                {caseData.comply_reasoning}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
