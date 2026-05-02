'use client'

import { useEffect, useState, useCallback } from 'react'
import { Case } from '@/types'
import { VerifyCard } from '@/components/verify'
import { createClient } from '@/lib/supabase/client'

export default function VerifyPage() {
  const [cases, setCases] = useState<Case[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPendingCases = useCallback(async () => {
    try {
      const res = await fetch('/api/cases?status=pending_verification&limit=20')
      if (!res.ok) throw new Error('Failed to load cases')
      const data = await res.json()

      // Sort by contempt_risk (high first), then by absolute_deadline (soonest first)
      const sorted = (data.cases as Case[]).sort((a, b) => {
        const riskOrder = { high: 0, medium: 1, low: 2 }
        const rA = riskOrder[a.contempt_risk ?? 'low']
        const rB = riskOrder[b.contempt_risk ?? 'low']
        if (rA !== rB) return rA - rB
        if (!a.absolute_deadline) return 1
        if (!b.absolute_deadline) return -1
        return new Date(a.absolute_deadline).getTime() - new Date(b.absolute_deadline).getTime()
      })

      setCases(sorted)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load cases')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPendingCases()
  }, [fetchPendingCases])

  // Supabase Realtime — listen for new pending_verification cases
  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('pending-verification-cases')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'cases',
          filter: 'status=eq.pending_verification',
        },
        () => {
          // Refresh the list when a new case is queued
          fetchPendingCases()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchPendingCases])

  const handleVerified = useCallback((caseId: string) => {
    setCases((prev) => prev.filter((c) => c.id !== caseId))
  }, [])

  return (
    <div className="max-w-5xl space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Verify Cases</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Review AI-extracted data and approve, edit, or reject each case. Your decisions are permanent and audited.
          </p>
        </div>
        {cases.length > 0 && (
          <div className="shrink-0 bg-amber-100 text-amber-800 text-xs font-semibold px-3 py-1.5 rounded border border-amber-200">
            {cases.length} pending
          </div>
        )}
      </div>

      {/* Trust reminder */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg px-4 py-3 text-sm text-teal-800">
        <strong>Verification protocol:</strong> Check each AI-extracted field against the source paragraph shown.
        Confidence scores below 70% require extra scrutiny. Only approve when you are certain the extraction is correct.
        Edits are applied immediately and logged.
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="w-7 h-7 rounded-full border-2 border-teal-600 border-t-transparent animate-spin" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {!loading && !error && cases.length === 0 && (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <div className="text-slate-300 text-4xl mb-3">✓</div>
          <p className="font-semibold text-slate-700">All cases verified</p>
          <p className="text-sm text-slate-400 mt-1">
            No cases pending verification. New cases will appear here automatically.
          </p>
        </div>
      )}

      {!loading && cases.length > 0 && (
        <div className="space-y-6">
          {cases.map((c) => (
            <VerifyCard
              key={c.id}
              caseData={c}
              onVerified={() => handleVerified(c.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
