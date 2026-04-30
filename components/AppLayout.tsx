'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Menu, Search, Bell, ChevronDown, Settings, AlertCircle, AlertTriangle } from 'lucide-react'
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
        { icon: '🛒', label: 'الطلبات', href: '/orders' },
        { icon: '🧾', label: 'الفواتير', href: '/invoices' },
        { icon: '👥', label: 'العملاء', href: '/customers' },
        { icon: '🏗️', label: 'الموردون', href: '/suppliers' },
        { icon: '📊', label: 'المخزون', href: '/inventory' },
        { icon: '📦', label: 'المنتجات', href: '/products' },
        { icon: '🏠', label: 'التقارير', href: '/dashboard' },
        { icon: '🤖', label: 'الذكاء الاصطناعي', href: '/ai' },
        { icon: '⚙️', label: 'الإعدادات', href: '/settings' },
    ]

    const isActive = (href: string) => pathname === href

    return (
        <aside
            className={`
        fixed md:relative w-60 h-screen bg-white border-l border-gray-200 
        flex flex-col z-40 transition-transform duration-300 ease-in-out
        ${open ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}
        >
            <div className="p-6 border-b border-gray-200 flex justify-center items-center">
                <Logo className="w-21.5 h-21" />
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto py-6 px-4">
                <div className="space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => onClose()}
                            className={`
                flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200
                ${isActive(item.href)
                                    ? 'bg-[#20b878]/10 text-[#20b878] border-r-2 border-[#20b878]'
                                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                                }
              `}
                        >
                            <span className="text-lg">{item.icon}</span>
                            <span className="text-sm font-medium flex-1">{item.label}</span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Bottom Time Widget */}
            <div className="p-4 border-t border-gray-200 mt-auto bg-white">
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-gray-50 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <span className="text-2xl font-black text-[#20b878] font-sans tracking-tight" dir="ltr">
                        {currentTime ? currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 mt-1">
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
        '/dashboard': 'التقارير',
        '/products': 'المنتجات',
        '/suppliers': 'الموردون',
        '/customers': 'العملاء',
        '/orders': 'الطلبات',
        '/invoices': 'الفواتير',
        '/inventory': 'المخزون',
        '/ai': 'الذكاء الاصطناعي',
        '/settings': 'الإعدادات',
    }

    const currentPageTitle = pageMap[pathname] || 'سوكر'

    return (
        <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
                >
                    <Menu size={20} />
                </button>
                <h1 className="text-xl font-bold text-gray-900">{currentPageTitle}</h1>
            </div>

            {/* Right Side - User Menu */}
            <div className="flex items-center gap-4">
                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-all duration-200"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-medium text-gray-900">أحمد محمد</p>
                            <p className="text-xs text-gray-500">مسؤول</p>
                        </div>
                        <div className="h-8 w-8 rounded-full bg-[#20b878]/20 flex items-center justify-center border border-gray-300">
                            <span className="text-xs font-bold text-[#20b878]">أ</span>
                        </div>
                        <ChevronDown size={16} className="text-gray-500" />
                    </button>

                    {dropdownOpen && (
                        <div className="absolute top-full mt-2 left-0 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                            <div className="p-3 border-b border-gray-200">
                                <p className="text-sm font-medium text-gray-900">حسابي</p>
                            </div>
                            <button 
                                onClick={() => {
                                    router.push('/profile');
                                    setDropdownOpen(false);
                                }}
                                className="w-full text-right px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors"
                            >
                                الملف الشخصي
                            </button>
                            <button className="w-full text-right px-4 py-2 text-gray-700 hover:bg-gray-100 transition-colors">
                                المساعدة
                            </button>
                            <div className="border-t border-gray-200"></div>
                            <button className="w-full text-right px-4 py-2 text-red-600 hover:bg-gray-100 transition-colors">
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
        <div className="flex h-screen bg-gray-50 overflow-hidden">
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/20 z-30 md:hidden"
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
                <main className="flex-1 overflow-auto">
                    <div className="p-6">
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
