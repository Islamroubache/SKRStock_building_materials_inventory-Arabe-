import React, { useState, ReactNode } from 'react'
import { ChevronDown, ChevronUp, ArrowUpDown } from 'lucide-react'

export interface TableColumn<T> {
  key: keyof T | string
  header: string
  render?: (value: any, item: T, index: number) => ReactNode
  sortable?: boolean
  width?: string
  align?: 'left' | 'center' | 'right'
  className?: string
}

interface ModernTableProps<T> {
  data: T[]
  columns: TableColumn<T>[]
  isLoading?: boolean
  loadingRows?: number
  expandable?: boolean
  onExpandChange?: (item: T, expanded: boolean) => void
  expandedContent?: (item: T) => ReactNode
  onRowClick?: (item: T, index: number) => void
  rowClassName?: (item: T, index: number) => string
  emptyMessage?: string
  striped?: boolean
}

export const ModernTable = React.forwardRef<HTMLDivElement, ModernTableProps<any>>(
  (
    {
      data,
      columns,
      isLoading = false,
      loadingRows = 5,
      expandable = false,
      onExpandChange,
      expandedContent,
      onRowClick,
      rowClassName,
      emptyMessage = 'لا توجد بيانات',
      striped = true,
    },
    ref
  ) => {
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null)
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())

    const handleSort = (key: string) => {
      setSortConfig((current) => {
        if (!current || current.key !== key) {
          return { key, direction: 'asc' }
        }
        if (current.direction === 'asc') {
          return { key, direction: 'desc' }
        }
        return null
      })
    }

    const toggleExpanded = (index: number) => {
      const newExpanded = new Set(expandedRows)
      if (newExpanded.has(index)) {
        newExpanded.delete(index)
      } else {
        newExpanded.add(index)
      }
      setExpandedRows(newExpanded)
      onExpandChange?.(data[index], newExpanded.has(index))
    }

    let sortedData = [...data]
    if (sortConfig) {
      sortedData.sort((a, b) => {
        const aVal = a[sortConfig.key as keyof typeof a]
        const bVal = b[sortConfig.key as keyof typeof b]

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1
        return 0
      })
    }

    return (
      <div ref={ref} className="w-full overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="w-full">
          {/* Header */}
          <thead className="bg-gradient-to-r from-purple-50 to-purple-50/50 border-b border-gray-200">
            <tr>
              {expandable && <th className="w-10 px-4 py-3"></th>}
              {columns.map((column) => (
                <th
                  key={String(column.key)}
                  style={{ width: column.width }}
                  className={`px-6 py-3 text-sm font-semibold text-gray-900 text-${column.align || 'left'}`}
                >
                  {column.sortable ? (
                    <button
                      onClick={() => handleSort(String(column.key))}
                      className="flex items-center gap-2 hover:text-purple-600 transition-colors w-full"
                    >
                      {column.header}
                      <ArrowUpDown size={14} className="opacity-50" />
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-gray-200">
            {isLoading ? (
              // Loading Skeleton
              Array.from({ length: loadingRows }).map((_, rowIndex) => (
                <tr key={`skeleton-${rowIndex}`} className="bg-white hover:bg-gray-50">
                  {expandable && <td className="px-4 py-3"></td>}
                  {columns.map((column) => (
                    <td key={String(column.key)} className="px-6 py-3">
                      <div className="h-4 bg-gradient-to-r from-gray-200 to-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              // Empty State
              <tr>
                <td colSpan={columns.length + (expandable ? 1 : 0)} className="px-6 py-12 text-center">
                  <p className="text-gray-500 font-medium">{emptyMessage}</p>
                </td>
              </tr>
            ) : (
              // Data Rows
              sortedData.map((item, index) => (
                <React.Fragment key={index}>
                  <tr
                    className={`
                      transition-colors duration-200
                      ${striped && index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                      hover:bg-purple-50 cursor-pointer border-b border-gray-100
                      ${rowClassName?.(item, index)}
                    `}
                    onClick={() => onRowClick?.(item, index)}
                  >
                    {expandable && (
                      <td
                        className="px-4 py-3"
                        onClick={(e) => {
                          e.stopPropagation()
                          toggleExpanded(index)
                        }}
                      >
                        <button className="text-purple-600 hover:bg-purple-100 p-1 rounded transition-colors">
                          {expandedRows.has(index) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </button>
                      </td>
                    )}

                    {columns.map((column) => (
                      <td
                        key={String(column.key)}
                        className={`px-6 py-3 text-sm text-gray-900 ${column.className || ''}`}
                      >
                        {column.render
                          ? column.render(item[column.key as keyof typeof item], item, index)
                          : String(item[column.key as keyof typeof item] || '-')}
                      </td>
                    ))}
                  </tr>

                  {/* Expanded Content */}
                  {expandable && expandedRows.has(index) && (
                    <tr className="bg-blue-50/30 border-b border-gray-100">
                      <td colSpan={columns.length + 1} className="px-6 py-4">
                        {expandedContent?.(item)}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    )
  }
)

ModernTable.displayName = 'ModernTable'
