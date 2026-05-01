import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:
          "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:shadow-lg hover:from-blue-700 hover:to-blue-800 rounded-full",
        secondary:
          "bg-gradient-to-r from-purple-600 to-purple-700 text-white hover:shadow-lg hover:from-purple-700 hover:to-purple-800 rounded-full",
        destructive:
          "bg-red-600 text-white hover:bg-red-700 hover:shadow-lg rounded-full",
        outline:
          "border-2 border-blue-300 text-blue-700 hover:bg-blue-50 rounded-full",
        ghost: "text-blue-700 hover:bg-blue-100 rounded-full",
        success:
          "bg-gradient-to-r from-emerald-600 to-emerald-700 text-white hover:shadow-lg hover:from-emerald-700 hover:to-emerald-800 rounded-full",
      },
      size: {
        default: "h-10 px-6",
        sm: "h-8 px-4 text-xs",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10 p-0",
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
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      className={buttonVariants({ variant, size, className })}
      ref={ref}
      {...props}
    />
  )
)
Button.displayName = "Button"

export { Button, buttonVariants }
