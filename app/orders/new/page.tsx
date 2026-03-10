'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Plus, Trash2, FileText, CheckCircle, AlertTriangle, Printer, Download, CreditCard, ShoppingBag, Store, ShoppingCart, X, ChevronDown, User, Calendar } from 'lucide-react';
import { numberToArabicWords } from '@/lib/number-to-arabic-words';
import { exportInvoiceToExcel } from '@/lib/export-invoice';
import { formatDate } from '@/lib/utils';

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
}

interface Product {
    id: number;
    name: string;
    quantity: number;
    sellPrice: number;
    purchasePrice: number;
    supplierId?: number | null;
    hasExpiryDate?: boolean;
}

interface OrderLine {
    id: string;
    productId: number | '';
    product?: Product;
    quantity: number;
    unitPrice: number;
    expiryDate?: string;
    manufactureDate?: string;
    showBatchInfo?: boolean;
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
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filtered = options.filter(opt => opt.label.toLowerCase().includes(search.toLowerCase()));
    const selected = options.find(opt => opt.id === value);

    return (
        <div className="relative" ref={wrapperRef}>
            <div
                className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 flex items-center justify-between cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"
                onClick={() => setIsOpen(!isOpen)}
            >
                <span className={selected ? "text-gray-900 font-bold" : "text-gray-400 font-medium"}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-2 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <Search className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                            <input
                                type="text"
                                autoFocus
                                placeholder="بحث..."
                                className="w-full bg-white border border-gray-200 rounded-md pr-8 pl-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-blue-400"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                onClick={e => e.stopPropagation()}
                            />
                        </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto">
                        {filtered.length === 0 ? (
                            <div className="p-4 text-center text-xs text-gray-400 font-medium">لا توجد نتائج</div>
                        ) : (
                            filtered.map(opt => (
                                <div
                                    key={opt.id}
                                    className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors flex flex-col gap-0.5
                    ${value === opt.id ? 'bg-blue-50 text-blue-700 font-bold' : 'text-gray-700'}`}
                                    onClick={() => {
                                        onChange(opt.id);
                                        if (onSelect) onSelect(opt);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <span>{opt.label}</span>
                                    {opt.subLabel && <span className="text-[10px] text-gray-400 font-normal">{opt.subLabel}</span>}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Main Page ---
export default function NewOrderPage() {
    const router = useRouter();

    // Data fetching
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);

    // Form states
    const [orderType, setOrderType] = useState<'SALE' | 'PURCHASE'>('SALE');
    const [customerType, setCustomerType] = useState<'CONTRACTOR' | 'GUEST'>('CONTRACTOR');
    const [customerId, setCustomerId] = useState<number | ''>('');
    const [guestName, setGuestName] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [supplierId, setSupplierId] = useState<number | ''>('');
    const [projectId, setProjectId] = useState<number | ''>('');
    const [docType, setDocType] = useState<'INVOICE' | 'BON'>('INVOICE');
    const [notes, setNotes] = useState('');

    // Payment states
    const [paymentMode, setPaymentMode] = useState<'FULL' | 'PARTIAL' | 'NONE'>('NONE');
    const [initialPayment, setInitialPayment] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
    const [dueDate, setDueDate] = useState<string>('');

    const [lines, setLines] = useState<OrderLine[]>([
        { id: '1', productId: '', quantity: 1, unitPrice: 0 }
    ]);

    // UI states
    const [loading, setLoading] = useState(false);
    const [invoiceData, setInvoiceData] = useState<any>(null);

    useEffect(() => {
        Promise.all([
            fetch('/api/customers').then(res => res.json()),
            fetch('/api/products').then(res => res.json()),
            fetch('/api/suppliers').then(res => res.json())
        ]).then(([custData, prodData, suppData]) => {
            setCustomers(custData);
            setProducts(prodData);
            setSuppliers(suppData);

            // Handle pre-fill from URL
            const params = new URLSearchParams(window.location.search);
            const cid = params.get('customerId');
            if (cid && orderType === 'SALE') {
                setCustomerId(parseInt(cid));
                setCustomerType('CONTRACTOR');
            }
        }).catch(err => console.error(err));
    }, [orderType]);

    const selectedCustomer = useMemo(() => customers.find(c => c.id === customerId) || null, [customers, customerId]);
    const selectedSupplier = useMemo(() => suppliers.find(s => s.id === supplierId) || null, [suppliers, supplierId]);

    useEffect(() => {
        if (orderType === 'SALE' && customerType === 'CONTRACTOR' && selectedCustomer) {
            fetch(`/api/customers/${selectedCustomer.id}/projects`)
                .then(res => res.json())
                .then(data => setProjects(data));
        } else {
            setProjects([]);
            setProjectId('');
        }
    }, [selectedCustomer, orderType, customerType]);

    const grandTotal = lines.reduce((sum, line) => sum + (line.quantity * line.unitPrice), 0);

    const addLine = () => setLines([...lines, { id: Date.now().toString(), productId: '', quantity: 1, unitPrice: 0, showBatchInfo: false }]);

    const updateLine = (id: string, field: keyof OrderLine, value: any) => {
        setLines(lines.map(l => {
            if (l.id !== id) return l;
            const updated = { ...l, [field]: value };
            if (field === 'productId') {
                const prod = products.find(p => p.id === value);
                updated.product = prod;
                updated.unitPrice = prod ? (orderType === 'SALE' ? prod.sellPrice : prod.purchasePrice) : 0;
            }
            return updated;
        }));
    };

    const removeLine = (id: string) => {
        if (lines.length === 1) {
            setLines([{ id: Date.now().toString(), productId: '', quantity: 1, unitPrice: 0 }]);
            return;
        }
        setLines(lines.filter(l => l.id !== id));
    };

    const isValidForm = (orderType === 'SALE' ? (customerType === 'CONTRACTOR' ? customerId !== '' : guestName !== '') : supplierId !== '') && lines.every(l => l.productId !== '' && l.quantity > 0 && l.unitPrice > 0) && lines.length > 0;

    let creditStatus: 'OK' | 'WARNING' | 'EXCEEDED' = 'OK';
    const projectedDebt = (selectedCustomer?.balanceDue || 0) + (grandTotal - initialPayment);
    if (orderType === 'SALE' && customerType === 'CONTRACTOR' && selectedCustomer?.creditLimit) {
        if (projectedDebt > selectedCustomer.creditLimit) creditStatus = 'EXCEEDED';
        else if (projectedDebt > selectedCustomer.creditLimit * 0.9) creditStatus = 'WARNING';
    }

    const handleSaveOrder = async () => {
        if (orderType === 'SALE' && customerType === 'CONTRACTOR' && !customerId) return alert('الرجاء اختيار المقاول');
        if (orderType === 'SALE' && customerType === 'GUEST' && !guestName) return alert('الرجاء إدخال اسم العميل');
        if (orderType === 'PURCHASE' && !supplierId) return alert('الرجاء اختيار المورد');

        const validLines = lines.filter(l => l.productId && l.quantity > 0 && l.unitPrice > 0);
        if (validLines.length === 0) return alert('الرجاء إضافة منتج واحد على الأقل بكمية وسعر صحيح');

        setLoading(true);
        try {
            const payload = {
                type: orderType,
                customerId: (orderType === 'SALE' && customerType === 'CONTRACTOR') ? customerId : undefined,
                guestName: (orderType === 'SALE' && customerType === 'GUEST') ? guestName : undefined,
                guestPhone: (orderType === 'SALE' && customerType === 'GUEST') ? guestPhone : undefined,
                supplierId: orderType === 'PURCHASE' ? supplierId : undefined,
                projectId: orderType === 'SALE' && projectId ? projectId : undefined,
                status: 'DONE',
                totalAmount: grandTotal,
                initialPayment: initialPayment,
                paymentMethod: paymentMethod,
                dueDate: dueDate || undefined,
                notes: (docType === 'BON' ? '[Bon de Commande] ' : '') + notes,
                items: validLines.map(l => ({
                    productId: l.productId,
                    quantity: l.quantity,
                    unitPrice: l.unitPrice,
                    expiryDate: l.product?.hasExpiryDate !== false ? l.expiryDate : undefined,
                    manufactureDate: l.product?.hasExpiryDate !== false ? l.manufactureDate : undefined
                }))
            };

            const res = await fetch('/api/orders', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'فشل الحفظ');

            setInvoiceData({
                docType,
                orderNumber: data.newOrder?.orderNumber || data.orderNumber,
                invoiceNumber: data.invoice?.invoiceNumber || `N/A`,
                date: new Date(data.newOrder?.orderDate || data.orderDate || Date.now()),
                customer: customerType === 'CONTRACTOR' ? selectedCustomer : { name: guestName, phone: guestPhone, type: 'GUEST' },
                supplier: selectedSupplier,
                project: projects.find(p => p.id === projectId),
                items: lines,
                totalAmount: data.newOrder?.total || data.totalAmount || grandTotal
            });

        } catch (e: any) {
            alert(`خطأ: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    if (invoiceData) {
        return (
            <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex flex-col items-center font-tajawal rtl print:bg-white print:p-0" dir="rtl">
                <div className="w-full max-w-4xl flex justify-between items-center mb-6 print:hidden">
                    <button onClick={() => { setInvoiceData(null); router.push('/dashboard'); }} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 font-bold transition-all"><X size={20} /> الخروج</button>
                    <div className="flex gap-2">
                        <button onClick={() => window.print()} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-lg"><Printer size={18} /> طباعة</button>
                        <button onClick={() => {
                            exportInvoiceToExcel({
                                invoiceNumber: invoiceData.invoiceNumber || invoiceData.orderNumber,
                                date: invoiceData.date,
                                customerName: invoiceData.customer?.name || 'غير محدد',
                                projectName: invoiceData.project?.name,
                                items: invoiceData.items.map((line: any) => ({
                                    name: line.product?.name || 'غير محدد',
                                    quantity: line.quantity,
                                    unitPrice: line.unitPrice,
                                    total: line.unitPrice * line.quantity
                                })),
                                grandTotal: invoiceData.totalAmount
                            });
                        }} className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-5 py-2 rounded-lg font-bold transition-all shadow-lg"><Download size={18} /> Excel</button>
                    </div>
                </div>

                <div className="bg-white w-full max-w-4xl shadow-2xl p-6 md:p-12 min-h-[1056px] relative text-gray-900 print:shadow-none print:m-0 print:border-none">
                    <div className="text-center mb-10 border-b-2 border-gray-900 pb-6 relative">
                        <h1 className="text-4xl font-black text-gray-900 tracking-wide uppercase">مخــزونـي</h1>
                        <p className="text-gray-600 text-lg font-medium mt-1">لتجارة مواد البناء والتوريدات العامة</p>
                        <div className="absolute top-0 right-0 hidden md:block opacity-10"><Store size={80} /></div>
                    </div>

                    <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
                        <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl flex-1 w-full order-2 md:order-1">
                            <h2 className="text-2xl font-black text-gray-900 mb-4">{invoiceData.docType === 'INVOICE' ? 'فـاتـورة مبيعـات رصـيـد' : 'بيـان طلبـية (B.C)'}</h2>
                            <p className="text-sm font-bold text-gray-600 mb-1">رقم المستند: <span className="text-gray-900 font-sans" dir="ltr">{invoiceData.docType === 'INVOICE' ? invoiceData.invoiceNumber : invoiceData.orderNumber}</span></p>
                            <p className="text-sm font-bold text-gray-600">التاريخ: <span className="text-gray-900 font-sans">{formatDate(invoiceData.date)}</span></p>
                        </div>
                        <div className="border-r-4 border-blue-600 pr-5 flex-1 w-full order-1 md:order-2">
                            <p className="text-xs font-black text-blue-600 mb-1 uppercase tracking-widest">
                                {invoiceData.type === 'SALE' ? 'موجه إلى العميل:' : 'من المورد:'}
                            </p>
                            <p className="text-xl font-black text-gray-900 leading-tight">{invoiceData.customer?.name || invoiceData.supplier?.name}</p>
                            <div className="mt-2 flex flex-wrap gap-2 text-xs font-bold">
                                {invoiceData.customer && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded uppercase">{invoiceData.customer?.type === 'LOYAL' || invoiceData.customer?.type === 'CONTRACTOR' ? 'مقاول مخلص' : 'عميل عادي'}</span>}
                                {invoiceData.project && <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">مشروع: {invoiceData.project.name}</span>}
                            </div>
                        </div>
                    </div>

                    <table className="w-full text-right border-collapse mb-8">
                        <thead className="bg-gray-900 text-white">
                            <tr>
                                <th className="px-4 py-3 font-bold w-12 text-center rounded-tr-lg">#</th>
                                <th className="px-4 py-3 font-bold">المنتج / الوصف</th>
                                <th className="px-4 py-3 font-bold text-center w-24">الكمية</th>
                                <th className="px-4 py-3 font-bold text-center w-32">السعر الوحدوي</th>
                                <th className="px-4 py-3 font-bold text-left w-36 rounded-tl-lg">المجموع</th>
                            </tr>
                        </thead>
                        <tbody className="text-gray-800">
                            {invoiceData.items.map((item: any, idx: number) => (
                                <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 text-center text-gray-400 font-sans">{idx + 1}</td>
                                    <td className="px-4 py-4 font-bold">{item.product?.name}</td>
                                    <td className="px-4 py-4 text-center font-bold font-sans" dir="ltr">{item.quantity}</td>
                                    <td className="px-4 py-4 text-center font-bold font-sans" dir="ltr">{item.unitPrice.toLocaleString()}</td>
                                    <td className="px-4 py-4 text-left font-black text-gray-900 font-sans" dir="ltr">{(item.quantity * item.unitPrice).toLocaleString()}</td>
                                </tr>
                            ))}
                            {/* Fill empty space */}
                            <tr className="h-20"><td colSpan={5}></td></tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={3} className="pt-6">
                                    <div className="bg-gray-50 border-r-4 border-gray-900 p-4">
                                        <p className="text-xs font-bold text-gray-500 mb-1">المبلغ الإجمالي بالحروف:</p>
                                        <p className="font-black text-gray-900">{tafqeet(invoiceData.totalAmount)}</p>
                                    </div>
                                </td>
                                <td colSpan={2} className="pt-6 pl-0">
                                    <div className="bg-gray-900 text-white p-6 rounded-b-xl flex flex-col items-end shadow-xl">
                                        <span className="text-sm font-bold opacity-70">الإجمالي الصافي (دج)</span>
                                        <span className="text-3xl font-black font-sans leading-none" dir="ltr">{invoiceData.totalAmount.toLocaleString()}</span>
                                    </div>
                                </td>
                            </tr>
                        </tfoot>
                    </table>

                    <div className="grid grid-cols-2 gap-12 mt-20 px-10">
                        <div className="text-center font-bold text-gray-600 border-t-2 border-gray-100 pt-8">
                            <p>توقيع وخـتـم البـائـع</p>
                        </div>
                        <div className="text-center font-bold text-gray-600 border-t-2 border-gray-100 pt-8">
                            <p>توقيع و استـلام المشـتري</p>
                        </div>
                    </div>

                    <style dangerouslySetInnerHTML={{
                        __html: `
              @media print {
                header, .print\\:hidden, aside { display: none !important; }
                main { padding: 0 !important; overflow: visible !important; }
                .p-6, .md\\:p-8 { padding: 0 !important; }
                @page { size: portrait; margin: 0; }
                body { background: white; }
                .bg-gray-100 { background: white !important; }
                .bg-white { box-shadow: none !important; border: none !important; width: 100% !important; max-width: none !important; margin: 0 !important; padding: 15mm !important; }
              }
            `}} />
                </div>
            </div>
        );
    }

    return (
        <div className="font-tajawal min-h-screen bg-gray-50 text-gray-900 p-4 md:p-8 flex flex-col gap-6" dir="rtl">
            <div className="flex items-center gap-3">
                <div className="bg-blue-600 p-2 rounded-lg text-white shadow-lg shadow-blue-200">
                    <ShoppingBag size={24} />
                </div>
                <h1 className="text-2xl font-black text-gray-900">إنشاء طلبية مبيعات ممتازة</h1>
            </div>

            <div className="flex flex-col xxl:flex-row gap-8">

                {/* FORM SIDE */}
                <div className="flex-1 flex flex-col gap-6">

                    {/* Main Settings Panel */}
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="flex items-center gap-2 px-6 py-4 bg-gray-50/50 border-b border-gray-200">
                            <Store size={20} className="text-gray-500" />
                            <h2 className="font-bold text-gray-900 text-lg">معلومات الطلب</h2>
                        </div>
                        <div className="p-6">
                            <div className="flex flex-col md:flex-row gap-8 mb-8 pb-6 border-b border-gray-100">
                                <div className="flex-1">
                                    <label className="block text-sm font-bold text-gray-700 mb-2">نوع الطلب <span className="text-red-500">*</span></label>
                                    <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                                        <button
                                            onClick={() => setOrderType('SALE')}
                                            className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${orderType === 'SALE' ? 'bg-white text-blue-700 shadow border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}
                                        >مبيعات</button>
                                        <button
                                            onClick={() => setOrderType('PURCHASE')}
                                            className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${orderType === 'PURCHASE' ? 'bg-white text-emerald-700 shadow border border-gray-200' : 'text-gray-500 hover:text-gray-900'}`}
                                        >مشتريات</button>
                                    </div>
                                </div>

                                {orderType === 'SALE' && (
                                    <div className="flex-1 animate-in slide-in-from-right duration-300">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">فئة العميل <span className="text-red-500">*</span></label>
                                        <div className="flex bg-gray-100 p-1 rounded-lg border border-gray-200">
                                            <button
                                                onClick={() => setCustomerType('CONTRACTOR')}
                                                className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${customerType === 'CONTRACTOR' ? 'bg-white text-purple-700 shadow border border-gray-200 font-black' : 'text-gray-500 hover:text-gray-900'}`}
                                            >مقاول مخلص</button>
                                            <button
                                                onClick={() => setCustomerType('GUEST')}
                                                className={`flex-1 py-2.5 text-sm font-bold rounded-md transition-all ${customerType === 'GUEST' ? 'bg-white text-gray-900 shadow border border-gray-200 font-black' : 'text-gray-500 hover:text-gray-900'}`}
                                            >عميل عادي</button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {orderType === 'SALE' ? (
                                <div className="space-y-6 animate-in fade-in duration-500">
                                    {customerType === 'CONTRACTOR' ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="relative z-20">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">اختر المقاول <span className="text-red-500">*</span></label>
                                                <SearchableSelect
                                                    options={customers.map(c => ({ id: c.id, label: c.name, subLabel: `رصيد: ${c.balanceDue.toLocaleString()} دج` }))}
                                                    value={customerId}
                                                    onChange={(val) => {
                                                        setCustomerId(val);
                                                        setProjectId('');
                                                    }}
                                                    placeholder="ابحث عن مقاول..."
                                                />
                                            </div>
                                            <div className="relative z-10">
                                                <label className="block text-sm font-bold text-gray-700 mb-2">مشروع محدد <span className="text-gray-400 font-normal text-xs">(اختياري)</span></label>
                                                <SearchableSelect
                                                    options={projects.map(p => ({ id: p.id, label: p.name }))}
                                                    value={projectId}
                                                    onChange={setProjectId}
                                                    placeholder={customerId ? "اختر المشروع..." : "الرجاء اختيار المقاول أولاً"}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">اسم العميل <span className="text-red-500">*</span></label>
                                                <input
                                                    type="text"
                                                    value={guestName}
                                                    onChange={e => setGuestName(e.target.value)}
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    placeholder="مثال: محمد بن علي"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2">رقم الهاتف <span className="text-gray-400 font-normal text-xs">(اختياري)</span></label>
                                                <input
                                                    type="tel"
                                                    value={guestPhone}
                                                    onChange={e => setGuestPhone(e.target.value)}
                                                    className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all font-sans"
                                                    placeholder="05 / 06 / 07 ..."
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="relative z-20">
                                        <label className="block text-sm font-bold text-gray-700 mb-2">المورد <span className="text-red-500">*</span></label>
                                        <SearchableSelect
                                            options={suppliers.map(s => ({ id: s.id, label: s.name, subLabel: `مستحقات: ${s.balanceDue.toLocaleString()} دج` }))}
                                            value={supplierId}
                                            onChange={setSupplierId}
                                            placeholder="ابحث عن مورد..."
                                        />
                                    </div>
                                    <div className="flex items-center justify-center p-4 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-100 mt-7">
                                        <ShoppingCart size={20} className="ml-2" />
                                        <span className="font-bold text-sm">سيتم إضافة المنتجات للمخزون تلقائياً</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {orderType === 'SALE' && customerType === 'CONTRACTOR' && selectedCustomer && (
                        <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm animate-in fade-in zoom-in-95 duration-500">
                            <div className="flex justify-between items-center mb-6 border-b border-gray-50 pb-4">
                                <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
                                    <User className="text-blue-600" size={20} />
                                    لوحة التحكم في الائتمان
                                </h2>
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase
                                    ${creditStatus === 'EXCEEDED' ? 'bg-red-100 text-red-700' :
                                        creditStatus === 'WARNING' ? 'bg-amber-100 text-amber-700' : 'bg-green-100 text-green-700'}`}>
                                    {creditStatus === 'EXCEEDED' ? 'تجاوز الحد!' : creditStatus === 'WARNING' ? 'تنبيه' : 'حالة سليمة'}
                                </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">الرصيد الحالي</p>
                                    <p className="text-xl font-black text-gray-900 font-sans">{selectedCustomer.balanceDue.toLocaleString()} دج</p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">الائتمان المتاح</p>
                                    <p className="text-xl font-black text-blue-600 font-sans">
                                        {selectedCustomer.creditLimit ? (selectedCustomer.creditLimit - selectedCustomer.balanceDue).toLocaleString() : '---'} دج
                                    </p>
                                </div>

                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase mb-1">النسبة المستخدمة</p>
                                    <div className="flex items-center gap-3 mt-1">
                                        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full transition-all duration-1000 ${creditStatus === 'EXCEEDED' ? 'bg-red-500' : creditStatus === 'WARNING' ? 'bg-amber-500' : 'bg-blue-500'}`}
                                                style={{ width: `${Math.min(100, (selectedCustomer.balanceDue / (selectedCustomer.creditLimit || 1)) * 100)}%` }}
                                            ></div>
                                        </div>
                                        <span className="text-xs font-black font-sans">{Math.round((selectedCustomer.balanceDue / (selectedCustomer.creditLimit || 1)) * 100)}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Debt Preview */}
                            <div className="mt-6 p-4 bg-blue-50/50 rounded-xl border border-blue-100 flex flex-col sm:flex-row justify-between items-center gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-600 p-2 rounded-lg text-white"><CreditCard size={16} /></div>
                                    <div>
                                        <p className="text-[10px] font-black text-blue-800 uppercase">الدين المتوقع بعد الطلب</p>
                                        <p className="text-lg font-black text-blue-900 font-sans">{projectedDebt.toLocaleString()} دج</p>
                                    </div>
                                </div>
                                {selectedCustomer.creditLimit && (
                                    <div className="text-left">
                                        <p className="text-[10px] font-black text-blue-800 uppercase">الائتمان المتبقي</p>
                                        <p className={`text-lg font-black font-sans ${projectedDebt > selectedCustomer.creditLimit ? 'text-red-600' : 'text-blue-900'}`}>
                                            {(selectedCustomer.creditLimit - projectedDebt).toLocaleString()} دج
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-50 pb-4">
                            <Plus className="text-blue-600" size={20} />
                            قائمة المنتجات
                        </h2>
                        <div className="overflow-x-auto">
                            {/* Order Lines Table */}
                            <table className="w-full text-sm text-right">
                                <thead className="text-gray-500 bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="py-3 px-4 font-semibold w-[45%]">المنتج <span className="text-red-500">*</span></th>
                                        <th className="py-3 px-4 font-semibold w-[20%]">الكمية <span className="text-red-500">*</span></th>
                                        <th className="py-3 px-4 font-semibold w-[20%]">سعر {orderType === 'SALE' ? 'البيع' : 'الشراء'} <span className="text-red-500">*</span></th>
                                        <th className="py-3 px-4 font-semibold text-left w-[15%]">المجموع</th>
                                        <th className="py-3 px-4 w-10"></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {lines.map((line) => {
                                        const p = products.find(prod => prod.id === line.productId);
                                        const showPriceWarn = orderType === 'SALE' && p && line.unitPrice < p.purchasePrice;
                                        const showQtyWarn = orderType === 'SALE' && p && line.quantity > p.quantity;

                                        return (
                                            <React.Fragment key={line.id}>
                                                <tr className="hover:bg-gray-50 transition-colors">
                                                    <td className="py-3 px-4">
                                                        <div className="relative">
                                                            <SearchableSelect
                                                                options={products.map(pr => ({
                                                                    id: pr.id,
                                                                    label: `${pr.name} - (${pr.quantity} متوفر)`,
                                                                    subLabel: orderType === 'SALE' ? `شراء: ${pr.purchasePrice} | بيع: ${pr.sellPrice}` : `المورد: ${pr.supplierId ? 'محدد' : 'غير محدد'}`
                                                                }))}
                                                                value={line.productId}
                                                                onChange={(val) => {
                                                                    const prod = products.find(p => p.id === val);
                                                                    updateLine(line.id, 'productId', val);
                                                                    if (prod) updateLine(line.id, 'unitPrice', orderType === 'SALE' ? prod.sellPrice : prod.purchasePrice);
                                                                }}
                                                                onSelect={(opt) => {
                                                                    const prod = products.find(p => p.id === opt.id);
                                                                    if (prod) updateLine(line.id, 'product', prod);
                                                                }}
                                                                placeholder="اختر المنتج..."
                                                            />
                                                            {showQtyWarn && <div className="absolute top-12 right-0 text-red-500 text-[10px] font-bold mt-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded shadow-sm z-50 whitespace-nowrap">الكمية غير كافية</div>}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 align-top pt-5">
                                                        <input
                                                            type="number"
                                                            min="1"
                                                            className={`w-full p-2 border rounded-md focus:ring-2 outline-none transition-colors font-sans ${showQtyWarn ? 'border-red-400 bg-red-50 focus:ring-red-500/50' : 'border-gray-300 focus:ring-blue-500/50'}`}
                                                            value={line.quantity || ''}
                                                            onChange={e => updateLine(line.id, 'quantity', parseInt(e.target.value) || 0)}
                                                        />
                                                    </td>
                                                    <td className="py-3 px-4 align-top pt-5">
                                                        <div className="relative">
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                className={`w-full p-2 border rounded-md focus:ring-2 outline-none transition-colors font-sans ${showPriceWarn ? 'border-red-400 bg-red-50 focus:ring-red-500/50 text-red-700' : 'border-gray-300 focus:ring-blue-500/50'}`}
                                                                value={line.unitPrice || ''}
                                                                onChange={e => updateLine(line.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                                                            />
                                                            {showPriceWarn && <div className="absolute top-10 right-0 text-red-500 text-[10px] font-bold mt-1 bg-red-50 border border-red-200 px-2 py-0.5 rounded shadow-sm z-50 whitespace-nowrap">السعر أقل من التكلفة</div>}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-left font-bold text-gray-900 font-sans" dir="ltr">
                                                        {(line.quantity * line.unitPrice).toLocaleString()}
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        <button onClick={() => removeLine(line.id)} className="text-gray-300 hover:text-red-500 transition-colors p-2">
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </td>
                                                </tr>
                                                {orderType === 'PURCHASE' && line.productId !== '' && line.product?.hasExpiryDate !== false && (
                                                    <tr key={`${line.id}-batch`} className="bg-gray-50/50">
                                                        <td colSpan={5} className="px-4 py-3 border-b border-gray-100">
                                                            <div className="flex flex-wrap items-center gap-6">
                                                                <div className="flex items-center gap-2 bg-blue-100/50 px-3 py-1.5 rounded-lg border border-blue-200">
                                                                    <Calendar size={14} className="text-blue-600" />
                                                                    <span className="text-xs font-bold text-blue-800 tracking-tight">إضافة بيانات الصلاحية لهذه الدفعة:</span>
                                                                </div>

                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500">تاريخ الانتهاء:</span>
                                                                    <input
                                                                        type="date"
                                                                        className="bg-white border border-gray-200 rounded px-2 py-1 text-xs font-sans font-bold"
                                                                        value={line.expiryDate || ''}
                                                                        onChange={e => updateLine(line.id, 'expiryDate', e.target.value)}
                                                                        required
                                                                    />
                                                                </div>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-xs text-gray-500">تاريخ الصنع:</span>
                                                                    <input
                                                                        type="date"
                                                                        className="bg-white border border-gray-200 rounded px-2 py-1 text-xs font-sans"
                                                                        value={line.manufactureDate || ''}
                                                                        onChange={e => updateLine(line.id, 'manufactureDate', e.target.value)}
                                                                    />
                                                                </div>
                                                                <div className="bg-blue-50 px-3 py-1 rounded-full text-[10px] font-bold text-blue-600 border border-blue-100 italic">
                                                                    سيتم إنشاء رقم دفعة (FIFO) تلقائياً
                                                                </div>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                )}
                                            </React.Fragment>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <button
                            onClick={addLine}
                            className="mt-6 w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex items-center justify-center gap-2 text-gray-400 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-all font-black"
                        >
                            <Plus size={20} /> إضافة بند جديد
                        </button>
                    </div >

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
                        <h2 className="text-lg font-black text-gray-900 mb-6 flex items-center gap-2 border-b border-gray-50 pb-4">
                            <CreditCard className="text-blue-600" size={20} />
                            خيارات الدفع والتحصيل
                        </h2>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-3">طريقة الدفع لهذا الطلب</label>
                                <div className="grid grid-cols-3 gap-3">
                                    <button
                                        onClick={() => { setPaymentMode('FULL'); setInitialPayment(grandTotal); }}
                                        className={`py-3 rounded-xl text-xs font-black border transition-all ${paymentMode === 'FULL' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-300'}`}
                                    >دفع كامل</button>
                                    <button
                                        onClick={() => setPaymentMode('PARTIAL')}
                                        className={`py-3 rounded-xl text-xs font-black border transition-all ${paymentMode === 'PARTIAL' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-300'}`}
                                    >دفع جزئي</button>
                                    <button
                                        onClick={() => { setPaymentMode('NONE'); setInitialPayment(0); }}
                                        className={`py-3 rounded-xl text-xs font-black border transition-all ${paymentMode === 'NONE' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-blue-300'}`}
                                    >على الحساب (دين)</button>
                                </div>
                            </div>

                            {(paymentMode === 'FULL' || paymentMode === 'PARTIAL') && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-gray-50 rounded-xl border border-gray-100 animate-in slide-in-from-top-4 duration-300">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">المبلغ المدفوع (دج)</label>
                                        <input
                                            type="number"
                                            value={initialPayment || ''}
                                            onChange={e => setInitialPayment(Math.min(grandTotal, parseFloat(e.target.value) || 0))}
                                            readOnly={paymentMode === 'FULL'}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 font-sans font-black focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2">وسيلة الدفع</label>
                                        <select
                                            value={paymentMethod}
                                            onChange={e => setPaymentMethod(e.target.value as any)}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                                        >
                                            <option value="CASH">نقداً (Cash)</option>
                                            <option value="BANK_TRANSFER">تحويل بنكي</option>
                                            <option value="CHEQUE">شيك بنكي</option>
                                        </select>
                                    </div>
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-gray-700 mb-2">تاريخ الاستحقاق (اختياري)</label>
                                <input
                                    type="date"
                                    value={dueDate}
                                    onChange={e => setDueDate(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-sm font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-6 rounded-2xl border border-gray-200 shadow-sm mb-12">
                        <h2 className="text-sm font-black text-gray-400 mb-4 flex items-center gap-2">
                            <FileText size={16} /> ملاحظات مكتبية
                        </h2>
                        <textarea
                            value={notes} onChange={e => setNotes(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-100 rounded-xl p-4 text-sm font-bold placeholder:text-gray-300 focus:bg-white focus:shadow-xl transition-all outline-none"
                            placeholder="تاريخ التوصيل، معلومات الدفع، إلخ..."
                            rows={3}
                        />
                    </div>
                </div >

                {/* SUMMARY SIDE */}
                < div className="lg:w-[400px]" >
                    <div className="sticky top-8 flex flex-col gap-6">
                        <div className="bg-gray-900 text-white p-8 rounded-[2rem] shadow-2xl relative overflow-hidden">
                            <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl"></div>

                            <div className="relative z-10">
                                <p className="text-xs font-black opacity-40 tracking-widest uppercase mb-8">ملخص الحساب الإجمالي</p>

                                <div className="flex flex-col gap-4 mb-10">
                                    <div className="flex justify-between items-center opacity-60 text-sm">
                                        <span>المجموع الفرعي</span>
                                        <span className="font-sans" dir="ltr">{grandTotal.toLocaleString()} دج</span>
                                    </div>
                                    <div className="flex justify-between items-end border-t border-white/10 pt-6">
                                        <span className="text-lg font-black">المبلغ الكلي</span>
                                        <span className="text-4xl font-black font-sans leading-none" dir="ltr">{grandTotal.toLocaleString()}</span>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    <p className="text-[10px] font-black opacity-30 uppercase tracking-widest text-center">نوع المستند</p>
                                    <div className="grid grid-cols-2 gap-2 bg-white/5 p-1.5 rounded-2xl">
                                        <button
                                            onClick={() => setDocType('INVOICE')}
                                            className={`py-3 rounded-xl text-xs font-black transition-all ${docType === 'INVOICE' ? 'bg-white text-gray-900 shadow-xl' : 'text-white/40 hover:text-white'}`}
                                        >فـاتـورة</button>
                                        <button
                                            onClick={() => setDocType('BON')}
                                            className={`py-3 rounded-xl text-xs font-black transition-all ${docType === 'BON' ? 'bg-white text-gray-900 shadow-xl' : 'text-white/40 hover:text-white'}`}
                                        >Bond (B.C)</button>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSaveOrder}
                                    disabled={!isValidForm || loading}
                                    className="w-full mt-10 bg-blue-500 hover:bg-blue-400 disabled:opacity-20 text-white h-16 rounded-[1.2rem] font-black text-lg transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3"
                                >
                                    {loading ? 'جاري الحفظ...' : <><CheckCircle size={24} /> تأكيد المبيعات</>}
                                </button>
                            </div>
                        </div>

                        {creditStatus === 'EXCEEDED' && (
                            <div className="bg-red-500 p-6 rounded-2xl text-white flex items-start gap-3 shadow-xl shadow-red-500/20 animate-bounce">
                                <AlertTriangle className="shrink-0" size={24} />
                                <div className="flex flex-col gap-1">
                                    <p className="text-sm font-black">تجاوز الائتمان المسموح!</p>
                                    <p className="text-xs font-bold opacity-80 leading-relaxed">هذا العميل تخطى السقف المادي المخصص له. المتابعة قد تتطلب دفع نقدي فوري.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div >
            </div >
        </div >
    );
}
