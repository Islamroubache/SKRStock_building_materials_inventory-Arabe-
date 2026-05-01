import React, { useState, useCallback } from 'react'
import { AlertCircle, CheckCircle2, MapPin } from 'lucide-react'

interface AddressInputProps {
  label?: string
  placeholder?: string
  value?: string
  onChange?: (value: string) => void
  onBlur?: () => void
  required?: boolean
  disabled?: boolean
  error?: string
  city?: string
  className?: string
}

const validateAddress = (address: string): string | null => {
  if (!address) return 'العنوان مطلوب'
  if (address.trim().length < 5) return 'العنوان قصير جداً (5 أحرف على الأقل)'
  if (address.length > 200) return 'العنوان طويل جداً (200 حرف كحد أقصى)'
  return null
}

export const AddressInput = React.forwardRef<HTMLTextAreaElement, AddressInputProps>(
  ({ label = 'العنوان', placeholder = 'شارع، رقم المنزل، الحي...', value = '', onChange, onBlur, required = false, disabled = false, error: externalError, city = '', className = '' }, ref) => {
    const [isFocused, setIsFocused] = useState(false)
    const [touched, setTouched] = useState(false)

    const validationError = touched && !externalError ? validateAddress(value) : externalError
    const isValid = touched && !validationError && value.length > 0

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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
          <textarea
            ref={ref}
            value={value}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={() => setIsFocused(true)}
            placeholder={placeholder}
            disabled={disabled}
            rows={3}
            className={`
              w-full pl-10 pr-4 py-3 rounded-lg font-medium text-gray-900 
              placeholder-gray-500 transition-all duration-200
              border-2 bg-white resize-none
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

          <MapPin className="absolute left-3 top-3 text-gray-400 pointer-events-none flex-shrink-0" size={20} />

          {isValid && <CheckCircle2 className="absolute right-3 bottom-3 text-emerald-500 flex-shrink-0" size={20} />}
          {validationError && touched && <AlertCircle className="absolute right-3 bottom-3 text-red-500 flex-shrink-0" size={20} />}
        </div>

        {touched && validationError && <p className="text-sm text-red-500 mt-2 font-medium">{validationError}</p>}

        <div className="mt-2 flex items-center gap-2 text-sm text-gray-500">
          {city && <span>المدينة: {city}</span>}
          <span>{value.length}/200</span>
        </div>
      </div>
    )
  }
)

AddressInput.displayName = 'AddressInput'
