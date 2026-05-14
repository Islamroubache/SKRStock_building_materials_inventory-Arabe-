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
import SingleDatePicker from '@/components/SingleDatePicker';

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
    phone?: string;
}

interface Product {
    id: number;
    code?: string;
    name: string;
    quantity: number;
    sellPrice: number;
    purchasePrice: number;
    unit: string;
    hasBatches?: boolean;
    hasExpiryDate?: boolean;
    tva?: number | null;
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

const formatWithSpaces = (val: number | string): string => {
    if (val === undefined || val === null || val === '') return '';
    const num = typeof val === 'string' ? val.replace(/\s/g, '') : val.toString();
    if (isNaN(Number(num))) return num;
    return num.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

const parseNumber = (val: string): number => {
    return parseFloat(val.replace(/\s/g, '')) || 0;
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
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

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
            setExternalOrderNumber('');
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
    const [guestPostalCode, setGuestPostalCode] = useState('28000');
    const [guestIsOfficial, setGuestIsOfficial] = useState(false);
    const [guestIsTvaSubject, setGuestIsTvaSubject] = useState(true);
    const [guestActivity, setGuestActivity] = useState('');
    const [fawtara, setFawtara] = useState(false);
    
    // Popup states
    const [showPrintPopup, setShowPrintPopup] = useState(false);
    const [createdOrderId, setCreatedOrderId] = useState<number | null>(null);

    // Payment states
    const [paymentMode, setPaymentMode] = useState<'FULL' | 'PARTIAL' | 'NONE'>('FULL');
    const [initialPayment, setInitialPayment] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
    const [chequeNumber, setChequeNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [dueDate, setDueDate] = useState<string>('');

    const [lines, setLines] = useState<OrderLine[]>([{ id: '1', productId: '', quantity: 1, unitPrice: 0, discount: 0 }]);
    const [currentStep, setCurrentStep] = useState(1);

    // Track list navigation index for Step 2 and Step 5
    const [activeListIndex, setActiveListIndex] = useState(0);
    const [focusedPaymentIndex, setFocusedPaymentIndex] = useState(0);
    const [activeSubFocus, setActiveSubFocus] = useState<'MODES' | 'AMOUNT' | 'METHODS' | 'DETAILS'>('MODES');
    const [focusedMethodIndex, setFocusedMethodIndex] = useState(0);
    const [focusedBankIndex, setFocusedBankIndex] = useState(0);

    const algerianBanks = [
        "بنك الجزائر الخارجي (BEA)",
        "البنك الوطني الجزائري (BNA)",
        "القرض الشعبي الجزائري (CPA)",
        "بنك الفلاحة والتنمية الريفية (BADR)",
        "بنك التنمية المحلية (BDL)",
        "صندوق التوفير والاحتياط (CNEP)",
        "بنك البركة الجزائري",
        "مصرف السلام الجزائر",
        "سوسيتي جينيرال الجزائر",
        "بي إن بي باريبا الجزائر",
        "الخليج بنك الجزائر (AGB)"
    ];

    // Global shortcuts for Cancel
    useEffect(() => {
        const handleGlobalKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'F12' || e.key === 'Escape') {
                e.preventDefault(); // Prevent browser dev tools for F12
                router.push('/orders');
            }


        };
        window.addEventListener('keydown', handleGlobalKeyDown);
        return () => window.removeEventListener('keydown', handleGlobalKeyDown);
    }, [router, currentStep, focusedPaymentIndex]);

    // Keyboard navigation for Purchase Wizard
    useEffect(() => {
        if (orderType !== 'PURCHASE') return;

        const handleKeyDown = (e: KeyboardEvent) => {
            // Global Back Shortcut (Right Arrow)
            if (e.key === 'ArrowRight' && currentStep > 1 && currentStep !== 4 && currentStep !== 5) {
                const target = e.target as HTMLElement;
                const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';
                
                if (isInput) {
                    const input = target as HTMLInputElement;
                    if (input.selectionStart !== input.value.length) return; 
                }

                e.preventDefault();
                
                // Reset data when going back from Step 2 to 1
                if (currentStep === 2) {
                    setSupplierId('');
                    setFocusedField('');
                    setGuestSupplierName('');
                    setActiveListIndex(0);
                }

                setCurrentStep(prev => prev - 1);
                return;
            }

            if (currentStep === 1) {
                if (e.key === 'ArrowLeft') {
                    setSupplierType('GUEST');
                } else if (e.key === 'ArrowRight') {
                    setSupplierType('REGISTERED');
                } else if (e.key === 'Enter') {
                    setCurrentStep(2);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [currentStep, orderType]);

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
        }).catch(err => console.error(err));
    }, [orderType]);

    const selectedCustomer = useMemo(() => (Array.isArray(customers) ? customers : []).find(c => c.id === customerId) || null, [customers, customerId]);
    const selectedSupplier = useMemo(() => (Array.isArray(suppliers) ? suppliers : []).find(s => s.id === supplierId) || null, [suppliers, supplierId]);
    
    const subtotal = useMemo(() => {
        return lines.reduce((acc, line) => acc + (line.quantity * Math.max(0, line.unitPrice - line.discount)), 0);
    }, [lines]);

    const taxTotal = useMemo(() => {
        if (!settings) return 0;
        return lines.reduce((acc, line) => {
            const p = products.find(prd => prd.id === Number(line.productId));
            const lineHt = line.quantity * Math.max(0, line.unitPrice - line.discount);
            const tvaRate = p?.tva !== undefined && p?.tva !== null ? p.tva : (settings?.tvaRate || 19);
            return acc + (lineHt * (tvaRate / 100));
        }, 0);
    }, [lines, products, settings]);

    const timbreAmount = useMemo(() => {
        if (!settings || paymentMethod !== 'CASH') return 0;
        return Math.min((subtotal + taxTotal) * (settings.timbreRate / 100), 10000);
    }, [settings, subtotal, taxTotal, paymentMethod]);

    const grandTotal = orderType === 'PURCHASE' ? subtotal : subtotal + taxTotal + timbreAmount;

    useEffect(() => {
        if (paymentMode === 'FULL') setInitialPayment(grandTotal);
        else if (paymentMode === 'NONE') setInitialPayment(0);
    }, [paymentMode, grandTotal]);

    const remaining = Math.max(0, grandTotal - initialPayment);

    const handleAddLine = () => setLines([...lines, { id: Math.random().toString(), productId: '', quantity: 1, unitPrice: 0, discount: 0, expiryDate: '' }]);
    const handleRemoveLine = (id: string) => setLines(lines.filter(l => l.id !== id));
    function updateLine(id: string, updates: Partial<OrderLine>) {
        setLines(prev => prev.map(l => {
            if (l.id !== id) return l;
            const updated = { ...l, ...updates };
            const p = products.find(prd => prd.id === Number(l.productId));
            const avgPurchasePrice = p?.purchasePrice || 0;
            
            // Enforce Rules:
            // 1. Selling Price (newSellPrice) >= Average Purchase Price (from database)
            if (updated.newSellPrice !== undefined && updated.newSellPrice < avgPurchasePrice) {
                updated.newSellPrice = avgPurchasePrice;
            }

            // 2. Selling Price (newSellPrice) >= Current Purchase Price (unitPrice)
            if (updated.newSellPrice !== undefined && updated.unitPrice > updated.newSellPrice) {
                updated.newSellPrice = updated.unitPrice;
            } else if (updated.unitPrice > (updated.newSellPrice ?? 0)) {
                updated.newSellPrice = updated.unitPrice;
            }
            
            return updated;
        }));
    }

    const canGoNext = () => {
        if (orderType === 'PURCHASE') {
            if (currentStep === 1) return !!supplierType;
            if (currentStep === 2) return (supplierType === 'REGISTERED' && supplierId) || (supplierType === 'GUEST' && guestSupplierName.trim().length >= 3);
            if (currentStep === 3) return externalOrderNumber && externalOrderNumber.length > 5;
            if (currentStep === 4) {
                const productLines = lines.filter(l => l.productId);
                return productLines.length > 0 && productLines.every(l => {
                    const p = products.find(prd => prd.id === Number(l.productId));
                    const needsExpiry = p?.hasExpiryDate;
                    const hasExpiry = !!l.expiryDate;
                    return l.quantity > 0 && l.unitPrice > 0 && (!needsExpiry || hasExpiry);
                });
            }
            if (currentStep === 5) {
                if (paymentMode === 'NONE') return true;
                if (initialPayment <= 0) return false;
                if (paymentMethod !== 'CASH' && (!chequeNumber || !bankName)) return false;
                return true;
            }
        } else {
            // SALE Logic
            if (currentStep === 1) return !!customerType;
            if (currentStep === 2) {
                if (customerType === 'REGISTERED') return !!customerId && !!projectId;
                if (customerType === 'GUEST') return guestName.trim().length >= 3;
            }
            if (currentStep === 3) {
                const productLines = lines.filter(l => l.productId);
                return productLines.length > 0 && productLines.every(l => l.quantity > 0 && l.unitPrice > 0);
            }
            if (currentStep === 4) {
                if (customerType === 'GUEST') return true; // bypassed
                if (paymentMode === 'NONE') return true;
                if (initialPayment <= 0) return false;
                if (paymentMethod !== 'CASH' && (!chequeNumber || !bankName)) return false;
                return true;
            }
        }
        return true;
    };

    const handleSave = async () => {
        setLoading(true);
        const payload = {
            type: orderType,
            status: orderStatus,
            customerId: (orderType === 'SALE' && customerType === 'REGISTERED') ? customerId : null,
            supplierId: orderType === 'PURCHASE' ? supplierId : null,
            projectId: projectId || undefined,
            guestSupplierName: (orderType === 'PURCHASE' && supplierType === 'GUEST') ? guestSupplierName : undefined,
            externalNumber: orderType === 'PURCHASE' ? externalOrderNumber : undefined,
            docType: orderType === 'SALE' && fawtara && customerType === 'GUEST' ? 'INVOICE' : docType,
            total: subtotal,
            grandTotal,
            isOfficial: orderType === 'SALE' && customerType === 'GUEST' ? fawtara : isOfficial,
            initialPayment: orderType === 'SALE' && customerType === 'GUEST' ? grandTotal : initialPayment,
            paymentMethod: orderType === 'SALE' && customerType === 'GUEST' ? 'CASH' : paymentMethod,
            notes,
            // Guest Fields
            customerName: orderType === 'SALE' && customerType === 'GUEST' ? guestName : undefined,
            customerPhone: orderType === 'SALE' && customerType === 'GUEST' ? guestPhone : undefined,
            customerRC: orderType === 'SALE' && customerType === 'GUEST' ? guestRC : undefined,
            customerNIF: orderType === 'SALE' && customerType === 'GUEST' ? guestNIF : undefined,
            customerAI: orderType === 'SALE' && customerType === 'GUEST' ? guestAI : undefined,
            customerNIS: orderType === 'SALE' && customerType === 'GUEST' ? guestNIS : undefined,
            customerAddress: orderType === 'SALE' && customerType === 'GUEST' ? guestAddress : undefined,
            customerCommune: orderType === 'SALE' && customerType === 'GUEST' ? guestCommune : undefined,
            customerWilaya: orderType === 'SALE' && customerType === 'GUEST' ? guestWilaya : undefined,
            items: lines.map(l => ({
                productId: l.productId,
                quantity: l.quantity,
                unitPrice: Math.max(0, l.unitPrice - l.discount),
                newSellPrice: l.newSellPrice,
                expiryDate: l.expiryDate
            }))
        };

        try {
            // 1. Create the Order
            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('فشل في إنشاء الطلبية');
            const result = await res.json();

            // 2. Update Product Selling Prices in Database
            if (orderType === 'PURCHASE') {
                const updatePromises = lines
                    .filter(l => l.productId && l.newSellPrice !== undefined)
                    .map(l => {
                        const originalProduct = products.find(p => p.id === Number(l.productId));
                        // Only update if price actually changed
                        if (originalProduct && originalProduct.sellPrice !== l.newSellPrice) {
                            return fetch(`/api/products/${l.productId}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ sellPrice: l.newSellPrice })
                            });
                        }
                        return null;
                    })
                    .filter(p => p !== null);

                await Promise.all(updatePromises);
            }

            if (orderType === 'SALE') {
                setCreatedOrderId(result.id);
                setShowPrintPopup(true);
            } else {
                router.push('/orders');
            }
        } catch (e: any) { 
            alert(e.message); 
        } finally { 
            setLoading(false); 
        }
    };

    const purchaseSteps = [
        { id: 1, name: 'نوع المورد', icon: UserCircle2 },
        { id: 2, name: 'بيانات المورد', icon: Building2 },
        { id: 3, name: 'الفاتورة', icon: FileText },
        { id: 4, name: 'المنتجات', icon: PackageOpen },
        { id: 5, name: 'الدفع', icon: CreditCard },
        { id: 6, name: 'المراجعة', icon: CheckCircle }
    ];

    const saleSteps = [
        { id: 1, name: 'نوع العميل', icon: UserCircle2 },
        { id: 2, name: 'بيانات المشتري', icon: Store },
        { id: 3, name: 'المنتجات', icon: PackageOpen },
        { id: 4, name: 'الدفع', icon: CreditCard },
        { id: 5, name: 'المراجعة', icon: CheckCircle }
    ];

    const steps = orderType === 'PURCHASE' ? purchaseSteps : saleSteps;

    // --- RENDER WIZARD ---
    return (
            <div className="font-tajawal h-screen bg-white text-gray-900 p-4 md:p-8 flex flex-col relative overflow-hidden" dir="rtl">
                <div className="w-full flex flex-col h-full gap-4 animate-in fade-in duration-700">
                    
                    {/* TOP HORIZONTAL STEPPER */}
                    <div className="w-full py-4 flex-shrink-0 relative">
                        <div className="flex items-center justify-between relative px-[22px]">
                            {/* Connector Line — left/right = padding(22) + half-circle(22) = 44px to align with dot centers */}
                            <div className="absolute top-[18px] left-[44px] right-[44px] h-[8px] bg-gray-100/50 rounded-full -z-0 overflow-hidden shadow-inner">
                                <div className="h-full bg-emerald-500 transition-all duration-700 ease-in-out shadow-[0_0_15px_rgba(16,185,129,0.5)]" 
                                     style={{ width: `${((currentStep - 1) / (steps.length - 1)) * 100}%` }}></div>
                            </div>

                            {steps.map((s) => (
                                <div key={s.id} className="flex flex-col items-center relative z-10 gap-3 group">
                                    <div className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-500 border-2 font-black text-sm
                                        ${currentStep >= s.id ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-white border-gray-200 text-gray-300'}
                                    `}>
                                        {currentStep > s.id ? <Check size={20} /> : s.id}
                                    </div>
                                    <span className={`text-[10px] md:text-xs font-black transition-colors duration-300 ${currentStep >= s.id ? 'text-gray-900' : 'text-gray-400'}`}>
                                        {s.name}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* SEPARATOR LINE */}
                    <div className="w-full h-[1px] bg-gray-100/60 shadow-sm flex-shrink-0"></div>

                    {/* CONTENT AREA (Scrollable) */}
                    <div className="flex-1 overflow-y-auto py-8 custom-scrollbar" style={{ paddingLeft: currentStep === 4 ? '56px' : '8px', paddingRight: currentStep === 4 ? '56px' : '8px' }}>
                        <div className={currentStep === 4 ? 'w-full' : 'max-w-5xl mx-auto w-full'}>
                            {currentStep === 1 && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <button
                                        onClick={() => { setSupplierType('REGISTERED'); setCurrentStep(2); }}
                                        onMouseEnter={() => setSupplierType('REGISTERED')}
                                        className={`p-10 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col items-center gap-4 group relative overflow-hidden ${supplierType === 'REGISTERED' ? 'border-blue-600 bg-blue-50/50 shadow-xl shadow-blue-100 scale-105 z-10' : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-blue-50/20 opacity-90 hover:opacity-100'}`}
                                    >
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 ${supplierType === 'REGISTERED' ? 'bg-blue-600 text-white rotate-6' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600 group-hover:rotate-3'}`}>
                                            <Building2 size={40} />
                                        </div>
                                        <div className="text-center">
                                            <h3 className={`text-xl font-black transition-colors ${supplierType === 'REGISTERED' ? 'text-blue-600' : 'text-gray-500 group-hover:text-blue-600'}`}>مورد مسجل</h3>
                                            <p className="text-xs text-gray-400 font-bold mt-1">البحث في قاعدة البيانات</p>
                                        </div>
                                        {supplierType === 'REGISTERED' && (
                                            <div className="text-[10px] font-black text-blue-400 mt-2 animate-bounce flex items-center gap-1">
                                                <Check size={12} strokeWidth={4} /> اضغط Enter للمتابعة
                                            </div>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => { setSupplierType('GUEST'); setCurrentStep(2); }}
                                        onMouseEnter={() => setSupplierType('GUEST')}
                                        className={`p-10 rounded-[2.5rem] border-2 transition-all duration-300 flex flex-col items-center gap-4 group relative overflow-hidden ${supplierType === 'GUEST' ? 'border-amber-600 bg-amber-50/50 shadow-xl shadow-amber-100 scale-105 z-10' : 'border-gray-200 bg-white hover:border-amber-200 hover:bg-amber-50/20 opacity-90 hover:opacity-100'}`}
                                    >
                                        <div className={`w-20 h-20 rounded-3xl flex items-center justify-center transition-all duration-500 ${supplierType === 'GUEST' ? 'bg-amber-600 text-white -rotate-6' : 'bg-gray-100 text-gray-400 group-hover:bg-amber-100 group-hover:text-amber-600 group-hover:-rotate-3'}`}>
                                            <UserCircle2 size={40} />
                                        </div>
                                        <div className="text-center">
                                            <h3 className={`text-xl font-black transition-colors ${supplierType === 'GUEST' ? 'text-amber-600' : 'text-gray-500 group-hover:text-amber-600'}`}>مورد غير مسجل</h3>
                                            <p className="text-xs text-gray-400 font-bold mt-1">إدخال الاسم يدوياً</p>
                                        </div>
                                        {supplierType === 'GUEST' && (
                                            <div className="text-[10px] font-black text-amber-400 mt-2 animate-bounce flex items-center gap-1">
                                                <Check size={12} strokeWidth={4} /> اضغط Enter للمتابعة
                                            </div>
                                        )}
                                    </button>
                                </div>
                            )}

                            {currentStep === 2 && (
                                <div className="relative flex flex-col gap-4 animate-in fade-in slide-in-from-right-4 duration-500 h-full max-w-3xl mx-auto w-full group/frame">
                                    {/* Mouse Navigation Arrows */}
                                    <button
                                        onClick={() => {
                                            setSupplierId('');
                                            setFocusedField('');
                                            setGuestSupplierName('');
                                            setActiveListIndex(0);
                                            setCurrentStep(1);
                                        }}
                                        className="absolute -right-20 top-[60%] -translate-y-1/2 w-14 h-14 bg-white border-2 border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:scale-110 transition-all shadow-xl z-20 hidden lg:flex"
                                        title="العودة للخطوة السابقة"
                                    >
                                        <ChevronDown className="-rotate-90" size={32} />
                                    </button>

                                    <button
                                        onClick={() => canGoNext() && setCurrentStep(3)}
                                        disabled={!canGoNext()}
                                        className={`absolute -left-20 top-[60%] -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl z-20 hidden lg:flex
                                            ${canGoNext() 
                                                ? 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-110 shadow-blue-200' 
                                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                                        title={canGoNext() ? "المتابعة للخطوة التالية" : "يرجى اختيار مورد للمتابعة"}
                                    >
                                        <ChevronDown className="rotate-90" size={32} />
                                    </button>

                                    {supplierType === 'REGISTERED' ? (
                                        <div className="flex flex-col h-[550px] bg-white border-2 border-blue-600 rounded-[2.5rem] shadow-[0_20px_60px_-15px_rgba(37,99,235,0.2)] overflow-hidden">
                                            {/* Search Field with Weighted Icon */}
                                            <div className="p-6 bg-white border-b border-gray-100 flex-shrink-0">
                                                <div className="relative">
                                                    <div className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                                        <Search size={24} />
                                                    </div>
                                                    <input
                                                        type="text"
                                                        autoFocus
                                                        placeholder="ابحث عن المورد بالاسم..."
                                                        className={`w-full bg-gray-50 border border-gray-200 rounded-[1.5rem] pr-16 pl-6 py-5 text-xl font-black focus:border-blue-600 focus:bg-white outline-none transition-all placeholder:text-gray-300 ${supplierId ? 'text-blue-600' : 'text-gray-900'}`}
                                                        value={selectedSupplier && !focusedField ? selectedSupplier.name : (focusedField || '')}
                                                        onChange={(e) => {
                                                            setFocusedField(e.target.value);
                                                            setActiveListIndex(0); // Reset index on type
                                                            if (selectedSupplier && e.target.value !== selectedSupplier.name) setSupplierId('');
                                                        }}
                                                        onKeyDown={(e) => {
                                                            const filtered = (suppliers || []).filter(s => s.name.toLowerCase().includes((focusedField || '').toLowerCase()));
                                                            if (focusedField && filtered.length > 0) {
                                                                if (e.key === 'ArrowDown') {
                                                                    e.preventDefault();
                                                                    const nextIdx = (activeListIndex + 1) % filtered.length;
                                                                    setActiveListIndex(nextIdx);
                                                                    setTimeout(() => document.getElementById(`supplier-item-${nextIdx}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 10);
                                                                } else if (e.key === 'ArrowUp') {
                                                                    e.preventDefault();
                                                                    const prevIdx = (activeListIndex - 1 + filtered.length) % filtered.length;
                                                                    setActiveListIndex(prevIdx);
                                                                    setTimeout(() => document.getElementById(`supplier-item-${prevIdx}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 10);
                                                                } else if (e.key === 'Enter') {
                                                                    if (!supplierId) {
                                                                        const target = filtered[activeListIndex];
                                                                        if (target) {
                                                                            setSupplierId(target.id);
                                                                            setFocusedField('');
                                                                            setActiveListIndex(0);
                                                                        }
                                                                    } else {
                                                                        setCurrentStep(3);
                                                                    }
                                                                }
                                                            } else if (e.key === 'Enter' && supplierId) {
                                                                setCurrentStep(3);
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            {/* Compact List Elements */}
                                            <div className="flex-1 overflow-y-auto custom-scrollbar bg-white">
                                                {supplierId ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-blue-600 gap-4 animate-in zoom-in-95">
                                                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center">
                                                            <CheckCircle size={48} />
                                                        </div>
                                                        <p className="font-black text-xl">تم اختيار المورد بنجاح</p>
                                                        <p className="text-gray-400 text-xs font-bold">اضغط Enter مرة أخرى للمتابعة أو امسح الاسم للتغيير</p>
                                                    </div>
                                                ) : !focusedField ? (
                                                    <div className="h-full flex flex-col items-center justify-center text-gray-300 gap-4 opacity-40">
                                                        <Search size={64} strokeWidth={1} />
                                                        <p className="font-black text-lg">ابدأ الكتابة للبحث عن مورد...</p>
                                                    </div>
                                                ) : (
                                                    (suppliers || [])
                                                        .filter(s => s.name.toLowerCase().includes((focusedField || '').toLowerCase()))
                                                        .map((s, idx) => (
                                                            <div
                                                                key={s.id}
                                                                id={`supplier-item-${idx}`}
                                                                onClick={() => {
                                                                    setSupplierId(s.id);
                                                                    setFocusedField(''); 
                                                                }}
                                                                className={`w-full text-right px-8 py-5 cursor-pointer transition-all flex items-center justify-between border-b border-gray-50 group
                                                                    ${idx === activeListIndex 
                                                                        ? 'bg-blue-50/80 text-blue-700' 
                                                                        : 'text-gray-700 bg-white hover:bg-gray-50'}`}
                                                            >
                                                                <div className="flex items-center gap-5">
                                                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-lg transition-all shadow-sm ${idx === activeListIndex ? 'bg-blue-600 text-white rotate-6' : 'bg-gray-100 text-gray-400 group-hover:bg-blue-100 group-hover:text-blue-600'}`}>
                                                                        {s.name.charAt(0)}
                                                                    </div>
                                                                    <div className="flex flex-col">
                                                                        <span className="font-black text-xl tracking-tight">{s.name}</span>
                                                                        {s.phone && (
                                                                            <span className="text-xs font-black text-blue-400 font-sans">
                                                                                {s.phone}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                                <div className="text-left">
                                                                    <div className="text-[10px] font-black text-gray-400 uppercase mb-1">الرصيد</div>
                                                                    <div className="font-sans font-black text-lg text-blue-600">
                                                                        {s.balanceDue.toLocaleString()} <span className="text-[10px]">دج</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="bg-white border-2 border-amber-500 rounded-[2.5rem] p-10 shadow-xl shadow-amber-100 animate-in zoom-in-95 duration-300">
                                            <h4 className="text-sm font-black text-amber-600 uppercase tracking-widest mb-6 flex items-center gap-2">أدخل اسم المورد <Plus size={16} /></h4>
                                            <input
                                                type="text"
                                                autoFocus
                                                placeholder="اسم المورد..."
                                                value={guestSupplierName}
                                                onChange={e => setGuestSupplierName(e.target.value.toUpperCase())}
                                                onKeyDown={e => { if (e.key === 'Enter' && guestSupplierName.trim().length >= 3) setCurrentStep(3); }}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-5 text-xl font-black focus:border-amber-500 outline-none transition-all shadow-inner uppercase"
                                            />
                                        </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 3 && (
                                <div className="relative flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500 max-w-3xl mx-auto w-full group/frame">
                                    {/* Mouse Navigation Arrows */}
                                    <button
                                        onClick={() => setCurrentStep(2)}
                                        className="absolute -right-20 top-[70%] -translate-y-1/2 w-14 h-14 bg-white border-2 border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:scale-110 transition-all shadow-xl z-20 hidden lg:flex"
                                        title="العودة للخطوة السابقة"
                                    >
                                        <ChevronDown className="-rotate-90" size={32} />
                                    </button>

                                    <button
                                        onClick={() => canGoNext() && setCurrentStep(4)}
                                        disabled={!canGoNext()}
                                        className={`absolute -left-20 top-[70%] -translate-y-1/2 w-14 h-14 rounded-full flex items-center justify-center transition-all shadow-xl z-20 hidden lg:flex
                                            ${canGoNext() 
                                                ? 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-110 shadow-blue-200' 
                                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                                        title={canGoNext() ? "المتابعة للخطوة التالية" : "يرجى إدخال رقم الفاتورة للمتابعة"}
                                    >
                                        <ChevronDown className="rotate-90" size={32} />
                                    </button>

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
                                                onChange={(e) => setExternalOrderNumber(e.target.value.replace(/[^0-9]/g, ''))}
                                                onKeyDown={e => { 
                                                    if (e.key === 'Enter' && externalOrderNumber.length > 5) {
                                                        setCurrentStep(4); 
                                                    }
                                                }}
                                                className="w-full pr-14 pl-6 py-6 bg-gray-50 border border-gray-200 rounded-[2rem] text-2xl font-black text-blue-600 focus:border-blue-600 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-center tracking-widest uppercase"
                                                placeholder="أدخل الرقم هنا..."
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {currentStep === 4 && (
                                <div className="relative flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500 w-full group/frame">
                                    {/* Navigation Arrows fixed at screen edges */}
                                    <button
                                        onClick={() => setCurrentStep(3)}
                                        className="fixed right-20 top-1/2 -translate-y-1/2 w-12 h-12 bg-white border-2 border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:scale-110 transition-all shadow-xl z-50"
                                        title="العودة للخطوة السابقة"
                                    >
                                        <ChevronDown className="-rotate-90" size={28} />
                                    </button>

                                    <button
                                        onClick={() => canGoNext() && setCurrentStep(5)}
                                        disabled={!canGoNext()}
                                        className={`fixed left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl z-50
                                            ${canGoNext() 
                                                ? 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-110 shadow-blue-200' 
                                                : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                                        title={canGoNext() ? "المتابعة للخطوة التالية" : "يرجى إكمال بيانات المنتجات للمتابعة"}
                                    >
                                        <ChevronDown className="rotate-90" size={28} />
                                    </button>

                                    <div className="text-center mb-2">
                                        <h2 className="text-2xl font-black text-gray-900">إضافة المنتجات</h2>
                                        <p className="text-gray-400 font-bold mt-2 text-sm text-center">ابحث عن المنتجات وأضفها للطلبية</p>
                                    </div>

                                    {/* SEARCH BOX — TOP, LEFT-ALIGNED, FLOATING DROPDOWN */}
                                    <div className="relative w-full max-w-xl">
                                        <div className="flex items-center bg-white border-2 border-blue-600 rounded-2xl shadow-[0_8px_30px_-8px_rgba(37,99,235,0.2)] overflow-hidden">
                                            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg mx-2 flex-shrink-0">
                                                <Search size={20} />
                                            </div>
                                            <input
                                                id="product-search"
                                                type="text"
                                                autoFocus
                                                placeholder="ابحث عن منتج لإضافته..."
                                                className="flex-1 bg-transparent pr-2 pl-4 py-4 text-lg font-black focus:outline-none placeholder:text-gray-300 text-gray-900"
                                                value={focusedField || ''}
                                                onChange={(e) => {
                                                    setFocusedField(e.target.value);
                                                    setActiveListIndex(0);
                                                }}
                                                onKeyDown={(e) => {
                                                    // Go to next step when empty
                                                    if (e.key === 'Enter' && (!focusedField || e.ctrlKey) && canGoNext()) {
                                                        e.preventDefault();
                                                        setCurrentStep(5);
                                                        return;
                                                    }

                                                    const query = (focusedField || '').toLowerCase();
                                                    const existingProductIds = lines.map(l => Number(l.productId)).filter(id => !isNaN(id));
                                                    const filtered = products.filter(p =>
                                                        !existingProductIds.includes(p.id) && (
                                                            p.name.toLowerCase().includes(query) ||
                                                            p.id.toString().includes(query) ||
                                                            p.code?.toLowerCase().includes(query)
                                                        )
                                                    );

                                                    if (focusedField && filtered.length > 0) {
                                                        if (e.key === 'ArrowDown') {
                                                            e.preventDefault();
                                                            const nextIdx = (activeListIndex + 1) % filtered.length;
                                                            setActiveListIndex(nextIdx);
                                                            setTimeout(() => document.getElementById(`search-item-${nextIdx}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 10);
                                                        } else if (e.key === 'ArrowUp') {
                                                            e.preventDefault();
                                                            const prevIdx = (activeListIndex - 1 + filtered.length) % filtered.length;
                                                            setActiveListIndex(prevIdx);
                                                            setTimeout(() => document.getElementById(`search-item-${prevIdx}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 10);
                                                        } else if (e.key === 'Enter') {
                                                            const target = filtered[activeListIndex];
                                                            if (target) {
                                                                const newLineId = Math.random().toString();
                                                                const newLine = { id: newLineId, productId: target.id.toString(), quantity: 1, unitPrice: target.purchasePrice, discount: 0, newSellPrice: target.sellPrice, expiryDate: '' };
                                                                setLines(prev => [newLine, ...prev.filter(l => l.productId)]);
                                                                setFocusedField('');
                                                                setActiveListIndex(0);
                                                                setTimeout(() => {
                                                                    const input = document.getElementById(`qty-${newLineId}`) as HTMLInputElement;
                                                                    input?.focus();
                                                                    input?.select();
                                                                }, 10);
                                                            }
                                                        }
                                                    }
                                                }}
                                            />
                                            {focusedField && (
                                                <button onClick={() => { setFocusedField(''); setActiveListIndex(0); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 mx-2 transition-all">
                                                    <X size={16} />
                                                </button>
                                            )}
                                        </div>

                                        {/* FLOATING DROPDOWN — max 7 results */}
                                        {focusedField && (() => {
                                            const query = focusedField.toLowerCase();
                                            const existingProductIds = lines.map(l => Number(l.productId)).filter(id => !isNaN(id));
                                            const filtered = products.filter(p =>
                                                !existingProductIds.includes(p.id) && (
                                                    p.name.toLowerCase().includes(query) ||
                                                    p.id.toString().includes(query) ||
                                                    p.code?.toLowerCase().includes(query)
                                                )
                                            );

                                            if (filtered.length === 0) return (
                                                <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 p-6 text-center text-gray-400 font-bold text-sm">
                                                    لا توجد نتائج
                                                </div>
                                            );

                                            return (
                                                <div className="absolute top-full mt-2 left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 max-h-[420px] overflow-y-auto">
                                                    {filtered.map((p, idx) => (
                                                        <div
                                                            key={p.id}
                                                            id={`search-item-${idx}`}
                                                            onClick={() => {
                                                                const newLineId = Math.random().toString();
                                                                const newLine = { id: newLineId, productId: p.id.toString(), quantity: 1, unitPrice: p.purchasePrice, discount: 0, newSellPrice: p.sellPrice, expiryDate: '' };
                                                                setLines(prev => [newLine, ...prev.filter(l => l.productId)]);
                                                                setFocusedField('');
                                                                setTimeout(() => {
                                                                    const input = document.getElementById(`qty-${newLineId}`) as HTMLInputElement;
                                                                    input?.focus();
                                                                    input?.select();
                                                                }, 10);
                                                            }}
                                                            className={`w-full text-right px-5 py-3 cursor-pointer transition-all flex items-center justify-between gap-4 border-b border-gray-50 last:border-0
                                                                ${idx === activeListIndex ? 'bg-blue-50 text-blue-700' : 'bg-white hover:bg-gray-50 text-gray-700'}`}
                                                        >
                                                            <div className="flex items-center gap-3">
                                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm transition-all flex-shrink-0 ${idx === activeListIndex ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-100 text-gray-400'}`}>
                                                                    {p.name.charAt(0)}
                                                                </div>
                                                                <div className="flex flex-col">
                                                                    <span className="font-black leading-tight">{p.name}</span>
                                                                    <span className="text-[10px] font-bold text-gray-400 uppercase">{p.code || `#${p.id}`}</span>
                                                                </div>
                                                            </div>
                                                            <span className="font-sans font-black text-blue-600 text-sm flex-shrink-0">{p.purchasePrice} دج</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            );
                                        })()}
                                    </div>

                                    {(() => {
                                        const productLines = lines.filter(l => l.productId);
                                        if (productLines.length === 0) return null;
                                        
                                        return (
                                            <>
                                                <div className="bg-white border-[3px] border-gray-200 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] overflow-hidden animate-in slide-in-from-top-4 mb-6">
                                                    <table className="w-full text-right border-collapse">
                                                        <thead className="bg-gray-50 border-b-[3px] border-gray-100">
                                                            <tr>
                                                                <th className="px-6 py-3 text-[13px] font-black text-gray-900 uppercase w-[25rem] text-right">المرجع</th>
                                                                <th className="px-6 py-3 text-[13px] font-black text-gray-900 uppercase text-right min-w-[30rem]">المنتج</th>
                                                                <th className="px-6 py-3 text-[13px] font-black text-gray-900 uppercase w-56 text-center">الكمية</th>
                                                                <th className="px-6 py-3 text-[13px] font-black text-gray-900 uppercase text-center w-72">سعر الشراء (دج)</th>
                                                                <th className="px-6 py-3 text-[13px] font-black text-gray-900 uppercase text-center w-72">سعر البيع (دج)</th>
                                                                <th className="px-6 py-3 text-[13px] font-black text-gray-900 uppercase text-center w-80">ت. الصلاحية</th>
                                                                <th className="px-4 py-3 w-16"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y-[3px] divide-gray-50">
                                                            {productLines.map((line, idx) => {
                                                                const p = products.find(prd => prd.id === Number(line.productId));
                                                                return (
                                                                    <tr key={line.id} className="hover:bg-blue-50/50 transition-all group/row focus-within:bg-blue-50">
                                                                <td className="px-6 py-3 font-sans font-black text-sm text-gray-500">{p?.code || `#${line.productId}`}</td>
                                                                <td className="px-6 py-3">
                                                                    <div className="font-black text-base text-gray-900 leading-none">{p?.name || 'منتج غير معروف'}</div>
                                                                    <div className="text-[10px] font-black text-blue-600 uppercase mt-1 tracking-wider">{p?.unit}</div>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <input 
                                                                        id={`qty-${line.id}`}
                                                                        type="text" 
                                                                        value={formatWithSpaces(line.quantity)} 
                                                                        onFocus={(e) => e.target.select()}
                                                                        onChange={e => {
                                                                            const raw = e.target.value.replace(/\s/g, '');
                                                                            if (!isNaN(Number(raw)) || raw === '') {
                                                                                updateLine(line.id, { quantity: parseFloat(raw) || 0 });
                                                                            }
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === 'ArrowLeft') {
                                                                                e.preventDefault();
                                                                                document.getElementById(`price-${line.id}`)?.focus();
                                                                            } else if (e.key === 'ArrowRight') {
                                                                                e.preventDefault();
                                                                                if (idx < productLines.length - 1) document.getElementById(`sell-${productLines[idx+1].id}`)?.focus();
                                                                            } else if (e.key === 'ArrowDown' && idx < productLines.length - 1) {
                                                                                e.preventDefault();
                                                                                document.getElementById(`qty-${productLines[idx+1].id}`)?.focus();
                                                                            } else if (e.key === 'ArrowUp' && idx > 0) {
                                                                                e.preventDefault();
                                                                                document.getElementById(`qty-${productLines[idx-1].id}`)?.focus();
                                                                            }
                                                                        }}
                                                                        className="w-full bg-gray-100/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-center font-sans font-black text-lg text-blue-600 outline-none transition-all shadow-sm focus:shadow-md"
                                                                        dir="ltr"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <input 
                                                                        id={`price-${line.id}`}
                                                                        type="text" 
                                                                        value={formatWithSpaces(line.unitPrice)} 
                                                                        onFocus={(e) => e.target.select()}
                                                                        onChange={e => {
                                                                            const raw = e.target.value.replace(/\s/g, '');
                                                                            if (!isNaN(Number(raw)) || raw === '') {
                                                                                updateLine(line.id, { unitPrice: parseFloat(raw) || 0 });
                                                                            }
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === 'ArrowLeft') {
                                                                                e.preventDefault();
                                                                                document.getElementById(`sell-${line.id}`)?.focus();
                                                                            } else if (e.key === 'ArrowRight') {
                                                                                e.preventDefault();
                                                                                document.getElementById(`qty-${line.id}`)?.focus();
                                                                            } else if (e.key === 'ArrowDown' && idx < productLines.length - 1) {
                                                                                e.preventDefault();
                                                                                document.getElementById(`price-${productLines[idx+1].id}`)?.focus();
                                                                            } else if (e.key === 'ArrowUp' && idx > 0) {
                                                                                e.preventDefault();
                                                                                document.getElementById(`price-${productLines[idx-1].id}`)?.focus();
                                                                            }
                                                                        }}
                                                                        className="w-full bg-gray-100/50 border border-transparent focus:border-emerald-500 focus:bg-white rounded-xl px-3 py-2 text-center font-sans font-black text-lg text-emerald-600 outline-none transition-all shadow-sm focus:shadow-md"
                                                                        dir="ltr"
                                                                    />
                                                                </td>
                                                                <td className="px-4 py-2">
                                                                    <input 
                                                                        id={`sell-${line.id}`}
                                                                        type="text" 
                                                                        value={formatWithSpaces(line.newSellPrice || 0)} 
                                                                        onFocus={(e) => e.target.select()}
                                                                        onChange={e => {
                                                                            const raw = e.target.value.replace(/\s/g, '');
                                                                            if (!isNaN(Number(raw)) || raw === '') {
                                                                                updateLine(line.id, { newSellPrice: parseFloat(raw) || 0 });
                                                                            }
                                                                        }}
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'Enter' || e.key === 'ArrowLeft') {
                                                                                e.preventDefault();
                                                                                if (idx === 0) document.getElementById('product-search')?.focus();
                                                                                else document.getElementById(`qty-${productLines[idx-1].id}`)?.focus();
                                                                            } else if (e.key === 'ArrowRight') {
                                                                                e.preventDefault();
                                                                                document.getElementById(`price-${line.id}`)?.focus();
                                                                            } else if (e.key === 'ArrowDown' && idx < productLines.length - 1) {
                                                                                e.preventDefault();
                                                                                document.getElementById(`sell-${productLines[idx+1].id}`)?.focus();
                                                                            } else if (e.key === 'ArrowUp' && idx > 0) {
                                                                                e.preventDefault();
                                                                                document.getElementById(`sell-${productLines[idx-1].id}`)?.focus();
                                                                            }
                                                                        }}
                                                                        className="w-full bg-blue-50/50 border border-transparent focus:border-blue-500 focus:bg-white rounded-xl px-3 py-2 text-center font-sans font-black text-lg text-blue-600 outline-none transition-all shadow-sm focus:shadow-md"
                                                                        dir="ltr"
                                                                    />
                                                                </td>
                                                                <td className="px-6 py-5 text-center min-w-[200px]">
                                                                    {p?.hasExpiryDate ? (
                                                                        <SingleDatePicker 
                                                                            selectedDate={line.expiryDate || null}
                                                                            onChange={(date) => {
                                                                                updateLine(line.id, { expiryDate: date || '' });
                                                                                if (date) setTimeout(() => document.getElementById('product-search')?.focus(), 50);
                                                                            }}
                                                                            label=""
                                                                            placeholder="اختر التاريخ..."
                                                                        />
                                                                    ) : (
                                                                        <span className="text-gray-300 font-bold text-xs uppercase tracking-widest">لا يتطلب</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-5 text-center">
                                                                    <button 
                                                                        id={`del-${line.id}`}
                                                                        onClick={() => handleRemoveLine(line.id)} 
                                                                        onKeyDown={(e) => {
                                                                            if (e.key === 'd' || e.key === 'D') {
                                                                                e.preventDefault();
                                                                                handleRemoveLine(line.id);
                                                                                document.getElementById('product-search')?.focus();
                                                                            } else if (e.key === 'Enter') {
                                                                                e.preventDefault();
                                                                                document.getElementById('product-search')?.focus();
                                                                            } else if (e.key === 'ArrowRight') {
                                                                                e.preventDefault();
                                                                                if (p?.hasExpiryDate) document.getElementById(`exp-${line.id}`)?.focus();
                                                                                else document.getElementById(`sell-${line.id}`)?.focus();
                                                                            }
                                                                        }}
                                                                        className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-rose-50 hover:text-rose-500 focus:bg-rose-500 focus:text-white outline-none transition-all"
                                                                    >
                                                                        <Trash2 size={16} />
                                                                    </button>
                                                                </td>
                                                                    </tr>
                                                                );
                                                             })}
                                                         </tbody>
                                                     </table>
                                                 </div>

                                                 {/* TOTAL SUMMARY BAR */}
                                                 <div className="flex flex-col md:flex-row justify-between items-center bg-white p-6 rounded-[2rem] border-2 border-gray-100 mb-6 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                                                     <div className="flex items-center gap-5 w-full md:w-auto mb-4 md:mb-0">
                                                         <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 shadow-inner">
                                                             <ShoppingCart size={28} />
                                                         </div>
                                                         <div className="flex flex-col">
                                                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">عدد الأصناف</span>
                                                             <span className="text-2xl font-black text-gray-900 leading-none">{productLines.length} <span className="text-sm">منتجات</span></span>
                                                         </div>
                                                     </div>

                                                      <div className="flex flex-col items-center md:items-end w-full md:w-auto">
                                                          <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">إجمالي مبلغ الشراء</span>
                                                          <div className="text-4xl font-black text-blue-600 font-sans tracking-tight leading-none" dir="ltr">
                                                              {formatWithSpaces(grandTotal)} <span className="text-base">دج</span>
                                                          </div>
                                                      </div>
                                                  </div>
                                              </>
                                          );
                                      })()}
                                </div>
                            )}

                             {currentStep === 5 && (
                                 <div className="relative flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-500 group/frame max-w-3xl mx-auto w-full">
                                     {/* Navigation Arrows */}
                                     <button
                                         onClick={() => setCurrentStep(4)}
                                         className="fixed right-20 top-1/2 -translate-y-1/2 w-12 h-12 bg-white border-2 border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:scale-110 transition-all shadow-xl z-50"
                                         title="العودة للخطوة السابقة"
                                     >
                                         <ChevronDown className="-rotate-90" size={28} />
                                     </button>
                                     <button
                                         onClick={() => canGoNext() && setCurrentStep(6)}
                                         disabled={!canGoNext()}
                                         className={`fixed left-20 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-xl z-50
                                             ${canGoNext() 
                                                 ? 'bg-blue-600 text-white hover:bg-blue-500 hover:scale-110 shadow-blue-200' 
                                                 : 'bg-gray-100 text-gray-300 cursor-not-allowed'}`}
                                         title={canGoNext() ? "المتابعة للمراجعة" : "يرجى إكمال بيانات الدفع للمتابعة"}
                                     >
                                         <ChevronDown className="rotate-90" size={28} />
                                     </button>

                                     {/* Header with total */}
                                     <div className="text-center space-y-3">
                                         <h2 className="text-2xl font-black text-gray-900">طريقة الدفع</h2>
                                         <div className="inline-flex items-center gap-2 bg-gray-900 text-white px-6 py-2.5 rounded-2xl shadow-lg">
                                             <span className="text-sm font-bold opacity-60">المبلغ الكلي</span>
                                             <span className="text-xl font-black font-sans" dir="ltr">{formatWithSpaces(grandTotal)}</span>
                                             <span className="text-xs font-bold opacity-60">دج</span>
                                         </div>
                                     </div>

                                     {/* Payment Modes - Horizontal Pills */}
                                     <div className="bg-gray-100/80 p-2 rounded-[2rem] flex gap-2">
                                         {[
                                             { id: 'FULL', name: 'دفع كامل', icon: CheckCircle, color: 'emerald', index: 0 },
                                             { id: 'PARTIAL', name: 'دفع جزئي', icon: Store, color: 'amber', index: 1 },
                                             { id: 'NONE', name: 'على الحساب', icon: Calendar, color: 'rose', index: 2 }
                                         ].map(mode => {
                                             const isSelected = paymentMode === mode.id;
                                             const isFocused = focusedPaymentIndex === mode.index;
                                             return (
                                                 <button 
                                                     key={mode.id} 
                                                     onClick={() => { 
                                                         setPaymentMode(mode.id as any); 
                                                         setFocusedPaymentIndex(mode.index); 
                                                         setActiveSubFocus('MODES');
                                                         if (mode.id === 'FULL') {
                                                             setInitialPayment(grandTotal);
                                                             setActiveSubFocus('METHODS');
                                                         } else if (mode.id === 'NONE') {
                                                             setInitialPayment(0);
                                                         }
                                                     }}
                                                     className={`flex-1 py-5 rounded-[1.5rem] font-black text-lg transition-all duration-300 flex items-center justify-center gap-3 relative cursor-pointer
                                                         ${isFocused 
                                                             ? 'bg-white text-gray-900 shadow-xl shadow-gray-200/50' 
                                                             : 'text-gray-400'
                                                         }`}
                                                 >
                                                     <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all
                                                         ${isFocused 
                                                             ? `bg-${mode.color}-500 text-white shadow-lg shadow-${mode.color}-200` 
                                                             : 'bg-transparent text-gray-300'}`}>
                                                         <mode.icon size={22} />
                                                     </div>
                                                     <span className={isFocused ? `text-${mode.color}-700` : ''}>{mode.name}</span>
                                                     {isSelected && <div className={`absolute bottom-2 left-1/2 -translate-x-1/2 w-6 h-1 bg-${mode.color}-500 rounded-full`} />}
                                                 </button>
                                             );
                                         })}
                                     </div>

                                     {/* Payment Amount & Method */}
                                     {(paymentMode === 'FULL' || paymentMode === 'PARTIAL') && (
                                         <div className="flex flex-col gap-5 animate-in zoom-in-95 duration-300">
                                             {/* Amount Input - Only for PARTIAL */}
                                             {paymentMode === 'PARTIAL' && (
                                             <div className={`bg-white rounded-[2rem] p-8 transition-all duration-300 ${activeSubFocus === 'AMOUNT' ? 'border-2 border-emerald-500 shadow-2xl shadow-emerald-100' : 'border-2 border-gray-100 shadow-lg'}`}>
                                                 <div className="flex items-center justify-between mb-4">
                                                     <span className="text-xs font-black text-gray-400 uppercase tracking-widest">المبلغ المدفوع</span>
                                                     <span className="text-emerald-600 font-black text-xs bg-emerald-50 px-3 py-1 rounded-full">دج</span>
                                                 </div>
                                                 <input 
                                                     id="initial-payment-input"
                                                     type="text" 
                                                     value={formatWithSpaces(initialPayment || '')} 
                                                     onFocus={(e) => { setActiveSubFocus('AMOUNT'); e.target.select(); }}
                                                     onChange={e => {
                                                         const raw = e.target.value.replace(/\s/g, '');
                                                         if (!isNaN(Number(raw)) || raw === '') {
                                                             setInitialPayment(Math.min(parseFloat(raw) || 0, grandTotal));
                                                         }
                                                     }} 
                                                     onKeyDown={(e) => {
                                                         if (e.key === 'Enter') {
                                                             e.preventDefault();
                                                             setActiveSubFocus('METHODS');
                                                         }
                                                     }}
                                                     className="w-full bg-gray-50/80 rounded-2xl px-6 py-5 text-4xl font-black text-emerald-600 outline-none text-center transition-all focus:bg-emerald-50/50 font-sans" 
                                                     placeholder="0" 
                                                     dir="ltr"
                                                 />
                                                 {initialPayment > 0 && (
                                                     <div className="flex justify-between mt-4 px-2 text-sm font-bold">
                                                         <span className="text-gray-400">المتبقي</span>
                                                         <span className="text-rose-500 font-black font-sans" dir="ltr">{formatWithSpaces(Math.max(0, grandTotal - initialPayment))} دج</span>
                                                     </div>
                                                 )}
                                             </div>
                                             )}

                                             {/* Payment Method */}
                                             <div className={`bg-white rounded-[2rem] p-8 transition-all duration-300 ${activeSubFocus === 'METHODS' ? 'border-2 border-blue-500 shadow-2xl shadow-blue-100' : 'border-2 border-gray-100 shadow-lg'}`}>
                                                 <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-5">وسيلة الدفع</span>
                                                 <div className="grid grid-cols-3 gap-3">
                                                     {[
                                                         { id: 'CASH', name: 'نقداً', index: 0 },
                                                         { id: 'BANK_TRANSFER', name: 'حوالة بنكية', index: 1 },
                                                         { id: 'CHEQUE', name: 'صك', index: 2 }
                                                     ].map(m => (
                                                         <button 
                                                             key={m.id}
                                                             onClick={() => { setPaymentMethod(m.id as any); setFocusedMethodIndex(m.index); setActiveSubFocus('METHODS'); }}
                                                             className={`py-4 px-3 rounded-2xl font-black text-base transition-all duration-200 flex items-center justify-center border-2
                                                                 ${paymentMethod === m.id 
                                                                     ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-[1.03]' 
                                                                     : focusedMethodIndex === m.index && activeSubFocus === 'METHODS'
                                                                        ? 'bg-blue-50 text-blue-600 border-blue-200'
                                                                        : 'bg-gray-50 text-gray-400 border-transparent hover:bg-gray-100 hover:text-gray-600'}`}
                                                         >
                                                             {m.name}
                                                         </button>
                                                     ))}
                                                 </div>
                                             </div>

                                             {/* Bank/Cheque Details */}
                                             {(paymentMethod === 'BANK_TRANSFER' || paymentMethod === 'CHEQUE') && (
                                                 <div className={`bg-white rounded-[2rem] p-8 transition-all duration-300 animate-in slide-in-from-bottom-4 ${activeSubFocus === 'DETAILS' ? 'border-2 border-blue-500 shadow-2xl shadow-blue-100' : 'border-2 border-gray-100 shadow-lg'}`}>
                                                     <div className="flex flex-col gap-6">
                                                         <div>
                                                             <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3">رقم {paymentMethod === 'CHEQUE' ? 'الصك' : 'الحوالة'}</label>
                                                             <input 
                                                                 id="cheque-number-input"
                                                                 type="text"
                                                                 value={chequeNumber}
                                                                 onChange={e => setChequeNumber(e.target.value)}
                                                                 onFocus={() => setActiveSubFocus('DETAILS')}
                                                                 className="w-full bg-gray-50 rounded-2xl px-6 py-4 text-xl font-black text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all border-2 border-gray-100 focus:border-blue-400"
                                                                 placeholder="أدخل الرقم..."
                                                             />
                                                         </div>
                                                         <div>
                                                             <label className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-3">اختر البنك</label>
                                                             <select 
                                                                 id="bank-select"
                                                                 value={bankName}
                                                                 onChange={e => setBankName(e.target.value)}
                                                                 onFocus={() => setActiveSubFocus('DETAILS')}
                                                                 className="w-full bg-gray-50 rounded-2xl px-6 py-4 text-lg font-black text-gray-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 outline-none transition-all border-2 border-gray-100 focus:border-blue-400 appearance-none cursor-pointer"
                                                             >
                                                                 <option value="">— اختر البنك —</option>
                                                                 {algerianBanks.map(bank => (
                                                                     <option key={bank} value={bank}>{bank}</option>
                                                                 ))}
                                                             </select>
                                                         </div>
                                                     </div>
                                                 </div>
                                             )}
                                         </div>
                                    )}
                                </div>
                            )}

                            {currentStep === 6 && (
                                <div className="relative flex flex-col gap-6 animate-in fade-in slide-in-from-right-4 duration-500 w-full max-w-5xl mx-auto pb-20">
                                    {/* Back Arrow */}
                                    <button
                                        onClick={() => setCurrentStep(5)}
                                        className="fixed right-20 top-1/2 -translate-y-1/2 w-12 h-12 bg-white border-2 border-gray-100 rounded-full flex items-center justify-center text-gray-400 hover:border-blue-500 hover:text-blue-500 hover:scale-110 transition-all shadow-xl z-50"
                                        title="العودة للخطوة السابقة"
                                    >
                                        <ChevronDown className="-rotate-90" size={28} />
                                    </button>

                                    <div className="text-center mb-4">
                                        <h2 className="text-3xl font-black text-gray-900">مراجعة نهائية للطلبية</h2>
                                        <p className="text-gray-400 font-bold mt-2">يرجى التأكد من صحة جميع المعلومات قبل الحفظ</p>
                                    </div>

                                    {/* Header Info */}
                                    <div className="bg-white border-2 border-gray-100 rounded-[2rem] p-8 shadow-sm flex flex-col gap-6">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                            <div className="bg-gray-50 rounded-2xl p-5">
                                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">نوع الطلبية</span>
                                                <span className="text-xl font-black text-gray-900">{orderType === 'PURCHASE' ? 'شراء (دخول مخزون)' : 'بيع'}</span>
                                            </div>
                                            <div className="bg-gray-50 rounded-2xl p-5">
                                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">{orderType === 'PURCHASE' ? 'المورد' : 'الزبون'}</span>
                                                <span className="text-xl font-black text-blue-600">{supplierType === 'REGISTERED' ? selectedSupplier?.name : guestSupplierName}</span>
                                            </div>
                                            <div className="bg-gray-50 rounded-2xl p-5">
                                                <span className="text-xs font-black text-gray-400 uppercase tracking-widest block mb-1">رقم الفاتورة / الوثيقة</span>
                                                <span className="text-xl font-black text-gray-900 font-sans" dir="ltr">{externalOrderNumber || '—'}</span>
                                            </div>
                                        </div>

                                        {/* Products Table */}
                                        <div className="border-2 border-gray-100 rounded-[1.5rem] overflow-hidden">
                                            <table className="w-full text-right border-collapse">
                                                <thead className="bg-gray-50 border-b-2 border-gray-100">
                                                    <tr>
                                                        <th className="px-4 py-4 text-xs font-black text-gray-400 uppercase w-12 text-center">#</th>
                                                        <th className="px-4 py-4 text-xs font-black text-gray-400 uppercase">المرجع</th>
                                                        <th className="px-4 py-4 text-xs font-black text-gray-400 uppercase">المنتج</th>
                                                        <th className="px-4 py-4 text-xs font-black text-gray-400 uppercase text-center">الوحدة</th>
                                                        <th className="px-4 py-4 text-xs font-black text-gray-400 uppercase text-center">الكمية</th>
                                                        <th className="px-4 py-4 text-xs font-black text-gray-400 uppercase text-center">سعر الوحدة (HT)</th>
                                                        <th className="px-4 py-4 text-xs font-black text-gray-400 uppercase text-center">TVA</th>
                                                        <th className="px-4 py-4 text-xs font-black text-gray-400 uppercase text-center">المبلغ (HT)</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-100">
                                                    {lines.filter(l => l.productId).map((line, idx) => {
                                                        const p = products.find(prd => prd.id === Number(line.productId));
                                                        const lineHt = line.quantity * line.unitPrice;
                                                        return (
                                                            <tr key={line.id} className="hover:bg-gray-50/50">
                                                                <td className="px-4 py-3 font-black text-gray-400 text-center">{idx + 1}</td>
                                                                <td className="px-4 py-3 font-sans font-bold text-gray-600 text-sm">{p?.code || '—'}</td>
                                                                <td className="px-4 py-3 font-black text-gray-900">{p?.name || '—'}</td>
                                                                <td className="px-4 py-3 font-bold text-gray-500 text-center text-sm">{p?.unit || '—'}</td>
                                                                <td className="px-4 py-3 font-black text-blue-600 text-center font-sans" dir="ltr">{formatWithSpaces(line.quantity)}</td>
                                                                <td className="px-4 py-3 font-black text-gray-900 text-center font-sans" dir="ltr">{formatWithSpaces(line.unitPrice)}</td>
                                                                <td className="px-4 py-3 font-bold text-gray-400 text-center font-sans" dir="ltr">{`${p?.tva !== undefined && p?.tva !== null ? p.tva : (settings?.tvaRate || 19)}%`}</td>
                                                                <td className="px-4 py-3 font-black text-emerald-600 text-center font-sans" dir="ltr">{formatWithSpaces(lineHt)}</td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>

                                        {/* Totals & Payment Split */}
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-2">
                                            {/* Payment Summary */}
                                            <div className="bg-gray-50 rounded-[1.5rem] p-6 border-2 border-gray-100/50">
                                                <h3 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">💳</span>
                                                    تفاصيل الدفع
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                                                        <span className="text-gray-500 font-bold text-sm">طريقة الدفع:</span>
                                                        <span className="font-black text-gray-900 bg-white px-3 py-1 rounded-lg border border-gray-100">
                                                            {paymentMode === 'FULL' ? 'دفع كامل' : paymentMode === 'PARTIAL' ? 'دفع جزئي' : 'على الحساب'}
                                                        </span>
                                                    </div>
                                                    {paymentMode !== 'NONE' && (
                                                        <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                                                            <span className="text-gray-500 font-bold text-sm">وسيلة الدفع:</span>
                                                            <span className="font-black text-gray-900 flex items-center gap-2">
                                                                {paymentMethod === 'CASH' ? 'نقداً' : paymentMethod === 'BANK_TRANSFER' ? 'حوالة بنكية' : 'صك'}
                                                                {paymentMethod !== 'CASH' && chequeNumber && (
                                                                    <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-xs font-sans" dir="ltr">N° {chequeNumber}</span>
                                                                )}
                                                            </span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between items-center pb-3 border-b border-gray-200/50">
                                                        <span className="text-gray-500 font-bold text-sm">المبلغ المدفوع:</span>
                                                        <span className="font-black text-emerald-600 text-lg font-sans" dir="ltr">{formatWithSpaces(initialPayment)} دج</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-1">
                                                        <span className="text-gray-500 font-bold text-sm">الباقي (الديون):</span>
                                                        <span className="font-black text-rose-500 text-lg font-sans" dir="ltr">{formatWithSpaces(Math.max(0, grandTotal - initialPayment))} دج</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Financial Totals */}
                                            <div className="bg-gray-900 rounded-[1.5rem] p-6 text-white shadow-xl">
                                                <h3 className="text-lg font-black text-white/90 mb-6 flex items-center gap-2">
                                                    <span className="w-8 h-8 rounded-lg bg-white/10 text-white flex items-center justify-center">💰</span>
                                                    الملخص المالي
                                                </h3>
                                                <div className="space-y-4">
                                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                                        <span className="text-white/60 font-bold text-sm">المجموع الفردي (Total HT):</span>
                                                        <span className="font-black text-white font-sans" dir="ltr">{formatWithSpaces(subtotal)} دج</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                                        <span className="text-white/60 font-bold text-sm">قيمة الضريبة (TVA):</span>
                                                        <span className="font-black text-white font-sans" dir="ltr">{formatWithSpaces(taxTotal)} دج</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pb-3 border-b border-white/10">
                                                        <span className="text-white/60 font-bold text-sm">حقوق الطابع (Timbre):</span>
                                                        <span className="font-black text-white font-sans" dir="ltr">{formatWithSpaces(timbreAmount)} دج</span>
                                                    </div>
                                                    <div className="flex justify-between items-center pt-2">
                                                        <span className="text-white/80 font-black text-lg">المبلغ الإجمالي (TTC):</span>
                                                        <div className="text-right">
                                                            <div className="font-black text-3xl text-emerald-400 font-sans tracking-tight" dir="ltr">
                                                                {formatWithSpaces(grandTotal)} <span className="text-lg">دج</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* NAVIGATION BUTTONS (Step 6 Save ONLY) */}
                    <div className="w-full py-6 flex-shrink-0 flex justify-center items-center max-w-2xl mx-auto gap-6 bg-white/80 backdrop-blur-md">
                        {currentStep === 6 && (
                            <button
                                onClick={handleSave}
                                disabled={loading}
                                className="flex-1 py-4 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-black shadow-xl"
                            >
                                {loading ? 'جاري الحفظ...' : 'حفظ الطلبية'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
}
