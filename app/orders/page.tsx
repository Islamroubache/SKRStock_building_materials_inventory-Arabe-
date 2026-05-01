'use client'

import React, { useState } from 'react'
import { Plus, Search, Edit2, Trash2, Eye, TrendingUp, AlertCircle } from 'lucide-react'
import { ModernButton, PrimaryButton, SecondaryButton } from '@/components/ui/modern-button'
import { ModernTable, TableColumn } from '@/components/ui/modern-table'
import { ModernModal, ConfirmationModal } from '@/components/ui/modern-modal'
import { FormInput } from '@/components/forms/form-input'
import { PhoneInput } from '@/components/forms/phone-input'
import { DateInput } from '@/components/forms/date-input'
import { AddressInput } from '@/components/forms/address-input'
import { PrintButton, ExportButton } from '@/components/ui/action-buttons'
import { IconButton } from '@/components/ui/action-buttons'
import useSWR from 'swr'

interface Order {
  id: string
  orderNumber: string
  customer: string
  date: string
  total: number
  status: 'pending' | 'processing' | 'completed' | 'cancelled'
  items: number
  paymentStatus: 'paid' | 'partial' | 'pending'
}

export default function Orders() {
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isViewModalOpen, setIsViewModalOpen] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    customerEmail: '',
    customerAddress: '',
    orderDate: new Date().toISOString().split('T')[0],
    deliveryDate: '',
    notes: '',
  })

  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const { data: orders = [], mutate } = useSWR('/api/orders', (url) => fetch(url).then((r) => r.json()))

  const filteredOrders = orders.filter((o: Order) => {
    const matchesSearch =
      o.orderNumber.includes(searchQuery) ||
      o.customer.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = !filterStatus || o.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const validateForm = () => {
    const errors: Record<string, string> = {}
    if (!formData.customerName.trim()) errors.customerName = 'اسم العميل مطلوب'
    if (!formData.customerPhone) errors.customerPhone = 'رقم الهاتف مطلوب'
    if (!formData.customerAddress.trim()) errors.customerAddress = 'العنوان مطلوب'
    if (!formData.orderDate) errors.orderDate = 'تاريخ الطلب مطلوب'
    setFormErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleAddOrder = async () => {
    if (!validateForm()) return

    setIsLoading(true)
    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      if (response.ok) {
        mutate()
        setIsAddModalOpen(false)
        resetForm()
      }
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      customerName: '',
      customerPhone: '',
      customerEmail: '',
      customerAddress: '',
      orderDate: new Date().toISOString().split('T')[0],
      deliveryDate: '',
      notes: '',
    })
    setFormErrors({})
  }

  const openViewModal = (order: Order) => {
    setSelectedOrder(order)
    setIsViewModalOpen(true)
  }

  const statusColors = {
    pending: 'bg-amber-100 text-amber-700',
    processing: 'bg-blue-100 text-blue-700',
    completed: 'bg-emerald-100 text-emerald-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const statusLabels = {
    pending: 'قيد الانتظار',
    processing: 'قيد المعالجة',
    completed: 'مكتمل',
    cancelled: 'ملغي',
  }

  const columns: TableColumn<Order>[] = [
    {
      key: 'orderNumber',
      header: 'رقم الطلب',
      sortable: true,
      render: (val) => <span className="font-semibold text-gray-900">{val}</span>,
    },
    {
      key: 'customer',
      header: 'العميل',
      sortable: true,
    },
    {
      key: 'date',
      header: 'التاريخ',
      sortable: true,
      render: (val) => new Date(val).toLocaleDateString('ar-DZ'),
    },
    {
      key: 'total',
      header: 'المبلغ',
      sortable: true,
      render: (val) => `${val.toLocaleString()} دج`,
      align: 'left',
    },
    {
      key: 'status',
      header: 'الحالة',
      render: (val: string) => (
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            statusColors[val as keyof typeof statusColors]
          }`}
        >
          {statusLabels[val as keyof typeof statusLabels]}
        </span>
      ),
    },
    {
      key: 'paymentStatus',
      header: 'الدفع',
      render: (val: string) => (
        <span
          className={`px-3 py-1 rounded-full text-sm font-semibold ${
            val === 'paid'
              ? 'bg-emerald-100 text-emerald-700'
              : val === 'partial'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-red-100 text-red-700'
          }`}
        >
          {val === 'paid' ? 'مدفوع' : val === 'partial' ? 'جزئي' : 'معلق'}
        </span>
      ),
    },
    {
      key: 'id',
      header: 'الإجراءات',
      render: (val, item) => (
        <div className="flex gap-1">
          <IconButton
            icon={<Eye size={18} />}
            tooltip="عرض"
            onClick={() => openViewModal(item)}
          />
          <IconButton
            icon={<Edit2 size={18} />}
            tooltip="تعديل"
            onClick={() => {}}
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
          <h1 className="text-4xl font-bold text-gray-900">الطلبات</h1>
          <p className="text-gray-600 mt-2">إدارة وتتبع جميع طلبات العملاء</p>
        </div>
        <PrimaryButton
          size="lg"
          icon={<Plus size={20} />}
          onClick={() => {
            resetForm()
            setIsAddModalOpen(true)
          }}
        >
          طلب جديد
        </PrimaryButton>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'إجمالي الطلبات', value: orders.length, color: 'from-purple-500 to-purple-600' },
          { label: 'قيد المعالجة', value: orders.filter((o: Order) => o.status === 'processing').length, color: 'from-blue-500 to-blue-600' },
          { label: 'مكتملة', value: orders.filter((o: Order) => o.status === 'completed').length, color: 'from-emerald-500 to-emerald-600' },
          { label: 'قيمة الطلبات', value: `${(orders.reduce((sum: number, o: Order) => sum + o.total, 0) / 1000).toFixed(1)}K`, unit: 'دج', color: 'from-amber-500 to-amber-600' },
        ].map((stat, idx) => (
          <div
            key={idx}
            className={`bg-gradient-to-br ${stat.color} text-white p-6 rounded-2xl shadow-lg`}
          >
            <p className="text-white/80 text-sm font-medium">{stat.label}</p>
            <p className="text-3xl font-bold mt-2">{stat.value}</p>
            {stat.unit && <p className="text-white/70 text-xs">{stat.unit}</p>}
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex gap-4 flex-wrap items-center justify-between">
          <div className="flex-1 min-w-xs">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="بحث في الطلبات..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
              />
            </div>
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-purple-500 outline-none transition-colors"
          >
            <option value="">جميع الحالات</option>
            <option value="pending">قيد الانتظار</option>
            <option value="processing">قيد المعالجة</option>
            <option value="completed">مكتمل</option>
            <option value="cancelled">ملغي</option>
          </select>

          <div className="flex gap-2">
            <PrintButton />
            <ExportButton />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <ModernTable data={filteredOrders} columns={columns} emptyMessage="لا توجد طلبات" />
      </div>

      {/* Add Order Modal */}
      <ModernModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          resetForm()
        }}
        title="إنشاء طلب جديد"
        description="أضف تفاصيل الطلب الجديد"
        size="lg"
        onConfirm={handleAddOrder}
        onCancel={() => {
          setIsAddModalOpen(false)
          resetForm()
        }}
        confirmText="إنشاء الطلب"
        cancelText="إلغاء"
        isLoading={isLoading}
      >
        <div className="space-y-4">
          <FormInput
            label="اسم العميل"
            placeholder="أدخل اسم العميل"
            value={formData.customerName}
            onChange={(val) => setFormData((p) => ({ ...p, customerName: val }))}
            error={formErrors.customerName}
            required
          />

          <PhoneInput
            label="رقم الهاتف"
            value={formData.customerPhone}
            onChange={(val) => setFormData((p) => ({ ...p, customerPhone: val }))}
            error={formErrors.customerPhone}
            required
          />

          <FormInput
            label="البريد الإلكتروني"
            type="email"
            placeholder="example@email.com"
            value={formData.customerEmail}
            onChange={(val) => setFormData((p) => ({ ...p, customerEmail: val }))}
          />

          <AddressInput
            label="العنوان"
            value={formData.customerAddress}
            onChange={(val) => setFormData((p) => ({ ...p, customerAddress: val }))}
            error={formErrors.customerAddress}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <DateInput
              label="تاريخ الطلب"
              value={formData.orderDate}
              onChange={(val) => setFormData((p) => ({ ...p, orderDate: val }))}
              error={formErrors.orderDate}
              required
            />

            <DateInput
              label="تاريخ التسليم المتوقع"
              value={formData.deliveryDate}
              onChange={(val) => setFormData((p) => ({ ...p, deliveryDate: val }))}
              minDate={formData.orderDate}
            />
          </div>

          <FormInput
            label="ملاحظات"
            placeholder="أضف ملاحظات إضافية..."
            value={formData.notes}
            onChange={(val) => setFormData((p) => ({ ...p, notes: val }))}
          />
        </div>
      </ModernModal>

      {/* View Order Modal */}
      <ModernModal
        isOpen={isViewModalOpen}
        onClose={() => {
          setIsViewModalOpen(false)
          setSelectedOrder(null)
        }}
        title={`تفاصيل الطلب #${selectedOrder?.orderNumber}`}
        size="lg"
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-gray-600 text-sm mb-1">العميل</p>
                <p className="text-lg font-semibold text-gray-900">{selectedOrder.customer}</p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">المبلغ الإجمالي</p>
                <p className="text-lg font-semibold text-gray-900">
                  {selectedOrder.total.toLocaleString()} دج
                </p>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">حالة الطلب</p>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    statusColors[selectedOrder.status as keyof typeof statusColors]
                  }`}
                >
                  {statusLabels[selectedOrder.status as keyof typeof statusLabels]}
                </span>
              </div>
              <div>
                <p className="text-gray-600 text-sm mb-1">حالة الدفع</p>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-semibold ${
                    selectedOrder.paymentStatus === 'paid'
                      ? 'bg-emerald-100 text-emerald-700'
                      : selectedOrder.paymentStatus === 'partial'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-red-100 text-red-700'
                  }`}
                >
                  {selectedOrder.paymentStatus === 'paid'
                    ? 'مدفوع'
                    : selectedOrder.paymentStatus === 'partial'
                      ? 'جزئي'
                      : 'معلق'}
                </span>
              </div>
            </div>
          </div>
        )}
      </ModernModal>
    </div>
  )
}
