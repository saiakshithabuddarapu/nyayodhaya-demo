import * as React from 'react'
import { cn } from '@/lib/utils'

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  default:     'bg-teal-700 text-white hover:bg-teal-800',
  outline:     'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
  ghost:       'text-slate-600 hover:bg-slate-100 hover:text-slate-900',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  link:        'text-teal-700 underline-offset-4 hover:underline p-0 h-auto',
}

const sizeClasses: Record<NonNullable<ButtonProps['size']>, string> = {
  default: 'h-9 px-4 py-2 text-sm',
  sm:      'h-7 px-3 text-xs',
  lg:      'h-11 px-6 text-base',
  icon:    'h-9 w-9',
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', size = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        sizeClasses[size],
        className,
      )}
      {...props}
    />
  )
)
Button.displayName = 'Button'

export { Button }
