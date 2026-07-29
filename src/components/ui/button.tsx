import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold ring-offset-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-95 transition-all",
  {
    variants: {
      variant: {
        default: "bg-[#0071E3] text-white hover:bg-[#0077ED] shadow-xs",
        destructive: "bg-rose-600 text-white hover:bg-rose-700 shadow-xs",
        outline: "border border-[#E5E5EA] bg-white text-[#1D1D1F] hover:bg-slate-50 hover:text-slate-900",
        secondary: "bg-[#F5F5F7] text-[#1D1D1F] hover:bg-slate-200",
        ghost: "hover:bg-slate-100 text-[#1D1D1F]",
        link: "text-[#0071E3] underline-offset-4 hover:underline",
        success: "bg-[#34C759] text-white hover:bg-[#30B753] shadow-xs",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-xl px-8 text-sm",
        icon: "h-9 w-9",
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
