'use client'

import React, { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
    Menu, Search, Bell, ChevronDown, Settings, AlertCircle, AlertTriangle,
    ShoppingCart, FileText, Users, Truck, Package, Box, BarChart3, Bot
} from 'lucide-react'
import { Logo } from './Logo'
import ExpiryAlertBanner from './ExpiryAlertBanner'

function Sidebar({ open, onClose, collapsed, onToggleCollapse }: { open: boolean; onClose: () => void; collapsed: boolean; onToggleCollapse: () => void }) {
    const pathname = usePathname()
    const [currentTime, setCurrentTime] = useState<Date | null>(null)

    useEffect(() => {
        setCurrentTime(new Date())
        const timer = setInterval(() => setCurrentTime(new Date()), 1000)
        return () => clearInterval(timer)
    }, [])

    const navItems = [
        { icon: ShoppingCart, label: 'الطلبات  ', href: '/orders' },
        { icon: FileText, label: 'الفواتير', href: '/invoices' },
        { icon: Users, label: 'العملاء', href: '/customers' },
        { icon: Truck, label: 'الموردون', href: '/suppliers' },
        { icon: Package, label: 'المخزون', href: '/inventory' },
        { icon: Box, label: 'المنتجات', href: '/products' },
        { icon: BarChart3, label: 'التقارير', href: '/dashboard' },
        { icon: Bot, label: 'الذكاء الاصطناعي', href: '/ai' },
    ]

    const isActive = (href: string) => pathname === href

    return (
        <aside
            className={`
        fixed md:relative ${collapsed ? 'w-16' : 'w-52'} h-full 
        flex flex-col z-40 transition-[width] duration-500 cubic-bezier text-white
        rounded-[1rem] overflow-hidden
        ${open ? 'translate-x-0' : 'translate-x-full md:translate-x-0'}
      `}
            style={{ backgroundColor: '#8b5cf6', transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
            <div
                className={`flex justify-center items-center cursor-pointer hover:opacity-80 active:scale-95 transition-all duration-500 ease-in-out ${collapsed ? 'p-2 py-6' : 'p-4'}`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}
                onClick={onToggleCollapse}
            >
                <Logo
                    className={`transition-all duration-500 ease-in-out ${collapsed ? 'w-10 h-10' : 'w-40 h-20'}`}
                    variant={collapsed ? "mini" : "full"}
                />
            </div>

            {/* Navigation Items */}
            <nav className={`flex-1 overflow-y-auto py-6 transition-all duration-500 ${collapsed ? 'px-2' : 'px-4'}`}>
                <div className="space-y-2">
                    {navItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            onClick={() => onClose()}
                            className={`
                relative flex items-center py-3.5 rounded-2xl transition-all duration-500
                ${collapsed ? 'px-0 justify-center' : 'px-4'}
                ${isActive(item.href)
                                    ? `shadow-lg font-bold ${collapsed ? '' : 'translate-x-1'}`
                                    : 'text-white/80 hover:bg-white/10 hover:text-white'
                                }
              `}
                            style={{
                                backgroundColor: isActive(item.href) ? '#f0eaff' : 'transparent',
                                color: isActive(item.href) ? '#8b5cf6' : 'inherit',
                                transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            title={collapsed ? item.label : ""}
                        >
                            <div className={`flex items-center justify-center transition-all duration-500 ${collapsed ? 'w-full' : 'w-6'}`}>
                                <item.icon size={22} strokeWidth={2.5} style={isActive(item.href) ? { color: '#8b5cf6' } : {}} />
                            </div>
                            <span className={`text-sm font-medium transition-all duration-500 overflow-hidden whitespace-nowrap ${collapsed ? 'opacity-0 w-0' : 'opacity-100 ml-4 w-auto'}`}>
                                {item.label}
                            </span>
                        </Link>
                    ))}
                </div>
            </nav>

            {/* Bottom Time Widget */}
            <div className={`mt-auto transition-all duration-500 ${collapsed ? 'opacity-0 scale-95 h-0 overflow-hidden p-0' : 'opacity-100 scale-100 p-6'}`}
                style={{ transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)' }}>
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/10 border border-white/20 backdrop-blur-md shadow-lg hover:bg-white/20 transition-all text-center">
                    <span className="text-3xl font-black text-white font-sans tracking-tight" dir="ltr">
                        {currentTime ? currentTime.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) : '--:--'}
                    </span>
                    <span className="text-[11px] font-bold text-white/80 mt-2 bg-black/10 px-3 py-1 rounded-full">
                        {currentTime ? currentTime.toLocaleDateString('ar-DZ', { weekday: 'long', year: 'numeric', month: 'short', day: 'numeric' }) : '...'}
                    </span>
                </div>
            </div>

        </aside>
    )
}

function TopBar({ onMenuClick, notificationCount = 0 }: { onMenuClick: () => void, notificationCount?: number }) {
    const pathname = usePathname()
    const router = useRouter()
    const [dropdownOpen, setDropdownOpen] = useState(false)

    return (
        <header className="h-24 bg-transparent px-8 flex items-center justify-between gap-8">
            <div className="flex items-center">
                <button
                    onClick={onMenuClick}
                    className="md:hidden p-2 text-gray-600 hover:text-violet-600 hover:bg-purple-50 rounded-lg transition-all"
                >
                    <Menu size={24} />
                </button>
            </div>

            {/* Search Bar - Center */}
            <div className="flex-1 max-w-md relative group">
                <input
                    type="text"
                    placeholder="بحث في النظام..."
                    className="w-full h-12 bg-white border border-gray-200 focus:border-violet-300 focus:ring-4 focus:ring-violet-500/10 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none shadow-sm"
                />
                <div className="absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10 bg-[#8b5cf6] rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none">
                    <Search size={18} strokeWidth={3} />
                </div>
            </div>

            {/* Right Side - Actions & User */}
            <div className="flex items-center gap-6">
                {/* Notification Button */}
                <button 
                    onClick={() => router.push('/dashboard?tab=notifications')}
                    className="relative h-12 w-12 rounded-2xl bg-[#8b5cf6] flex items-center justify-center shadow-lg shadow-violet-100 hover:scale-105 active:scale-95 transition-all group"
                >
                    <Bell size={22} className="text-white group-hover:rotate-12 transition-transform" />
                    {notificationCount > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-5 bg-red-500 border-2 border-white rounded-full shadow-sm flex items-center justify-center px-1 text-[10px] font-black text-white animate-in zoom-in duration-300">
                            {notificationCount}
                        </span>
                    )}
                </button>

                <div className="relative">
                    <button
                        onClick={() => setDropdownOpen(!dropdownOpen)}
                        className="flex items-center gap-4 h-12 px-5 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl transition-all duration-200 group shadow-sm"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-black text-gray-900 leading-none">أحمد محمد</p>
                            <p className="text-[10px] text-[#8b5cf6] font-black uppercase tracking-wider mt-1">مسؤول النظام</p>
                        </div>
                        <ChevronDown size={16} className="text-gray-400 transition-transform duration-300 group-hover:text-gray-600" style={{ transform: dropdownOpen ? 'rotate(180deg)' : 'rotate(0)' }} />
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
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [notifCount, setNotifCount] = useState(0)

    useEffect(() => {
        const fetchNotifs = async () => {
            try {
                const res = await fetch('/api/dashboard/stats?type=daily')
                const data = await res.json()
                const count = (data.expiredCount || 0) + (data.lowStockCount || 0) + (data.overdueInvoicesCount || 0)
                setNotifCount(count)
            } catch (err) {
                console.error('Failed to fetch notifs:', err)
            }
        }
        fetchNotifs()
        // Refresh every 5 minutes
        const interval = setInterval(fetchNotifs, 5 * 60 * 1000)
        return () => clearInterval(interval)
    }, [])

    return (
        <div className="flex h-screen overflow-hidden p-0.5 gap-1" style={{ backgroundColor: '#8b5cf6' }}>
            {/* Mobile Overlay */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-30 md:hidden backdrop-blur-sm"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <Sidebar
                open={sidebarOpen}
                onClose={() => setSidebarOpen(false)}
                collapsed={isCollapsed}
                onToggleCollapse={() => setIsCollapsed(!isCollapsed)}
            />

            {/* Main Content */}
            <div className="flex-1 flex flex-col bg-white rounded-[1rem] md:rounded-[1.4rem] overflow-hidden shadow-2xl relative border border-white/10">
                {/* Top Bar */}
                <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} notificationCount={notifCount} />

                {/* Content Area */}
                <main className="flex-1 overflow-auto">
                    {children}
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
