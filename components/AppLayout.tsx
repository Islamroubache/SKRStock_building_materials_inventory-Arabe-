'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, BarChart3, FileText, Users, Building2, Package, TrendingUp, Sparkles, Settings, ChevronDown, Clock } from 'lucide-react'
import { Logo } from './Logo'
import ExpiryAlertBanner from './ExpiryAlertBanner'

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
    const pathname = usePathname()
    const [currentTime, setCurrentTime] = useState<Date | null>(null)

    useEffect(() => {
        setCurrentTime(new Date())
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const navItems = [
        { icon: BarChart3, label: 'التقارير', href: '/dashboard' },
        { icon: FileText, label: 'الطلبات', href: '/orders' },
        { icon: FileText, label: 'الفواتير', href: '/invoices' },
        { icon: Users, label: 'العملاء', href: '/customers' },
        { icon: Building2, label: 'الموردون', href: '/suppliers' },
        { icon: Package, label: 'المخزون', href: '/inventory' },
        { icon: TrendingUp, label: 'المنتجات', href: '/products' },
        { icon: Sparkles, label: 'الذكاء الاصطناعي', href: '/ai' },
        { icon: Settings, label: 'الإعدادات', href: '/settings' },
    ]

    const isActive = (href: string) => pathname === href

    return (
        <aside
            className={`
        fixed md:relative w-64 h-screen bg-gradient-to-b from-blue-700 via-blue-600 to-purple-700
        flex flex-col z-40 transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}
        >
            <div className="p-6 flex justify-center items-center">
                <Logo className="w-24 h-24" />
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
                <div className="space-y-2">
                    {navItems.map((item) => {
                        const Icon = item.icon
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => onClose()}
                                className={`
                    flex items-center gap-3 px-4 py-3 rounded-full transition-all duration-200 text-sm font-semibold
                    ${isActive(item.href)
                                        ? 'bg-white/25 text-white shadow-lg backdrop-blur-sm border border-white/30'
                                        : 'text-white/80 hover:bg-white/15 hover:text-white'
                                    }
                  `}
                            >
                                <Icon size={18} className="flex-shrink-0" />
                                <span className="flex-1">{item.label}</span>
                            </Link>
                        )
                    })}
                </div>
            </nav>

            {/* Bottom Time Widget */}
            <div className="p-4 border-t border-white/10 mt-auto">
                <div className="flex flex-col items-center justify-center p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg">
                    <Clock size={16} className="text-white/70 mb-2" />
                    <span className="text-lg font-bold text-white font-sans tracking-tight" dir="ltr">
                        {currentTime ? currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                    <span className="text-[11px] font-semibold text-white/70 mt-1 text-center">
                        {currentTime ? currentTime.toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }) : '...'}
                    </span>
                </div>
            </div>

        </aside>
    )
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
    const pathname = usePathname()
    const router = useRouter()
    const [dropdownOpen, setDropdownOpen] = useState(false)

    const pageMap: { [key: string]: string } = {
        '/dashboard': 'لوحة التحكم',
        '/products': 'المنتجات',
        '/suppliers': 'الموردون',
        '/customers': 'العملاء',
        '/orders': 'الطلبات',
        '/invoices': 'الفواتير',
        '/inventory': 'المخزون',
        '/ai': 'الذكاء الاصطناعي',
        '/settings': 'الإعدادات',
    }

    const currentPageTitle = pageMap[pathname] || 'SKRStock'

    return (
        <header className="h-16 bg-white border-b border-blue-100/50 px-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-all"
                >
                    <Menu size={20} />
                </button>
                <h1 className="text-lg font-bold text-gray-900">{currentPageTitle}</h1>
            </div>

            {/* Right Side - User Menu */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-3 p-2 hover:bg-blue-50 rounded-full transition-all duration-200"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-semibold text-gray-900">أحمد محمد</p>
                            <p className="text-xs text-gray-500">مسؤول</p>
                        </div>
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center border border-blue-200 text-white font-bold text-sm shadow-md">
                            أ
                        </div>
                        <ChevronDown size={16} className="text-gray-400" />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute top-full mt-2 right-0 w-56 bg-white border border-blue-100 rounded-2xl shadow-xl z-50 overflow-hidden">
                            <div className="p-4 border-b border-blue-100 bg-blue-50/50">
                                <p className="text-sm font-semibold text-gray-900">حسابي</p>
                            </div>
                            <button 
                                onClick={() => {
                                    router.push('/profile');
                                    setDropdownOpen(false);
                                }}
                                className="w-full text-right px-4 py-3 text-gray-700 hover:bg-blue-50 transition-colors text-sm font-medium"
                            >
                                الملف الشخصي
                            </button>
                            <button className="w-full text-right px-4 py-3 text-gray-700 hover:bg-blue-50 transition-colors text-sm font-medium">
                                المساعدة
                            </button>
                            <div className="border-t border-blue-100"></div>
                            <button className="w-full text-right px-4 py-3 text-red-600 hover:bg-red-50 transition-colors text-sm font-medium">
                                تسجيل الخروج
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false)

    return (
        <div className="flex h-screen bg-blue-50/30 overflow-hidden">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/30 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top Bar */}
                <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

                {/* Content Area */}
                <main className="flex-1 overflow-auto bg-gradient-to-br from-white via-blue-50/20 to-purple-50/30">
                    <div className="p-6 md:p-8">
                        {children}
                    </div>
                </main>
            </div>

            <style jsx global>{`
                @media print {
                    aside, header, nav, button, .no-print, [role="button"] {
                        display: none !important;
                    }
                    main {
                        padding: 0 !important;
                        margin: 0 !important;
                        overflow: visible !important;
                        height: auto !important;
                    }
                    body {
                        background: white !important;
                    }
                    .flex-1 {
                        display: block !important;
                    }
                    * {
                        overflow: visible !important;
                    }
                }
            `}</style>
        </div>
    )
}
