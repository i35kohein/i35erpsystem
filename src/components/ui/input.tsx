import * as React from "react"
import { cn } from "../../lib/utils"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** error styling (red border + ring) */
  invalid?: boolean
}

/**
 * THE one input component (Button-policy equivalent for fields).
 * Base: 40px (h-10), white bg, text-sm, rounded-xl, hairline border,
 * brand focus ring, muted placeholder, disabled state. Override via className
 * (tailwind-merge). Raw <input> is banned outside the ui kit — see README.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, invalid, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-xl border border-line bg-white px-3.5 text-sm text-ink transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted focus-visible:outline-none focus-visible:border-brand focus-visible:ring-2 focus-visible:ring-brand/20 disabled:cursor-not-allowed disabled:opacity-50",
          invalid && "border-rose-500 focus-visible:border-rose-500 focus-visible:ring-rose-500/20",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
