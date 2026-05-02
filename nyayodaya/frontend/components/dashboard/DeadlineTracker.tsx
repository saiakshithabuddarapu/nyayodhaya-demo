'use client'

import { useState } from 'react'
import { Case } from '@/types'
import { getDaysUntilDeadline, formatDate, truncate } from '@/lib/utils'
import { CaseModal } from '@/components/shared'
import { cn } from '@/lib/utils'

interface DeadlineTrackerProps {
  cases: Case[]
}

export function DeadlineTracker({ cases }: DeadlineTrackerProps) {
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)

  const sorted = [...cases].sort((a, b) => {
    if (!a.absolute_deadline) return 1
    if (!b.absolute_deadline) return -1
    return new Date(a.absolute_deadline).getTime() - new Date(b.absolute_deadline).getTime()
  })

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-lg">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900 text-sm">Deadline Tracker</h3>
          <p className="text-xs text-slate-400 mt-0.5">Verified cases ordered by urgency</p>
        </div>

        {sorted.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-slate-400">
            No active deadlines
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {sorted.slice(0, 10).map((c) => {
              const days = getDaysUntilDeadline(c.absolute_deadline)
              const urgency =
                days === null ? 'ok'
                : days <= 3 ? 'critical'
                : days <= 14 ? 'soon'
                : 'ok'

              const borderColor = urgency === 'critical' ? 'border-l-red-500' : urgency === 'soon' ? 'border-l-amber-400' : 'border-l-green-500'
              const daysBadgeColor = urgency === 'critical' ? 'bg-red-100 text-red-800' : urgency === 'soon' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'

              return (
                <li
                  key={c.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 border-l-4 transition-colors',
                    borderColor,
                    urgency === 'critical' && 'animate-pulse-subtle'
                  )}
                  onClick={() => setSelectedCase(c)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-slate-900 truncate">
                        {c.case_number}
                      </span>
                      {c.contempt_risk === 'high' && (
                        <span className="text-xs text-red-700 font-medium">CONTEMPT</span>
                      )}
                    </div>
                    <div className="text-xs text-slate-500 truncate mt-0.5">
                      {c.respondent_department?.name ?? 'Unknown Dept'} &mdash;{' '}
                      {c.key_directives?.[0] ? truncate(c.key_directives[0], 60) : 'No directive'}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Due: {formatDate(c.absolute_deadline)}
                    </div>
                  </div>
                  <div className={cn('shrink-0 px-2 py-1 rounded text-xs font-semibold', daysBadgeColor)}>
                    {days === null ? '—' : days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? 'Today' : `${days}d`}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {selectedCase && (
        <CaseModal caseData={selectedCase} onClose={() => setSelectedCase(null)} />
      )}
    </>
  )
}
