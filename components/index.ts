// ============================================
// Central Export File for All Components
// Use these imports throughout the app
// ============================================

// Form Components
export { FormInput } from './forms/form-input'
export { EmailInput } from './forms/email-input'
export { PhoneInput } from './forms/phone-input'
export { DateInput } from './forms/date-input'
export { AddressInput } from './forms/address-input'

// Button Components
export {
  ModernButton,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  SuccessButton,
  OutlineButton,
  GhostButton,
  type ButtonVariant,
  type ButtonSize,
} from './ui/modern-button'

export {
  PrintButton,
  ExportButton,
  DownloadButton,
  DeleteButton,
  EditButton,
  AddButton,
  SearchButton,
  ShareButton,
  IconButton,
} from './ui/action-buttons'

// Modal Components
export {
  ModernModal,
  AlertModal,
  ConfirmationModal,
} from './ui/modern-modal'

// Table Components
export {
  ModernTable,
  type TableColumn,
} from './ui/modern-table'

// Other UI Components
export { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card'
export { Badge } from './ui/badge'
export { Input } from './ui/input'

// Layout Components
export { default as AppLayout } from './AppLayout'
export { TopBar } from './AppLayout'
export { Sidebar } from './AppLayout'

// ============================================
// Quick Import Example:
// import { FormInput, PrimaryButton, ModernModal, ModernTable } from '@/components'
// ============================================
