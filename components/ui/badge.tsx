import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default:
          "border border-blue-200/50 bg-blue-50 text-blue-700 hover:bg-blue-100",
        secondary:
          "border border-purple-200/50 bg-purple-50 text-purple-700 hover:bg-purple-100",
        destructive:
          "border border-red-200/50 bg-red-50 text-red-700 hover:bg-red-100",
        success:
          "border border-emerald-200/50 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
        warning:
          "border border-amber-200/50 bg-amber-50 text-amber-700 hover:bg-amber-100",
        outline: "border-2 border-gray-300 text-gray-700",
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

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={badgeVariants({ variant, className })} {...props} />
  )
}

export { Badge, badgeVariants }
