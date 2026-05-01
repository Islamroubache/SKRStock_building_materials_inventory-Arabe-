import React, { useState, useCallback } from 'react'
import { AlertCircle, CheckCircle2 } from 'lucide-react'

interface PhoneInputProps {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  required?: boolean
  disabled?: boolean
  error?: string
  countryCode?: string
  className?: string
}

const validatePhone = (phone: string): string | null => {
  if (!phone) return 'رقم الهاتف مطلوب'
  // Algerian phone numbers: +213, 0213, or 0 followed by 9 digits
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 9 && cleaned.startsWith('5')) return null // 05XXXXXXXXX
  if (cleaned.length === 10 && cleaned.startsWith('05')) return null // 05XXXXXXXXX
  if (cleaned.length === 12 && cleaned.startsWith('213')) return null // 213XXXXXXXXX
  return 'رقم الهاتف غير صحيح. استخدم رقم جزائري صحيح'
}

const formatPhone = (value: string): string => {
  const cleaned = value.replace(/\D/g, '')
  if (!cleaned) return ''
  
  // Format as: 05XX XXX XXXX
  if (cleaned.startsWith('0')) {
    const part1 = cleaned.slice(0, 2)
    const part2 = cleaned.slice(2, 5)
    const part3 = cleaned.slice(5, 9)
    return `${part1}${part2 ? ' ' + part2 : ''}${part3 ? ' ' + part3 : ''}`
  }
  return cleaned
}

export const PhoneInput = React.forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ label = 'رقم الهاتف', placeholder = '05XX XXX XXXX', value = '', onChange, onBlur, required = false, disabled = false, error: externalError, countryCode = '+213', className = '' }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [touched, setTouched] = useState(false)

    const validationError = touched && !externalError ? validatePhone(value) : externalError
    const isValid = touched && !validationError && value.length > 0

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value)
        onChange?.(formatted)
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
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">
            {countryCode}
          </div>
          <input
            ref={ref}
            type="tel"
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            disabled={disabled}
            autoComplete="tel"
            className={`
              w-full pl-12 pr-4 py-3 rounded-lg font-medium text-gray-900 
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

          {isValid && <CheckCircle2 className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500" size={20} />}
          {validationError && touched && <AlertCircle className="absolute right-3 top-1/2 -translate-y-1/2 text-red-500" size={20} />}
        </div>

        {touched && validationError && <p className="text-sm text-red-500 mt-2 font-medium">{validationError}</p>}
      </div>
    )
  }
)

PhoneInput.displayName = 'PhoneInput'
