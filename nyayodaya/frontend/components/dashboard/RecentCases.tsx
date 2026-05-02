'use client'

import { useState } from 'react'
import { Case } from '@/types'
import { StatusBadge, RiskBadge, CaseModal } from '@/components/shared'
import { formatDate, formatDeadlineLabel, getDaysUntilDeadline } from '@/lib/utils'

interface RecentCasesProps {
  cases: Case[]
}

export function RecentCases({ cases }: RecentCasesProps) {
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">Recent Verified Cases</h3>
          <p className="text-xs text-slate-400 mt-0.5">Latest human-approved cases</p>
        </div>

        {cases.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">No verified cases yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                  <th className="px-4 py-2 font-medium">Case No.</th>
                  <th className="px-4 py-2 font-medium">Department</th>
                  <th className="px-4 py-2 font-medium">Deadline</th>
                  <th className="px-4 py-2 font-medium">Status</th>
                  <th className="px-4 py-2 font-medium">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {cases.map((c) => {
                  const days = getDaysUntilDeadline(c.absolute_deadline)
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-slate-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedCase(c)}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-teal-700">{c.case_number}</span>
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[160px] truncate">
                        {c.respondent_department?.code ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700">{formatDate(c.absolute_deadline)}</div>
                        <div className={`text-xs mt-0.5 ${days !== null && days <= 3 ? 'text-red-600' : days !== null && days <= 14 ? 'text-amber-600' : 'text-green-600'}`}>
                          {formatDeadlineLabel(c.absolute_deadline)}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-4 py-3">
                        <RiskBadge risk={c.contempt_risk} />
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedCase && (
        <CaseModal caseData={selectedCase} onClose={() => setSelectedCase(null)} />
      )}
    </>
  )
}
