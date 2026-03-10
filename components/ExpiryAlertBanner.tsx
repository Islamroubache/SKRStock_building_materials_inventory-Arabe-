'use client';

import React, { useEffect, useState } from 'react';
import { AlertCircle, AlertTriangle } from 'lucide-react';
import Link from 'next/link';

interface ExpiryStats {
    expired: number;
    expiringSoon: number;
    expiringThisWeek: number;
}

export default function ExpiryAlertBanner() {
    const [stats, setStats] = useState<ExpiryStats | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            try {
                const res = await fetch('/api/products/expiry-stats');
                if (res.ok) {
                    const data = await res.json();
                    setStats({
                        expired: data.expired || 0,
                        expiringSoon: data.expiringSoon || 0,
                        expiringThisWeek: data.expiringThisWeek || 0,
                    });
                }
            } catch (error) {
                console.error('Failed to fetch expiry stats for banner');
            } finally {
                setLoading(false);
            }
        }
        fetchStats();
    }, []);

    if (loading || !stats) return null;

    if (stats.expired === 0 && stats.expiringSoon === 0) return null;

    return (
        <div className="w-full flex flex-col gap-2 p-4 pb-0 bg-gray-50 border-b border-gray-100">
            {stats.expired > 0 && (
                <Link href="/products?filter=expired" className="block w-full">
                    <div className="w-full bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg flex items-center justify-between shadow-sm hover:bg-red-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <AlertCircle size={18} className="text-red-500 shrink-0" />
                            <span className="text-sm font-bold font-tajawal">
                                🔴 يوجد {stats.expired} منتجات منتهية الصلاحية — يجب سحبها فوراً
                            </span>
                        </div>
                        <span className="text-xs text-red-600 underline">عرض المنتجات</span>
                    </div>
                </Link>
            )}

            {stats.expiringSoon > 0 && (
                <Link href="/products?filter=expiring" className="block w-full">
                    <div className="w-full bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2 rounded-lg flex items-center justify-between shadow-sm hover:bg-amber-100 transition-colors">
                        <div className="flex items-center gap-3">
                            <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                            <span className="text-sm font-bold font-tajawal">
                                🟡 يوجد {stats.expiringSoon} منتجات تنتهي صلاحيتها قريباً
                                {stats.expiringThisWeek > 0 && ` (منها ${stats.expiringThisWeek} منتجات خلال هذا الأسبوع)`}
                            </span>
                        </div>
                        <span className="text-xs text-amber-600 underline">عرض المنتجات</span>
                    </div>
                </Link>
            )}
        </div>
    );
}
