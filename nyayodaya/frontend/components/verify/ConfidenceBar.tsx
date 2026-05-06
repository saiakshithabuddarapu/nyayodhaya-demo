'use client'

import { cn } from '@/lib/utils'

interface ConfidenceBarProps {
  label: string
  value: number
  sourceText?: string
  sourcePage?: number
}

export function ConfidenceBar({ label, value, sourceText, sourcePage }: ConfidenceBarProps) {
  const rounded = Math.round(value)
  const color =
    rounded >= 80 ? 'bg-green-500'
    : rounded >= 60 ? 'bg-amber-500'
    : 'bg-red-400'

  const textColor =
    rounded >= 80 ? 'text-green-700'
    : rounded >= 60 ? 'text-amber-700'
    : 'text-red-600'

  const levelLabel =
    rounded >= 80 ? 'High confidence'
    : rounded >= 60 ? 'Medium confidence'
    : 'Low confidence — verify manually'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <span className={cn('text-xs font-bold tabular-nums', textColor)}>{rounded}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={cn('h-full rounded-full transition-all', color)}
          style={{ width: `${rounded}%` }}
        />
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <p className={cn('text-xs', textColor)}>{levelLabel}</p>
      </div>
      {sourceText && (
        <div className="mt-1.5 bg-slate-50 border-l-2 border-slate-300 rounded-sm overflow-hidden">
          {sourcePage && (
            <div className="px-2 py-0.5 bg-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
              Source: Page {sourcePage}
            </div>
          )}
          <blockquote className="px-2 py-1 text-xs text-slate-500 italic">
            &ldquo;{sourceText.length > 200 ? sourceText.slice(0, 200) + '…' : sourceText}&rdquo;
          </blockquote>
        </div>
      )}
    </div>
  )
}
