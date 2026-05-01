import React from 'react'
import { Printer, Download, Trash2, Edit, FileText, Share2, Plus, Search } from 'lucide-react'
import { ModernButton, ModernButtonProps } from './modern-button'

// Print Button - All print buttons will use this
export const PrintButton: React.FC<Omit<ModernButtonProps, 'variant' | 'icon'>> = ({ ...props }) => (
  <ModernButton
    variant="outline"
    size="md"
    icon={<Printer size={18} />}
    {...props}
  >
    {props.children || 'طباعة'}
  </ModernButton>
)

// Export Button - All export buttons will use this
export const ExportButton: React.FC<Omit<ModernButtonProps, 'variant' | 'icon'>> = ({ ...props }) => (
  <ModernButton
    variant="success"
    size="md"
    icon={<Download size={18} />}
    {...props}
  >
    {props.children || 'تصدير'}
  </ModernButton>
)

// Download Button
export const DownloadButton: React.FC<Omit<ModernButtonProps, 'variant' | 'icon'>> = ({ ...props }) => (
  <ModernButton
    variant="primary"
    size="md"
    icon={<Download size={18} />}
    {...props}
  >
    {props.children || 'تحميل'}
  </ModernButton>
)

// Delete Button - All delete buttons will use this
export const DeleteButton: React.FC<Omit<ModernButtonProps, 'variant' | 'icon'>> = ({ ...props }) => (
  <ModernButton
    variant="danger"
    size="md"
    icon={<Trash2 size={18} />}
    {...props}
  >
    {props.children || 'حذف'}
  </ModernButton>
)

// Edit Button - All edit buttons will use this
export const EditButton: React.FC<Omit<ModernButtonProps, 'variant' | 'icon'>> = ({ ...props }) => (
  <ModernButton
    variant="primary"
    size="md"
    icon={<Edit size={18} />}
    {...props}
  >
    {props.children || 'تعديل'}
  </ModernButton>
)

// Add Button
export const AddButton: React.FC<Omit<ModernButtonProps, 'variant' | 'icon'>> = ({ ...props }) => (
  <ModernButton
    variant="success"
    size="lg"
    icon={<Plus size={20} />}
    {...props}
  >
    {props.children || 'إضافة'}
  </ModernButton>
)

// Search Button
export const SearchButton: React.FC<Omit<ModernButtonProps, 'variant' | 'icon'>> = ({ ...props }) => (
  <ModernButton
    variant="primary"
    size="md"
    icon={<Search size={18} />}
    {...props}
  >
    {props.children || 'بحث'}
  </ModernButton>
)

// Share Button
export const ShareButton: React.FC<Omit<ModernButtonProps, 'variant' | 'icon'>> = ({ ...props }) => (
  <ModernButton
    variant="secondary"
    size="md"
    icon={<Share2 size={18} />}
    {...props}
  >
    {props.children || 'مشاركة'}
  </ModernButton>
)

// Icon Button (for inline table actions)
export const IconButton: React.FC<Omit<ModernButtonProps, 'children'> & { icon: React.ReactNode; tooltip?: string }> = ({ icon, tooltip, ...props }) => (
  <button
    className="p-2 rounded-full text-gray-600 hover:bg-purple-100 hover:text-purple-600 transition-colors"
    title={tooltip}
    {...props}
  >
    {icon}
  </button>
)
