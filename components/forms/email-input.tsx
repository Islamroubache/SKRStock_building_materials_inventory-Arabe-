import React, { useState, useCallback } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface EmailInputProps {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  required?: boolean
  disabled?: boolean
  error?: string
  className?: string
}

const validateEmail = (email: string): string | null => {
  if (!email) return 'البريد الإلكتروني مطلوب'
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) return 'صيغة البريد الإلكتروني غير صحيحة'
  return null
}

export const EmailInput = React.forwardRef<HTMLInputElement, EmailInputProps>(
  ({ label = 'البريد الإلكتروني', placeholder = 'example@email.com', value = '', onChange, onBlur, required = false, disabled = false, error: externalError, className = '' }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [touched, setTouched] = useState(false)

    const validationError = touched && !externalError ? validateEmail(value) : externalError

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

    const isValid = touched && !validationError && value.length > 0

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
            type="email"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="email"
            className={`
              w-full px-4 py-3 rounded-lg font-medium text-gray-900 
              placeholder-gray-500 transition-all duration-200
              border-2 bg-white
              ${
                disabled
                  ? 'bg-gray-100 border-gray-200 text-gray-500 cursor-not-allowed'
                  : isFocused
                    ? 'border-purple-500 bg-white'
                    : validationError && touched
                      ? 'border-red-500 bg-red-50/30'
                      : isValid
                        ? 'border-emerald-500 bg-emerald-50/30'
                        : 'border-gray-200 bg-white hover:border-gray-300'
              }
            `}
          />

          {isValid && <CheckCircle2 className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />}
          {validationError && touched && <AlertCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-red-500" size={20} />}
        </div>

        {touched && validationError && <p className="text-sm text-red-500 mt-2 font-medium">{validationError}</p>}
      </div>
    )
  }
)

EmailInput.displayName = 'EmailInput'
