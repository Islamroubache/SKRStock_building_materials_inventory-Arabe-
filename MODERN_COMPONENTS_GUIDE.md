# SKRStock Modern Components Guide

## Overview
This document outlines all the modern, reusable components created for the SKRStock inventory management system redesign. These components follow modern design patterns, include real-time validation, and provide excellent user experience.

---

## Form Input Components

### 1. FormInput
Basic text input with real-time validation and success/error states.

**Location:** `components/forms/form-input.tsx`

**Features:**
- Real-time validation feedback
- Password visibility toggle
- Max length tracking
- Success/error icons
- Helper text support
- Required field indicators

**Usage:**
```tsx
import { FormInput } from '@/components/forms'

<FormInput
  label="اسم المنتج"
  placeholder="أدخل الاسم"
  value={value}
  onChange={setValue}
  error={error}
  required
  maxLength={100}
/>
```

### 2. EmailInput
Specialized email input with automatic validation.

**Location:** `components/forms/email-input.tsx`

**Features:**
- Automatic email format validation
- Real-time feedback
- Arabic error messages
- RTL support

**Usage:**
```tsx
import { EmailInput } from '@/components/forms'

<EmailInput
  value={email}
  onChange={setEmail}
  required
/>
```

### 3. PhoneInput
Algerian phone number input with formatting and validation.

**Location:** `components/forms/phone-input.tsx`

**Features:**
- Automatic Algerian phone number formatting
- Supports multiple formats (05XX XXX XXXX, +213, etc.)
- Real-time validation
- Country code prefix
- Arabic error messages

**Usage:**
```tsx
import { PhoneInput } from '@/components/forms'

<PhoneInput
  value={phone}
  onChange={setPhone}
  required
  countryCode="+213"
/>
```

### 4. DateInput
Modern date picker with range validation.

**Location:** `components/forms/date-input.tsx`

**Features:**
- Date validation
- Min/max date support
- datetime-local support
- Calendar icon
- Arabic error messages

**Usage:**
```tsx
import { DateInput } from '@/components/forms'

<DateInput
  value={date}
  onChange={setDate}
  minDate={minDate}
  maxDate={maxDate}
  required
/>
```

### 5. AddressInput
Multi-line address input with validation.

**Location:** `components/forms/address-input.tsx`

**Features:**
- 3-line textarea
- Address validation (5-200 characters)
- Character counter
- City display
- RTL support

**Usage:**
```tsx
import { AddressInput } from '@/components/forms'

<AddressInput
  value={address}
  onChange={setAddress}
  city="الجزائر"
  required
/>
```

---

## Button Components

### ModernButton
Base button component with variants and sizes.

**Location:** `components/ui/modern-button.tsx`

**Variants:** `primary` | `secondary` | `danger` | `success` | `warning` | `outline` | `ghost`

**Sizes:** `sm` | `md` | `lg`

**Features:**
- Loading state with spinner
- Icon support (left/right)
- Full width option
- Disabled state
- Smooth transitions

**Usage:**
```tsx
import { ModernButton, PrimaryButton } from '@/components/ui'

<ModernButton
  variant="primary"
  size="lg"
  isLoading={loading}
  icon={<Icon />}
>
  Click Me
</ModernButton>

// Shortcut
<PrimaryButton>Primary Action</PrimaryButton>
```

### Action Button Components
Specialized buttons for common actions. **All action buttons across all pages use these same components for consistency.**

**PrintButton** - For printing pages
```tsx
import { PrintButton } from '@/components/ui'
<PrintButton onClick={handlePrint} />
```

**ExportButton** - For exporting data (Excel, CSV, PDF)
```tsx
import { ExportButton } from '@/components/ui'
<ExportButton onClick={handleExport} />
```

**DeleteButton** - For delete actions
```tsx
import { DeleteButton } from '@/components/ui'
<DeleteButton onClick={handleDelete} />
```

**EditButton** - For edit actions
```tsx
import { EditButton } from '@/components/ui'
<EditButton onClick={handleEdit} />
```

**AddButton** - For adding new items
```tsx
import { AddButton } from '@/components/ui'
<AddButton onClick={handleAdd}>منتج جديد</AddButton>
```

**IconButton** - For inline table actions
```tsx
import { IconButton } from '@/components/ui'
<IconButton
  icon={<Edit2 size={18} />}
  tooltip="تعديل"
  onClick={handleEdit}
/>
```

---

## Modal Components

### ModernModal
Main modal component with title, content, and actions.

**Location:** `components/ui/modern-modal.tsx`

**Features:**
- Smooth animations
- Backdrop blur
- Escape key support
- Scrollable content
- Optional close button
- Confirmation/cancel buttons
- Dangerous action support

**Usage:**
```tsx
import { ModernModal } from '@/components/ui'

<ModernModal
  isOpen={isOpen}
  onClose={onClose}
  title="Add Product"
  description="Fill in the product details"
  size="lg"
  onConfirm={handleSave}
  onCancel={onClose}
  confirmText="Save"
  cancelText="Cancel"
  isDangerous={false}
  isLoading={loading}
>
  {/* Modal content */}
</ModernModal>
```

### AlertModal
Simple alert modal for notifications.

```tsx
import { AlertModal } from '@/components/ui'

<AlertModal
  isOpen={isOpen}
  onClose={onClose}
  title="Success"
  message="Product added successfully"
  type="success" // info | success | warning | error
/>
```

### ConfirmationModal
Specialized modal for confirmations (especially dangerous actions).

```tsx
import { ConfirmationModal } from '@/components/ui'

<ConfirmationModal
  isOpen={isOpen}
  onClose={onClose}
  onConfirm={handleDelete}
  title="Delete Product?"
  message="This action cannot be undone."
  isDangerous={true}
  isLoading={loading}
/>
```

---

## Table Component

### ModernTable
Advanced data table with sorting, expansion, and striping.

**Location:** `components/ui/modern-table.tsx`

**Features:**
- Sortable columns
- Expandable rows
- Striped rows
- Loading skeletons
- Empty states
- Hover effects
- Custom column rendering
- RTL support

**Usage:**
```tsx
import { ModernTable, TableColumn } from '@/components/ui'

interface Product {
  id: string
  name: string
  price: number
}

const columns: TableColumn<Product>[] = [
  {
    key: 'name',
    header: 'Product Name',
    sortable: true,
    render: (val) => <span className="font-semibold">{val}</span>
  },
  {
    key: 'price',
    header: 'Price',
    sortable: true,
    render: (val) => `${val.toLocaleString()} دج`,
    align: 'left'
  }
]

<ModernTable
  data={products}
  columns={columns}
  isLoading={loading}
  loadingRows={5}
  expandable={true}
  expandedContent={(item) => <ProductDetails item={item} />}
  striped={true}
  emptyMessage="No products found"
/>
```

---

## Form Validation Best Practices

### Real-Time Validation Pattern

```tsx
const [formData, setFormData] = useState({
  name: '',
  phone: '',
  email: '',
  address: '',
})

const [formErrors, setFormErrors] = useState<Record<string, string>>({})

const validateForm = () => {
  const errors: Record<string, string> = {}
  if (!formData.name.trim()) errors.name = 'Name is required'
  if (!formData.phone) errors.phone = 'Phone is required'
  // ... more validation
  setFormErrors(errors)
  return Object.keys(errors).length === 0
}

const handleSubmit = async () => {
  if (!validateForm()) return
  // Submit form
}

return (
  <>
    <FormInput
      label="Name"
      value={formData.name}
      onChange={(val) => setFormData(p => ({ ...p, name: val }))}
      error={formErrors.name}
      required
    />
    <PhoneInput
      value={formData.phone}
      onChange={(val) => setFormData(p => ({ ...p, phone: val }))}
      error={formErrors.phone}
      required
    />
  </>
)
```

---

## Color System

All modern components use consistent colors:

- **Primary:** Purple (from-purple-600 to-purple-500)
- **Secondary:** Gray (bg-gray-200)
- **Danger:** Red (bg-red-600)
- **Success:** Emerald (bg-emerald-600)
- **Warning:** Amber (bg-amber-600)
- **Info:** Blue (bg-blue-600)
- **Accent:** Cyan (bg-cyan-600)

---

## Usage Across Pages

### Dashboard Page (`app/dashboard/page.tsx`)
- KPI cards with gradients
- Area charts for trends
- Modern tables for product performance
- Alert cards
- Period filters with consistent buttons

### Products Page (`app/products/page.tsx`)
- Search and filter bar
- Modern data table
- Add/Edit modals with form inputs
- Delete confirmation
- Action buttons (Print, Export, Edit, Delete)

### Orders Page (`app/orders/page.tsx`)
- Quick stats cards
- Order table with expandable rows
- Create order modal with form validation
- View order details modal
- Status badges and color coding

---

## Import Examples

### All Imports You'll Need

```tsx
// Form Inputs
import { FormInput, EmailInput, PhoneInput, DateInput, AddressInput } from '@/components/forms'

// Buttons
import {
  ModernButton,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
  SuccessButton,
  PrintButton,
  ExportButton,
  DeleteButton,
  EditButton,
  AddButton,
  IconButton
} from '@/components/ui'

// Modals
import { ModernModal, AlertModal, ConfirmationModal } from '@/components/ui'

// Tables
import { ModernTable, TableColumn } from '@/components/ui'

// Icons (from lucide-react)
import { Plus, Edit2, Trash2, Search, etc. } from 'lucide-react'

// Data fetching
import useSWR from 'swr'
```

---

## Accessibility Features

All components include:
- Proper ARIA labels
- Keyboard navigation (Tab, Escape, Enter)
- Focus states
- Screen reader support
- Color contrast compliance
- RTL language support (Arabic)

---

## Browser Support

All modern components support:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

---

## Performance Optimization

Components include:
- React.memo for re-render prevention
- Lazy loading for modals
- Debounced search inputs
- Loading skeletons for better UX
- Optimized Recharts integration

---

## Next Steps

1. **Test the new components** in your browser
2. **Check form validation** with invalid data
3. **Test modal interactions** (open, close, confirm)
4. **Verify table sorting** works correctly
5. **Check RTL styling** for Arabic text
6. **Test responsive design** on mobile devices

---

**Version:** 1.0.0
**Last Updated:** 2026-05-01
**Author:** v0 AI Assistant
