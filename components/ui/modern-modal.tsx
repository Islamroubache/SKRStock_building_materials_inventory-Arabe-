import React, { useEffect } from 'react'
import { X } from 'lucide-react'
import { ModernButton } from './modern-button'

interface ModernModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  description?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showCloseButton?: boolean
  onConfirm?: () => void
  onCancel?: () => void
  confirmText?: string
  cancelText?: string
  isLoading?: boolean
  isDangerous?: boolean
}

const sizeStyles = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-2xl',
}

export const ModernModal: React.FC<ModernModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  showCloseButton = true,
  onConfirm,
  onCancel,
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  isLoading = false,
  isDangerous = false,
}) => {
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className={`
            bg-white rounded-2xl shadow-2xl w-full ${sizeStyles[size]}
            animate-in fade-in zoom-in duration-300
            max-h-[90vh] overflow-y-auto
          `}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex-1">
                {title && <h2 className="text-2xl font-bold text-gray-900">{title}</h2>}
                {description && <p className="text-gray-500 mt-2">{description}</p>}
              </div>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors ml-4"
                >
                  <X size={24} />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="p-6">{children}</div>

          {/* Footer - Only show if there are actions */}
          {(onConfirm || onCancel) && (
            <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
              {onCancel && (
                <ModernButton
                  variant="secondary"
                  size="md"
                  onClick={onCancel}
                  disabled={isLoading}
                >
                  {cancelText}
                </ModernButton>
              )}
              {onConfirm && (
                <ModernButton
                  variant={isDangerous ? 'danger' : 'primary'}
                  size="md"
                  onClick={onConfirm}
                  isLoading={isLoading}
                  disabled={isLoading}
                >
                  {confirmText}
                </ModernButton>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

// Simple Alert Modal
export const AlertModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
  type?: 'info' | 'success' | 'warning' | 'error'
}> = ({ isOpen, onClose, title, message, type = 'info' }) => {
  const bgColor = {
    info: 'bg-blue-50 border-blue-200',
    success: 'bg-emerald-50 border-emerald-200',
    warning: 'bg-amber-50 border-amber-200',
    error: 'bg-red-50 border-red-200',
  }[type]

  const textColor = {
    info: 'text-blue-900',
    success: 'text-emerald-900',
    warning: 'text-amber-900',
    error: 'text-red-900',
  }[type]

  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      onConfirm={onClose}
      confirmText="حسناً"
    >
      <div className={`p-4 rounded-lg border-2 ${bgColor}`}>
        <p className={`${textColor} font-medium`}>{message}</p>
      </div>
    </ModernModal>
  )
}

// Confirmation Modal
export const ConfirmationModal: React.FC<{
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  isDangerous?: boolean
  isLoading?: boolean
}> = ({ isOpen, onClose, onConfirm, title, message, isDangerous = false, isLoading = false }) => {
  return (
    <ModernModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      size="sm"
      onConfirm={onConfirm}
      onCancel={onClose}
      confirmText="تأكيد"
      cancelText="إلغاء"
      isDangerous={isDangerous}
      isLoading={isLoading}
    >
      <p className="text-gray-700">{message}</p>
    </ModernModal>
  )
}
