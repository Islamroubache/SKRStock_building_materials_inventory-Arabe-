'use client';

import React, { useState, useEffect } from 'react';
import { 
    User, Mail, Phone, Shield, Calendar, MapPin, Camera,
    Settings, Store, Building2, Percent, Save, RefreshCw, 
    FileText, BadgeCheck, Image as ImageIcon, X, CreditCard,
    Layers, Briefcase, Package, CheckCircle
} from 'lucide-react';

interface SettingsData {
    storeName: string;
    logo: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
    rc: string | null;
    nif: string | null;
    ai: string | null;
    nis: string | null;
    tvaRate: number;
    timbreRate: number;
    categories: string;
    units: string;
    activities: string;
}

export default function ProfilePage() {
    const [activeTab, setActiveTab] = useState<'profile' | 'settings'>('profile');
    
    // User Data (Mock for now)
    const user = {
        name: 'أحمد محمد',
        role: 'مسؤول النظام',
        email: 'ahmed@makhzoun.dz',
        phone: '0555 12 34 56',
        address: 'الجزائر العاصمة، الجزائر',
        joinedDate: 'جانفي 2024',
        permissions: ['إدارة المخزون', 'إدارة المستخدمين', 'التقارير المالية', 'التحليلات الذكية']
    };

    // Settings State
    const [settings, setSettings] = useState<SettingsData>({
        storeName: 'برنامج إدارة محل',
        logo: '',
        address: '',
        phone: '',
        email: '',
        rc: '',
        nif: '',
        ai: '',
        nis: '',
        tvaRate: 19,
        timbreRate: 1,
        categories: 'مواد بناء,كهرباء,سباكة,دهانات,أخرى',
        units: 'كيس,قضيب,متر,لتر,كرتون,قطعة',
        activities: 'بيع بالجملة,بيع بالتجزئة,مقاولات,أخرى'
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await fetch('/api/settings');
            if (res.ok) {
                const data = await res.json();
                setSettings({
                    storeName: data.storeName || 'برنامج إدارة محل',
                    logo: data.logo || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    rc: data.rc || '',
                    nif: data.nif || '',
                    ai: data.ai || '',
                    nis: data.nis || '',
                    tvaRate: data.tvaRate ?? 19,
                    timbreRate: data.timbreRate ?? 1,
                    categories: data.categories || 'مواد بناء,كهرباء,سباكة,دهانات,أخرى',
                    units: data.units || 'كيس,قضيب,متر,لتر,كرتون,قطعة',
                    activities: data.activities || 'بيع بالجملة,بيع بالتجزئة,مقاولات,أخرى'
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveSettings = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const res = await fetch('/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(settings)
            });
            if (res.ok) {
                setMessage({ type: 'success', text: 'تم حفظ الإعدادات بنجاح' });
                setTimeout(() => setMessage(null), 3000);
            } else {
                setMessage({ type: 'error', text: 'فشل حفظ الإعدادات' });
            }
        } catch (e) {
            setMessage({ type: 'error', text: 'حدث خطأ غير متوقع' });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50" dir="rtl">
                <RefreshCw className="animate-spin text-[#20b878]" size={40} />
            </div>
        );
    }

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 p-4 md:p-8 flex flex-col items-center" dir="rtl">
            
            {/* TABS */}
            <div className="w-full max-w-4xl flex bg-gray-200/50 p-1.5 rounded-2xl gap-1 mb-8 overflow-x-auto no-scrollbar">
                <button 
                    onClick={() => setActiveTab('profile')} 
                    className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'profile' ? 'bg-white text-[#20b878] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <User size={18} /> ملف المستخدم
                </button>
                <button 
                    onClick={() => setActiveTab('settings')} 
                    className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'settings' ? 'bg-white text-[#20b878] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Store size={18} /> إعدادات المتجر
                </button>
                <button 
                    onClick={() => setActiveTab('app')} 
                    className={`flex-1 min-w-[120px] py-3 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'app' ? 'bg-white text-[#20b878] shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Settings size={18} /> إعدادات البرنامج
                </button>
            </div>

            <div className="w-full max-w-4xl animate-in fade-in slide-in-from-bottom-4 duration-500">
                
                {activeTab === 'profile' && (
                    <div className="flex flex-col gap-8">
                        {/* Header Card */}
                        <div className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -translate-y-1/2 translate-x-1/3 -z-0 opacity-50" />
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
                            <div className="md:col-span-1 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                                <h3 className="text-lg font-black text-gray-900 mb-6 border-b border-gray-50 pb-4">معلومات التواصل</h3>
                                <div className="space-y-6">
                                    <div className="flex items-start gap-4">
                                        <div className="bg-blue-50 p-3 rounded-xl text-blue-600"><Mail size={20} /></div>
                                        <div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">البريد الإلكتروني</div>
                                            <div className="text-sm font-bold text-gray-900">{user.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-start gap-4">
                                        <div className="bg-green-50 p-3 rounded-xl text-green-600"><Phone size={20} /></div>
                                        <div>
                                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">رقم الهاتف</div>
                                            <div className="text-sm font-bold text-gray-900">{user.phone}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="md:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100">
                                <h3 className="text-lg font-black text-gray-900 mb-6 border-b border-gray-50 pb-4">الصلاحيات والوصول</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {user.permissions.map((perm, i) => (
                                        <div key={i} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                            <div className="h-2 w-2 rounded-full bg-[#20b878] shadow-[0_0_8px_rgba(32,184,120,0.5)]" />
                                            <span className="text-sm font-bold text-gray-700">{perm}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="mt-8 pt-8 border-t border-gray-50 flex justify-between items-center">
                                    <h4 className="text-sm font-black text-gray-900">أمان الحساب</h4>
                                    <button className="bg-gray-900 text-white px-6 py-3 rounded-xl text-xs font-black hover:bg-black transition-all">تغيير كلمة المرور</button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'settings' && (
                    <form onSubmit={handleSaveSettings} className="flex flex-col gap-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Identity */}
                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-6">
                                <h2 className="text-xl font-black flex items-center gap-2 text-blue-600 border-b border-gray-50 pb-4">
                                    <Store size={22} /> هوية المتجر
                                </h2>
                                <div className="flex flex-col gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 mr-2">اسم المتجر / الشركة</label>
                                        <input 
                                            type="text"
                                            value={settings.storeName}
                                            onChange={e => setSettings({...settings, storeName: e.target.value})}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#20b878]/20 font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 mr-2">رابط الشعار (URL)</label>
                                        <input 
                                            type="text"
                                            value={settings.logo || ''}
                                            onChange={e => setSettings({...settings, logo: e.target.value})}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#20b878]/20 font-sans"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 mr-2">العنوان الكامل</label>
                                        <input 
                                            type="text"
                                            value={settings.address || ''}
                                            onChange={e => setSettings({...settings, address: e.target.value})}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-[#20b878]/20 font-bold"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Fiscal Info */}
                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-6">
                                <h2 className="text-xl font-black flex items-center gap-2 text-indigo-600 border-b border-gray-50 pb-4">
                                    <BadgeCheck size={22} /> المعلومات القانونية
                                </h2>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 mr-2">RC</label>
                                        <input 
                                            type="text"
                                            value={settings.rc || ''}
                                            onChange={e => setSettings({...settings, rc: e.target.value})}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none font-sans font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 mr-2">NIF</label>
                                        <input 
                                            type="text"
                                            value={settings.nif || ''}
                                            onChange={e => setSettings({...settings, nif: e.target.value})}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none font-sans font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 mr-2">AI</label>
                                        <input 
                                            type="text"
                                            value={settings.ai || ''}
                                            onChange={e => setSettings({...settings, ai: e.target.value})}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none font-sans font-bold"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-black text-gray-400 mr-2">NIS</label>
                                        <input 
                                            type="text"
                                            value={settings.nis || ''}
                                            onChange={e => setSettings({...settings, nis: e.target.value})}
                                            className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none font-sans font-bold"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tax & Action */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 flex flex-col md:flex-row items-center gap-8">
                            <div className="flex-1 grid grid-cols-2 gap-8 w-full">
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 mr-2">TVA %</label>
                                    <input 
                                        type="number"
                                        value={settings.tvaRate}
                                        onChange={e => setSettings({...settings, tvaRate: parseFloat(e.target.value) || 0})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none font-sans font-black text-emerald-600"
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-xs font-black text-gray-400 mr-2">Timbre %</label>
                                    <input 
                                        type="number"
                                        value={settings.timbreRate}
                                        onChange={e => setSettings({...settings, timbreRate: parseFloat(e.target.value) || 0})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none font-sans font-black text-emerald-600"
                                    />
                                </div>
                            </div>
                            <div className="w-full md:w-auto">
                                {message && (
                                    <div className={`mb-4 p-3 rounded-xl text-center text-xs font-bold ${message.type === 'success' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {message.text}
                                    </div>
                                )}
                                <button 
                                    type="submit"
                                    disabled={saving}
                                    className="w-full md:w-64 bg-[#20b878] hover:bg-[#1a9d66] text-white py-4 rounded-2xl font-black shadow-xl shadow-[#20b878]/20 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-gray-300"
                                >
                                    {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                    حفظ إعدادات المتجر
                                </button>
                            </div>
                        </div>
                    </form>
                )}
                {activeTab === 'app' && (
                    <form onSubmit={handleSaveSettings} className="flex flex-col gap-8">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {/* Categories */}
                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4">
                                <h2 className="text-lg font-black flex items-center gap-2 text-purple-600 border-b border-gray-50 pb-4">
                                    <Layers size={20} /> فئات المنتجات
                                </h2>
                                <p className="text-[10px] font-bold text-gray-400">أدخل الفئات مفصولة بفاصلة (,)</p>
                                <textarea 
                                    value={settings.categories}
                                    onChange={e => setSettings({...settings, categories: e.target.value})}
                                    rows={5}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-purple-500/20 font-bold text-sm leading-relaxed"
                                />
                            </div>

                            {/* Units */}
                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4">
                                <h2 className="text-lg font-black flex items-center gap-2 text-blue-600 border-b border-gray-50 pb-4">
                                    <Package size={20} /> وحدات القياس
                                </h2>
                                <p className="text-[10px] font-bold text-gray-400">أدخل الوحدات مفصولة بفاصلة (,)</p>
                                <textarea 
                                    value={settings.units}
                                    onChange={e => setSettings({...settings, units: e.target.value})}
                                    rows={5}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500/20 font-bold text-sm leading-relaxed"
                                />
                            </div>

                            {/* Activities */}
                            <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col gap-4">
                                <h2 className="text-lg font-black flex items-center gap-2 text-emerald-600 border-b border-gray-50 pb-4">
                                    <Briefcase size={20} /> الأنشطة التجارية
                                </h2>
                                <p className="text-[10px] font-bold text-gray-400">أدخل الأنشطة مفصولة بفاصلة (,)</p>
                                <textarea 
                                    value={settings.activities}
                                    onChange={e => setSettings({...settings, activities: e.target.value})}
                                    rows={5}
                                    className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-emerald-500/20 font-bold text-sm leading-relaxed"
                                />
                            </div>
                        </div>

                        <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-gray-100 flex items-center justify-between">
                            <p className="text-xs font-bold text-gray-500 max-w-md">
                                * سيتم استخدام هذه القوائم تلقائياً في جميع نماذج الإضافة (منتج جديد، مورد جديد، عميل جديد).
                            </p>
                            <button 
                                type="submit"
                                disabled={saving}
                                className="bg-gray-900 hover:bg-black text-white px-10 py-4 rounded-2xl font-black shadow-xl shadow-gray-200 flex items-center justify-center gap-3 transition-all active:scale-95 disabled:bg-gray-300"
                            >
                                {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                                حفظ قوائم البرنامج
                            </button>
                        </div>
                    </form>
                )}
            </div>

            {message && (
                <div className="fixed bottom-8 left-8 animate-in slide-in-from-left duration-300 z-50">
                    <div className={`px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 font-black text-sm border ${message.type === 'success' ? 'bg-white border-emerald-500 text-emerald-600' : 'bg-white border-red-500 text-red-600'}`}>
                        {message.type === 'success' ? <CheckCircle size={20} /> : <X size={20} />}
                        {message.text}
                    </div>
                </div>
            )}
        </div>
    );
}
