'use client'

import { useEffect, useState } from 'react'
import { AuditLog } from '@/types'

interface AuditTrailProps {
  caseId: string
}

export function AuditTrail({ caseId }: AuditTrailProps) {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/audit?case_id=${caseId}&limit=20`)
      .then((r) => r.json())
      .then((data) => setLogs(data.logs ?? []))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [caseId])

  if (loading) {
    return <div className="text-xs text-slate-400 py-2">Loading audit trail…</div>
  }

  if (logs.length === 0) {
    return <div className="text-xs text-slate-400 py-2">No audit entries yet</div>
  }

  const actionColors: Record<string, string> = {
    verification_approved: 'bg-green-100 text-green-800',
    verification_edited:   'bg-blue-100 text-blue-800',
    verification_rejected: 'bg-red-100 text-red-800',
  }

  return (
    <ul className="space-y-2">
      {logs.map((log) => (
        <li key={log.id} className="flex gap-2.5 text-xs">
          <div className="mt-0.5 shrink-0 w-1.5 h-1.5 rounded-full bg-slate-300 mt-1.5" />
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${actionColors[log.action] ?? 'bg-slate-100 text-slate-700'}`}>
                {log.action.replace('verification_', '').replace('_', ' ')}
              </span>
              <span className="text-slate-400">
                {new Date(log.created_at).toLocaleString('en-IN', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </span>
            </div>
            {Boolean((log.details as Record<string, unknown>)?.rejection_reason) && (
              <p className="text-slate-500 mt-0.5 italic">
                Reason: {String((log.details as Record<string, unknown>).rejection_reason)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ul>
  )
}
