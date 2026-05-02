'use client'

import { CaseStatus, ContemptRisk } from '@/types'
import { cn } from '@/lib/utils'

interface StatusBadgeProps {
  status: CaseStatus
  className?: string
}

const statusConfig: Record<CaseStatus, { label: string; className: string }> = {
  processing:           { label: 'Processing',          className: 'bg-slate-100 text-slate-700 border-slate-200' },
  extracted:            { label: 'Extracted',           className: 'bg-blue-50 text-blue-700 border-blue-200' },
  pending_verification: { label: 'Pending Review',      className: 'bg-amber-50 text-amber-800 border-amber-200' },
  verified:             { label: 'Verified',            className: 'bg-green-50 text-green-800 border-green-200' },
  rejected:             { label: 'Rejected',            className: 'bg-red-50 text-red-700 border-red-200' },
  complied:             { label: 'Complied',            className: 'bg-teal-50 text-teal-800 border-teal-200' },
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status] ?? { label: status, className: 'bg-gray-100 text-gray-700 border-gray-200' }
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}

interface RiskBadgeProps {
  risk: ContemptRisk | undefined
  className?: string
}

const riskConfig: Record<ContemptRisk, { label: string; className: string }> = {
  high:   { label: 'High Contempt Risk',   className: 'bg-red-50 text-red-800 border-red-300' },
  medium: { label: 'Medium Risk',          className: 'bg-amber-50 text-amber-800 border-amber-300' },
  low:    { label: 'Low Risk',             className: 'bg-green-50 text-green-800 border-green-300' },
}

export function RiskBadge({ risk, className }: RiskBadgeProps) {
  if (!risk) return null
  const config = riskConfig[risk]
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  )
}
