import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-bold transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground shadow-[rgba(0,0,0,0.35)_0px_8px_20px] hover:scale-[1.03] hover:bg-primary/90',
        outline:
          'border border-border bg-transparent text-foreground hover:border-foreground hover:bg-secondary',
        ghost:
          'bg-transparent text-muted-foreground hover:bg-secondary hover:text-foreground',
        link: 'rounded-none px-0 text-foreground underline decoration-muted-foreground underline-offset-4 hover:text-primary',
        destructive:
          'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        secondary:
          'bg-secondary text-secondary-foreground shadow-[rgba(0,0,0,0.3)_0px_8px_8px] hover:bg-muted',
      },
      size: {
        default: 'h-11 px-5 py-3',
        xs: "h-8 gap-1 px-3 py-2 text-xs has-[>svg]:px-2 [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-9 gap-1.5 px-4 py-2 text-xs',
        lg: 'h-14 gap-3 px-7 py-4 text-sm uppercase tracking-[1.4px]',
        icon: 'size-11 px-0',
        'icon-xs': "size-8 px-0 [&_svg:not([class*='size-'])]:size-3",
        'icon-sm': 'size-9 px-0',
        'icon-lg': 'size-14 px-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)

function Button({
  className,
  variant = 'default',
  size = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : 'button'

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
