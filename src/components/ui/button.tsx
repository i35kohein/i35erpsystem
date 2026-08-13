import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { Loader2 } from "lucide-react"
import { cn } from "../../lib/utils"

const buttonVariants = cva(
  // audit A-P3: single transition-all (transition-colors was dead weight —
  // tailwind-merge dropped it); audit A-P1: focus-visible ring restores the
  // keyboard indicator the global outline removal took away.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-xs font-bold ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-white disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer active:scale-95 transition-all",
  {
    variants: {
      variant: {
        default: "bg-brand text-white hover:bg-brand-deep shadow-xs",
        destructive: "bg-danger text-white hover:bg-danger-deep shadow-xs",
        outline: "border border-line bg-white text-ink hover:bg-surface hover:text-ink",
        secondary: "bg-surface text-ink hover:bg-line",
        ghost: "hover:bg-surface text-ink",
        link: "text-brand underline-offset-4 hover:underline",
        success: "bg-success text-white hover:bg-success/90 shadow-xs",
        // audit A-P3: 32px chip is a deliberate desktop-dense variant (not a
        // primary touch control); document the intentional sub-40px size.
        chip: "h-8 rounded-full border border-line bg-white px-3 text-xs font-bold text-ink hover:bg-surface",
        iconGhost: "text-muted hover:text-ink hover:bg-surface rounded-lg",
      },
      size: {
        default: "h-10 px-4 py-2",  // 40px everywhere (app touch standard)
        // audit A-P3: lg:h-8 (32px) is intentional for dense desktop header
        // rows; touch-first controls should use the default h-10 size.
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
  /** audit A-P2: render a spinner, disable the button and set aria-busy. */
  loading?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, type = 'button', loading = false, disabled, children, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        // audit F-P3: native button default is type="submit" — default to
        // "button" so an unlabelled Button inside a form can't submit it.
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        {...props}
      >
        {loading && !asChild && <Loader2 className="h-4 w-4 animate-spin" />}
        {children}
      </Comp>
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
