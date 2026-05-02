'use client'

import { DashboardMetrics } from '@/types'
import { cn } from '@/lib/utils'

interface MetricsGridProps {
  metrics: DashboardMetrics
}

interface MetricCardProps {
  label: string
  value: string | number
  sublabel?: string
  accent?: 'teal' | 'red' | 'amber' | 'green' | 'slate'
}

function MetricCard({ label, value, sublabel, accent = 'slate' }: MetricCardProps) {
  const accentMap = {
    teal:  'border-l-teal-600',
    red:   'border-l-red-500',
    amber: 'border-l-amber-500',
    green: 'border-l-green-600',
    slate: 'border-l-slate-400',
  }

  return (
    <div className={cn('bg-white border border-slate-200 rounded-lg p-4 border-l-4', accentMap[accent])}>
      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</div>
      <div className="mt-1 text-2xl font-bold text-slate-900">{value}</div>
      {sublabel && <div className="mt-0.5 text-xs text-slate-400">{sublabel}</div>}
    </div>
  )
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <MetricCard
        label="Total Cases"
        value={metrics.total_cases}
        sublabel="All time"
        accent="teal"
      />
      <MetricCard
        label="Pending Review"
        value={metrics.pending_verification}
        sublabel="Awaiting officer"
        accent={metrics.pending_verification > 5 ? 'amber' : 'slate'}
      />
      <MetricCard
        label="Verified Today"
        value={metrics.verified_today}
        sublabel="Last 24 hours"
        accent="green"
      />
      <MetricCard
        label="Critical Deadlines"
        value={metrics.critical_deadlines}
        sublabel="Due within 3 days"
        accent={metrics.critical_deadlines > 0 ? 'red' : 'slate'}
      />
      <MetricCard
        label="Compliance Rate"
        value={`${metrics.compliance_rate.toFixed(0)}%`}
        sublabel="Verified cases"
        accent="teal"
      />
    </div>
  )
}
