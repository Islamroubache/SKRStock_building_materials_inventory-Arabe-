'use client';

import React, { useState, useEffect } from 'react';
import { 
    Settings, Store, Building2, Percent, Save, RefreshCw, 
    FileText, Phone, Mail, MapPin, BadgeCheck, Image as ImageIcon
} from 'lucide-react';
import PageHeader from '@/components/PageHeader';

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
}

export default function SettingsPage() {
    const [settings, setSettings] = useState<SettingsData>({
        storeName: 'مخزون',
        logo: '',
        address: '',
        phone: '',
        email: '',
        rc: '',
        nif: '',
        ai: '',
        nis: '',
        tvaRate: 19,
        timbreRate: 1
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
                    storeName: data.storeName || 'مخزون',
                    logo: data.logo || '',
                    address: data.address || '',
                    phone: data.phone || '',
                    email: data.email || '',
                    rc: data.rc || '',
                    nif: data.nif || '',
                    ai: data.ai || '',
                    nis: data.nis || '',
                    tvaRate: data.tvaRate ?? 19,
                    timbreRate: data.timbreRate ?? 1
                });
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
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
            <div className="flex items-center justify-center min-h-screen bg-gray-50 drop-shadow-sm" dir="rtl">
                <div className="flex flex-col items-center gap-4">
                    <RefreshCw className="animate-spin text-blue-600" size={40} />
                    <p className="text-gray-500 font-bold font-tajawal">جاري تحميل الإعدادات...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 flex flex-col gap-8" dir="rtl">
            <style jsx global>{`
                @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@200;300;400;500;700;800;900&display=swap');
                .font-tajawal { font-family: 'Tajawal', sans-serif; }
            `}</style>

            {/* HEADER */}
            <div className="no-print">
                <PageHeader 
                    title="إعدادات النظام" 
                    subtitle="تهيئة المعلومات الأساسية، العملات، وطباعة الفواتير" 
                    Icon={Settings} 
                />
            </div>

            <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* LEFT COLUMN: IDENTITY & TAX */}
                <div className="lg:col-span-2 flex flex-col gap-6">
                    
                    {/* STORE INFO CARD */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                        <h2 className="text-xl font-black flex items-center gap-2 mb-6 text-blue-600">
                            <Store size={22} /> هوية المتجر
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-600 px-1">اسم المتجر / الشركة</label>
                                <div className="relative">
                                    <Store className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input 
                                        type="text"
                                        value={settings.storeName}
                                        onChange={e => setSettings({...settings, storeName: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-bold"
                                        placeholder="مثال: مؤسسة مخرون للتوريدات"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-600 px-1">شعار المتجر (رابط الصورة)</label>
                                <div className="relative">
                                    <ImageIcon className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input 
                                        type="text"
                                        value={settings.logo || ''}
                                        onChange={e => setSettings({...settings, logo: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-sans"
                                        placeholder="https://example.com/logo.png"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2 md:col-span-2">
                                <label className="text-sm font-bold text-gray-600 px-1">العنوان الكامل</label>
                                <div className="relative">
                                    <MapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input 
                                        type="text"
                                        value={settings.address || ''}
                                        onChange={e => setSettings({...settings, address: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-bold"
                                        placeholder="الحي الإداري، ولاية الجزائر"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-600 px-1">رقم الهاتف</label>
                                <div className="relative">
                                    <Phone className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input 
                                        type="text"
                                        value={settings.phone || ''}
                                        onChange={e => setSettings({...settings, phone: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-sans font-bold text-right"
                                        placeholder="0550 00 00 00"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-600 px-1">البريد الإلكتروني</label>
                                <div className="relative">
                                    <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input 
                                        type="email"
                                        value={settings.email || ''}
                                        onChange={e => setSettings({...settings, email: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-sans font-bold"
                                        placeholder="contact@store.com"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* BUSINESS IDS CARD */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                        <h2 className="text-xl font-black flex items-center gap-2 mb-6 text-indigo-600">
                            <BadgeCheck size={22} /> المعلومات القانونية (للجباية)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-600 px-1">السجل التجاري (RC)</label>
                                <div className="relative">
                                    <FileText className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input 
                                        type="text"
                                        value={settings.rc || ''}
                                        onChange={e => setSettings({...settings, rc: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-sans font-bold"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-600 px-1">الرقم التعريفي الجبائي (NIF)</label>
                                <div className="relative">
                                    <FileText className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input 
                                        type="text"
                                        value={settings.nif || ''}
                                        onChange={e => setSettings({...settings, nif: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-sans font-bold"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-600 px-1">رقم المادة (AI)</label>
                                <div className="relative">
                                    <FileText className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input 
                                        type="text"
                                        value={settings.ai || ''}
                                        onChange={e => setSettings({...settings, ai: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-sans font-bold"
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-600 px-1">الرقم التعريفي الإحصائي (NIS)</label>
                                <div className="relative">
                                    <FileText className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                                    <input 
                                        type="text"
                                        value={settings.nis || ''}
                                        onChange={e => setSettings({...settings, nis: e.target.value})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl pr-12 pl-4 py-3.5 outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all font-sans font-bold"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: TAX RATES & PREVIEW */}
                <div className="flex flex-col gap-8">
                    
                    {/* TAX CARD */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm">
                        <h2 className="text-xl font-black flex items-center gap-2 mb-6 text-emerald-600">
                            <Percent size={22} /> إعدادات الضرائب
                        </h2>
                        <div className="space-y-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-600 px-1">نسبة الضريبة على القيمة المضافة (TVA %)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 font-sans">%</span>
                                    <input 
                                        type="number"
                                        value={settings.tvaRate}
                                        onChange={e => setSettings({...settings, tvaRate: parseFloat(e.target.value) || 0})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all font-bold font-sans"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium leading-tight">تطبق هذه النسبة تلقائياً على المنتجات في الفواتير الرسمية.</p>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-sm font-bold text-gray-600 px-1">نسبة قسيمة الدمغة (Timbre %)</label>
                                <div className="relative">
                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-gray-400 font-sans">%</span>
                                    <input 
                                        type="number"
                                        value={settings.timbreRate}
                                        onChange={e => setSettings({...settings, timbreRate: parseFloat(e.target.value) || 0})}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-4 py-3.5 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:bg-white transition-all font-bold font-sans"
                                    />
                                </div>
                                <p className="text-[10px] text-gray-400 font-medium leading-tight">تطبق حصراً على الفواتير الرسمية المدفوعة نقداً (الأقصى 10,000 دج).</p>
                            </div>
                        </div>
                    </div>

                    {/* LOGO PREVIEW */}
                    <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm flex flex-col items-center gap-4">
                        <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest w-full text-right">معاينة الشعار</h3>
                        <div className="w-full aspect-video rounded-2xl bg-gray-50 border border-dashed border-gray-200 flex items-center justify-center overflow-hidden">
                            {settings.logo ? (
                                <img src={settings.logo} alt="Store Logo" className="max-w-full max-h-full object-contain p-4" onError={(e) => (e.currentTarget.src = 'https://via.placeholder.com/150?text=Error')}/>
                            ) : (
                                <div className="flex flex-col items-center gap-2 text-gray-300">
                                    <ImageIcon size={48} />
                                    <span className="text-xs font-bold">لا يوجد شعار مؤشر</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ACTION BUTTONS */}
                    <div className="flex flex-col gap-3 sticky bottom-8">
                        {message && (
                            <div className={`p-4 rounded-2xl text-sm font-bold text-center animate-in slide-in-from-bottom-2 ${message.type === 'success' ? 'bg-emerald-50/80 text-emerald-600 border border-emerald-100' : 'bg-red-50 text-red-600 border border-red-100'}`}>
                                {message.text}
                            </div>
                        )}
                        <button 
                            type="submit"
                            disabled={saving}
                            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black py-4 rounded-2xl shadow-xl shadow-blue-200 transition-all flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {saving ? <RefreshCw className="animate-spin" size={20} /> : <Save size={20} />}
                            حفظ كافة التغييرات الجوهرية
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
