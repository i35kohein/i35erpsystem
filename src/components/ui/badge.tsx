import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors ",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-brand text-white",
        secondary:
          "border-transparent bg-surface text-ink",
        destructive:
          "border-transparent bg-danger/15 text-danger border-danger/30",
        outline: "text-ink border-line",
        success: "bg-success/10 text-success-deep border-success/30",
        warning: "bg-warning/10 text-warning border-warning/30",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  // audit A-P3: render a <span> — badges sit inside Buttons/links where a
  // <div> would be invalid HTML nesting.
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
