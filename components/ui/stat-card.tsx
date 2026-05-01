import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "./card"

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  variant?: "blue" | "purple" | "emerald" | "amber" | "red" | "cyan"
  trend?: { value: number; direction: "up" | "down" }
}

const variantStyles = {
  blue: "from-blue-50 to-blue-100/30 border-blue-100 text-blue-700 bg-blue-50/40",
  purple: "from-purple-50 to-purple-100/30 border-purple-100 text-purple-700 bg-purple-50/40",
  emerald: "from-emerald-50 to-emerald-100/30 border-emerald-100 text-emerald-700 bg-emerald-50/40",
  amber: "from-amber-50 to-amber-100/30 border-amber-100 text-amber-700 bg-amber-50/40",
  red: "from-red-50 to-red-100/30 border-red-100 text-red-700 bg-red-50/40",
  cyan: "from-cyan-50 to-cyan-100/30 border-cyan-100 text-cyan-700 bg-cyan-50/40",
}

const iconBgStyles = {
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-purple-100 text-purple-600",
  emerald: "bg-emerald-100 text-emerald-600",
  amber: "bg-amber-100 text-amber-600",
  red: "bg-red-100 text-red-600",
  cyan: "bg-cyan-100 text-cyan-600",
}

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = "blue",
  trend,
}: StatCardProps) {
  return (
    <Card className={`bg-gradient-to-br ${variantStyles[variant]} border overflow-hidden`}>
      <CardHeader className="pb-3 border-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-semibold text-gray-700">
            {title}
          </CardTitle>
          {icon && (
            <div className={`p-2.5 rounded-xl ${iconBgStyles[variant]}`}>
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        <div className="flex items-baseline justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900">{value}</div>
            {subtitle && <p className="text-xs text-gray-600 mt-1">{subtitle}</p>}
          </div>
          {trend && (
            <div
              className={`text-xs font-semibold ${
                trend.direction === "up" ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {trend.direction === "up" ? "↑" : "↓"} {Math.abs(trend.value)}%
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
