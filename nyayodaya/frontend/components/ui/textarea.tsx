import * as React from 'react'
import { cn } from '@/lib/utils'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full rounded border border-slate-300 bg-white px-3 py-2 text-sm',
        'placeholder:text-slate-400 resize-none',
        'focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        className,
      )}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'

export { Textarea }
