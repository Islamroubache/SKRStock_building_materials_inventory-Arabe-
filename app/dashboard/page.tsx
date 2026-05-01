'use client'

import React, { useEffect, useState } from 'react'
import { Package, TrendingUp, AlertTriangle, Users, CreditCard, ArrowDownLeft, Clock, Printer, Download, ChevronDown, FileText, CheckCircle2, Zap } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar } from 'recharts'
import * as XLSX from 'xlsx'
import { ModernButton, PrimaryButton, SecondaryButton } from '@/components/ui/modern-button'
import { PrintButton, ExportButton } from '@/components/ui/action-buttons'
import { ModernTable, TableColumn } from '@/components/ui/modern-table'

interface DashboardStats {
  totalProducts: number
  todayNet: number
  todayCustomerCollections: number
  todaySupplierPayments: number
  lowStockCount: number
  totalDebt: number
  productPerformance: Array<{ name: string; sold: number; revenue: number; profit: number }>
  expiredList: Array<{ name: string }>
  lowStockProducts: Array<{ name: string; quantity: number; unit: string }>
  creditAlerts: Array<{ name: string }>
  overdueInvoices: Array<{ invoiceNumber: string; customerName: string; dueDate: string; remaining: number }>
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [chartData, setChartData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom'>('monthly')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false)

  const fetchData = () => {
    setLoading(true)
    const query = new URLSearchParams({ type: period })
    if (period === 'custom' && from && to) {
      query.append('from', from)
      query.append('to', to)
    }

    Promise.all([
      fetch(`/api/dashboard/stats?${query.toString()}`).then((res) => res.json()),
      fetch(`/api/dashboard/sales-chart?${query.toString()}`).then((res) => res.json()),
    ])
      .then(([statsData, chartResData]) => {
        setStats(statsData)
        setChartData(Array.isArray(chartResData) ? chartResData : [])
        setLoading(false)
      })
      .catch((err) => {
        console.error(err)
        setLoading(false)
      })
  }

  useEffect(() => {
    fetch('/api/batches/expiry-check', { method: 'POST' }).catch(console.error)
  }, [])

  useEffect(() => {
    if (period !== 'custom') fetchData()
  }, [period])

  const handlePrint = () => {
    window.print()
  }

  const handleExportExcel = () => {
    const wsData = [
      ['لوحة التحكم - التقرير الشامل'],
      ['فترة:', period === 'custom' ? `من ${from} إلى ${to}` : period],
      [],
      ['ملخص الأداء'],
      ['المنتجات الكلية', stats?.totalProducts || 0],
      ['المبيعات الصافية', (stats?.todayNet || 0).toLocaleString()],
      ['التحصيلات', (stats?.todayCustomerCollections || 0).toLocaleString()],
      ['المدفوعات', (stats?.todaySupplierPayments || 0).toLocaleString()],
      [],
      ['أداء المنتجات'],
      ...((stats?.productPerformance || []).map((p) => [p.name, p.sold, p.revenue, p.profit]) as any),
    ]
    const ws = XLSX.utils.aoa_to_sheet(wsData)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Dashboard')
    XLSX.writeFile(wb, `dashboard-${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const getPeriodLabel = () => {
    const labels = { daily: 'اليوم', weekly: 'هذا الأسبوع', monthly: 'هذا الشهر', yearly: 'هذه السنة', custom: 'المدة المخصصة' }
    return labels[period]
  }

  const productColumns: TableColumn<typeof stats.productPerformance[0]>[] = [
    {
      key: 'name',
      header: 'اسم المنتج',
      sortable: true,
    },
    {
      key: 'sold',
      header: 'الكمية المباعة',
      sortable: true,
      align: 'center',
    },
    {
      key: 'revenue',
      header: 'الإيراد',
      render: (val) => `${val.toLocaleString()} دج`,
      sortable: true,
      align: 'left',
    },
    {
      key: 'profit',
      header: 'الربح',
      render: (val) => (
        <span className="text-emerald-600 font-semibold">{val.toLocaleString()} دج</span>
      ),
      sortable: true,
      align: 'left',
    },
  ]

  const kpiCards = [
    { icon: Package, label: 'المنتجات', value: stats?.totalProducts || 0, color: 'blue', trend: '+12%' },
    { icon: TrendingUp, label: `المبيعات - ${getPeriodLabel()}`, value: (stats?.todayNet || 0).toLocaleString(), unit: 'دج', color: 'emerald', trend: '+8.5%' },
    { icon: CreditCard, label: `التحصيلات - ${getPeriodLabel()}`, value: (stats?.todayCustomerCollections || 0).toLocaleString(), unit: 'دج', color: 'cyan', trend: '+15%' },
    { icon: ArrowDownLeft, label: `المدفوعات - ${getPeriodLabel()}`, value: (stats?.todaySupplierPayments || 0).toLocaleString(), unit: 'دج', color: 'red', trend: '-3%' },
  ]

  const colorClasses = {
    blue: 'from-blue-500 to-blue-600',
    emerald: 'from-emerald-500 to-emerald-600',
    cyan: 'from-cyan-500 to-cyan-600',
    red: 'from-red-500 to-red-600',
  }

  return (
    <div className="space-y-8 font-tajawal">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900">لوحة التحكم</h1>
          <p className="text-gray-600 mt-2">مرحبا بك في نظام إدارة المخزون SKRStock</p>
        </div>
      </div>

      {/* Period & Export Controls */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex gap-2 flex-wrap">
            {(['daily', 'weekly', 'monthly', 'yearly'] as const).map((p) => (
              <ModernButton
                key={p}
                variant={period === p ? 'primary' : 'secondary'}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {{
                  daily: 'اليوم',
                  weekly: 'أسبوع',
                  monthly: 'شهر',
                  yearly: 'سنة',
                }[p]}
              </ModernButton>
            ))}
            <ModernButton
              variant={period === 'custom' ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => setPeriod('custom')}
            >
              مخصص
            </ModernButton>
          </div>

          <div className="flex gap-2">
            <PrintButton onClick={handlePrint} />
            <div className="relative">
              <ExportButton onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)} />
              {isExportDropdownOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-xl shadow-lg z-50">
                  <button
                    onClick={() => {
                      handleExportExcel()
                      setIsExportDropdownOpen(false)
                    }}
                    className="w-full text-right px-4 py-3 hover:bg-purple-50 text-gray-700 font-medium transition-colors border-b border-gray-100"
                  >
                    Excel
                  </button>
                  <button
                    onClick={() => {
                      handlePrint()
                      setIsExportDropdownOpen(false)
                    }}
                    className="w-full text-right px-4 py-3 hover:bg-purple-50 text-gray-700 font-medium transition-colors"
                  >
                    PDF
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {period === 'custom' && (
          <div className="flex gap-2 mt-4 flex-wrap items-center">
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm"
            />
            <span className="text-gray-600">إلى</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="px-4 py-2 border-2 border-gray-200 rounded-lg text-sm"
            />
            <ModernButton size="sm" onClick={fetchData}>
              تحديث
            </ModernButton>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiCards.map((card, idx) => {
          const Icon = card.icon
          return (
            <div
              key={idx}
              className={`bg-gradient-to-br ${colorClasses[card.color as keyof typeof colorClasses]} p-6 rounded-2xl text-white shadow-lg hover:shadow-xl transition-shadow cursor-pointer group`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-white/80 text-sm font-medium mb-2">{card.label}</p>
                  <h3 className="text-3xl font-bold text-white mb-3">{card.value}</h3>
                  {card.unit && <p className="text-white/70 text-xs">{card.unit}</p>}
                </div>
                <div className="bg-white/20 p-3 rounded-full group-hover:scale-110 transition-transform">
                  <Icon size={28} className="text-white" />
                </div>
              </div>
              <div className="text-sm text-white/80 mt-4 flex items-center gap-1">
                <TrendingUp size={14} />
                {card.trend}
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-6">اتجاهات المبيعات والمشتريات</h3>
          <div className="h-80 w-full" dir="ltr">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#06B6D4" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                  <XAxis dataKey="date" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Area type="monotone" dataKey="sales" name="المبيعات" stroke="#7C3AED" fillOpacity={1} fill="url(#colorSales)" strokeWidth={2} />
                  <Area type="monotone" dataKey="purchases" name="المشتريات" stroke="#06B6D4" fillOpacity={1} fill="url(#colorPurchases)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-500">لا توجد بيانات</div>
            )}
          </div>
        </div>

        {/* Alerts Card */}
        <div className="bg-gradient-to-br from-red-50 to-orange-50 p-6 rounded-2xl border border-red-100 shadow-sm">
          <div className="flex items-center gap-2 mb-6">
            <AlertTriangle className="text-red-600" size={24} />
            <h3 className="text-xl font-bold text-red-900">التنبيهات الهامة</h3>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto">
            {stats?.expiredList?.length ? (
              stats.expiredList.map((p, i) => (
                <div key={i} className="bg-white/60 p-3 rounded-lg border border-red-200 text-sm">
                  <p className="text-red-900 font-medium">منتهي الصلاحية: {p.name}</p>
                </div>
              ))
            ) : null}

            {stats?.lowStockProducts?.length ? (
              stats.lowStockProducts.map((p, i) => (
                <div key={i} className="bg-white/60 p-3 rounded-lg border border-amber-200 text-sm">
                  <p className="text-amber-900 font-medium">مخزون منخفض: {p.name}</p>
                </div>
              ))
            ) : null}

            {!stats?.expiredList?.length && !stats?.lowStockProducts?.length && (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <CheckCircle2 className="text-emerald-600 mb-2" size={32} />
                <p className="text-gray-700 font-medium">كل شيء على ما يرام</p>
                <p className="text-gray-500 text-sm mt-1">لا توجد تنبيهات حالياً</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Products Performance Table */}
      <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
        <h3 className="text-xl font-bold text-gray-900 mb-6">أداء المنتجات</h3>
        <ModernTable data={stats?.productPerformance || []} columns={productColumns} isLoading={loading} striped />
      </div>

      {/* Summary Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-2">إجمالي الديون</p>
            <p className="text-3xl font-bold text-gray-900">{(stats.totalDebt || 0).toLocaleString()} دج</p>
            <p className="text-red-600 text-sm mt-2">يتطلب متابعة</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-2">السيولة الفعلية</p>
            <p className="text-3xl font-bold text-emerald-600">
              {((stats.todayNet || 0) + (stats.todayCustomerCollections || 0) - (stats.todaySupplierPayments || 0)).toLocaleString()} دج
            </p>
            <p className="text-emerald-600 text-sm mt-2">موضع جيد</p>
          </div>

          <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
            <p className="text-gray-600 text-sm font-medium mb-2">المنتجات منخفضة المخزون</p>
            <p className="text-3xl font-bold text-amber-600">{stats.lowStockCount || 0}</p>
            <p className="text-amber-600 text-sm mt-2">تحتاج إعادة طلب</p>
          </div>
        </div>
      )}
    </div>
  )
}
