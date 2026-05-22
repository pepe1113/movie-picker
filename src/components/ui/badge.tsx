import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { Slot } from 'radix-ui'

import { cn } from '@/lib/utils'

const badgeVariants = cva(
  'inline-flex w-fit shrink-0 items-center justify-center gap-1.5 overflow-hidden whitespace-nowrap rounded-sm border border-transparent px-2.5 py-1 text-[0.66rem] font-semibold capitalize transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 [&>svg]:size-3 [&>svg]:pointer-events-none',
  {
    variants: {
      variant: {
        default: 'bg-accent text-accent-foreground [a&]:hover:bg-accent/90',
        secondary:
          'border-transparent bg-muted text-foreground [a&]:hover:bg-muted/80',
        destructive:
          'bg-destructive text-destructive-foreground [a&]:hover:bg-destructive/90',
        outline:
          'border-border bg-transparent text-foreground [a&]:hover:border-foreground',
        ghost:
          'border-transparent text-muted-foreground [a&]:hover:text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
)

function Badge({
  className,
  variant = 'default',
  asChild = false,
  ...props
}: React.ComponentProps<'span'> &
  VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : 'span'

  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  )
}

export { Badge, badgeVariants }
