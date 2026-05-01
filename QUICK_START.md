# Quick Start: Using Modern Components

## 30-Second Setup

All new components are ready to use. Just import and use!

---

## Form Inputs - 3 Steps

### Step 1: Create State
```tsx
const [name, setName] = useState('')
const [phone, setPhone] = useState('')
const [error, setError] = useState('')
```

### Step 2: Import Component
```tsx
import { FormInput, PhoneInput } from '@/components/forms'
```

### Step 3: Use Component
```tsx
<FormInput
  label="Full Name"
  value={name}
  onChange={setName}
  error={error}
  required
/>

<PhoneInput
  value={phone}
  onChange={setPhone}
  required
/>
```

---

## Buttons - Pick One

### Print Button
```tsx
import { PrintButton } from '@/components/ui'

<PrintButton onClick={() => window.print()} />
```

### Export Button
```tsx
import { ExportButton } from '@/components/ui'

<ExportButton onClick={handleExport} />
```

### Delete Button
```tsx
import { DeleteButton } from '@/components/ui'

<DeleteButton onClick={handleDelete} />
```

### Custom Button
```tsx
import { ModernButton } from '@/components/ui'
import { Plus } from 'lucide-react'

<ModernButton
  variant="primary"
  size="lg"
  icon={<Plus size={20} />}
>
  Add Item
</ModernButton>
```

---

## Modals - Simple & Effective

### Alert Modal
```tsx
import { AlertModal } from '@/components/ui'

const [showAlert, setShowAlert] = useState(false)

<AlertModal
  isOpen={showAlert}
  onClose={() => setShowAlert(false)}
  title="Success!"
  message="Product added successfully"
  type="success"
/>

// Show alert
onClick={() => setShowAlert(true)}
```

### Confirmation Modal
```tsx
import { ConfirmationModal } from '@/components/ui'

const [showConfirm, setShowConfirm] = useState(false)

<ConfirmationModal
  isOpen={showConfirm}
  onClose={() => setShowConfirm(false)}
  onConfirm={handleDelete}
  title="Delete Item?"
  message="This cannot be undone"
  isDangerous={true}
/>
```

### Custom Modal
```tsx
import { ModernModal } from '@/components/ui'

<ModernModal
  isOpen={isOpen}
  onClose={onClose}
  title="Add Product"
  size="lg"
  onConfirm={handleSave}
  confirmText="Save"
>
  {/* Your form here */}
</ModernModal>
```

---

## Data Tables - Super Easy

### Step 1: Define Columns
```tsx
import { TableColumn } from '@/components/ui'

interface Product {
  id: string
  name: string
  price: number
  status: string
}

const columns: TableColumn<Product>[] = [
  {
    key: 'name',
    header: 'Product',
    sortable: true
  },
  {
    key: 'price',
    header: 'Price',
    sortable: true,
    render: (val) => `${val.toLocaleString()} دج`
  },
  {
    key: 'status',
    header: 'Status',
    render: (val) => (
      <span className="px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-sm font-semibold">
        {val}
      </span>
    )
  }
]
```

### Step 2: Render Table
```tsx
import { ModernTable } from '@/components/ui'

<ModernTable
  data={products}
  columns={columns}
  isLoading={loading}
  emptyMessage="No products found"
/>
```

### Step 3: Click Header to Sort
Users can now click column headers to sort!

---

## Form Validation Pattern

```tsx
const [formData, setFormData] = useState({
  name: '',
  phone: '',
  email: ''
})
const [errors, setErrors] = useState<Record<string, string>>({})

const validate = () => {
  const newErrors: Record<string, string> = {}
  if (!formData.name) newErrors.name = 'Name is required'
  if (!formData.phone) newErrors.phone = 'Phone is required'
  setErrors(newErrors)
  return Object.keys(newErrors).length === 0
}

const handleSubmit = async () => {
  if (!validate()) return
  // Submit form
  const res = await fetch('/api/items', {
    method: 'POST',
    body: JSON.stringify(formData)
  })
}

return (
  <>
    <FormInput
      label="Name"
      value={formData.name}
      onChange={(val) => setFormData(p => ({ ...p, name: val }))}
      error={errors.name}
      required
    />
  </>
)
```

---

## Complete Example: Add Product Form

```tsx
'use client'

import { useState } from 'react'
import { FormInput, PhoneInput } from '@/components/forms'
import { ModernModal } from '@/components/ui'
import { PrimaryButton } from '@/components/ui'

export default function AddProductModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    price: ''
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)

  const validate = () => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.phone) newErrors.phone = 'Phone is required'
    if (!formData.price) newErrors.price = 'Price is required'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setLoading(true)
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })
      if (res.ok) {
        setIsOpen(false)
        setFormData({ name: '', phone: '', price: '' })
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <PrimaryButton onClick={() => setIsOpen(true)}>
        Add Product
      </PrimaryButton>

      <ModernModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Add New Product"
        onConfirm={handleSave}
        isLoading={loading}
      >
        <div className="space-y-4">
          <FormInput
            label="Product Name"
            value={formData.name}
            onChange={(val) => setFormData(p => ({ ...p, name: val }))}
            error={errors.name}
            required
          />

          <PhoneInput
            value={formData.phone}
            onChange={(val) => setFormData(p => ({ ...p, phone: val }))}
            error={errors.phone}
            required
          />

          <FormInput
            label="Price"
            type="number"
            value={formData.price}
            onChange={(val) => setFormData(p => ({ ...p, price: val }))}
            error={errors.price}
            required
          />
        </div>
      </ModernModal>
    </>
  )
}
```

---

## Common Patterns

### Pattern 1: Form with Modal
```tsx
const [isAddOpen, setIsAddOpen] = useState(false)
const [formData, setFormData] = useState({...})
const [errors, setErrors] = useState({})

<PrimaryButton onClick={() => setIsAddOpen(true)}>
  Add New
</PrimaryButton>

<ModernModal
  isOpen={isAddOpen}
  onConfirm={handleAdd}
  onCancel={() => setIsAddOpen(false)}
>
  {/* Form fields */}
</ModernModal>
```

### Pattern 2: Delete with Confirmation
```tsx
const [toDelete, setToDelete] = useState(null)

<ConfirmationModal
  isOpen={!!toDelete}
  onConfirm={() => {
    handleDelete(toDelete.id)
    setToDelete(null)
  }}
  title="Delete?"
  isDangerous
/>
```

### Pattern 3: Table with Actions
```tsx
const columns = [
  // ... other columns
  {
    key: 'id',
    header: 'Actions',
    render: (val, item) => (
      <div className="flex gap-2">
        <IconButton
          icon={<Edit2 size={18} />}
          onClick={() => handleEdit(item)}
        />
        <IconButton
          icon={<Trash2 size={18} />}
          onClick={() => setToDelete(item)}
        />
      </div>
    )
  }
]
```

---

## Tips & Tricks

### 1. Show Loading State
```tsx
<ModernButton isLoading={loading}>
  Save
</ModernButton>
```

### 2. Disable Buttons
```tsx
<PrimaryButton disabled={!isValid}>
  Submit
</PrimaryButton>
```

### 3. Custom Button Colors
```tsx
<ModernButton variant="danger">
  Delete
</ModernButton>

<ModernButton variant="outline">
  Cancel
</ModernButton>
```

### 4. Icon on Right
```tsx
<ModernButton
  icon={<Download size={20} />}
  iconPosition="right"
>
  Download
</ModernButton>
```

### 5. Table Expansion
```tsx
<ModernTable
  data={items}
  columns={columns}
  expandable={true}
  expandedContent={(item) => (
    <div>Details for {item.name}</div>
  )}
/>
```

---

## API Integration

All components work seamlessly with API calls:

```tsx
import useSWR from 'swr'

const { data: products, isLoading, mutate } = useSWR(
  '/api/products',
  url => fetch(url).then(r => r.json())
)

// After adding item
await fetch('/api/products', { method: 'POST', ... })
mutate() // Refresh data
```

---

## Keyboard Shortcuts

- **Tab** - Navigate between inputs
- **Escape** - Close modal
- **Enter** - Submit form
- **Click header** - Sort table

---

## What's Next?

1. Import components where needed
2. Copy-paste examples above
3. Customize colors/text for your needs
4. Test with real data

Everything else is ready to go!

---

**Happy coding!** 🚀

For more details, see `MODERN_COMPONENTS_GUIDE.md`
