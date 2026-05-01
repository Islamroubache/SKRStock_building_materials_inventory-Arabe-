import React, { useState, useCallback } from 'react'
import { AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react'

interface FormInputProps {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  type?: 'text' | 'email' | 'password' | 'number' | 'search'
  required?: boolean
  disabled?: boolean
  error?: string
  helper?: string
  showSuccess?: boolean
  maxLength?: number
  pattern?: string
  className?: string
  autoComplete?: string
}

export const FormInput = React.forwardRef<HTMLInputElement, FormInputProps>(
  (
    {
      label,
      placeholder,
      value = '',
      onChange,
      onBlur,
      type = 'text',
      required = false,
      disabled = false,
      error,
      helper,
      showSuccess = false,
      maxLength,
      pattern,
      className = '',
      autoComplete,
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false)
    const [isFocused, setIsFocused] = useState(false)
    const [touched, setTouched] = useState(false)

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange?.(e.target.value)
      },
      [onChange]
    )

    const handleBlur = () => {
      setTouched(true)
      onBlur?.()
      setIsFocused(false)
    }

    const inputType = type === 'password' && showPassword ? 'text' : type

    return (
      <div className={`w-full ${className}`}>
        {label && (
          <label className="block text-sm font-semibold text-gray-900 mb-2">
            {label}
            {required && <span className="text-red-500 ml-1">*</span>}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            type={inputType}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            disabled={disabled}
            maxLength={maxLength}
            pattern={pattern}
            autoComplete={autoComplete}
            className={`
              w-full px-4 py-3 rounded-lg font-medium text-gray-900 
              placeholder-gray-500 transition-all duration-200
              border-2 bg-white
              ${
                disabled
                  ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                  : isFocused
                    ? 'border-purple-500 bg-white'
                    : error && touched
                      ? 'border-red-500 bg-red-50/30'
                      : showSuccess && touched
                        ? 'border-emerald-500 bg-emerald-50/30'
                        : 'border-gray-200 bg-white hover:border-gray-300'
              }
            `}
          />

          {type === 'password' && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          )}

          {showSuccess && touched && !error && (
            <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />
          )}

          {error && touched && (
            <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={20} />
          )}
        </div>

        {touched && error && <p className="text-sm text-red-500 mt-2 font-medium">{error}</p>}
        {!error && helper && <p className="text-sm text-gray-500 mt-2">{helper}</p>}
        {maxLength && (
          <p className="text-xs text-gray-400 mt-1">
            {value.length}/{maxLength}
          </p>
        )}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'
