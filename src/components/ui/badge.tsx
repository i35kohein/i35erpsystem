import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-[#0071E3] text-white",
        secondary:
          "border-transparent bg-[#F5F5F7] text-[#1D1D1F]",
        destructive:
          "border-transparent bg-rose-100 text-rose-700 border-rose-200",
        outline: "text-[#1D1D1F] border-[#E5E5EA]",
        success: "bg-[#EAF8ED] text-[#28A745] border-[#34C759]/30",
        warning: "bg-amber-50 text-amber-700 border-amber-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
