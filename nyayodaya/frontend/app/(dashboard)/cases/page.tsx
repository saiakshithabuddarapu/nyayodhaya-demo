'use client'

import { useEffect, useState, useCallback } from 'react'
import { Case, CaseStatus } from '@/types'
import { StatusBadge, RiskBadge, CaseModal } from '@/components/shared'
import { formatDate, formatDeadlineLabel, getDaysUntilDeadline } from '@/lib/utils'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const STATUS_FILTERS: { label: string; value: CaseStatus | 'all' }[] = [
  { label: 'All', value: 'all' },
  { label: 'Pending Review', value: 'pending_verification' },
  { label: 'Verified', value: 'verified' },
  { label: 'Processing', value: 'processing' },
  { label: 'Rejected', value: 'rejected' },
  { label: 'Complied', value: 'complied' },
]

export default function CasesPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [selectedStatus, setSelectedStatus] = useState<CaseStatus | 'all'>('all')
  const [selectedCase, setSelectedCase] = useState<Case | null>(null)
  const [offset, setOffset] = useState(0)
  const LIMIT = 25

  const fetchCases = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ limit: String(LIMIT), offset: String(offset) })
      if (selectedStatus !== 'all') params.set('status', selectedStatus)

      const res = await fetch(`/api/cases?${params}`)
      if (!res.ok) throw new Error('Failed to load cases')
      const data = await res.json()
      setCases(data.cases ?? [])
      setTotal(data.total ?? 0)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [selectedStatus, offset])

  useEffect(() => {
    fetchCases()
  }, [fetchCases])

  useEffect(() => {
    setOffset(0)
  }, [selectedStatus])

  return (
    <>
      <div className="max-w-7xl space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">All Cases</h1>
            <p className="text-sm text-slate-500 mt-0.5">{total} total cases</p>
          </div>
          <Link
            href="/upload"
            className="px-4 py-2 bg-teal-700 text-white text-sm font-medium rounded hover:bg-teal-800 transition-colors"
          >
            Upload judgment
          </Link>
        </div>

        {/* Status filter */}
        <div className="flex gap-1.5 flex-wrap">
          {STATUS_FILTERS.map(({ label, value }) => (
            <button
              key={value}
              onClick={() => setSelectedStatus(value)}
              className={cn(
                'px-3 py-1.5 rounded text-xs font-medium border transition-colors',
                selectedStatus === value
                  ? 'bg-teal-700 text-white border-teal-700'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
            </div>
          ) : cases.length === 0 ? (
            <div className="py-16 text-center text-sm text-slate-400">No cases found</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-400 uppercase tracking-wide bg-slate-50 border-b border-slate-100">
                    <th className="px-4 py-3 font-medium">Case No.</th>
                    <th className="px-4 py-3 font-medium">Department</th>
                    <th className="px-4 py-3 font-medium">Directive</th>
                    <th className="px-4 py-3 font-medium">Deadline</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Risk</th>
                    <th className="px-4 py-3 font-medium">Confidence</th>
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
                          <span className="font-semibold text-teal-700">{c.case_number}</span>
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[140px] truncate">
                          {c.respondent_department?.code ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-slate-600 max-w-[200px]">
                          <span className="line-clamp-2 text-xs">
                            {c.key_directives?.[0] ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-slate-700 text-xs">{formatDate(c.absolute_deadline)}</div>
                          <div className={cn(
                            'text-xs mt-0.5',
                            days !== null && days <= 3 ? 'text-red-600' : days !== null && days <= 14 ? 'text-amber-600' : 'text-green-600'
                          )}>
                            {formatDeadlineLabel(c.absolute_deadline)}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={c.status} />
                        </td>
                        <td className="px-4 py-3">
                          <RiskBadge risk={c.contempt_risk} />
                        </td>
                        <td className="px-4 py-3">
                          {c.confidence_scores ? (
                            <div className="flex items-center gap-1.5">
                              <div className="h-1.5 w-16 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${c.confidence_scores.overall >= 80 ? 'bg-green-500' : c.confidence_scores.overall >= 60 ? 'bg-amber-500' : 'bg-red-400'}`}
                                  style={{ width: `${c.confidence_scores.overall}%` }}
                                />
                              </div>
                              <span className="text-xs text-slate-500">
                                {Math.round(c.confidence_scores.overall)}%
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-300">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Showing {offset + 1}–{Math.min(offset + LIMIT, total)} of {total}</span>
            <div className="flex gap-2">
              <button
                onClick={() => setOffset(Math.max(0, offset - LIMIT))}
                disabled={offset === 0}
                className="px-3 py-1.5 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                onClick={() => setOffset(offset + LIMIT)}
                disabled={offset + LIMIT >= total}
                className="px-3 py-1.5 border border-slate-200 rounded disabled:opacity-40 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedCase && (
        <CaseModal caseData={selectedCase} onClose={() => setSelectedCase(null)} />
      )}
    </>
  )
}
