import * as React from 'react'

import { cn } from '@/lib/utils'

function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'file:text-foreground placeholder:text-muted-foreground selection:bg-accent selection:text-accent-foreground bg-input text-foreground h-12 w-full min-w-0 rounded-full border-0 px-5 py-3 text-base shadow-[rgb(18,18,18)_0px_1px_0px,rgb(124,124,124)_0px_0px_0px_1px_inset] transition-[box-shadow,background-color] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        'focus:bg-secondary focus:shadow-[rgb(18,18,18)_0px_1px_0px,rgb(255,255,255)_0px_0px_0px_1px_inset]',
        'aria-invalid:border-destructive',
        className,
      )}
      {...props}
    />
  )
}

export { Input }
