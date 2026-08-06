import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-95 transition-all",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-deep shadow-xs",
        destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-xs",
        outline: "border border-line bg-white text-ink hover:bg-slate-50 hover:text-slate-900",
        secondary: "bg-surface text-ink hover:bg-slate-200",
        ghost: "hover:bg-slate-100 text-ink",
        link: "text-brand underline-offset-4 hover:underline",
        success: "bg-success text-white hover:bg-success/90 shadow-xs",
        chip: "h-8 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink hover:bg-surface",
        iconGhost: "text-muted hover:text-ink hover:bg-surface rounded-lg",
      },
      size: {
        default: "h-11 lg:h-9 px-4 py-2",
        sm: "h-10 lg:h-8 rounded-xl px-3 text-xs",
        lg: "h-12 lg:h-11 rounded-xl px-6 lg:px-8 text-sm",
        icon: "h-10 w-10",
        iconSm: "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
