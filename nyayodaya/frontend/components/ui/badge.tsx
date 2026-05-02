import * as React from 'react'
import { cn } from '@/lib/utils'

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline' | 'success' | 'warning' | 'destructive'
}

const variantClasses: Record<NonNullable<BadgeProps['variant']>, string> = {
  default:     'bg-teal-50 text-teal-800 border-teal-200',
  outline:     'bg-white text-slate-700 border-slate-300',
  success:     'bg-green-50 text-green-800 border-green-200',
  warning:     'bg-amber-50 text-amber-800 border-amber-200',
  destructive: 'bg-red-50 text-red-800 border-red-200',
}

function Badge({ className, variant = 'default', ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 text-xs font-medium rounded border',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
}

export { Badge }
