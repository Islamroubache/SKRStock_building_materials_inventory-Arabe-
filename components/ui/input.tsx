import * as React from "react"

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={`flex h-10 w-full rounded-lg border border-blue-200/50 bg-white px-4 py-2 text-sm text-gray-900 placeholder:text-gray-500 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50 transition-all ${
        className || ""
      }`}
      ref={ref}
      {...props}
    />
  )
)
Input.displayName = "Input"

export { Input }
