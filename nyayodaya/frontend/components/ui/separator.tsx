import * as React from 'react'
import { cn } from '@/lib/utils'

interface SeparatorProps extends React.HTMLAttributes<HTMLHRElement> {
  orientation?: 'horizontal' | 'vertical'
}

function Separator({ orientation = 'horizontal', className, ...props }: SeparatorProps) {
  return (
    <hr
      className={cn(
        'border-slate-200',
        orientation === 'vertical' ? 'border-l h-full w-px border-t-0' : 'border-t w-full',
        className,
      )}
      {...props}
    />
  )
}

export { Separator }
