import React from 'lucide-react'

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline' | 'ghost'
export type ButtonSize = 'sm' | 'md' | 'lg'

interface ModernButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  children: React.ReactNode
}

const variantStyles = {
  primary: 'bg-gradient-to-r from-purple-600 to-purple-500 text-white hover:from-purple-700 hover:to-purple-600 shadow-md hover:shadow-lg',
  secondary: 'bg-gray-200 text-gray-900 hover:bg-gray-300 shadow-sm hover:shadow-md',
  danger: 'bg-red-600 text-white hover:bg-red-700 shadow-md hover:shadow-lg',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md hover:shadow-lg',
  warning: 'bg-amber-600 text-white hover:bg-amber-700 shadow-md hover:shadow-lg',
  outline: 'border-2 border-purple-600 text-purple-600 hover:bg-purple-50 bg-white',
  ghost: 'text-purple-600 hover:bg-purple-50 bg-transparent',
}

const sizeStyles = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-2.5 text-base',
  lg: 'px-8 py-3 text-lg',
}

export const ModernButton = React.forwardRef<HTMLButtonElement, ModernButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled = false,
      className = '',
      children,
      ...props
    },
    ref
  ) => {
    const baseStyles = 'rounded-full font-semibold transition-all duration-200 flex items-center justify-center gap-2'
    const variantStyle = variantStyles[variant]
    const sizeStyle = sizeStyles[size]
    const disabledStyle = disabled || isLoading ? 'opacity-60 cursor-not-allowed' : ''
    const widthStyle = fullWidth ? 'w-full' : ''

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyle} ${sizeStyle} ${disabledStyle} ${widthStyle} ${className}`}
        {...props}
      >
        {isLoading && (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent" />
        )}

        {icon && iconPosition === 'left' && !isLoading && icon}

        <span>{children}</span>

        {icon && iconPosition === 'right' && !isLoading && icon}
      </button>
    )
  }
)

ModernButton.displayName = 'ModernButton'

// Specialized button components
export const PrimaryButton: React.FC<Omit<ModernButtonProps, 'variant'>> = (props) => (
  <ModernButton variant="primary" {...props} />
)

export const SecondaryButton: React.FC<Omit<ModernButtonProps, 'variant'>> = (props) => (
  <ModernButton variant="secondary" {...props} />
)

export const DangerButton: React.FC<Omit<ModernButtonProps, 'variant'>> = (props) => (
  <ModernButton variant="danger" {...props} />
)

export const SuccessButton: React.FC<Omit<ModernButtonProps, 'variant'>> = (props) => (
  <ModernButton variant="success" {...props} />
)

export const OutlineButton: React.FC<Omit<ModernButtonProps, 'variant'>> = (props) => (
  <ModernButton variant="outline" {...props} />
)

export const GhostButton: React.FC<Omit<ModernButtonProps, 'variant'>> = (props) => (
  <ModernButton variant="ghost" {...props} />
)
