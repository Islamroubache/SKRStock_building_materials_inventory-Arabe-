'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { 
    Search, Plus, Trash2, CheckCircle, AlertTriangle, Printer, Download, 
    CreditCard, ShoppingBag, ShoppingCart, X, ChevronDown, User, Calendar, 
    PackageOpen, Layers, Dribbble, BookOpen, UserCircle2, Building2, Store,
    FileText, FileSpreadsheet, Percent, Info, ShieldCheck, Landmark
} from 'lucide-react';
import { numberToArabicWords } from '@/lib/number-to-arabic-words';
import { exportInvoiceToExcel } from '@/lib/export-invoice';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { BonDeCommande } from '@/components/documents/BonDeCommande';
import { Facture } from '@/components/documents/Facture';
import { ALGERIA_LOCATIONS } from '@/lib/constants/algeria-locations';

// --- Types ---
interface Customer {
    id: number;
    name: string;
    type: 'REGULAR' | 'LOYAL';
    balanceDue: number;
    creditLimit: number | null;
}

interface Supplier {
    id: number;
    name: string;
    balanceDue: number;
}

interface Project {
    id: number;
    name: string;
    customerId: number;
}

interface Product {
    id: number;
    name: string;
    quantity: number;
    sellPrice: number;
    purchasePrice: number;
    unit: string;
    hasBatches?: boolean;
}

interface OrderLine {
    id: string;
    productId: number | '';
    product?: Product;
    quantity: number;
    unitPrice: number;
}

// --- Utilities ---
const tafqeet = (num: number): string => {
    return numberToArabicWords(num);
};

// --- Custom Components ---
const SearchableSelect = ({
    options,
    value,
    onChange,
    placeholder,
    onSelect
}: {
    options: { id: number, label: string, subLabel?: string }[],
    value: number | '',
    onChange: (val: number | '') => void,
    placeholder: string,
    onSelect?: (option: any) => void
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setIsOpen(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
    const selected = options.find(opt => opt.id === value);

    return (
        <div className={`relative ${isOpen ? 'z-[60]' : 'z-10'}`} ref={wrapperRef}>
            <div
                className={`w-full bg-white/50 border ${isOpen ? 'border-blue-500 ring-2 ring-blue-500/20' : 'border-gray-200 hover:border-gray-300'} rounded-2xl px-4 py-3 flex items-center justify-between cursor-pointer transition-all`}
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={selected ? "text-gray-900 font-bold" : "text-gray-500 font-medium"}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown size={18} className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-[100] w-full mt-2 bg-white border border-gray-200 rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-gray-100 bg-white">
                        <div className="relative">
                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                type="text"
                                autoFocus
                                placeholder="بحث..."
                                className="w-full bg-gray-50 border border-gray-200 rounded-xl pr-10 pl-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-500/50"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filtered.length === 0 ? (
                            <div className="p-6 text-center text-sm text-gray-500 font-bold">لا توجد نتائج مطابقة</div>
                        ) : (
                            filtered.map(opt => (
                                <div
                                    key={opt.id}
                                    className={`px-4 py-3 text-sm cursor-pointer hover:bg-gray-50 transition-colors flex flex-col gap-1 border-b border-gray-100 last:border-0
                                    ${value === opt.id ? 'bg-blue-50 text-blue-600 border-l-4 border-l-blue-500' : 'text-gray-700 bg-white'}`}
                                    onClick={() => {
                                        onChange(opt.id);
                                        if (onSelect) onSelect(opt);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <span className="font-bold">{opt.label}</span>
                                    {opt.subLabel && <span className="text-[11px] text-gray-500 font-medium font-sans">{opt.subLabel}</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default function NewOrderPageWrapper() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center p-8"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div></div>}>
            <NewOrderPage />
        </Suspense>
    );
}

function NewOrderPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Data fetching
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    // Form states
    const [orderType, setOrderType] = useState<'SALE' | 'PURCHASE'>('SALE');

    useEffect(() => {
        const type = searchParams.get('type');
        if (type === 'PURCHASE') {
            setOrderType('PURCHASE');
            setExternalOrderNumber('SHR-');
        } else {
            setOrderType('SALE');
            setExternalOrderNumber('');
        }
    }, [searchParams]);
    const [orderStatus, setOrderStatus] = useState<'DONE' | 'PENDING'>('DONE');
    const [customerType, setCustomerType] = useState<'REGISTERED' | 'GUEST'>('GUEST');
    const [customerId, setCustomerId] = useState<number | ''>('');
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [supplierId, setSupplierId] = useState<number | ''>('');
    const [supplierType, setSupplierType] = useState<'REGISTERED' | 'GUEST'>('REGISTERED');
    const [guestSupplierName, setGuestSupplierName] = useState('');
    const [projectId, setProjectId] = useState<number | ''>('');
    const [docType, setDocType] = useState<'INVOICE' | 'BON'>('INVOICE');
    const [externalOrderNumber, setExternalOrderNumber] = useState('');
    const [notes, setNotes] = useState('');
    const [isOfficial, setIsOfficial] = useState(false);
    const [settings, setSettings] = useState<any>(null);
    const [guestRC, setGuestRC] = useState('');
    const [guestNIF, setGuestNIF] = useState('');
    const [guestAI, setGuestAI] = useState('');
    const [guestNIS, setGuestNIS] = useState('');
    const [guestAddress, setGuestAddress] = useState('');
    const [guestCommune, setGuestCommune] = useState('المسيلة');
    const [guestWilaya, setGuestWilaya] = useState('المسيلة');

    // Payment states
    const [paymentMode, setPaymentMode] = useState<'FULL' | 'PARTIAL' | 'NONE'>('FULL');
    const [initialPayment, setInitialPayment] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
    const [chequeNumber, setChequeNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [dueDate, setDueDate] = useState<string>('');

    const [lines, setLines] = useState<OrderLine[]>([{ id: '1', productId: '', quantity: 1, unitPrice: 0 }]);

    // UI states
    const [loading, setLoading] = useState(false);
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [showErrors, setShowErrors] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    useEffect(() => {
        Promise.all([
            fetch('/api/customers').then(res => res.json()),
            fetch('/api/products').then(res => res.json()),
            fetch('/api/suppliers').then(res => res.json()),
            fetch('/api/projects').then(res => res.json()),
            fetch('/api/settings').then(res => res.json())
        ]).then(([custData, prodData, suppData, projData, settingsData]) => {
            setCustomers(Array.isArray(custData) ? custData : []);
            setProducts(Array.isArray(prodData) ? prodData : []);
            setSuppliers(Array.isArray(suppData) ? suppData : []);
            setProjects(Array.isArray(projData) ? projData : []);
            setSettings(settingsData && !settingsData.error ? settingsData : null);

            const params = new URLSearchParams(window.location.search);
            const cid = params.get('customerId');
            if (cid && orderType === 'SALE') {
                setCustomerId(parseInt(cid));
                setCustomerType('REGISTERED');
            }
        }).catch(err => console.error(err));
    }, [orderType]);

    const selectedCustomer = useMemo(() => (Array.isArray(customers) ? customers : []).find(c => c.id === customerId) || null, [customers, customerId]);
    const selectedSupplier = useMemo(() => (Array.isArray(suppliers) ? suppliers : []).find(s => s.id === supplierId) || null, [suppliers, supplierId]);
    const customerProjects = useMemo(() => (Array.isArray(projects) ? projects : []).filter(p => p.customerId === customerId), [projects, customerId]);

    const subtotal = useMemo(() => {
        return lines.reduce((acc, line) => acc + (line.quantity * line.unitPrice), 0);
    }, [lines]);

    const taxTotal = useMemo(() => {
        if (!isOfficial || !settings) return 0;
        return subtotal * (settings.tvaRate / 100);
    }, [isOfficial, settings, subtotal]);

    const timbreAmount = useMemo(() => {
        if (!isOfficial || !settings || paymentMethod !== 'CASH') return 0;
        return Math.min((subtotal + taxTotal) * (settings.timbreRate / 100), 10000);
    }, [isOfficial, settings, subtotal, taxTotal, paymentMethod]);

    const grandTotal = subtotal + taxTotal + timbreAmount;

    useEffect(() => {
        if (paymentMode === 'FULL') setInitialPayment(grandTotal);
        else if (paymentMode === 'NONE') setInitialPayment(0);
    }, [paymentMode, grandTotal]);

    const remaining = Math.max(0, grandTotal - initialPayment);

    const creditLimitExceeded = useMemo(() => {
        if (orderType !== 'SALE' || !selectedCustomer || selectedCustomer.type !== 'LOYAL' || !selectedCustomer.creditLimit) return false;
        return (selectedCustomer.balanceDue + remaining) > selectedCustomer.creditLimit;
    }, [orderType, selectedCustomer, remaining]);

    const hasAnyLineWarning = useMemo(() => {
        return lines.some(line => {
            const selectedProduct = products.find(p => p.id === line.productId);
            if (!selectedProduct) return false;
            if (orderType === 'SALE') {
                return line.quantity > selectedProduct.quantity || line.unitPrice < selectedProduct.purchasePrice;
            } else {
                return line.unitPrice > selectedProduct.sellPrice;
            }
        });
    }, [lines, products, orderType]);

    const isDueDateInvalid = useMemo(() => {
        if (!dueDate) return false;
        return dueDate < new Date().toISOString().split('T')[0];
    }, [dueDate]);

    const progressPercent = useMemo(() => {
        if (!selectedCustomer || !selectedCustomer.creditLimit) return 0;
        return Math.min(100, Math.round(((selectedCustomer.balanceDue + remaining) / selectedCustomer.creditLimit) * 100));
    }, [selectedCustomer, remaining]);

    const handleAddLine = () => setLines([...lines, { id: Math.random().toString(), productId: '', quantity: 1, unitPrice: 0 }]);
    const handleRemoveLine = (id: string) => setLines(lines.filter(l => l.id !== id));
    function updateLine(id: string, updates: Partial<OrderLine>) {
        setLines(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    }

    const validateStock = () => {
        if (orderType === 'PURCHASE') return true;
        for (const line of lines) {
            if (!line.product) continue;
            if (line.quantity > line.product.quantity) return false;
        }
        return true;
    };

    const isFormValid = () => {
        if (orderType === 'SALE') {
            if (customerType === 'REGISTERED' && !customerId) return false;
            if (customerType === 'GUEST' && !guestName.trim()) return false;
        } else {
            if (supplierType === 'REGISTERED' && !supplierId) return false;
            if (supplierType === 'GUEST' && !guestSupplierName.trim()) return false;
            if (!externalOrderNumber || externalOrderNumber === 'SHR-') return false;
        }

        if (lines.length === 0) return false;
        for (const line of lines) {
            if (!line.productId || line.quantity <= 0 || line.unitPrice <= 0) return false;
            if (orderType === 'PURCHASE' && line.product && line.unitPrice > line.product.sellPrice) return false;
        }

        if (!validateStock()) return false;
        if (creditLimitExceeded) return false;
        if (hasAnyLineWarning) return false;
        if (isDueDateInvalid) return false;

        return true;
    };

    const handleSave = async () => {
        if (creditLimitExceeded) {
            alert('لا يمكنك تأكيد الطلبية! السقف الائتماني المتاح للمقاول غير كافٍ. يرجى رفع قيمة التسديد النقدي أو تسوية ديونه السابقة الأولية.');
            return;
        }
        if (!isFormValid()) {
            setShowErrors(true);
            return;
        }
        setLoading(true);

        const payload = {
            type: orderType,
            status: orderStatus,
            customerId: (orderType === 'SALE' && customerType === 'REGISTERED') ? customerId : null,
            supplierId: orderType === 'PURCHASE' ? supplierId : null,
            projectId: projectId || undefined,
            guestName: customerType === 'GUEST' ? guestName : undefined,
            guestPhone: customerType === 'GUEST' ? guestPhone : undefined,
            guestSupplierName: (orderType === 'PURCHASE' && supplierType === 'GUEST') ? guestSupplierName : undefined,
            orderNumber: orderType === 'PURCHASE' ? externalOrderNumber : undefined,
            externalNumber: orderType === 'PURCHASE' ? externalOrderNumber : undefined,
            docType,
            total: subtotal,
            grandTotal,
            isOfficial,
            taxRate: isOfficial ? settings?.tvaRate : 0,
            taxTotal,
            timbreAmount,
            initialPayment,
            paymentMethod,
            chequeNumber: paymentMethod === 'CHEQUE' ? chequeNumber : undefined,
            bankName: paymentMethod === 'CHEQUE' ? bankName : undefined,
            dueDate: dueDate || undefined,
            notes,
            guestRC: customerType === 'GUEST' ? guestRC : undefined,
            guestNIF: customerType === 'GUEST' ? guestNIF : undefined,
            guestAI: customerType === 'GUEST' ? guestAI : undefined,
            guestNIS: customerType === 'GUEST' ? guestNIS : undefined,
            guestAddress: customerType === 'GUEST' ? guestAddress : undefined,
            guestCommune: customerType === 'GUEST' ? guestCommune : undefined,
            guestWilaya: customerType === 'GUEST' ? guestWilaya : undefined,
            items: lines.map(l => ({
                productId: l.productId,
                quantity: l.quantity,
                unitPrice: l.unitPrice
            }))
        };

        try {
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                setInvoiceData(data);
            } else {
                const err = await res.json();
                alert(`❌ خطأ: ${err.error || 'فشل في إنشاء الطلبية'}`);
            }
        } catch (e: any) {
            alert(`حدث خطأ تقني: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        const form = e.currentTarget;
        const focusableElements = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea, button[type="submit"]'));
        const index = focusableElements.indexOf(e.target as any);

        if (e.key === 'Enter') {
            if (index > -1 && index < focusableElements.length - 1) {
                e.preventDefault();
                (focusableElements[index + 1] as HTMLElement).focus();
            }
        } else if (e.key === 'ArrowRight') {
            const target = e.target as HTMLInputElement;
            const isTextAtStart = target.tagName !== 'INPUT' || (target.selectionStart === 0 && target.selectionEnd === 0);
            
            if (isTextAtStart && index > 0) {
                e.preventDefault();
                (focusableElements[index - 1] as HTMLElement).focus();
            }
        }
    };

    const handlePrint = () => {
        if (!invoiceData) return;
        window.print();
    };

    if (invoiceData) {
        return (
            <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 flex flex-col items-center justify-center p-4 relative" dir="rtl">
                <style jsx global>{`
                    @media print {
                        @page { margin: 0; }
                        body { background: white; margin: 0; padding: 0; }
                        .no-print { display: none !important; }
                    }
                `}</style>
                
                {/* SUCCESS MODAL UI */}
                <div className="bg-white border border-gray-200 shadow-2xl rounded-[2.5rem] p-10 max-w-lg w-full text-center relative overflow-hidden animate-in zoom-in-95 duration-500 no-print">
                    <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-emerald-500/10 to-transparent pointer-events-none"></div>
                    <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={48} className="text-emerald-400 drop-shadow-lg" />
                    </div>
                    <h2 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">تمت الطلبية بنجاح!</h2>
                    
                    <div className="bg-white/50 border border-gray-200 rounded-2xl p-6 text-right space-y-4 mb-8">
                        <div className="flex justify-between items-center pb-4 border-b border-gray-200">
                            <span className="text-gray-500 font-bold text-sm">رقم الفاتورة:</span>
                            <span className="font-black text-gray-900 bg-blue-500/10 px-3 py-1 rounded-lg border border-blue-500/20 font-sans tracking-widest">
                                {orderType === 'SALE' ? invoiceData.newOrder?.orderNumber : invoiceData.orderNumber}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-bold text-sm">الجهة المعنية:</span>
                            <span className="font-bold text-gray-800">
                                {orderType === 'SALE' ? (customerType === 'REGISTERED' ? (customers.find(c => c.id === customerId)?.name || 'عميل مسجل') : (guestName || 'زبون عابر')) : (suppliers.find(s => s.id === supplierId)?.name || 'غير محدد')}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-gray-500 font-bold text-sm">المبلغ الإجمالي:</span>
                            <span className="font-black text-gray-900 font-sans">{grandTotal.toLocaleString()} دج</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                            <div>
                                <span className="block text-xs font-bold text-gray-500 mb-1">المدفوع</span>
                                <span className="font-black text-emerald-400 font-sans">{initialPayment.toLocaleString()} دج</span>
                            </div>
                            <div>
                                <span className="block text-xs font-bold text-gray-500 mb-1">المتبقي</span>
                                <span className="font-black text-rose-400 font-sans">{remaining.toLocaleString()} دج</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-3">
                        {orderType === 'SALE' && (
                            <>
                                <button onClick={() => { setDocType('INVOICE'); setTimeout(() => handlePrint(), 100); }} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/50">
                                    <Printer size={20} /> طباعة كـ فاتورة (Invoice)
                                </button>
                                <button onClick={() => { setDocType('BON'); setTimeout(() => handlePrint(), 100); }} className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 font-black py-4 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-amber-500/50">
                                    <Printer size={20} /> طباعة كـ وصل استلام (Bon)
                                </button>
                            </>
                        )}
                        <div className="flex gap-3">
                            <button className="flex-1 bg-white/50 hover:bg-gray-100 border border-gray-300 text-gray-900 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                <FileText size={18} /> تصدير PDF
                            </button>
                            <button className="flex-1 bg-white/50 hover:bg-gray-100 border border-gray-300 text-emerald-400 font-bold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors">
                                <FileSpreadsheet size={18} /> Excel
                            </button>
                        </div>
                        <div className="flex gap-3 mt-4">
                            <button onClick={() => window.location.reload()} className="flex-1 text-gray-400 hover:text-gray-900 font-bold text-sm transition-colors text-right px-2">➕ تسجيل طلبية أخرى</button>
                            <Link href="/orders" className="flex-1 text-gray-400 hover:text-gray-900 font-bold text-sm transition-colors text-left px-2">📋 العودة للقائمة</Link>
                        </div>
                    </div>
                </div>

                {/* HIDDEN PRINT DOCUMENT */}
                <div id="printable-invoice" className="hidden print:block absolute left-0 top-0 w-full bg-white z-[9999]" dir="rtl">
                    {docType === 'INVOICE' ? (
                        <Facture 
                            settings={settings} 
                            order={{ ...invoiceData.newOrder, taxRate: isOfficial ? settings?.tvaRate : 0, taxTotal, timbreAmount, grandTotal }} 
                            items={lines.map(l => ({ ...l, product: products.find(p => p.id === l.productId) }))} 
                        />
                    ) : (
                        <BonDeCommande 
                            settings={settings} 
                            order={{ ...invoiceData.newOrder, total: subtotal }} 
                            items={lines.map(l => ({ ...l, product: products.find(p => p.id === l.productId) }))} 
                        />
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 flex flex-col items-center" dir="rtl">
            <div className="w-full max-w-7xl grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
                
                {/* ━━━ RIGHT SIDE (MAIN FORM) ━━━ */}
                <div className="xl:col-span-7 flex flex-col gap-6">
                    
                    {/* Header */}
                    <div className="flex items-center gap-4 mb-2">
                        <div className="bg-blue-600/20 p-3 rounded-2xl border border-blue-500/30">
                            <ShoppingCart size={28} className="text-blue-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">
                                {orderType === 'SALE' ? 'إنشاء طلبية بيع' : 'إنشاء طلبية شراء'}
                            </h1>
                            <p className="text-gray-400 text-sm font-medium mt-1">
                                {orderType === 'SALE' ? 'واجهة تسجيل مخرجات المخزون' : 'واجهة تسجيل مدخلات المخزون'}
                            </p>
                        </div>
                    </div>

                    {/* STEP 1: ORDER STATUS */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">1. نوع الوثيقة والتحصيل</h2>
                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100">
                                <Landmark size={14} className="text-blue-600" />
                                <span className="text-[10px] font-black text-blue-600 uppercase">التطبيق الضريبي الرسمي</span>
                                <button 
                                    type="button"
                                    onClick={() => setIsOfficial(!isOfficial)}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isOfficial ? 'bg-blue-600' : 'bg-gray-200'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isOfficial ? '-translate-x-6' : '-translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex p-1.5 bg-gray-50 border border-gray-200 rounded-2xl w-full">
                                <button
                                    onClick={() => setOrderStatus('DONE')}
                                    className={`flex-1 py-3 rounded-xl flex justify-center items-center gap-2 text-md font-black transition-all ${orderStatus === 'DONE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                                >
                                    <CheckCircle size={18} /> {orderType === 'SALE' ? 'تسليم فوري (مكتملة)' : 'استلام كامل للمخزون'}
                                </button>
                            </div>
                            <div className="flex p-1.5 bg-gray-50 border border-gray-200 rounded-2xl w-full">
                                <select 
                                    value={isOfficial ? 'INVOICE' : 'BON'} 
                                    onChange={(e) => {
                                        const val = e.target.value as 'INVOICE' | 'BON';
                                        setDocType(val);
                                        setIsOfficial(val === 'INVOICE');
                                    }}
                                    className="w-full bg-transparent text-center font-black text-gray-700 outline-none"
                                >
                                    <option value="BON">وثيقة داخلية (Bon)</option>
                                    <option value="INVOICE">فاتورة رسمية (Facture)</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* ORDER NUMBER (FOR PURCHASES) */}
                    {orderType === 'PURCHASE' && (
                        <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-xl flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                                <FileText size={18} /> رقم الفاتورة الخارجية
                            </h2>
                            <div className="relative">
                                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-emerald-600">SHR-</span>
                                <input
                                    type="text"
                                    value={externalOrderNumber.replace('SHR-', '')}
                                    onChange={(e) => {
                                        const val = e.target.value.replace('SHR-', '');
                                        setExternalOrderNumber('SHR-' + val);
                                    }}
                                    className={`w-full pl-14 pr-4 py-4 bg-gray-50 border rounded-2xl text-lg font-black focus:ring-2 focus:ring-emerald-500 outline-none transition-all ${showErrors && (!externalOrderNumber || externalOrderNumber === 'SHR-') ? 'border-rose-500 ring-2 ring-rose-500' : 'border-gray-200'}`}
                                    placeholder="أدخل رقم الفاتورة..."
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 2: ACTOR INFO */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-xl flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            2. بيانات {orderType === 'SALE' ? 'العميل' : 'المورد المعتمد'} <User size={16} />
                        </h2>
                        
                        {orderType === 'SALE' && (
                            <>
                                <div className="flex p-1 bg-gray-50 border border-gray-200 rounded-xl w-fit">
                                    <button onClick={() => setCustomerType('REGISTERED')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${customerType === 'REGISTERED' ? 'bg-gray-200 text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}>👤 عميل مسجل</button>
                                    <button onClick={() => setCustomerType('GUEST')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${customerType === 'GUEST' ? 'bg-gray-200 text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}>🚶 زبون عابر</button>
                                </div>

                                {customerType === 'REGISTERED' ? (
                                    <div className="space-y-4">
                                        <div className={showErrors && !customerId ? "ring-2 ring-rose-500/50 rounded-2xl p-1" : ""}>
                                            <SearchableSelect 
                                                options={customers.map(c => ({ 
                                                    id: c.id, 
                                                    label: c.name, 
                                                    subLabel: c.type === 'LOYAL' ? 'مقاول معتمد - له سقف ائتماني' : 'عميل عادي' 
                                                }))}
                                                value={customerId} 
                                                onChange={(val) => setCustomerId(val)}
                                                placeholder="ابحث واختر العميل من القائمة..."
                                            />
                                        </div>
                                        {showErrors && !customerId && <p className="text-rose-500 text-xs font-bold px-2">⚠️ يرجى اختيار العميل من القائمة لمعالجة الطلبية</p>}
                                        
                                        {/* Credit Card Banner */}
                                        {selectedCustomer && selectedCustomer.type === 'LOYAL' && selectedCustomer.creditLimit && (
                                            <div className="bg-gradient-to-br from-[#1A2333] to-[#0B101A] rounded-2xl border border-gray-300/50 p-5 shadow-inner">
                                                <div className="flex items-center gap-3 mb-4 text-gray-900">
                                                    <Building2 size={24} className="text-indigo-400" />
                                                    <span className="font-black text-lg">الائتمان المالي: {selectedCustomer.name}</span>
                                                </div>
                                                <div className="flex items-center justify-between font-sans text-sm font-black text-gray-400 mb-2">
                                                    <span className="flex items-center gap-2">الائتمان المتاح <span className="text-emerald-400">{selectedCustomer.creditLimit.toLocaleString()} دج 🟢</span></span>
                                                    <span className="flex items-center gap-2">الدين الحالي <span className="text-rose-400">{selectedCustomer.balanceDue.toLocaleString()} دج 🔴</span></span>
                                                </div>
                                                <div className="w-full bg-gray-100 rounded-full h-3.5 mb-2 overflow-hidden border border-gray-200 relative">
                                                    <div 
                                                        className={`h-full rounded-full transition-all duration-1000 ${progressPercent > 90 ? 'bg-rose-500' : progressPercent > 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} 
                                                    style={{ width: `${progressPercent}%` }}></div>
                                                    <div className="absolute inset-0 bg-white/10 w-full" style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(0,0,0,0.1) 10px, rgba(0,0,0,0.1) 20px)' }}></div>
                                                </div>
                                                <p className="text-xs font-bold text-gray-500 text-center">{progressPercent}% مستخدم من السقف الائتماني</p>
                                            </div>
                                        )}

                                        {selectedCustomer && selectedCustomer.type === 'LOYAL' && customerProjects.length > 0 && (
                                            <div className="pt-2">
                                                <label className="text-sm font-bold text-gray-400 block mb-2">تأطير الطلبية ضمن مشروع (اختياري)</label>
                                                <select 
                                                    className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 focus:border-blue-500 outline-none transition-colors"
                                                    value={projectId} 
                                                    onChange={(e) => setProjectId(e.target.value ? parseInt(e.target.value) : '')}
                                                >
                                                    <option value="">لا يوجد مشروع محدد</option>
                                                    {customerProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4" onKeyDown={handleKeyDown}>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            <div className="md:col-span-2">
                                                <div className={showErrors && !guestName.trim() ? "ring-2 ring-rose-500/50 rounded-xl" : ""}>
                                                    <input 
                                                        type="text" 
                                                        placeholder="* الاسم الكامل للزبون العابر..." 
                                                        value={guestName} 
                                                        onChange={e => setGuestName(e.target.value.toUpperCase())}
                                                        className={`w-full bg-white/50 border rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-colors uppercase ${showErrors && !guestName.trim() ? 'border-rose-500 bg-rose-50' : 'border-gray-200 focus:border-blue-500'}`}
                                                    />
                                                </div>
                                                {showErrors && !guestName.trim() && <p className="text-rose-500 text-xs font-bold px-2 mt-1">⚠️ اسم الزبون العابر إلزامي!</p>}
                                            </div>
                                            <input type="tel" dir="ltr" placeholder="رقم الهاتف (اختياري)" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} onFocus={() => setFocusedField('guestPhone')} onBlur={() => setFocusedField(null)} className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 transition-colors" />
                                            {focusedField === 'guestPhone' && (
                                                <div className="md:col-span-2 flex gap-1 mt-1 font-mono text-xs" dir="ltr">
                                                    {[...Array(10)].map((_, i) => (
                                                        <div key={i} className={`flex-1 flex justify-center border-b-2 ${guestPhone[i] ? 'text-blue-600 border-blue-600' : (i === guestPhone.length ? 'text-amber-500 border-amber-500 font-bold scale-110' : 'text-gray-300 border-gray-100')}`}>
                                                            {guestPhone[i] || 'x'}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <input 
                                                type="text" 
                                                placeholder="* العنوان (Cité / الحي / الشارع)..." 
                                                value={guestAddress}
                                                onChange={e => setGuestAddress(e.target.value.toUpperCase())}
                                                className={`w-full bg-white/50 border rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-colors uppercase font-black ${showErrors && !guestAddress.trim() ? 'border-rose-500 bg-rose-50' : 'border-gray-200 focus:border-blue-500'}`} 
                                            />
                                            {showErrors && !guestAddress.trim() && <p className="text-rose-500 text-xs font-bold px-2 mt-1">⚠️ العنوان إلزامي!</p>}
                                        </div>
                                        
                                        {isOfficial && (
                                            <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-5 space-y-4">
                                                <h4 className="text-[10px] font-black text-blue-500 uppercase flex items-center gap-2 mb-2"><Info size={12} /> الهوية الجبائية للزبون (للفاتورة)</h4>
                                                <div className="grid grid-cols-2 gap-4">
                                                    {/* RC - 10 chars */}
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500">سجل تجاري (RC)</label>
                                                        <div className="relative font-mono">
                                                            <input 
                                                                type="text" maxLength={10} value={guestRC} 
                                                                onChange={e => setGuestRC(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))} 
                                                                onFocus={() => setFocusedField('guestRC')}
                                                                onBlur={() => setFocusedField(null)}
                                                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text" 
                                                                dir="ltr" 
                                                            />
                                                            <div className="flex gap-0.5 w-full justify-between items-center bg-white border border-gray-200 rounded-lg px-2 py-1.5 z-10 text-[10px]" dir="ltr">
                                                                {[...Array(10)].map((_, i) => (
                                                                    <div key={i} className={`flex-1 flex justify-center border-b ${guestRC[i] ? 'text-blue-600 border-blue-600 font-bold' : (i === guestRC.length && focusedField === 'guestRC' ? 'text-amber-500 border-amber-500 font-black scale-110 shadow-sm' : 'text-gray-300 border-gray-100')}`}>
                                                                        {guestRC[i] || 'x'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* NIF - 15 digits */}
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500">رقم التعريف الجبائي (NIF)</label>
                                                        <div className="relative font-mono">
                                                            <input 
                                                                type="text" maxLength={15} value={guestNIF} 
                                                                onChange={e => setGuestNIF(e.target.value.replace(/\D/g, ''))} 
                                                                onFocus={() => setFocusedField('guestNIF')}
                                                                onBlur={() => setFocusedField(null)}
                                                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text" 
                                                                dir="ltr" 
                                                            />
                                                            <div className="flex gap-0.5 w-full justify-between items-center bg-white border border-gray-200 rounded-lg px-1 py-1.5 z-10 text-[9px]" dir="ltr">
                                                                {[...Array(15)].map((_, i) => (
                                                                    <div key={i} className={`flex-1 flex justify-center border-b ${guestNIF[i] ? 'text-blue-600 border-blue-600 font-bold' : (i === guestNIF.length && focusedField === 'guestNIF' ? 'text-amber-500 border-amber-500 font-black scale-110 shadow-sm' : 'text-gray-300 border-gray-100')}`}>
                                                                        {guestNIF[i] || 'x'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* AI - 11 digits */}
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500">رقم المادة (AI)</label>
                                                        <div className="relative font-mono">
                                                            <input 
                                                                type="text" maxLength={11} value={guestAI} 
                                                                onChange={e => setGuestAI(e.target.value.replace(/\D/g, ''))} 
                                                                onFocus={() => setFocusedField('guestAI')}
                                                                onBlur={() => setFocusedField(null)}
                                                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text" 
                                                                dir="ltr" 
                                                            />
                                                            <div className="flex gap-0.5 w-full justify-between items-center bg-white border border-gray-200 rounded-lg px-2 py-1.5 z-10 text-[10px]" dir="ltr">
                                                                {[...Array(11)].map((_, i) => (
                                                                    <div key={i} className={`flex-1 flex justify-center border-b ${guestAI[i] ? 'text-blue-600 border-blue-600 font-bold' : (i === guestAI.length && focusedField === 'guestAI' ? 'text-amber-500 border-amber-500 font-black scale-110 shadow-sm' : 'text-gray-300 border-gray-100')}`}>
                                                                        {guestAI[i] || 'x'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {/* NIS - 15 digits */}
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500">رقم التعريف الإحصائي (NIS)</label>
                                                        <div className="relative font-mono">
                                                            <input 
                                                                type="text" maxLength={15} value={guestNIS} 
                                                                onChange={e => setGuestNIS(e.target.value.replace(/\D/g, ''))} 
                                                                onFocus={() => setFocusedField('guestNIS')}
                                                                onBlur={() => setFocusedField(null)}
                                                                className="absolute inset-0 w-full h-full opacity-0 z-20 cursor-text" 
                                                                dir="ltr" 
                                                            />
                                                            <div className="flex gap-0.5 w-full justify-between items-center bg-white border border-gray-200 rounded-lg px-1 py-1.5 z-10 text-[9px]" dir="ltr">
                                                                {[...Array(15)].map((_, i) => (
                                                                    <div key={i} className={`flex-1 flex justify-center border-b ${guestNIS[i] ? 'text-blue-600 border-blue-600 font-bold' : (i === guestNIS.length && focusedField === 'guestNIS' ? 'text-amber-500 border-amber-500 font-black scale-110 shadow-sm' : 'text-gray-300 border-gray-100')}`}>
                                                                        {guestNIS[i] || 'x'}
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="pt-2 space-y-3">
                                                    <div className="space-y-1">
                                                        <label className="text-[9px] font-bold text-gray-500">العنوان الكامل (الشارع / الحي / Cité) <span className="text-red-500">*</span></label>
                                                        <input type="text" placeholder="Cité, Street, Ave..." value={guestAddress} onChange={e => setGuestAddress(e.target.value.toUpperCase())} className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 uppercase font-black" required />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-500">الولاية <span className="text-red-500">*</span></label>
                                                            <select 
                                                                value={guestWilaya} 
                                                                onChange={e => {
                                                                    const w = ALGERIA_LOCATIONS.find(l => l.arabicName === e.target.value);
                                                                    setGuestWilaya(e.target.value);
                                                                    setGuestCommune(w?.communes[0] || '');
                                                                }}
                                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 font-bold"
                                                            >
                                                                {ALGERIA_LOCATIONS.map(w => (
                                                                    <option key={w.id} value={w.arabicName}>{w.id} - {w.arabicName}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1">
                                                            <label className="text-[9px] font-bold text-gray-500">البلدية <span className="text-red-500">*</span></label>
                                                            <input 
                                                                type="text" 
                                                                placeholder="البلدية..." 
                                                                value={guestCommune} 
                                                                onChange={e => setGuestCommune(e.target.value.toUpperCase())} 
                                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-blue-500 font-bold uppercase" 
                                                                required 
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {orderType === 'PURCHASE' && (
                            <>
                                <div className="flex p-1 bg-gray-50 border border-gray-200 rounded-xl w-fit">
                                    <button onClick={() => setSupplierType('REGISTERED')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${supplierType === 'REGISTERED' ? 'bg-gray-200 text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}>🏢 مورد مسجل</button>
                                    <button onClick={() => setSupplierType('GUEST')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${supplierType === 'GUEST' ? 'bg-gray-200 text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}>👤 مورد غير مسجل</button>
                                </div>

                                {supplierType === 'REGISTERED' ? (
                                    <div className="space-y-4">
                                        <div className={showErrors && !supplierId ? "ring-2 ring-rose-500 rounded-2xl p-1" : ""}>
                                            <SearchableSelect 
                                                options={suppliers.map(s => ({ id: s.id, label: s.name, subLabel: `رصيد المورد: ${s.balanceDue.toLocaleString()} دج` }))}
                                                value={supplierId} 
                                                onChange={(val) => setSupplierId(val)}
                                                placeholder="ابحث واختر المورد لطلب سلع جديدة..."
                                            />
                                        </div>
                                        {showErrors && !supplierId && <p className="text-rose-500 text-xs font-bold px-2">⚠️ يرجى تحديد المورد الذي ستشتري منه لإكمال الطلبية</p>}
                                        {selectedSupplier && (
                                            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 flex justify-between items-center text-sm font-bold mt-2">
                                                <span className="text-gray-400">الديون المستحقة له:</span>
                                                <span className="text-emerald-400 font-sans font-black text-xl tracking-tight">{selectedSupplier.balanceDue.toLocaleString()} دج</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className={showErrors && !guestSupplierName.trim() ? "ring-2 ring-rose-500 rounded-xl" : ""}>
                                            <input 
                                                type="text" 
                                                placeholder="* اسم المورد اليدوي..." 
                                                value={guestSupplierName} 
                                                onChange={e => setGuestSupplierName(e.target.value)}
                                                className={`w-full bg-white/50 border rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-colors ${showErrors && !guestSupplierName.trim() ? 'border-rose-500 bg-rose-50' : 'border-gray-200 focus:border-blue-500'}`}
                                            />
                                        </div>
                                        {showErrors && !guestSupplierName.trim() && <p className="text-rose-500 text-xs font-bold px-2">⚠️ اسم المورد إلزامي!</p>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>


                    {/* STEP 4: PRODUCTS PORTAL */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] shadow-xl overflow-hidden">
                        <div className="bg-white/50 p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><PackageOpen className="text-blue-500" /> شبكة بناء الطلبية (المنتجات)</h2>
                        </div>
                        
                        <div className="p-6 flex flex-col gap-4 bg-gray-50">
                            {lines.map((line, index) => {
                                const selectedProduct = line.product;
                                const isQtyWarn = orderType === 'SALE' && selectedProduct && line.quantity > selectedProduct.quantity;
                                const isPriceWarn = orderType === 'SALE' && selectedProduct && line.unitPrice < selectedProduct.purchasePrice;
                                
                                return (
                                    <div key={line.id} className={`bg-white border border-gray-200 rounded-2xl p-5 relative transition-all shadow-md group ${isQtyWarn ? 'ring-2 ring-rose-500/50' : ''}`}>
                                        <div className="flex items-start justify-between gap-4 mb-4">
                                            <div className="flex-1">
                                                <SearchableSelect 
                                                    options={products.map(p => ({ 
                                                        id: p.id, 
                                                        label: p.name, 
                                                        subLabel: `متوفر: ${p.quantity} ${p.unit} | متوسط التكلفة: ${p.purchasePrice} دج`
                                                    }))}
                                                    value={line.productId}
                                                    onChange={(val) => updateLine(line.id, { productId: val })}
                                                    placeholder="[🔍] انقر للبحث عن المخزون وإدراجه..."
                                                    onSelect={(opt) => {
                                                        const prd = products.find(p => p.id === opt.id);
                                                        if (prd) updateLine(line.id, { product: prd, unitPrice: orderType === 'SALE' ? prd.sellPrice : prd.purchasePrice });
                                                    }}
                                                />
                                            </div>
                                            <div className="bg-white/50 px-4 py-3 rounded-xl border border-gray-200 shrink-0 min-w-28 text-center text-xs font-black text-gray-500">
                                                {selectedProduct ? selectedProduct.unit : 'وحدة القياس'}
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                            <div className="bg-white/50 border border-gray-200 rounded-xl p-2 px-3 flex items-center justify-between focus-within:border-blue-500/50">
                                                <span className="text-xs font-bold text-gray-500">الكمية</span>
                                                <input 
                                                    type="number" min="1" dir="ltr"
                                                    value={line.quantity || ''}
                                                    onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                                                    className="bg-transparent border-none outline-none text-gray-900 font-sans font-black text-right w-24 text-lg"
                                                />
                                            </div>
                                            <div className="bg-white/50 border border-gray-200 rounded-xl p-2 px-3 flex items-center justify-between focus-within:border-blue-500/50 relative">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-gray-500">{orderType === 'SALE' ? 'سعر البيع الافرادي' : 'تكلفة الشراء (دج)'}</span>
                                                    {orderType === 'PURCHASE' && selectedProduct && (
                                                        <span className="text-[10px] text-blue-500 font-bold">سعر البيع الحالي: {selectedProduct.sellPrice} دج</span>
                                                    )}
                                                </div>
                                                <input 
                                                    type="number" min="1" dir="ltr"
                                                    value={line.unitPrice || ''}
                                                    onChange={e => updateLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                                    className={`bg-transparent border-none outline-none font-sans font-black text-right w-28 text-lg ${isPriceWarn ? 'text-rose-400' : 'text-emerald-400'}`}
                                                />
                                            </div>
                                        </div>

                                        <div className="flex flex-wrap justify-between items-end border-t border-gray-200 pt-4">
                                            <div className="flex flex-col gap-1">
                                                {isQtyWarn && <span className="text-[11px] font-black font-sans bg-rose-500/10 text-rose-400 px-2 py-1 rounded-md mb-1 w-fit">⚠️ الكمية المطلوبة تتجاوز المخزون المتاح ({selectedProduct.quantity})</span>}
                                                {isPriceWarn && <span className="text-[11px] font-black font-sans bg-amber-500/10 text-amber-500 px-2 py-1 rounded-md w-fit">⚠️ تنبيه: سعر البيع أقل من التكلفة ({selectedProduct.purchasePrice} دج)</span>}
                                                {orderType === 'PURCHASE' && selectedProduct && line.unitPrice > selectedProduct.sellPrice && (
                                                    <span className="text-[11px] font-black font-sans bg-rose-500/10 text-rose-400 px-2 py-1 rounded-md w-fit">❌ خطأ: تكلفة الشراء ({line.unitPrice} دج) أكبر من سعر البيع الحالي ({selectedProduct.sellPrice} دج)</span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-left font-sans flex flex-col">
                                                    <span className="text-[10px] uppercase text-gray-600 font-bold tracking-widest block mb-1">المجموع الجزئي (Line Total)</span>
                                                    <span className="text-2xl font-black text-gray-900">{(line.quantity * line.unitPrice).toLocaleString()} <span className="text-sm text-gray-500">دج</span></span>
                                                </div>
                                                {lines.length > 1 && (
                                                    <button onClick={() => handleRemoveLine(line.id)} className="w-10 h-10 flex justify-center items-center rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500 hover:text-gray-900 transition-colors border border-rose-500/20">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}

                            <button 
                                onClick={handleAddLine} 
                                disabled={hasAnyLineWarning}
                                className={`mt-2 w-full py-5 border-2 border-dashed rounded-2xl font-black flex items-center justify-center gap-2 transition-all
                                    ${hasAnyLineWarning ? 'border-amber-300/50 text-amber-400 bg-amber-50 cursor-not-allowed' : 'border-gray-300 hover:border-blue-500/50 text-blue-400 hover:bg-blue-500/5'}`}
                            >
                                <Plus size={20} /> {hasAnyLineWarning ? 'يرجى إصلاح التنبيهات لحل المشكلة قبل إضافة منتج جديد' : 'إدراج منتج آخر إلى القائمة'}
                            </button>
                        </div>
                    </div>

                    {/* STEP 5: PAYMENT */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-xl flex flex-col gap-6">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">5. هيكلة السداد المالي</h2>
                        
                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => setPaymentMode('FULL')} className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 font-black transition-all ${paymentMode === 'FULL' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : 'bg-white/50 border-gray-200 text-gray-400 hover:bg-gray-200'}`}>
                                <CreditCard size={24} /> <span>دفع كامل<br/><span className="text-[10px] opacity-70 font-medium">(الكل نقداً)</span></span>
                            </button>
                            <button onClick={() => setPaymentMode('PARTIAL')} className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 font-black transition-all ${paymentMode === 'PARTIAL' ? 'bg-amber-500/10 border-amber-500/50 text-amber-400' : 'bg-white/50 border-gray-200 text-gray-400 hover:bg-gray-200'}`}>
                                <Store size={24} /> <span>دفع جزئي<br/><span className="text-[10px] opacity-70 font-medium">(عربون وتسديد لاحق)</span></span>
                            </button>
                            <button onClick={() => setPaymentMode('NONE')} className={`p-4 rounded-2xl border flex flex-col items-center justify-center text-center gap-2 font-black transition-all ${paymentMode === 'NONE' ? 'bg-rose-500/10 border-rose-500/50 text-rose-400' : 'bg-white/50 border-gray-200 text-gray-400 hover:bg-gray-200'}`}>
                                <Calendar size={24} /> <span>تسليف / آجل<br/><span className="text-[10px] opacity-70 font-medium">(دين بالكامل)</span></span>
                            </button>
                        </div>

                        {paymentMode !== 'NONE' && (
                            <div className="bg-white/50 border border-gray-200 rounded-2xl p-5 animate-in slide-in-from-top-2">
                                {paymentMode === 'PARTIAL' && (
                                    <div className="mb-6">
                                        <label className="text-xs font-bold text-gray-400 block mb-2">الدفع الأولي (المُقدم)</label>
                                        <input 
                                            type="number" dir="ltr"
                                            className="w-full bg-gray-50 border border-gray-300 rounded-xl px-4 py-3 text-gray-900 font-sans font-black text-2xl outline-none focus:border-blue-500 text-left"
                                            value={initialPayment || ''}
                                            onChange={e => setInitialPayment(Math.min(grandTotal, parseFloat(e.target.value) || 0))}
                                        />
                                        <div className="flex gap-2 mt-3 justify-end font-sans">
                                            {[25, 50, 75].map(pct => (
                                                <button key={pct} onClick={() => setInitialPayment(grandTotal * (pct/100))} className="bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 text-[10px] font-black px-3 py-1 rounded border border-blue-500/20">
                                                    {pct}% تسديد
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <label className="text-xs font-bold text-gray-400 block mb-3">حالة ووسيلة الدفع:</label>
                                <div className="flex gap-2 p-1 bg-gray-50 rounded-xl mb-4 w-fit border border-gray-200">
                                    <button onClick={() => setPaymentMethod('CASH')} className={`px-5 py-2 rounded-lg text-sm font-black transition-colors ${paymentMethod === 'CASH' ? 'bg-gray-200 text-gray-900 shadow' : 'text-gray-500'}`}>💵 كاش النقدي</button>
                                    <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`px-5 py-2 rounded-lg text-sm font-black transition-colors ${paymentMethod === 'BANK_TRANSFER' ? 'bg-gray-200 text-gray-900 shadow' : 'text-gray-500'}`}>🏦 الحوالة بنكي</button>
                                    <button onClick={() => setPaymentMethod('CHEQUE')} className={`px-5 py-2 rounded-lg text-sm font-black transition-colors ${paymentMethod === 'CHEQUE' ? 'bg-gray-200 text-gray-900 shadow' : 'text-gray-500'}`}>📄 الشيك البنكي</button>
                                </div>

                                {paymentMethod === 'CHEQUE' && (
                                    <div className="grid grid-cols-2 gap-4 mt-4">
                                        <input type="text" placeholder="رقم الشيك / الحوالة" value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500/50" />
                                        <select value={bankName} onChange={e => setBankName(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 outline-none focus:border-blue-500/50">
                                            <option value="" disabled>اختر البنك أو المؤسسة...</option>
                                            <option value="Algérie Poste (بريد الجزائر)">Algérie Poste (بريد الجزائر)</option>
                                            <option value="BNA (البنك الوطني الجزائري)">BNA (البنك الوطني الجزائري)</option>
                                            <option value="CPA (القرض الشعبي الجزائري)">CPA (القرض الشعبي الجزائري)</option>
                                            <option value="BADR (الفلاحة والتنمية الريفية)">BADR (الفلاحة والتنمية الريفية)</option>
                                            <option value="BDL (بنك التنمية المحلية)">BDL (بنك التنمية المحلية)</option>
                                            <option value="CNEP (الصندوق الوطني للتوفير)">CNEP (الصندوق للتوفير والاحتياط)</option>
                                            <option value="BEA (بنك الجزائر الخارجي)">BEA (بنك الجزائر الخارجي)</option>
                                            <option value="Société Générale Algérie">Société Générale Algérie</option>
                                            <option value="BNP Paribas El Djazaïr">BNP Paribas El Djazaïr</option>
                                            <option value="Gulf Bank Algérie (AGB)">Gulf Bank Algérie (AGB)</option>
                                            <option value="Natixis Algérie">Natixis Algérie</option>
                                            <option value="Al Baraka (بنك البركة)">Al Baraka (بنك البركة)</option>
                                            <option value="Al Salam Bank (مصرف السلام)">Al Salam Bank (مصرف السلام)</option>
                                            <option value="Trust Bank Algeria">Trust Bank Algeria</option>
                                            <option value="Housing Bank Algeria">Housing Bank Algeria</option>
                                            <option value="Fransabank El Djazaïr">Fransabank El Djazaïr</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        )}

                        {remaining > 0 && (
                            <div className={`border rounded-2xl p-5 transition-colors ${isDueDateInvalid ? 'bg-rose-500/10 border-rose-500 ring-2 ring-rose-500/30' : 'bg-rose-500/5 border-rose-500/20'}`}>
                                <label className={`text-xs font-bold block mb-2 ${isDueDateInvalid ? 'text-rose-600' : 'text-rose-400'}`}>يوجد باقٍ للتسديد، هل تريد تحديد تاريخ استحقاق؟ (اختياري)</label>
                                <input 
                                    type="date" 
                                    lang="fr-FR"
                                    min={new Date().toISOString().split('T')[0]}
                                    value={dueDate} onChange={e => setDueDate(e.target.value)}
                                    className={`bg-white/50 border rounded-xl px-4 py-3 text-sm font-sans w-full max-w-xs outline-none transition-colors ${isDueDateInvalid ? 'border-rose-500 text-rose-600 focus:border-rose-600' : 'border-gray-200 text-gray-700 focus:border-rose-500/50'}`}
                                />
                                {isDueDateInvalid && (
                                    <p className="text-xs font-black text-rose-500 mt-2 flex items-center gap-1">
                                        <AlertTriangle size={14} /> خطأ: لا يمكن اختيار تاريخ استحقاق في الماضي!
                                    </p>
                                )}
                            </div>
                        )}
                    </div>

                    {/* STEP 6: NOTES */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-xl mb-24 lg:mb-0">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest mb-4 flex items-center gap-2">6. أدرج ملحقات نصية للطباعة <BookOpen size={16} /></h2>
                        <textarea 
                            rows={3} 
                            placeholder="ملاحظات تظهر وتُطبع على الفاتورة (مثلا: النقل على عاتق المشتري)..."
                            value={notes} onChange={e => setNotes(e.target.value)}
                            className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500/50 resize-none font-medium leading-relaxed"
                        />
                    </div>
                </div>

                {/* ━━━ LEFT SIDE (STICKY SUMMARY) ━━━ */}
                <div className="xl:col-span-5 w-full">
                    <div className="sticky top-8 bg-gradient-to-b from-[#111825] to-[#0a0f18] border border-gray-800 shadow-2xl rounded-[2.5rem] overflow-hidden">
                        {/* Header */}
                        <div className="p-6 border-b border-gray-800/50 bg-[url('/noise.png')] relative">
                            <div className="absolute inset-0 bg-blue-600/10 mix-blend-overlay"></div>
                            <h3 className="text-xl font-black text-white relative z-10 flex justify-between items-center">
                                ملخص الطلبية الافتراضي
                                <span>🧾</span>
                            </h3>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Meta Summary */}
                            <div className="space-y-2 text-sm font-bold text-gray-300">
                                <p className="flex justify-between border-b border-gray-800/50 pb-2">
                                    <span className="text-gray-500">رقم الفاتورة:</span>
                                    <span className="text-amber-400 font-sans font-black tracking-widest uppercase">
                                        {orderType === 'PURCHASE' ? (externalOrderNumber !== 'SHR-' ? externalOrderNumber : <span className="text-rose-500 text-xs">مفقود!</span>) : 'سيتم التوليد'}
                                    </span>
                                </p>
                                <p className="flex justify-between border-b border-gray-800/50 pb-2">
                                    <span className="text-gray-500">الطرف المعني:</span>
                                    <span className="text-white font-black truncate max-w-[150px]">
                                        {orderType === 'SALE' 
                                            ? (customerType === 'REGISTERED' ? selectedCustomer?.name : guestName) || <span className="text-rose-500 text-xs">مفقود!</span>
                                            : (supplierType === 'REGISTERED' ? selectedSupplier?.name : guestSupplierName) || <span className="text-rose-500 text-xs">مفقود!</span>
                                        }
                                    </span>
                                </p>
                                {projectId && (
                                    <p className="flex justify-between border-b border-gray-800/50 pb-2">
                                        <span className="text-gray-500">المشروع:</span>
                                        <span className="text-indigo-400">{customerProjects.find(p => p.id === projectId)?.name}</span>
                                    </p>
                                )}
                                <p className="flex justify-between border-b border-gray-800/50 pb-2">
                                    <span className="text-gray-500">النوع:</span>
                                    <span className={orderType === 'PURCHASE' ? 'text-amber-400' : 'text-blue-400'}>{orderType === 'PURCHASE' ? 'فاتورة شراء' : 'فاتورة بيع'}</span>
                                </p>
                            </div>

                            {/* Products Snapshot */}
                            <div className="bg-[#1a2333]/50 border border-gray-800/50 rounded-2xl p-4">
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-3">شريط المنتجات</h4>
                                <div className="space-y-3 max-h-40 overflow-y-auto custom-scrollbar pr-2">
                                    {lines.map((l, i) => l.productId ? (
                                        <div key={i} className="flex justify-between items-center text-xs text-gray-300 font-bold">
                                            <span className="truncate max-w-[150px]">■ {products.find(p => p.id === l.productId)?.name} <span className="text-gray-500 font-sans">×{l.quantity}</span></span>
                                            <span className="shrink-0 font-sans text-white">{Math.round(l.quantity * l.unitPrice).toLocaleString()} دج</span>
                                        </div>
                                    ) : <div key={i} className="text-xs text-gray-600 italic">...سطر فارغ...</div>)}
                                </div>
                            </div>

                            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-800 to-transparent"></div>

                            {/* Live Calculations */}
                            <div className="font-sans space-y-3">
                                <div className="flex justify-between items-center text-gray-500 font-bold border-b border-gray-800/50 pb-2">
                                    <span className="text-xs">المجموع (HT):</span>
                                    <span>{subtotal.toLocaleString()} دج</span>
                                </div>
                                {isOfficial && (
                                    <>
                                        <div className="flex justify-between items-center text-blue-400 font-bold border-b border-gray-800/50 pb-2">
                                            <span className="text-xs">TVA ({settings?.tvaRate}%):</span>
                                            <span>{taxTotal.toLocaleString()} دج</span>
                                        </div>
                                        {timbreAmount > 0 && (
                                            <div className="flex justify-between items-center text-amber-400/50 text-xs border-b border-gray-800/50 pb-2">
                                                <span>حقوق الدمغة:</span>
                                                <span>{timbreAmount.toLocaleString()} دج</span>
                                            </div>
                                        )}
                                    </>
                                )}
                                <div className="flex justify-between items-end pt-2">
                                    <span className="text-sm font-black text-gray-400">الإجمالي (TTC)</span>
                                    <span className="text-4xl font-black text-white">{grandTotal.toLocaleString()} دج</span>
                                </div>
                                <div className="flex justify-between items-center bg-[#1a2333] p-2 rounded-xl border border-gray-800/50">
                                    <span className="text-xs font-bold text-gray-500">المدفوع سلفاً</span>
                                    <span className="text-lg font-black text-emerald-400">{initialPayment.toLocaleString()} دج 🟢</span>
                                </div>
                                <div className={`flex justify-between items-center p-2 rounded-xl border ${remaining > 0 ? 'bg-rose-950/20 border-rose-900/30' : 'bg-emerald-950/20 border-emerald-900/30'}`}>
                                    <span className={`text-xs font-bold ${remaining > 0 ? 'text-rose-500/50' : 'text-emerald-500/50'}`}>المتبقي الصافي</span>
                                    <span className={`text-lg font-black ${remaining > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{remaining.toLocaleString()} دج {remaining > 0 ? '🔴' : '🟢'}</span>
                                </div>
                            </div>

                            {/* Tafqeet preview */}
                            <div className="bg-[#1a2333]/50 border border-gray-800/50 rounded-xl p-4 text-center">
                                <p className="text-[10px] font-bold text-blue-500/80 mb-1">تفقيط القيمة أوتوماتيكياً للطباعة المعيارية</p>
                                <p className="text-sm font-black text-blue-300 leading-tight">"{tafqeet(grandTotal)} دينار جزائري"</p>
                            </div>

                            {/* Credit Exceeded Warning */}
                            {creditLimitExceeded && (
                                <div className="bg-rose-500/10 border-2 border-rose-500/50 rounded-2xl p-4 animate-pulse">
                                    <p className="flex items-center gap-2 text-rose-400 font-black mb-2"><AlertTriangle size={18} /> تحذير إيقاف النظام</p>
                                    <p className="text-xs text-rose-300 font-bold leading-relaxed mb-3">هذا الطلب يخترق السقف الائتماني العالي للمقاول. المتاح فقط [{selectedCustomer?.creditLimit?.toLocaleString()} دج]، يرجى رفع التسديد النقدي الأولّي.</p>
                                </div>
                            )}

                            {/* Final Save Action */}
                            <div className="flex flex-col gap-3 pt-2">
                                <button 
                                    onClick={handleSave}
                                    disabled={loading}
                                    className={`w-full py-5 rounded-2xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-2xl
                                        ${creditLimitExceeded ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-900/50' : loading ? 'bg-blue-600/50 text-gray-900 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/50 hover:shadow-blue-500/50 hover:-translate-y-1'}`}
                                >
                                    {loading ? '⏳ جاري التسجيل المحاسبي...' : creditLimitExceeded ? '🚫 الرصيد الائتماني غير كاف' : '💾 تأكيد وحفظ الطلبية الرسمية'}
                                </button>
                                <button onClick={() => router.back()} className="text-sm font-bold text-gray-500 hover:text-gray-900 transition-colors">
                                    ← إلغاء والرجوع للقائمة
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
