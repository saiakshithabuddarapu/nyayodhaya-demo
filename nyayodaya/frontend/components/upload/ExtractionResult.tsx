'use client'

import { Case } from '@/types'
import { StatusBadge, RiskBadge } from '@/components/shared'
import { formatDate, formatDeadlineLabel, getDaysUntilDeadline } from '@/lib/utils'
import Link from 'next/link'

interface ExtractionResultProps {
  caseData: Case
}

export function ExtractionResult({ caseData }: ExtractionResultProps) {
  const days = getDaysUntilDeadline(caseData.absolute_deadline)

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="bg-teal-700 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white font-semibold">{caseData.case_number}</h3>
            <p className="text-teal-200 text-xs mt-0.5">{caseData.court}</p>
          </div>
          <div className="flex gap-2">
            <StatusBadge status={caseData.status} />
            <RiskBadge risk={caseData.contempt_risk} />
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Department</div>
            <div className="font-medium text-slate-900">{caseData.respondent_department?.name ?? '—'}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Order Date</div>
            <div className="font-medium text-slate-900">{formatDate(caseData.order_date)}</div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Deadline</div>
            <div className="font-medium text-slate-900">{formatDate(caseData.absolute_deadline)}</div>
            <div className={`text-xs mt-0.5 ${days !== null && days <= 3 ? 'text-red-600' : days !== null && days <= 14 ? 'text-amber-600' : 'text-green-600'}`}>
              {formatDeadlineLabel(caseData.absolute_deadline)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-0.5">Recommendation</div>
            <div className={`inline-flex px-2 py-0.5 rounded text-xs font-semibold border ${
              caseData.comply_recommendation === 'comply'
                ? 'bg-green-50 text-green-800 border-green-200'
                : 'bg-amber-50 text-amber-800 border-amber-200'
            }`}>
              {(caseData.comply_recommendation ?? 'UNCLEAR').toUpperCase()}
            </div>
          </div>
        </div>

        {caseData.key_directives?.length > 0 && (
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1.5">Court Directives</div>
            <ul className="space-y-1.5">
              {caseData.key_directives.map((d, i) => (
                <li key={i} className="flex gap-2 text-sm text-slate-700">
                  <span className="text-teal-600 font-bold shrink-0">{i + 1}.</span>
                  <span>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {caseData.confidence_scores && (
          <div>
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-1.5">AI Confidence</div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: 'Case Number', value: caseData.confidence_scores.case_number },
                { label: 'Department',  value: caseData.confidence_scores.department },
                { label: 'Deadline',    value: caseData.confidence_scores.deadline },
                { label: 'Directive',   value: caseData.confidence_scores.directive },
              ].map(({ label, value }) => (
                <div key={label} className="text-xs">
                  <div className="flex justify-between text-slate-500 mb-0.5">
                    <span>{label}</span>
                    <span className="font-medium">{Math.round(value)}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${value >= 80 ? 'bg-green-500' : value >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="pt-2 border-t border-slate-100 flex gap-3">
          <Link
            href="/verify"
            className="flex-1 text-center py-2 bg-teal-700 text-white text-sm font-medium rounded hover:bg-teal-800 transition-colors"
          >
            Review &amp; Verify
          </Link>
          <Link
            href="/dashboard"
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded hover:bg-slate-50 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
