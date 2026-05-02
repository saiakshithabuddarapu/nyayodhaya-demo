import * as React from 'react'
import { cn } from '@/lib/utils'

interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: number
  variant?: 'default' | 'success' | 'warning' | 'destructive'
}

const variantClasses: Record<NonNullable<ProgressProps['variant']>, string> = {
  default:     'bg-teal-600',
  success:     'bg-green-500',
  warning:     'bg-amber-500',
  destructive: 'bg-red-500',
}

function Progress({ value = 0, variant = 'default', className, ...props }: ProgressProps) {
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value}
      className={cn('h-2 w-full bg-slate-100 rounded-full overflow-hidden', className)}
      {...props}
    >
      <div
        className={cn('h-full rounded-full transition-all duration-500', variantClasses[variant])}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  )
}

export { Progress }
