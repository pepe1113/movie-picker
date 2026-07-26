import * as React from 'react'
import { cn } from '@/lib/utils'

function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'placeholder:text-muted-foreground selection:bg-accent selection:text-accent-foreground bg-input text-foreground min-h-32 w-full resize-y rounded-lg border-0 px-5 py-4 text-base leading-relaxed shadow-[rgb(18,18,18)_0px_1px_0px,rgb(124,124,124)_0px_0px_0px_1px_inset] transition-[box-shadow,background-color] outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus:bg-secondary focus:shadow-[rgb(18,18,18)_0px_1px_0px,rgb(255,255,255)_0px_0px_0px_1px_inset]',
        'aria-invalid:shadow-[rgb(18,18,18)_0px_1px_0px,var(--destructive)_0px_0px_0px_1px_inset]',
        className,
      )}
      {...props}
    />
  )
}

export { Textarea }
