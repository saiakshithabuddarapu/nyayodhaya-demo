import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      ref={ref}
      className={cn(
        'flex h-9 w-full rounded border border-slate-300 bg-white px-3 py-1 text-sm',
        'placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
)
Input.displayName = 'Input'

export { Input }
