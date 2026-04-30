'use client';

import React from 'react';
import { User, Mail, Phone, Shield, Calendar, MapPin, Camera } from 'lucide-react';

export default function ProfilePage() {
    // Mock user data - in a real app this would come from an auth session
    const user = {
        name: 'أحمد محمد',
        role: 'مسؤول النظام',
        email: 'ahmed@makhzoun.dz',
        phone: '0555 12 34 56',
        address: 'الجزائر العاصمة، الجزائر',
        joinedDate: 'جانفي 2024',
        permissions: ['إدارة المخزون', 'إدارة المستخدمين', 'التقارير المالية', 'التحليلات الذكية']
    };

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 p-4 md:p-8 flex justify-center items-start" dir="rtl">
            <div className="w-full max-w-4xl flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {/* Header Card */}
                <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-50 rounded-full -translate-y-1/2 translate-x-1/3 -z-0 opacity-50" />
                    
                    <div className="relative z-10">
                        <div className="h-32 w-32 rounded-3xl bg-gradient-to-br from-[#20b878] to-emerald-600 flex items-center justify-center text-5xl font-black text-white shadow-xl shadow-emerald-100 relative group">
                            {user.name.charAt(0)}
                            <button className="absolute -bottom-2 -left-2 bg-white p-2 rounded-xl shadow-lg border border-gray-100 text-gray-400 hover:text-[#20b878] transition-all">
                                <Camera size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 text-center md:text-right relative z-10">
                        <h1 className="text-3xl font-black text-gray-900">{user.name}</h1>
                        <p className="text-[#20b878] font-bold mt-1 flex items-center justify-center md:justify-start gap-2">
                            <Shield size={16} /> {user.role}
                        </p>
                        <div className="mt-6 flex flex-wrap justify-center md:justify-start gap-4 text-sm font-bold text-gray-500">
                            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                <MapPin size={14} className="text-gray-400" /> {user.address}
                            </div>
                            <div className="flex items-center gap-2 bg-gray-50 px-4 py-2 rounded-xl border border-gray-100">
                                <Calendar size={14} className="text-gray-400" /> انضم في {user.joinedDate}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Contact Info */}
                    <div className="md:col-span-1 flex flex-col gap-6">
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                            <h3 className="text-lg font-black text-gray-900 mb-6 border-b border-gray-50 pb-4">معلومات التواصل</h3>
                            <div className="space-y-6">
                                <div className="flex items-start gap-4">
                                    <div className="bg-blue-50 p-3 rounded-xl text-blue-600">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">البريد الإلكتروني</div>
                                        <div className="text-sm font-bold text-gray-900">{user.email}</div>
                                    </div>
                                </div>
                                <div className="flex items-start gap-4">
                                    <div className="bg-green-50 p-3 rounded-xl text-green-600">
                                        <Phone size={20} />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">رقم الهاتف</div>
                                        <div className="text-sm font-bold text-gray-900">{user.phone}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Permissions & Security */}
                    <div className="md:col-span-2 flex flex-col gap-6">
                        <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 h-full">
                            <h3 className="text-lg font-black text-gray-900 mb-6 border-b border-gray-50 pb-4">الصلاحيات والوصول</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {user.permissions.map((perm, i) => (
                                    <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100 hover:border-[#20b878]/30 transition-all group">
                                        <div className="h-2 w-2 rounded-full bg-[#20b878] shadow-[0_0_8px_rgba(32,184,120,0.5)]" />
                                        <span className="text-sm font-bold text-gray-700 group-hover:text-gray-900">{perm}</span>
                                    </div>
                                ))}
                            </div>
                            
                            <div className="mt-8 pt-8 border-t border-gray-50 flex justify-between items-center">
                                <div>
                                    <h4 className="text-sm font-black text-gray-900">أمان الحساب</h4>
                                    <p className="text-[10px] font-bold text-gray-400 mt-1">آخر تغيير لكلمة المرور: منذ شهرين</p>
                                </div>
                                <button className="bg-gray-900 text-white px-6 py-3 rounded-xl text-xs font-black hover:bg-black transition-all shadow-lg shadow-gray-200">
                                    تغيير كلمة المرور
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2rem] flex items-start gap-4">
                    <div className="bg-white p-2 rounded-xl text-amber-500 shadow-sm">
                        <User size={24} />
                    </div>
                    <div>
                        <h4 className="text-sm font-black text-amber-900">نصيحة الأمان</h4>
                        <p className="text-xs font-bold text-amber-700/70 mt-1 leading-relaxed">
                            بصفتك **مسؤول نظام**، يرجى التأكد من عدم مشاركة بيانات دخولك مع أي شخص آخر. جميع الحركات المسجلة في النظام (الطلبات، الفواتير، التعديلات) يتم ربطها بحسابك الشخصي للتدقيق.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
