'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import {
    Search, Plus, Trash2, CheckCircle, AlertTriangle, Printer, Download,
    CreditCard, ShoppingBag, ShoppingCart, X, ChevronDown, User, Calendar,
    PackageOpen, Layers, Dribbble, BookOpen, UserCircle2, Building2, Store,
    FileText, FileSpreadsheet, Percent, Info, ShieldCheck, Landmark, Check
} from 'lucide-react';
import { numberToArabicWords } from '@/lib/number-to-arabic-words';
import { exportInvoiceToExcel } from '@/lib/export-invoice';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { BonDeCommande } from '@/components/documents/BonDeCommande';
import { Facture } from '@/components/documents/Facture';
import { ALGERIA_LOCATIONS } from '@/lib/constants/algeria-locations';
import { printDocument } from '@/lib/print-helper';

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
    status: string;
}

interface Product {
    id: number;
    name: string;
    quantity: number;
    sellPrice: number;
    purchasePrice: number;
    unit: string;
    hasBatches?: boolean;
    hasExpiryDate?: boolean;
    nearestExpiryDate?: string | null;
    validQuantity: number;
}

interface OrderLine {
    id: string;
    productId: number | '';
    product?: Product;
    quantity: number;
    unitPrice: number;
    discount: number;
    newSellPrice?: number;
    expiryDate?: string;
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
            setExternalOrderNumber('ACHAT-');
            setOrderStatus('DONE');
        } else {
            setOrderType('SALE');
            setExternalOrderNumber('');
            setOrderStatus('DONE');
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
    const [guestIsOfficial, setGuestIsOfficial] = useState(false);

    // Payment states
    const [paymentMode, setPaymentMode] = useState<'FULL' | 'PARTIAL' | 'NONE'>('FULL');
    const [initialPayment, setInitialPayment] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
    const [chequeNumber, setChequeNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [dueDate, setDueDate] = useState<string>('');

    const [lines, setLines] = useState<OrderLine[]>([{ id: '1', productId: '', quantity: 1, unitPrice: 0, discount: 0 }]);
    const [currentStep, setCurrentStep] = useState(1);

    // UI states
    const [loading, setLoading] = useState(false);
    const [invoiceData, setInvoiceData] = useState<any>(null);
    const [showErrors, setShowErrors] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === 'ArrowRight') {
            const inputs = Array.from(document.querySelectorAll<HTMLInputElement>('.navigable-input'));
            const index = inputs.indexOf(e.currentTarget);
            if (index > -1 && index + 1 < inputs.length) {
                e.preventDefault();
                inputs[index + 1].focus();
                inputs[index + 1].select();
            }
        }
    };

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
    const customerProjects = useMemo(() => (Array.isArray(projects) ? projects : []).filter(p => p.customerId === customerId && p.status === 'ACTIVE'), [projects, customerId]);
    
    const filteredCustomersForList = useMemo(() => {
        return (Array.isArray(customers) ? customers : []);
    }, [customers]);

    const subtotal = useMemo(() => {
        return lines.reduce((acc, line) => acc + (line.quantity * Math.max(0, line.unitPrice - line.discount)), 0);
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
            const effectivePrice = line.unitPrice - line.discount;
            if (orderType === 'SALE') {
                return line.quantity > selectedProduct.quantity || effectivePrice < selectedProduct.purchasePrice;
            } else {
                const effectiveSellPrice = line.newSellPrice !== undefined ? line.newSellPrice : selectedProduct.sellPrice;
                return line.unitPrice > effectiveSellPrice || effectiveSellPrice < Math.max(selectedProduct.purchasePrice, line.unitPrice);
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

    const handleAddLine = () => setLines([...lines, { id: Math.random().toString(), productId: '', quantity: 1, unitPrice: 0, discount: 0, expiryDate: '' }]);
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
            if (!externalOrderNumber || externalOrderNumber === 'ACHAT-') return false;
        }

        if (lines.length === 0) return false;
        for (const line of lines) {
            if (!line.productId || line.quantity <= 0 || line.unitPrice <= 0) return false;
            if (orderType === 'PURCHASE' && line.product) {
                const effectiveSellPrice = line.newSellPrice !== undefined ? line.newSellPrice : line.product.sellPrice;
                if (line.unitPrice > effectiveSellPrice || effectiveSellPrice < Math.max(line.product.purchasePrice, line.unitPrice)) return false;
            }
        }

        if (!validateStock()) return false;
        if (creditLimitExceeded) return false;
        if (hasAnyLineWarning) return false;
        if (isDueDateInvalid) return false;

        return true;
    };

    const handleSave = async () => {
        if (creditLimitExceeded) {
            alert('لا يمكنك تأكيد الطلبية! السقف الائتماني المتاح للعميل غير كافٍ. يرجى رفع قيمة التسديد النقدي أو تسوية ديونه السابقة الأولية.');
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
            chequeNumber: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? chequeNumber : undefined,
            bankName: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? bankName : undefined,
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
                unitPrice: Math.max(0, l.unitPrice - l.discount),
                newSellPrice: l.newSellPrice,
                expiryDate: l.expiryDate
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
        printDocument();
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

    // --- RENDER WIZARD (FOR PURCHASE) ---
    if (orderType === 'PURCHASE') {
        const steps = [
            { id: 1, name: 'نوع المورد', icon: UserCircle2 },
            { id: 2, name: 'بيانات المورد', icon: Building2 },
            { id: 3, name: 'الفاتورة', icon: FileText },
            { id: 4, name: 'المنتجات', icon: PackageOpen },
            { id: 5, name: 'الدفع', icon: CreditCard },
            { id: 6, name: 'المراجعة', icon: CheckCircle }
        ];

        const canGoNext = () => {
            if (currentStep === 1) return !!supplierType;
            if (currentStep === 2) return (supplierType === 'REGISTERED' && supplierId) || (supplierType === 'GUEST' && guestSupplierName.trim());
            if (currentStep === 3) return externalOrderNumber && externalOrderNumber !== 'ACHAT-';
            if (currentStep === 4) return lines.length > 0 && lines.every(l => l.productId && l.quantity > 0 && l.unitPrice > 0);
            return true;
        };

        return (
            <div className="font-tajawal min-h-screen bg-white text-gray-900 p-4 md:p-8 flex flex-col items-center" dir="rtl">
                <div className="w-full max-w-6xl flex flex-col lg:flex-row-reverse gap-12 items-start">
                    
                    {/* LEFT SIDE: VERTICAL STEPPER (Sticky for Desktop) */}
                    <div className="hidden lg:block w-48 sticky top-12 p-4">
                        <div className="flex flex-col items-start gap-16 relative">
                            {/* Vertical Connector Line Background */}
                            <div className="absolute right-[21px] top-6 bottom-6 w-[2px] bg-gray-100 -z-0">
                                <div className="h-full bg-emerald-500 transition-all duration-700 ease-in-out" 
                                     style={{ height: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}></div>
                            </div>

                            {steps.map((s, i) => (
                                <div key={s.id} className="flex items-center gap-6 relative z-10 w-full justify-end">
                                    {/* Arrow indicator (pointing from side) */}
                                    <div className={`transition-all duration-500 ${currentStep === s.id ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
                                        <ChevronDown size={14} className="text-emerald-500" style={{ transform: 'rotate(90deg)' }} />
                                    </div>

                                    {/* Label */}
                                    <span className={`text-sm font-black transition-colors duration-300 flex-1 text-right ${currentStep >= s.id ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {s.name}
                                    </span>

                                    {/* Circle */}
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 border-2 font-black text-sm flex-shrink-0
                                        ${currentStep >= s.id ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white border-gray-200 text-gray-300'}
                                    `}>
                                        {currentStep > s.id ? <Check size={20} /> : s.id}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* RIGHT SIDE: CONTENT */}
                    <div className="flex-1 w-full">
                        {/* Mobile Stepper (Horizontal) */}
                        <div className="lg:hidden w-full py-4 mb-8">
                            <div className="flex items-center justify-between relative px-4">
                                <div className="absolute top-[32px] left-[10%] right-[10%] h-[2px] bg-gray-200 -z-0">
                                    <div className="h-full bg-emerald-500 transition-all duration-700" style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}></div>
                                </div>
                                {steps.map((s) => (
                                    <div key={s.id} className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 ${currentStep >= s.id ? 'bg-emerald-500 border-emerald-500 text-white' : 'bg-white border-gray-200 text-gray-300'}`}>
                                        {currentStep > s.id ? <Check size={16} /> : s.id}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* CONTENT AREA */}
                        <div className="min-h-[500px]">
                            {currentStep === 1 && (
                                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-gray-900">من هو المورد؟</h2>
                                    <p className="text-gray-400 font-bold mt-2 text-sm text-center">اختر نوع المورد للبدء في تسجيل الطلبية</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button
                                        onClick={() => { setSupplierType('REGISTERED'); setCurrentStep(2); }}
                                        className={`p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 group ${supplierType === 'REGISTERED' ? 'border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-100' : 'border-gray-100 bg-white hover:border-gray-300'}`}
                                    >
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${supplierType === 'REGISTERED' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                                            <Building2 size={40} />
                                        </div>
                                        <div className="text-center">
                                            <h3 className={`text-xl font-black ${supplierType === 'REGISTERED' ? 'text-blue-600' : 'text-gray-900'}`}>مورد مسجل</h3>
                                            <p className="text-xs text-gray-400 font-bold mt-1">البحث في قاعدة البيانات</p>
                                        </div>
                                    </button>

                                    <button
                                        onClick={() => { setSupplierType('GUEST'); setCurrentStep(2); }}
                                        className={`p-10 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 group ${supplierType === 'GUEST' ? 'border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-100' : 'border-gray-100 bg-white hover:border-gray-300'}`}
                                    >
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all ${supplierType === 'GUEST' ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                                            <UserCircle2 size={40} />
                                        </div>
                                        <div className="text-center">
                                            <h3 className={`text-xl font-black ${supplierType === 'GUEST' ? 'text-blue-600' : 'text-gray-900'}`}>مورد غير مسجل</h3>
                                            <p className="text-xs text-gray-400 font-bold mt-1">إدخال الاسم يدوياً</p>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        )}

                        {currentStep === 2 && (
                            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                {supplierType === 'REGISTERED' ? (
                                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl animate-in zoom-in-95 duration-300">
                                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">ابحث واختر المورد <Search size={16} /></h4>
                                        <SearchableSelect
                                            options={suppliers.map(s => ({ id: s.id, label: s.name, subLabel: `رصيد المورد: ${s.balanceDue.toLocaleString()} دج` }))}
                                            value={supplierId}
                                            onChange={(val) => setSupplierId(val)}
                                            placeholder="ابحث عن المورد هنا..."
                                        />
                                        {selectedSupplier && (
                                            <div className="mt-6 p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex justify-between items-center">
                                                <span className="text-xs font-black text-emerald-600">رصيد المورد الحالي:</span>
                                                <span className="text-xl font-black font-sans text-emerald-700">{selectedSupplier.balanceDue.toLocaleString()} دج</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl animate-in zoom-in-95 duration-300">
                                        <h4 className="text-sm font-black text-gray-400 uppercase tracking-widest mb-6 flex items-center gap-2">أدخل اسم المورد <Plus size={16} /></h4>
                                        <input
                                            type="text"
                                            placeholder="اسم المورد..."
                                            value={guestSupplierName}
                                            onChange={e => setGuestSupplierName(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 text-lg font-black focus:border-blue-600 outline-none transition-all"
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep === 3 && (
                            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-gray-900">رقم الفاتورة</h2>
                                    <p className="text-gray-400 font-bold mt-2 text-sm">أدخل رقم الفاتورة الخارجية المرفقة مع الطلبية</p>
                                </div>

                                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-xl flex flex-col gap-6">
                                    <div className="relative">
                                        <span className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 font-black text-lg">#</span>
                                        <input
                                            type="text"
                                            value={externalOrderNumber}
                                            onChange={(e) => setExternalOrderNumber(e.target.value)}
                                            className="w-full pr-14 pl-6 py-6 bg-gray-50 border border-gray-200 rounded-[2rem] text-2xl font-black text-blue-600 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-center tracking-widest uppercase"
                                            placeholder="أدخل الرقم هنا..."
                                            autoFocus
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 4 && (
                            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-gray-900">المنتجات</h2>
                                    <p className="text-gray-400 font-bold mt-2 text-sm text-center">أضف المنتجات والكميات المراد شراؤها</p>
                                </div>

                                <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden">
                                    <div className="p-6 flex flex-col gap-4 bg-gray-50">
                                        {lines.map((line, index) => (
                                            <div key={line.id} className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm group">
                                                <div className="flex flex-col gap-6">
                                                    <div className="flex-1">
                                                        <SearchableSelect
                                                            options={products.map(p => ({
                                                                id: p.id,
                                                                label: p.name,
                                                                subLabel: `المخزون: ${p.quantity} ${p.unit} | التكلفة: ${p.purchasePrice} دج`
                                                            }))}
                                                            value={line.productId}
                                                            onChange={(val) => updateLine(line.id, { productId: val })}
                                                            placeholder="ابحث عن منتج..."
                                                            onSelect={(opt) => {
                                                                const prd = products.find(p => p.id === opt.id);
                                                                if (prd) updateLine(line.id, { product: prd, unitPrice: prd.purchasePrice });
                                                            }}
                                                        />
                                                    </div>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">الكمية المطلوبة</label>
                                                            <div className="flex items-center gap-3">
                                                                 <input
                                                                    type="number"
                                                                    value={line.quantity || ''}
                                                                    onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })}
                                                                    className="bg-transparent border-none outline-none font-sans font-black text-2xl text-blue-600 w-full"
                                                                />
                                                                <span className="text-gray-400 font-bold">{line.product?.unit || '...'}</span>
                                                            </div>
                                                        </div>
                                                        <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                                                            <label className="text-[10px] font-black text-gray-400 uppercase block mb-2">تكلفة الوحدة (دج)</label>
                                                            <input
                                                                type="number"
                                                                value={line.unitPrice || ''}
                                                                onChange={e => updateLine(line.id, { unitPrice: parseFloat(e.target.value) || 0 })}
                                                                className="bg-transparent border-none outline-none font-sans font-black text-2xl text-emerald-500 w-full"
                                                            />
                                                        </div>
                                                    </div>
                                                    {lines.length > 1 && (
                                                        <button onClick={() => handleRemoveLine(line.id)} className="text-rose-500 font-bold text-xs flex items-center gap-1 hover:text-rose-600 transition-colors">
                                                            <Trash2 size={14} /> حذف هذا السطر
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        <button
                                            onClick={handleAddLine}
                                            className="w-full py-6 border-2 border-dashed border-gray-200 rounded-3xl text-gray-400 font-black hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={20} /> إضافة منتج آخر
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {currentStep === 5 && (
                            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-gray-900">طريقة الدفع</h2>
                                    <p className="text-gray-400 font-bold mt-2 text-sm">حدد كيف سيتم تسوية هذه الفاتورة</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { id: 'FULL', name: 'دفع كامل', icon: CheckCircle, color: 'emerald' },
                                        { id: 'PARTIAL', name: 'دفع جزئي', icon: Store, color: 'amber' },
                                        { id: 'NONE', name: 'على الحساب', icon: Calendar, color: 'rose' }
                                    ].map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setPaymentMode(mode.id as any)}
                                            className={`p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${paymentMode === mode.id ? `border-${mode.color}-500 bg-${mode.color}-50 text-${mode.color}-600 shadow-lg shadow-${mode.color}-100` : 'border-gray-100 bg-white hover:border-gray-300 text-gray-400'}`}
                                        >
                                            <mode.icon size={24} />
                                            <span className="font-black">{mode.name}</span>
                                        </button>
                                    ))}
                                </div>

                                {(paymentMode === 'FULL' || paymentMode === 'PARTIAL') && (
                                    <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-xl flex flex-col gap-6 animate-in zoom-in-95">
                                        {paymentMode === 'PARTIAL' && (
                                            <div>
                                                <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3 text-right">المبلغ المدفوع حالياً (دج)</label>
                                                <input
                                                    type="number"
                                                    value={initialPayment || ''}
                                                    onChange={e => setInitialPayment(parseFloat(e.target.value) || 0)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-2xl font-black text-emerald-600 focus:border-emerald-500 outline-none"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-4 text-right">وسيلة الدفع</label>
                                            <div className="grid grid-cols-3 gap-3">
                                                <button onClick={() => setPaymentMethod('CASH')} className={`py-3 rounded-xl font-black text-sm transition-all ${paymentMethod === 'CASH' ? 'bg-gray-900 text-white shadow-xl' : 'bg-gray-100 text-gray-500'}`}>💵 نقداً</button>
                                                <button onClick={() => setPaymentMethod('BANK_TRANSFER')} className={`py-3 rounded-xl font-black text-sm transition-all ${paymentMethod === 'BANK_TRANSFER' ? 'bg-gray-900 text-white shadow-xl' : 'bg-gray-100 text-gray-500'}`}>🏦 حوالة</button>
                                                <button onClick={() => setPaymentMethod('CHEQUE')} className={`py-3 rounded-xl font-black text-sm transition-all ${paymentMethod === 'CHEQUE' ? 'bg-gray-900 text-white shadow-xl' : 'bg-gray-100 text-gray-500'}`}>📄 صك</button>
                                            </div>
                                        </div>

                                        {(paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                                <input type="text" placeholder="رقم الصك / العملية..." value={chequeNumber} onChange={e => setChequeNumber(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none" />
                                                <input type="text" placeholder="اسم البنك..." value={bankName} onChange={e => setBankName(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold focus:border-blue-500 outline-none" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        )}

                        {currentStep === 6 && (
                            <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <div className="text-center">
                                    <h2 className="text-2xl font-black text-gray-900">مراجعة الطلبية</h2>
                                    <p className="text-gray-400 font-bold mt-2 text-sm">تأكد من كافة البيانات قبل الحفظ النهائي</p>
                                </div>

                                <div className="bg-white border border-gray-100 rounded-[2.5rem] shadow-xl overflow-hidden">
                                    <div className="p-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
                                        <div className="flex justify-between items-center mb-6">
                                            <span className="text-blue-100 font-bold text-sm uppercase tracking-widest">إجمالي الفاتورة</span>
                                            <div className="bg-white/20 px-4 py-1 rounded-full text-xs font-black">فاتورة شراء #{externalOrderNumber}</div>
                                        </div>
                                        <div className="text-5xl font-black font-sans">{grandTotal.toLocaleString()} <span className="text-xl">دج</span></div>
                                    </div>
                                    <div className="p-8 space-y-6">
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                            <span className="text-gray-400 font-bold text-sm">المورد:</span>
                                            <span className="font-black text-gray-900 text-lg">{supplierType === 'REGISTERED' ? selectedSupplier?.name : guestSupplierName}</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                            <span className="text-gray-400 font-bold text-sm">عدد المواد:</span>
                                            <span className="font-black text-gray-900">{lines.length} منتجات</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                            <span className="text-gray-400 font-bold text-sm">المبلغ المدفوع:</span>
                                            <span className="font-black text-emerald-600">{initialPayment.toLocaleString()} دج</span>
                                        </div>
                                        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
                                            <span className="text-gray-400 font-bold text-sm">المبلغ المتبقي:</span>
                                            <span className="font-black text-rose-500">{remaining.toLocaleString()} دج</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* FOOTER NAVIGATION */}
                    <div className="mt-12 flex justify-between items-center gap-4">
                        <button
                            onClick={() => currentStep > 1 && setCurrentStep(currentStep - 1)}
                            disabled={currentStep === 1}
                            className={`px-8 py-4 rounded-2xl font-black transition-all ${currentStep === 1 ? 'opacity-0' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                        >
                            السابق
                        </button>

                        {currentStep < 6 ? (
                            <button
                                onClick={() => canGoNext() && setCurrentStep(currentStep + 1)}
                                disabled={!canGoNext()}
                                className={`px-12 py-4 rounded-2xl font-black text-white shadow-xl transition-all ${canGoNext() ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' : 'bg-gray-300 cursor-not-allowed'}`}
                            >
                                التالي
                            </button>
                        ) : (
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="px-16 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-xl shadow-emerald-100 transition-all"
                            >
                                {loading ? 'جاري الحفظ...' : 'تأكيد وحفظ الطلبية'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

    // --- RENDER SALE (PREMIUM ORIGINAL UI) ---
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
                                إنشاء طلبية بيع
                            </h1>
                            <p className="text-gray-400 text-sm font-medium mt-1">
                                واجهة تسجيل مخرجات المخزون
                            </p>
                        </div>
                    </div>

                    {/* STEP 1: ORDER STATUS */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-xl animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">1. نوع التحصيل</h2>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex p-1.5 bg-gray-50 border border-gray-200 rounded-2xl w-full">
                                <button
                                    onClick={() => setOrderStatus('DONE')}
                                    className={`flex-1 py-3 rounded-xl flex justify-center items-center gap-2 text-sm font-black transition-all ${orderStatus === 'DONE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/20' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                                >
                                    <CheckCircle size={18} /> تسليم فوري (مكتملة)
                                </button>
                                <button
                                    onClick={() => setOrderStatus('PENDING')}
                                    className={`flex-1 py-3 rounded-xl flex justify-center items-center gap-2 text-sm font-black transition-all ${orderStatus === 'PENDING' ? 'bg-amber-500 text-white shadow-lg shadow-amber-900/20' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200/50'}`}
                                >
                                    <AlertTriangle size={18} /> معلقة
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* STEP 2: ACTOR INFO */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-xl flex flex-col gap-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest flex items-center gap-2">
                            2. بيانات العميل <User size={16} />
                        </h2>

                        <div className="flex p-1 bg-gray-50 border border-gray-200 rounded-xl w-fit">
                            <button onClick={() => setCustomerType('REGISTERED')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${customerType === 'REGISTERED' ? 'bg-gray-200 text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}>👤 عميل مسجل</button>
                            <button onClick={() => setCustomerType('GUEST')} className={`px-6 py-2 rounded-lg text-sm font-black transition-all ${customerType === 'GUEST' ? 'bg-gray-200 text-gray-900 shadow' : 'text-gray-500 hover:text-gray-700'}`}>🚶 زبون عابر</button>
                        </div>

                        {customerType === 'REGISTERED' ? (
                            <div className="space-y-4">
                                <div className={showErrors && !customerId ? "ring-2 ring-rose-500/50 rounded-2xl p-1" : ""}>
                                    <SearchableSelect
                                        options={filteredCustomersForList.map(c => ({
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

                                {selectedCustomer && selectedCustomer.type === 'LOYAL' && selectedCustomer.creditLimit && (
                                    <div className="bg-gradient-to-br from-[#1A2333] to-[#0B101A] rounded-2xl border border-gray-300/50 p-5 shadow-inner">
                                        <div className="flex items-center gap-3 mb-4 text-white">
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
                                        </div>
                                        <p className="text-xs font-bold text-gray-500 text-center">{progressPercent}% مستخدم من السقف الائتماني</p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="space-y-4" onKeyDown={handleKeyDown}>
                                <input
                                    type="text"
                                    placeholder="* الاسم الكامل للزبون العابر..."
                                    value={guestName}
                                    onChange={e => setGuestName(e.target.value.toUpperCase())}
                                    className={`w-full bg-white/50 border rounded-xl px-4 py-3 text-sm text-gray-900 outline-none transition-colors uppercase ${showErrors && !guestName.trim() ? 'border-rose-500 bg-rose-50' : 'border-gray-200 focus:border-blue-500'}`}
                                />
                                <input type="tel" dir="ltr" placeholder="رقم الهاتف (اختياري)" value={guestPhone} onChange={e => setGuestPhone(e.target.value)} className="w-full bg-white/50 border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 outline-none focus:border-blue-500 transition-colors" />
                            </div>
                        )}
                    </div>

                    {/* PRODUCTS GRID */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] shadow-xl overflow-hidden">
                        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2"><PackageOpen className="text-blue-500" /> المنتجات المختارة</h2>
                        </div>
                        <div className="p-6 flex flex-col gap-4 bg-gray-50">
                            {lines.map((line, index) => (
                                <div key={line.id} className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm">
                                    <div className="flex flex-col gap-4">
                                        <SearchableSelect
                                            options={products.map(p => ({
                                                id: p.id,
                                                label: p.name,
                                                subLabel: `المخزون: ${p.quantity} ${p.unit} | السعر: ${p.sellPrice} دج`
                                            }))}
                                            value={line.productId}
                                            onChange={(val) => updateLine(line.id, { productId: val })}
                                            placeholder="اختر منتجاً..."
                                            onSelect={(opt) => {
                                                const prd = products.find(p => p.id === opt.id);
                                                if (prd) updateLine(line.id, { product: prd, unitPrice: prd.sellPrice });
                                            }}
                                        />
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-400">الكمية</span>
                                                <input type="number" value={line.quantity || ''} onChange={e => updateLine(line.id, { quantity: parseFloat(e.target.value) || 0 })} className="bg-transparent border-none outline-none font-black text-right w-20 text-lg" />
                                            </div>
                                            <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
                                                <span className="text-xs font-bold text-gray-400">المجموع</span>
                                                <span className="font-black text-emerald-600">{(line.unitPrice * line.quantity).toLocaleString()} دج</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            <button onClick={handleAddLine} className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-400 font-black hover:border-blue-500 hover:text-blue-500 transition-all">+ إضافة سطر جديد</button>
                        </div>
                    </div>

                    {/* PAYMENT SECTION */}
                    <div className="bg-white border border-gray-200 rounded-[2rem] p-6 shadow-xl flex flex-col gap-6 mb-20">
                        <h2 className="text-sm font-black text-gray-500 uppercase tracking-widest">3. تفاصيل الدفع</h2>
                        <div className="grid grid-cols-3 gap-3">
                            <button onClick={() => setPaymentMode('FULL')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 font-black transition-all ${paymentMode === 'FULL' ? 'bg-emerald-50 border-emerald-500 text-emerald-600 shadow-lg' : 'bg-white border-gray-200 text-gray-400'}`}>
                                <CreditCard size={20} /> كامل
                            </button>
                            <button onClick={() => setPaymentMode('PARTIAL')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 font-black transition-all ${paymentMode === 'PARTIAL' ? 'bg-amber-50 border-amber-500 text-amber-600 shadow-lg' : 'bg-white border-gray-200 text-gray-400'}`}>
                                <Store size={20} /> جزئي
                            </button>
                            <button onClick={() => setPaymentMode('NONE')} className={`p-4 rounded-2xl border flex flex-col items-center gap-2 font-black transition-all ${paymentMode === 'NONE' ? 'bg-rose-50 border-rose-500 text-rose-600 shadow-lg' : 'bg-white border-gray-200 text-gray-400'}`}>
                                <Calendar size={20} /> آجل
                            </button>
                        </div>

                        {paymentMode === 'PARTIAL' && (
                            <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 animate-in slide-in-from-top-2">
                                <label className="text-xs font-black text-gray-400 block mb-2">المبلغ المدفوع حالياً (دج)</label>
                                <input
                                    type="number"
                                    value={initialPayment || ''}
                                    onChange={e => setInitialPayment(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-lg font-black text-emerald-600 outline-none focus:border-emerald-500"
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* ━━━ LEFT SIDE (STICKY SUMMARY) ━━━ */}
                <div className="xl:col-span-5 w-full">
                    <div className="sticky top-8 bg-gradient-to-b from-[#111825] to-[#0a0f18] border border-gray-800 shadow-2xl rounded-[2.5rem] overflow-hidden">
                        <div className="p-8 space-y-8 text-white">
                            <h3 className="text-xl font-black flex justify-between items-center">الملخص المالي <span>📊</span></h3>
                            
                            <div className="space-y-4">
                                <div className="flex justify-between items-center text-gray-400 font-bold border-b border-gray-800 pb-2">
                                    <span>المجموع (HT):</span>
                                    <span className="text-white font-sans">{subtotal.toLocaleString()} دج</span>
                                </div>
                                {isOfficial && (
                                    <div className="flex justify-between items-center text-blue-400 font-bold border-b border-gray-800 pb-2">
                                        <span>TVA ({settings?.tvaRate}%):</span>
                                        <span>{taxTotal.toLocaleString()} دج</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-end pt-4">
                                    <span className="text-gray-400 font-black">الإجمالي النهائي:</span>
                                    <span className="text-5xl font-black text-blue-400 font-sans">{grandTotal.toLocaleString()} <span className="text-sm">دج</span></span>
                                </div>
                            </div>

                            <div className="bg-[#1a2333]/50 border border-gray-800/50 rounded-2xl p-4 text-center">
                                <p className="text-[10px] font-bold text-blue-500/80 mb-1">تفقيط القيمة أوتوماتيكياً</p>
                                <p className="text-sm font-black text-blue-300">"{tafqeet(grandTotal)} دينار جزائري"</p>
                            </div>

                            {creditLimitExceeded && (
                                <div className="bg-rose-500/10 border-2 border-rose-500/50 rounded-2xl p-4 animate-pulse">
                                    <p className="flex items-center gap-2 text-rose-400 font-black mb-1"><AlertTriangle size={18} /> تحذير الائتمان!</p>
                                    <p className="text-[10px] text-rose-300 font-bold">تجاوز هذا المبلغ السقف الائتماني المسموح به لهذا العميل.</p>
                                </div>
                            )}

                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className={`w-full py-5 rounded-2xl font-black text-lg transition-all shadow-xl ${creditLimitExceeded ? 'bg-rose-600/50 cursor-not-allowed opacity-50' : loading ? 'bg-blue-600/50 cursor-wait' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/40'}`}
                            >
                                {loading ? 'جاري الحفظ...' : creditLimitExceeded ? 'الرصيد غير كافٍ' : 'حفظ الطلبية وطباعة الوصل'}
                            </button>

                            <button onClick={() => router.back()} className="w-full text-sm font-bold text-gray-500 hover:text-gray-400 transition-colors">
                                ← إلغاء والرجوع
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
