import React, { useState, useCallback } from 'react'
import { AlertCircle, CheckCircle2, Calendar } from 'lucide-react'

interface DateInputProps {
  label?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  required?: boolean
  disabled?: boolean
  error?: string
  minDate?: string
  maxDate?: string
  type?: 'date' | 'datetime-local'
  className?: string
}

const validateDate = (date: string, minDate?: string, maxDate?: string): string | null => {
  if (!date) return 'التاريخ مطلوب'
  
  const selected = new Date(date)
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  if (minDate) {
    const min = new Date(minDate)
    if (selected < min) return 'التاريخ لا يمكن أن يكون قبل التاريخ المحدد'
  }

  if (maxDate) {
    const max = new Date(maxDate)
    if (selected > max) return 'التاريخ لا يمكن أن يكون بعد التاريخ المحدد'
  }

  return null
}

export const DateInput = React.forwardRef<HTMLInputElement, DateInputProps>(
  ({ label = 'التاريخ', value = '', onChange, onBlur, required = false, disabled = false, error: externalError, minDate, maxDate, type = 'date', className = '' }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [touched, setTouched] = useState(false)

    const validationError = touched && !externalError ? validateDate(value, minDate, maxDate) : externalError
    const isValid = touched && !validationError && value.length > 0

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
            type={type}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            disabled={disabled}
            min={minDate}
            max={maxDate}
            className={`
              w-full pl-10 pr-4 py-3 rounded-lg font-medium text-gray-900 
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

          <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={20} />

          {isValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />}
          {validationError && touched && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={20} />}
        </div>

        {touched && validationError && <p className="text-sm text-red-500 mt-2 font-medium">{validationError}</p>}
      </div>
    )
  }
)

DateInput.displayName = 'DateInput'
