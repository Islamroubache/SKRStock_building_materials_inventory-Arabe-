'use client'

import React, { useState, useCallback } from 'react'
import { Plus, Search, Edit2, Trash2, Eye, Filter } from 'lucide-react'
import { ModernButton, PrimaryButton } from '@/components/ui/modern-button'
import { ModernTable, TableColumn } from '@/components/ui/modern-table'
import { ModernModal, ConfirmationModal } from '@/components/ui/modern-modal'
import { FormInput } from '@/components/forms/form-input'
import { PrintButton, ExportButton, DeleteButton, EditButton } from '@/components/ui/action-buttons'
import { IconButton } from '@/components/ui/action-buttons'
import useSWR from 'swr'

interface Product {
  id: string
  name: string
  sku: string
  category: string
  quantity: number
  unit: string
  price: number
  cost: number
  supplier: string
  status: 'in_stock' | 'low_stock' | 'out_of_stock'
  lastRestockDate: string
}

export default function Products() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: '',
    quantity: '',
    unit: 'وحدة',
    price: '',
    cost: '',
    supplier: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  const { data: products = [], isLoading, mutate } = useSWR('/api/products', (url) => fetch(url).then((r) => r.json()))

  const filteredProducts = products.filter((p: Product) => {
    const matchesSearch = p.name.includes(searchQuery) || p.sku.includes(searchQuery)
    const matchesCategory = !filterCategory || p.category === filterCategory
    return matchesSearch && matchesCategory
  })

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.name.trim()) errors.name = 'اسم المنتج مطلوب'
    if (!formData.sku.trim()) errors.sku = 'الرمز مطلوب'
    if (!formData.category.trim()) errors.category = 'الفئة مطلوبة'
    if (!formData.quantity) errors.quantity = 'الكمية مطلوبة'
    if (!formData.price) errors.price = 'السعر مطلوب'
    if (!formData.cost) errors.cost = 'التكلفة مطلوبة'
    if (!formData.supplier.trim()) errors.supplier = 'المورد مطلوب'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddProduct = async () => {
    if (!validateForm()) return

    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          price: parseFloat(formData.price),
          cost: parseFloat(formData.cost),
        }),
      })
      if (response.ok) {
        mutate()
        setIsAddModalOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleEditProduct = async () => {
    if (!selectedProduct || !validateForm()) return

    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          quantity: parseInt(formData.quantity),
          price: parseFloat(formData.price),
          cost: parseFloat(formData.cost),
        }),
      })
      if (response.ok) {
        mutate()
        setIsEditModalOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error(error)
    }
  }

  const handleDeleteProduct = async () => {
    if (!selectedProduct) return

    try {
      const response = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        mutate()
        setIsDeleteModalOpen(false)
        setSelectedProduct(null)
      }
    } catch (error) {
      console.error(error)
    }
  }

  const openEditModal = (product: Product) => {
    setSelectedProduct(product)
    setFormData({
      name: product.name,
      sku: product.sku,
      category: product.category,
      quantity: product.quantity.toString(),
      unit: product.unit,
      price: product.price.toString(),
      cost: product.cost.toString(),
      supplier: product.supplier,
    })
    setFormErrors({})
    setIsEditModalOpen(true)
  }

  const openDeleteModal = (product: Product) => {
    setSelectedProduct(product)
    setIsDeleteModalOpen(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      category: '',
      quantity: '',
      unit: 'وحدة',
      price: '',
      cost: '',
      supplier: '',
    })
    setFormErrors({})
  }

  const columns: TableColumn<Product>[] = [
    {
      key: 'name',
      header: 'المنتج',
      sortable: true,
      render: (val, item) => (
        <div>
          <p className="font-semibold text-gray-900">{val}</p>
          <p className="text-sm text-gray-500">{item.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: 'الفئة',
      sortable: true,
    },
    {
      key: 'quantity',
      header: 'الكمية',
      sortable: true,
      align: 'center',
      render: (val, item) => (
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            item.status === 'in_stock'
              ? 'bg-emerald-100 text-emerald-700'
              : item.status === 'low_stock'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {val} {item.unit}
        </span>
      ),
    },
    {
      key: 'price',
      header: 'السعر',
      sortable: true,
      render: (val) => `${val.toLocaleString()} دج`,
    },
    {
      key: 'supplier',
      header: 'المورد',
      sortable: true,
    },
    {
      key: 'id',
      header: 'الإجراءات',
      render: (val, item) => (
        <div className="flex gap-1">
          <IconButton
            icon={<Edit2 size={18} />}
            tooltip="تعديل"
            onClick={() => openEditModal(item)}
          />
          <IconButton
            icon={<Trash2 size={18} className="text-red-600" />}
            tooltip="حذف"
            onClick={() => openDeleteModal(item)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="space-y-8 font-tajawal">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">المنتجات</h1>
          <p className="text-gray-600 mt-2">إدارة وتتبع جميع منتجات المخزن</p>
        </div>
        <PrimaryButton
          size="lg"
          icon={<Plus size={20} />}
          onClick={() => {
            resetForm()
            setIsAddModalOpen(true)
          }}
        >
          منتج جديد
        </PrimaryButton>
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex gap-4 flex-wrap items-center justify-between">
          <div className="flex-1 min-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="بحث في المنتجات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
              />
            </div>
          </div>

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
          >
            <option value="">جميع الفئات</option>
            <option value="مواد_البناء">مواد البناء</option>
            <option value="الأدوات">الأدوات</option>
            <option value="معدات">معدات</option>
          </select>

          <div className="flex gap-2">
            <PrintButton />
            <ExportButton />
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <ModernTable data={filteredProducts} columns={columns} isLoading={isLoading} emptyMessage="لا توجد منتجات" />
      </div>

      {/* Add Product Modal */}
      <ModernModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          resetForm()
        }}
        title="إضافة منتج جديد"
        description="املأ تفاصيل المنتج الجديد"
        size="lg"
        onConfirm={handleAddProduct}
        onCancel={() => {
          setIsAddModalOpen(false)
          resetForm()
        }}
        confirmText="إضافة"
        cancelText="إلغاء"
      >
        <div className="space-y-4">
          <FormInput
            label="اسم المنتج"
            placeholder="أدخل اسم المنتج"
            value={formData.name}
            onChange={(val) => setFormData((p) => ({ ...p, name: val }))}
            error={formErrors.name}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="الرمز"
              placeholder="SKU..."
              value={formData.sku}
              onChange={(val) => setFormData((p) => ({ ...p, sku: val }))}
              error={formErrors.sku}
              required
            />

            <FormInput
              label="الفئة"
              placeholder="حدد الفئة"
              value={formData.category}
              onChange={(val) => setFormData((p) => ({ ...p, category: val }))}
              error={formErrors.category}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="الكمية"
              type="number"
              placeholder="0"
              value={formData.quantity}
              onChange={(val) => setFormData((p) => ({ ...p, quantity: val }))}
              error={formErrors.quantity}
              required
            />

            <FormInput
              label="الوحدة"
              placeholder="وحدة"
              value={formData.unit}
              onChange={(val) => setFormData((p) => ({ ...p, unit: val }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="السعر (دج)"
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(val) => setFormData((p) => ({ ...p, price: val }))}
              error={formErrors.price}
              required
            />

            <FormInput
              label="التكلفة (دج)"
              type="number"
              placeholder="0.00"
              value={formData.cost}
              onChange={(val) => setFormData((p) => ({ ...p, cost: val }))}
              error={formErrors.cost}
              required
            />
          </div>

          <FormInput
            label="المورد"
            placeholder="اسم المورد"
            value={formData.supplier}
            onChange={(val) => setFormData((p) => ({ ...p, supplier: val }))}
            error={formErrors.supplier}
            required
          />
        </div>
      </ModernModal>

      {/* Edit Product Modal */}
      <ModernModal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false)
          resetForm()
        }}
        title="تعديل المنتج"
        description={`تعديل بيانات: ${selectedProduct?.name}`}
        size="lg"
        onConfirm={handleEditProduct}
        onCancel={() => {
          setIsEditModalOpen(false)
          resetForm()
        }}
        confirmText="حفظ التغييرات"
        cancelText="إلغاء"
      >
        <div className="space-y-4">
          <FormInput
            label="اسم المنتج"
            placeholder="أدخل اسم المنتج"
            value={formData.name}
            onChange={(val) => setFormData((p) => ({ ...p, name: val }))}
            error={formErrors.name}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="الرمز"
              placeholder="SKU..."
              value={formData.sku}
              onChange={(val) => setFormData((p) => ({ ...p, sku: val }))}
              error={formErrors.sku}
              required
            />

            <FormInput
              label="الفئة"
              placeholder="حدد الفئة"
              value={formData.category}
              onChange={(val) => setFormData((p) => ({ ...p, category: val }))}
              error={formErrors.category}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="الكمية"
              type="number"
              placeholder="0"
              value={formData.quantity}
              onChange={(val) => setFormData((p) => ({ ...p, quantity: val }))}
              error={formErrors.quantity}
              required
            />

            <FormInput
              label="الوحدة"
              placeholder="وحدة"
              value={formData.unit}
              onChange={(val) => setFormData((p) => ({ ...p, unit: val }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput
              label="السعر (دج)"
              type="number"
              placeholder="0.00"
              value={formData.price}
              onChange={(val) => setFormData((p) => ({ ...p, price: val }))}
              error={formErrors.price}
              required
            />

            <FormInput
              label="التكلفة (دج)"
              type="number"
              placeholder="0.00"
              value={formData.cost}
              onChange={(val) => setFormData((p) => ({ ...p, cost: val }))}
              error={formErrors.cost}
              required
            />
          </div>

          <FormInput
            label="المورد"
            placeholder="اسم المورد"
            value={formData.supplier}
            onChange={(val) => setFormData((p) => ({ ...p, supplier: val }))}
            error={formErrors.supplier}
            required
          />
        </div>
      </ModernModal>

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false)
          setSelectedProduct(null)
        }}
        onConfirm={handleDeleteProduct}
        title="حذف المنتج"
        message={`هل أنت متأكد من رغبتك في حذف "${selectedProduct?.name}"؟ هذا الإجراء لا يمكن التراجع عنه.`}
        isDangerous
      />
    </div>
  )
}
