'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    ChevronRight, Building2, User, AlertTriangle, Briefcase,
    ShoppingCart, FileText, Plus, ChevronDown, ChevronUp,
    CreditCard, History, Clock, ArrowDownLeft, CheckCircle,
    Calendar, Phone, MapPin, MoreVertical, ExternalLink, X,
    Printer, Activity, RotateCcw, Package, Info, Eye, ShoppingBag, Edit,
    Banknote, ArrowUpRight, AlertCircle, Check, Mail, BarChart3, Star, Power,
    Filter, ArrowDownAZ, SortDesc, Search, Download, FileSpreadsheet, Users
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { ALGERIA_LOCATIONS } from '@/lib/constants/algeria-locations';
import { numberToFrenchWords } from '@/lib/number-to-french-words';
import { printDocument } from '@/lib/print-helper';
import { InvoicesTable, StatusBadge } from '@/components/InvoicesTable';


export default function CustomerDetailPage() {
    const { id } = useParams();
    const router = useRouter();

    const [customer, setCustomer] = useState<any>(null);
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'PROJECTS' | 'ORDERS' | 'PRODUCTS' | 'SOA'>('PROJECTS');

    // Modals
    const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);
    const [showPaymentModal, setShowPaymentModal] = useState<any | null>(null);
    const [showHistoryModal, setShowHistoryModal] = useState<any | null>(null);
    const [showReturnsModal, setShowReturnsModal] = useState<any | null>(null);
    
    // Payment Form (Exact from Invoices page)
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
    const [chequeNumber, setChequeNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);
    const [projectData, setProjectData] = useState({ name: '', description: '', address: '', startDate: '' });

    const [expandedProjects, setExpandedProjects] = useState<number[]>([]);
    
    // SOA Filters
    const [soaSearchQuery, setSoaSearchQuery] = useState('');
    const [soaMotifFilter, setSoaMotifFilter] = useState('ALL');
    const [soaMethodFilter, setSoaMethodFilter] = useState('ALL');
    const [soaDateFrom, setSoaDateFrom] = useState('');
    const [soaDateTo, setSoaDateTo] = useState('');
    const [soaProjectFilter, setSoaProjectFilter] = useState('ALL');

    // New states for returns and expanded orders
    const [expandedOrder, setExpandedOrder] = useState<number | null>(null);
    const [returnModal, setReturnModal] = useState<{ item: any; maxQty: number } | null>(null);
    const [returnQty, setReturnQty] = useState(1);
    const [isReturning, setIsReturning] = useState(false);

    const [soaRange, setSoaRange] = useState({ start: '', end: new Date().toISOString().split('T')[0] });
    const [isSOAFiltering, setIsSOAFiltering] = useState(false);

    // Edit Modal states
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editData, setEditData] = useState<any>({});
    const [touched, setTouched] = useState<Record<string, boolean>>({});
    const [focusedField, setFocusedField] = useState<string | null>(null);

    const [projectTouched, setProjectTouched] = useState<Record<string, boolean>>({});
    const [selectedProjectForOrders, setSelectedProjectForOrders] = useState<any>(null);
    const [isExportDropdownOpen, setIsExportDropdownOpen] = useState(false);

    // Project Filters/Sort
    const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ALL');
    const [projectFinanceFilter, setProjectFinanceFilter] = useState<'ALL' | 'PAID' | 'DEBT' | 'SURPLUS'>('ALL');
    const [projectSortBy, setProjectSortBy] = useState<'RECENT' | 'OLD' | 'ALPHA' | 'ORDERS' | 'PURCHASES'>('RECENT');

    const exportProjectOrdersCSV = () => {
    };

    const handleEditKeyDown = (e: React.KeyboardEvent) => {
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

    const setFieldTouched = (field: string) => {
        setTouched(prev => ({ ...prev, [field]: true }));
    };

    const setProjectFieldTouched = (field: string) => {
        setProjectTouched(prev => ({ ...prev, [field]: true }));
    };

    // --- Invoice Modal States (from Invoices Page) ---





    const projectValidations = {
        name: (() => {
            const words = (projectData.name || '').trim().split(/\s+/).filter((w: string) => w.length > 0);
            return words.length >= 2;
        })(),
        address: (() => {
            const words = (projectData.address || '').trim().split(/\s+/).filter((w: string) => w.length > 0);
            return words.length >= 3;
        })(),
        description: (projectData.description || '').trim().length > 0,
        startDate: !!projectData.startDate && new Date(projectData.startDate) <= new Date()
    };

    const validateNIF = (nif: string) => {
        if (!nif) return null;
        if (!/^\d+$/.test(nif)) return { valid: false, error: "يجب أن يحتوي على أرقام فقط بدون مسافات" };
        if (nif.length !== 15 && nif.length !== 20) return { valid: false, error: "يجب أن يكون 15 أو 20 رقماً بالضبط" };
        const cat = parseInt(nif[0]);
        if (cat > 8) return { valid: false, error: "رقم الفئة (أول رقم) يجب أن يكون بين 0 و 8" };
        const wilCode = parseInt(nif.substring(4, 6));
        if (wilCode < 1 || wilCode > 58) return { valid: false, error: `كود الولاية (${nif.substring(4, 6)}) غير صحيح (01-58)` };
        return { valid: true, breakdown: "صحيح" };
    };

    const validateNIS = (nis: string) => {
        if (!nis) return null;
        if (!/^\d+$/.test(nis)) return { valid: false, error: "يجب أن يحتوي على أرقام فقط بدون مسافات" };
        if (nis.length !== 15 && nis.length !== 18) return { valid: false, error: "يجب أن يكون 15 أو 18 رقماً بالضبط" };
        if (nis.substring(1, 4) === "000") return { valid: false, error: "سنة التأسيس (الخانة 2-4) لا يمكن أن تكون 000" };
        return { valid: true, breakdown: "صحيح" };
    };

    const validateRC = (rc: string) => {
        if (!rc) return null;
        const match1 = rc.match(/^(\d{2})\/(\d{2})-(\d{7})(?:\s([AB]))?$/i);
        if (match1) {
            const wilCode = parseInt(match1[1]);
            if (wilCode < 1 || wilCode > 58) return { valid: false, error: `كود الولاية (${match1[1]}) غير صحيح (01-58)` };
            return { valid: true, breakdown: "صحيح" };
        }
        const match2 = rc.match(/^(\d{2})\s?([AB])\s?(\d{7})(?:-(\d{2}))?$/i);
        if (match2) {
            const wilaya = match2[4];
            if (wilaya) {
                const wilCode = parseInt(wilaya);
                if (wilCode < 1 || wilCode > 58) return { valid: false, error: `كود الولاية (${wilaya}) غير صحيح (01-58)` };
            }
            return { valid: true, breakdown: "صحيح" };
        }
        return { valid: false, error: "الصيغة غير صحيحة. أمثلة: 16/24-0012345 B أو 24 B 0012345-16" };
    };

    const validateAI = (ai: string) => {
        if (!ai) return null;
        const cleanAI = ai.replace(/\s/g, '');
        if (!/^\d{11}$/.test(cleanAI)) return { valid: false, error: "رقم المادة يجب أن يتكون من 11 رقماً بالضبط" };
        const wilCode = parseInt(cleanAI.substring(0, 2));
        if (wilCode < 1 || wilCode > 58) return { valid: false, error: `كود الولاية (${cleanAI.substring(0, 2)}) غير صحيح (01-58)` };
        return { valid: true, breakdown: "صحيح" };
    };

    const nifInfo = useMemo(() => validateNIF(editData.nif || ''), [editData.nif]);
    const nisInfo = useMemo(() => validateNIS(editData.nis || ''), [editData.nis]);
    const rcInfo = useMemo(() => validateRC(editData.rc || ''), [editData.rc]);
    const aiInfo = useMemo(() => validateAI(editData.ai || ''), [editData.ai]);

    const editValidations = useMemo(() => ({
        name: (() => {
            const words = (editData.name || '').trim().split(/\s+/).filter(w => w.length > 0);
            return words.length >= 2;
        })(),
        phone: /^(05|06|07|02)\d{8}$/.test(editData.phone || ''),
        commune: (editData.commune || '').length > 0,
        wilaya: (editData.wilaya || '').length > 0,
        email: !editData.email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editData.email),
        creditLimit: editData.type !== 'LOYAL' || (parseFloat(String(editData.creditLimit)) >= 0),
        rc: rcInfo === null || rcInfo.valid,
        nif: nifInfo === null || nifInfo.valid,
        ai: aiInfo === null || aiInfo.valid,
        nis: nisInfo === null || nisInfo.valid
    }), [editData, rcInfo, nifInfo, aiInfo, nisInfo]);

    const isEditValid = useMemo(() => {
        if (!editValidations) return false;
        return Object.values(editValidations).every(v => v === true);
    }, [editValidations]);

    const fetchCustomer = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/customers/${id}`);
            if (res.ok) {
                const data = await res.json();
                setCustomer(data);
            }
            const payRes = await fetch(`/api/payments/customer/${id}`);
            if (payRes.ok) {
                const payData = await payRes.json();
                setPayments(payData);
            }
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        if (id) fetchCustomer();
    }, [id]);

    useEffect(() => {
        if (customer) {
            setSoaRange((prev: any) => ({ ...prev, start: new Date(customer.createdAt).toISOString().split('T')[0] }));
        }
    }, [customer]);

    const fetchPaymentHistory = async (invoiceId: number) => {
        try {
            const res = await fetch(`/api/invoices/${invoiceId}/payments`);
            if (res.ok) {
                const data = await res.json();
                setShowHistoryModal((prev: any) => prev ? { ...prev, payments: data } : null);
            }
        } catch (e) {
            console.error(e);
        }
    };

    const fetchReturnsHistory = async (orderNumber: string) => {
        try {
            const res = await fetch(`/api/orders?type=RETURN_SALE`);
            if (res.ok) {
                const allReturns = await res.json();
                const relevantReturns = allReturns.filter((r: any) => r.orderNumber.includes(orderNumber));
                setShowReturnsModal((prev: any) => prev ? { ...prev, returns: relevantReturns } : null);
            }
        } catch (e) {
            console.error(e);
        }
    };


    const handleRefundExcess = async (inv: any) => {
        if (!confirm(`هل أنت متأكد من إرجاع مبلغ ${Math.abs(inv.remaining).toLocaleString()} دج للزبون نقداً؟ سيتم تصفير الرصيد.`)) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: inv.id,
                    customerId: parseInt(id as string),
                    amount: inv.remaining,
                    paymentMethod: 'CASH',
                    notes: 'إرجاع فائض المرتجعات للزبون نقداً'
                })
            });

            if (res.ok) {
                alert('تم إرجاع المبلغ الزائد وتصفير الحساب بنجاح');
                await fetchCustomer();
                if (showHistoryModal && showHistoryModal.id === inv.id) {
                    fetchPaymentHistory(inv.id);
                }
            } else {
                const err = await res.json();
                alert(err.error || 'فشلت عملية الإرجاع');
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRecordPayment = async () => {
        if (!showPaymentModal || paymentAmount <= 0) return;

        setIsSubmitting(true);
        try {
            const isGlobal = showPaymentModal.isGlobal;
            const url = isGlobal ? `/api/customers/${id}/pay` : '/api/payments';
            
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...(isGlobal ? {} : { invoiceId: showPaymentModal.id }),
                    ...(showPaymentModal.projectId ? { projectId: showPaymentModal.projectId } : {}),
                    customerId: parseInt(id as string),
                    amount: paymentAmount,
                    paymentMethod,
                    chequeNumber: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? chequeNumber : null,
                    bankName: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? bankName : null,
                    notes: paymentNotes
                })
            });

            if (res.ok) {
                await fetchCustomer();
                setShowPaymentModal(null);
                setPaymentAmount(0);
                setPaymentNotes('');
                setChequeNumber('');
                setBankName('');
                if (showHistoryModal && showHistoryModal.id === showPaymentModal.id) {
                    fetchPaymentHistory(showPaymentModal.id);
                }
            } else {
                const err = await res.json();
                alert(err.error || 'فشل تسجيل الدفع');
            }
        } catch (e) {
            alert('خطأ في الاتصال بالخادم');
        } finally {
            setIsSubmitting(false);
        }
    };


    const handleCreateProject = async () => {

        if (!projectValidations.name) { setProjectTouched({ name: true }); return; }
        try {
            const res = await fetch(`/api/customers/${id}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            if (res.ok) {
                setIsProjectSheetOpen(false);
                fetchCustomer();
                setProjectData({ name: '', description: '', address: '', startDate: '' });
                setProjectTouched({});
            } else { alert('فشل إنشاء المشروع'); }
        } catch (e) { alert('خطأ'); }
    };

    const toggleProjectStatus = async (projectId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'ACTIVE' ? 'DISABLED' : 'ACTIVE';
        try {
            const res = await fetch(`/api/projects/${projectId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (res.ok) {
                fetchCustomer();
            } else {
                alert('فشل في تغيير حالة المشروع');
            }
        } catch (e) {
            alert('خطأ في الاتصال');
        }
    };

    const handleEditCustomer = async () => {
        if (!isEditValid) return;
        setIsSubmitting(true);
        try {
            // Only send the fields that exist in the database model
            const payload = {
                name: editData.name,
                activity: editData.activity,
                type: editData.type,
                phone: editData.phone,
                email: editData.email,
                rc: editData.rc,
                nif: editData.nif,
                ai: editData.ai,
                nis: editData.nis,
                address: editData.address,
                commune: editData.commune,
                wilaya: editData.wilaya,
                postalCode: editData.postalCode,
                creditLimit: parseFloat(String(editData.creditLimit)) || 0
            };

            const res = await fetch(`/api/customers/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                setIsEditModalOpen(false);
                fetchCustomer();
                // Optional: show success toast/alert
            } else { 
                const err = await res.json();
                alert(err.error || 'فشل تحديث البيانات. يرجى التحقق من صحة المعلومات (رقم الهاتف أو السجل التجاري قد يكون مسجلاً مسبقاً)'); 
            }
        } catch (e) { 
            console.error(e);
            alert('خطأ في الاتصال بالخادم'); 
        }
        finally { setIsSubmitting(false); }
    };

    const handleReturn = async () => {
        if (!returnModal) return;
        setIsReturning(true);
        try {
            const res = await fetch(`/api/customers/${id}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderItemId: returnModal.item.id, quantity: returnQty })
            });
            const data = await res.json();
            if (res.ok) {
                setReturnModal(null);
                fetchCustomer();
                alert(`✅ تم الإرجاع بنجاح. تم تخفيض رصيد العميل بـ ${data.returnValue?.toLocaleString()} دج`);
            } else { alert(`❌ ${data.error}`); }
        } catch { alert('خطأ في الاتصال'); }
        finally { setIsReturning(false); }
    };


    const filteredOrders = useMemo(() => {
        if (!customer?.orders) return [];
        if (!isSOAFiltering) return customer.orders;
        const start = new Date(soaRange.start);
        const end = new Date(soaRange.end);
        end.setHours(23, 59, 59, 999);
        return customer.orders.filter((o: any) => {
            const d = new Date(o.orderDate);
            return d >= start && d <= end;
        });
    }, [customer?.orders, isSOAFiltering, soaRange]);

    const filteredPayments = useMemo(() => {
        if (!payments) return [];
        if (!isSOAFiltering) return payments;
        const start = new Date(soaRange.start);
        const end = new Date(soaRange.end);
        end.setHours(23, 59, 59, 999);
        return payments.filter((p: any) => {
            const d = new Date(p.paymentDate);
            return d >= start && d <= end;
        });
    }, [payments, isSOAFiltering, soaRange]);

    const topProducts = useMemo(() => {
        if (!customer || !customer.orders) return [];
        const counts: Record<string, { name: string, qty: number, total: number, firstDate: Date, lastDate: Date }> = {};
        (customer.orders || []).forEach((o: any) => {
            if (o.type === 'RETURN_SALE' || o.type === 'RETURN_PURCHASE') return;
            const orderDate = new Date(o.orderDate);
            (o.items || []).forEach((item: any) => {
                const pid = item.product?.id || 'unknown';
                if (!counts[pid]) {
                    counts[pid] = { 
                        name: item.product?.name || 'منتج غير معروف', 
                        qty: 0, 
                        total: 0,
                        firstDate: orderDate,
                        lastDate: orderDate
                    };
                }
                counts[pid].qty += item.quantity;
                counts[pid].total += (item.quantity * (item.unitPrice || 0));
                
                if (orderDate < counts[pid].firstDate) counts[pid].firstDate = orderDate;
                if (orderDate > counts[pid].lastDate) counts[pid].lastDate = orderDate;
            });
        });
        return Object.values(counts).sort((a, b) => b.total - a.total).slice(0, 6);
    }, [customer]);

    const filteredAndSortedProjects = useMemo(() => {
        if (!customer?.projects) return [];
        
        let result = [...customer.projects];

        // 1. Status Filter
        if (projectStatusFilter !== 'ALL') {
            result = result.filter(p => p.status === projectStatusFilter);
        }

        // 2. Finance Filter
        if (projectFinanceFilter !== 'ALL') {
            result = result.filter(p => {
                const projectOrders = (customer.orders || []).filter((o: any) => 
                    o.projectId === p.id && 
                    o.type !== 'RETURN_SALE' && 
                    o.type !== 'RETURN_PURCHASE'
                );
                const balance = projectOrders.reduce((sum: number, o: any) => {
                    const netTotal = o.grandTotal || o.total || 0;
                    const paid = o.invoice?.paid || 0;
                    return sum + (netTotal - paid);
                }, 0);

                if (projectFinanceFilter === 'DEBT') return balance > 0.01;
                if (projectFinanceFilter === 'SURPLUS') return balance < -0.01;
                if (projectFinanceFilter === 'PAID') return Math.abs(balance) <= 0.01 && projectOrders.length > 0;
                return true;
            });
        }

        // 3. Sorting
        result.sort((a, b) => {
            if (projectSortBy === 'ALPHA') return a.name.localeCompare(b.name);
            if (projectSortBy === 'RECENT') return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
            if (projectSortBy === 'OLD') return new Date(a.startDate).getTime() - new Date(b.startDate).getTime();
            
            if (projectSortBy === 'ORDERS') {
                const countA = (customer.orders || []).filter((o: any) => o.projectId === a.id).length;
                const countB = (customer.orders || []).filter((o: any) => o.projectId === b.id).length;
                return countB - countA;
            }
            
            if (projectSortBy === 'PURCHASES') {
                const totalA = (customer.orders || []).filter((o: any) => o.projectId === a.id).reduce((s: number, o: any) => s + (o.grandTotal || o.total || 0), 0);
                const totalB = (customer.orders || []).filter((o: any) => o.projectId === b.id).reduce((s: number, o: any) => s + (o.grandTotal || o.total || 0), 0);
                return totalB - totalA;
            }
            
            return 0;
        });

        return result;
    }, [customer, projectStatusFilter, projectFinanceFilter, projectSortBy]);

    const isDateRangeValid = useMemo(() => {
        if (!customer || !soaRange.start || !soaRange.end) return false;
        const start = new Date(soaRange.start);
        const end = new Date(soaRange.end);
        const today = new Date();
        return start <= end && end <= today;
    }, [soaRange, customer]);

    if (loading) {
        return (
            <div className="flex-1 flex flex-col justify-center items-center h-screen bg-gray-50 gap-4" dir="rtl">
                <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="font-black text-gray-400">جاري تحميل بيانات العميل...</p>
            </div>
        );
    }

    if (!customer) return <div className="p-8 text-center text-red-500 font-black" dir="rtl">لم يتم العثور على العميل</div>;

    const isLoyal = customer.type === 'LOYAL';
    const overCredit = isLoyal && customer.creditLimit && customer.balanceDue >= customer.creditLimit;
    const hasActiveProject = (customer.projects || []).some((p: any) => p.status === 'ACTIVE');

    const getAvatarStyle = (id: number) => {
        const gradients = [
            'from-blue-600 to-indigo-700',
            'from-emerald-500 to-teal-700',
            'from-violet-600 to-purple-800',
            'from-rose-500 to-red-700',
            'from-amber-500 to-orange-700',
            'from-cyan-500 to-blue-700',
            'from-fuchsia-600 to-pink-800',
            'from-slate-700 to-slate-900',
            'from-lime-500 to-green-700',
            'from-sky-500 to-indigo-600'
        ];
        const index = id % gradients.length;
        return gradients[index];
    };

    return (
        <div className="font-tajawal min-h-screen bg-white text-gray-900 p-4 md:p-8 flex flex-col gap-8 print:bg-white print:p-0" dir="rtl">
            <style jsx global>{`
                @media print {
                    body * { visibility: hidden; }
                    .print-area, .print-area * { visibility: visible; }
                    .print-area { position: absolute; left: 0; top: 0; width: 100%; margin: 0; padding: 20px; }
                    .no-print { display: none !important; }
                }
                @keyframes shimmer {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(100%); }
                }
                .animate-shimmer {
                    animation: shimmer 2s infinite linear;
                }
            `}</style>

            <div className="print-area w-full h-full">
                {/* Breadcrumb & Header */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 no-print mb-6">
                    <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2 text-xs font-black text-gray-400 uppercase tracking-widest">
                            <Link href="/customers" className="hover:text-blue-600 transition-colors uppercase">قائمة العملاء</Link>
                            <ChevronRight size={14} className="rotate-180" />
                            <span className="text-gray-900">{customer.name}</span>
                        </div>
                    </div>


                </div>

                {/* ===== FULL WIDTH CUSTOMER CARD ===== */}
                {overCredit && (
                    <div className="bg-red-600 text-white p-5 rounded-2xl shadow-xl shadow-red-200 flex items-center gap-5 animate-pulse mb-2">
                        <div className="bg-white/20 p-3 rounded-xl"><AlertTriangle size={28} /></div>
                        <div>
                            <h3 className="text-lg font-black">تجاوز الحد الائتماني!</h3>
                            <p className="font-bold opacity-80 text-sm mt-0.5">يجب على العميل تسديد جزء من ديونه ليتمكن من القيام بعمليات شراء آجلة أخرى.</p>
                        </div>
                    </div>
                )}

                <div className="bg-white rounded-[2rem] border border-gray-200 shadow-xl shadow-gray-100 overflow-hidden">
                    <div className="px-8 py-12 flex flex-col items-center text-center gap-6 bg-emerald-50/40">
                        {/* Name + Activity + Edit Button */}
                        <div className="w-full flex items-center justify-between gap-6 max-w-4xl">
                            <div className="flex-1" /> {/* Spacer */}
                            <div className="flex flex-col items-center gap-2 flex-1">
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{customer.name}</h2>
                                <span className="px-4 py-1.5 bg-white shadow-sm text-gray-600 rounded-full text-[11px] font-black uppercase tracking-wider border border-emerald-100">
                                    {customer.activity || 'شركة خاصة'}
                                </span>
                            </div>
                            <div className="flex-1 flex justify-end">
                                <button 
                                    onClick={() => { 
                                        // Normalize wilaya/commune to match ALGERIA_LOCATIONS exactly
                                        const normalizedData = { ...customer };
                                        if (normalizedData.wilaya) {
                                            // Handle formats like "18 - Jijel" or just "Jijel"
                                            const rawWilayaName = normalizedData.wilaya.includes(' - ') 
                                                ? normalizedData.wilaya.split(' - ')[1].trim() 
                                                : normalizedData.wilaya.trim();

                                            const wMatch = ALGERIA_LOCATIONS.find(l => 
                                                l.name.toLowerCase() === rawWilayaName.toLowerCase() ||
                                                l.id === normalizedData.wilaya.split(' - ')[0].trim()
                                            );

                                            if (wMatch) {
                                                normalizedData.wilaya = wMatch.name;
                                                if (normalizedData.commune) {
                                                    const cMatch = wMatch.communes.find(c => c.name.toLowerCase() === normalizedData.commune?.toLowerCase().trim());
                                                    if (cMatch) {
                                                        normalizedData.commune = cMatch.name;
                                                        normalizedData.postalCode = cMatch.postCode;
                                                    }
                                                }
                                            }
                                        }
                                        setEditData(normalizedData); 
                                        setTouched({}); // Reset touched state when opening
                                        setIsEditModalOpen(true); 
                                    }} 
                                    className="bg-white/60 backdrop-blur-md border border-emerald-200 text-emerald-700 px-5 py-2.5 rounded-xl font-black text-[11px] flex items-center gap-2 shadow-sm hover:bg-white hover:border-emerald-300 transition-all no-print"
                                >
                                    <Edit size={14} /> تعديل البيانات
                                </button>
                            </div>
                        </div>

                        {/* Stats Highlights Centered */}
                        <div className="flex items-center justify-center gap-12 py-6 w-full max-w-2xl">
                            <div className="text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">تاريخ الانضمام</p>
                                <p className="text-sm font-black text-gray-700 font-sans">{new Date(customer.createdAt).toLocaleDateString('ar-DZ', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                            </div>
                            <div className="w-px h-10 bg-emerald-100" />
                            <div className="text-center">
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-1">إجمالي المشتريات</p>
                                <p className="text-sm font-black text-blue-600 font-sans">
                                    {(customer.orders?.reduce((sum: number, o: any) => sum + (o.grandTotal || 0), 0) || 0).toLocaleString()} دج
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="px-8 pb-8 flex flex-col gap-8">


                        {/* Divider */}
                        <div className="border-t border-gray-100" />

                        {/* Sections Row */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">

                            {/* Section 1: Contact */}
                            <div className="flex flex-col gap-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Phone size={11} /> اتصال وتواصل
                                </p>
                                <div className="flex flex-col gap-2">
                                    <div className="flex items-center gap-3 p-3 bg-blue-50/60 rounded-xl border border-blue-100/50">
                                        <Phone size={15} className="text-blue-500 shrink-0" />
                                        <span className="font-black font-sans text-gray-900 text-sm" dir="ltr">{customer.phone || '---'}</span>
                                    </div>
                                    <div className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <MapPin size={15} className="text-gray-500 shrink-0 mt-0.5" />
                                        <div className="flex flex-col gap-0.5">
                                            <p className="font-black text-gray-900 text-sm">{customer.address || '---'}</p>
                                            <p className="text-gray-500 font-bold text-[11px]">{customer.commune} - {customer.wilaya}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">الرمز البريدي:</span>
                                                <span className="font-black font-sans text-emerald-600 text-[11px]">{customer.postalCode || '---'}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                        <Mail size={15} className="text-gray-500 shrink-0" />
                                        <span className="font-black font-sans text-gray-900 text-sm truncate" dir="ltr">{customer.email || '---'}</span>
                                    </div>
                                </div>
                                <div className="border-t border-dashed border-gray-200 mt-2" />
                            </div>

                            {/* Section 2: Legal Documents */}
                            <div className="flex flex-col gap-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <FileText size={11} /> الوثائق القانونية
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'RC', value: customer.rc },
                                        { label: 'NIF', value: customer.nif },
                                        { label: 'AI', value: customer.ai },
                                        { label: 'NIS', value: customer.nis },
                                    ].map(({ label, value }) => (
                                        <div key={label} className="flex flex-col gap-1 p-3 bg-gray-50 rounded-xl border border-gray-100">
                                            <span className="text-[9px] font-black text-gray-400 uppercase">{label}</span>
                                            <span className="font-black font-sans text-gray-900 text-[11px] break-all">{value || '---'}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="border-t border-dashed border-gray-200 mt-2" />
                            </div>

                            {/* Section 3: Credit Analysis */}
                            <div className="flex flex-col gap-3">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <CreditCard size={11} /> تحليل الرصيد والائتمان
                                </p>
                                {(customer.creditLimit || 0) > 0 ? (
                                    <div className="flex flex-col gap-3">
                                        <div className="grid grid-cols-1 gap-2">
                                            {(() => {
                                                const balance = customer.balanceDue || 0;
                                                let bgColor = 'bg-emerald-50 border-emerald-100';
                                                let textColor = 'text-emerald-600';
                                                let labelColor = 'text-emerald-400';

                                                if (balance > 0) {
                                                    bgColor = 'bg-red-50 border-red-100';
                                                    textColor = 'text-red-600';
                                                    labelColor = 'text-red-400';
                                                } else if (balance < 0) {
                                                    bgColor = 'bg-violet-50 border-violet-100';
                                                    textColor = 'text-violet-600';
                                                    labelColor = 'text-violet-400';
                                                }

                                                return (
                                                    <div className={`p-4 ${bgColor} rounded-xl border`}>
                                                        <p className={`text-[9px] font-black ${labelColor} uppercase mb-1 tracking-tighter`}>إجمالي الدين المستحق</p>
                                                        <p className={`text-2xl font-black font-sans ${textColor}`}>
                                                            {Math.abs(balance).toLocaleString()} دج
                                                            {balance < 0 && <span className="text-[10px] mr-2">(رصيد زائد)</span>}
                                                        </p>
                                                    </div>
                                                );
                                            })()}
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">الحد الائتماني</p>
                                                    <p className="text-sm font-black font-sans text-gray-900">{(customer.creditLimit || 0).toLocaleString()} دج</p>
                                                </div>
                                                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase mb-1">المتاح</p>
                                                    <p className="text-sm font-black font-sans text-blue-600">{Math.max(0, (customer.creditLimit || 0) - (customer.balanceDue || 0)).toLocaleString()} دج</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1.5">
                                                <span className="text-[9px] font-black text-gray-400 uppercase">معدل الاستخدام</span>
                                                <span className={`text-[9px] font-black font-sans ${overCredit ? 'text-red-600' : 'text-blue-600'}`}>
                                                    {Math.round(((customer.balanceDue || 0) / customer.creditLimit) * 100)}%
                                                </span>
                                            </div>
                                            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all duration-1000 ease-out ${overCredit ? 'bg-red-500' : 'bg-blue-500'}`}
                                                    style={{ width: `${Math.min(100, ((customer.balanceDue || 0) / customer.creditLimit) * 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                        {customer.balanceDue > 0 && (
                                            <button
                                                onClick={() => {
                                                    setShowPaymentModal({ isGlobal: true, id: -1, invoiceNumber: 'تسديد شامل للرصيد', remaining: customer.balanceDue });
                                                    setPaymentAmount(customer.balanceDue);
                                                }}
                                                className="w-full bg-emerald-50 text-emerald-700 border border-emerald-100 py-2.5 rounded-xl text-xs font-black shadow-sm hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                                            >
                                                <CreditCard size={14} /> تسديد الديون
                                            </button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {(() => {
                                            const balance = customer.balanceDue || 0;
                                            let bgColor = 'bg-emerald-50 border-emerald-100';
                                            let textColor = 'text-emerald-600';
                                            let labelColor = 'text-emerald-400';

                                            if (balance > 0) {
                                                bgColor = 'bg-red-50 border-red-100';
                                                textColor = 'text-red-600';
                                                labelColor = 'text-red-400';
                                            } else if (balance < 0) {
                                                bgColor = 'bg-violet-50 border-violet-100';
                                                textColor = 'text-violet-600';
                                                labelColor = 'text-violet-400';
                                            }

                                            return (
                                                <div className={`p-4 ${bgColor} rounded-xl border`}>
                                                    <p className={`text-[9px] font-black ${labelColor} uppercase mb-1 tracking-tighter`}>إجمالي الدين المستحق</p>
                                                    <p className={`text-2xl font-black font-sans ${textColor}`}>
                                                        {Math.abs(balance).toLocaleString()} دج
                                                        {balance < 0 && <span className="text-[10px] mr-2">(رصيد زائد)</span>}
                                                    </p>
                                                </div>
                                            );
                                        })()}
                                        {customer.balanceDue > 0 && (
                                            <button
                                                onClick={() => {
                                                    setShowPaymentModal({ isGlobal: true, id: -1, invoiceNumber: 'تسديد شامل للرصيد', remaining: customer.balanceDue });
                                                    setPaymentAmount(customer.balanceDue);
                                                }}
                                                className="w-full bg-emerald-50 text-emerald-700 border border-emerald-100 py-2.5 rounded-xl text-xs font-black shadow-sm hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
                                            >
                                                <CreditCard size={14} /> تسديد الديون
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-8 flex flex-col gap-6">
                    <div className="flex gap-2 p-1 bg-white border border-gray-200 rounded-2xl shadow-sm no-print overflow-x-auto">
                        <button onClick={() => setActiveTab('PROJECTS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'PROJECTS' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <Briefcase size={16} /> المشاريع
                        </button>
                        
                        <button onClick={() => setActiveTab('ORDERS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'ORDERS' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <ShoppingCart size={16} /> طلبيات عامة
                            {(() => {
                                const generalOrders = (customer?.orders || []).filter((o: any) => !o.projectId && o.type === 'SALE');
                                if (generalOrders.length > 0) {
                                    return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === 'ORDERS' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-600'}`}>{generalOrders.length}</span>;
                                }
                                return null;
                            })()}
                        </button>
                        
                        <button onClick={() => setActiveTab('PRODUCTS')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'PRODUCTS' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <Star size={16} /> المنتجات الأكثر طلباً
                        </button>
                        
                        <button onClick={() => setActiveTab('SOA')} className={`px-6 py-3 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === 'SOA' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:bg-gray-50'}`}>
                            <Printer size={16} /> كشف الحساب
                        </button>
                    </div>

                    <div className="min-h-[400px]">
                        {activeTab === 'PROJECTS' && (
                            <div className="flex flex-col pb-6 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                {/* Filter & Sort Bar */}
                                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex flex-wrap items-center gap-4 no-print">
                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-100">
                                        <Filter size={14} className="text-gray-400" />
                                        <select 
                                            value={projectStatusFilter} 
                                            onChange={(e: any) => setProjectStatusFilter(e.target.value)}
                                            className="bg-transparent text-[11px] font-black text-gray-700 outline-none cursor-pointer"
                                        >
                                            <option value="ALL">كل الحالات (نشط/معطل)</option>
                                            <option value="ACTIVE">المشاريع النشطة</option>
                                            <option value="DISABLED">المشاريع المعطلة</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-100">
                                        <Activity size={14} className="text-gray-400" />
                                        <select 
                                            value={projectFinanceFilter} 
                                            onChange={(e: any) => setProjectFinanceFilter(e.target.value)}
                                            className="bg-transparent text-[11px] font-black text-gray-700 outline-none cursor-pointer"
                                        >
                                            <option value="ALL">كل الحالات المالية</option>
                                            <option value="DEBT">مشاريع عليها ديون</option>
                                            <option value="PAID">مشاريع مسواة (خالصة)</option>
                                            <option value="SURPLUS">مشاريع فيها رصيد زائد</option>
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-2xl border border-gray-100 mr-auto">
                                        <SortDesc size={14} className="text-gray-400" />
                                        <select 
                                            value={projectSortBy} 
                                            onChange={(e: any) => setProjectSortBy(e.target.value)}
                                            className="bg-transparent text-[11px] font-black text-gray-700 outline-none cursor-pointer"
                                        >
                                            <option value="RECENT">الأحدث (تاريخ البدء)</option>
                                            <option value="OLD">الأقدم (تاريخ البدء)</option>
                                            <option value="ALPHA">أبجدياً (الاسم)</option>
                                            <option value="ORDERS">الأكثر طلباً (عدد الطلبيات)</option>
                                            <option value="PURCHASES">الأكبر قيمة (إجمالي المشتريات)</option>
                                        </select>
                                    </div>
                                    
                                    <div className="text-[10px] font-black text-gray-400 px-4 py-2 border-r border-gray-100">
                                        النتائج: <span className="text-blue-600 font-sans">{filteredAndSortedProjects.length}</span>
                                    </div>
                                </div>

                                {filteredAndSortedProjects.length === 0 ? (
                                    <div className="py-20 text-center bg-white rounded-[2.5rem] border border-gray-100 border-dashed">
                                        <Briefcase size={48} className="mx-auto text-gray-200 mb-4" />
                                        <p className="font-black text-gray-400">لا توجد مشاريع تطابق الفلاتر المختارة</p>
                                    </div>
                                ) : (
                                <div className="bg-white border border-gray-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                                    <table className="w-full text-right border-collapse" dir="rtl">
                                        <thead>
                                            <tr className="bg-gray-50/80 border-b border-gray-100">
                                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest w-16 text-center">#</th>
                                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">المشروع / الموقع</th>
                                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">تاريخ البدء</th>
                                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الطلبيات</th>
                                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">إجمالي المشتريات</th>
                                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">المستحقات</th>
                                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الحالة</th>
                                                <th className="p-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredAndSortedProjects.map((p: any, idx: number) => {
                                                // Filter orders specifically for this project
                                                const projectOrders = (customer.orders || []).filter((o: any) => 
                                                    o.projectId === p.id && 
                                                    o.type !== 'RETURN_SALE' && 
                                                    o.type !== 'RETURN_PURCHASE'
                                                );
                                                
                                                const projectTotalPurchases = projectOrders.reduce((sum: number, o: any) => sum + (o.grandTotal || o.total || 0), 0);
                                                
                                                // Calculate balance: Sum of (Net Total - Paid) for each invoice in this project
                                                const projectBalance = projectOrders.reduce((sum: number, o: any) => {
                                                    const netTotal = o.grandTotal || o.total || 0;
                                                    const paid = o.invoice?.paid || 0;
                                                    return sum + (netTotal - paid);
                                                }, 0);

                                                const hasDebt = projectBalance > 0.01;
                                                const hasSurplus = projectBalance < -0.01;

                                                return (
                                                    <tr key={p.id} className={`hover:bg-blue-50/30 transition-colors group ${p.status === 'DISABLED' ? 'opacity-50' : ''}`}>
                                                        <td className="p-4 text-center">
                                                            <span className="text-[11px] font-black text-gray-300 font-sans">{idx + 1}</span>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className="font-black text-gray-900 group-hover:text-blue-600 transition-colors text-sm">{p.name}</span>
                                                                <div className="flex items-center gap-2">
                                                                    <span className="text-[10px] font-bold text-gray-400 truncate max-w-[150px]" title={p.description}>
                                                                        {p.description || 'بدون وصف'}
                                                                    </span>
                                                                    <span className="text-gray-200">|</span>
                                                                    <div className="flex items-center gap-1 text-[10px] text-gray-400 font-bold">
                                                                        <MapPin size={10} className="text-gray-300" />
                                                                        <span className="truncate max-w-[120px]">{p.address || 'عنوان غير محدد'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className="text-xs font-black text-gray-600 font-sans">
                                                                {new Date(p.startDate).toLocaleDateString('ar-DZ')}
                                                            </span>
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <div className="inline-flex items-center gap-1.5 bg-gray-100 px-2.5 py-1 rounded-lg">
                                                                <span className="text-sm font-black text-gray-900 font-sans">{projectOrders.length}</span>
                                                                <ShoppingCart size={12} className="text-gray-400" />
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex flex-col">
                                                                <span className="text-sm font-black text-gray-900 font-sans">{projectTotalPurchases.toLocaleString()}</span>
                                                                <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">دج</span>
                                                            </div>
                                                        </td>
                                                        <td className="p-4">
                                                            {hasDebt ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-sm font-black text-rose-600 font-sans">+{projectBalance.toLocaleString()} دج</span>
                                                                    <span className="text-[9px] font-black text-rose-400 uppercase tracking-tighter">ديون عالقة</span>
                                                                </div>
                                                            ) : hasSurplus ? (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-sm font-black text-purple-600 font-sans">{projectBalance.toLocaleString()} دج</span>
                                                                    <span className="text-[9px] font-black text-purple-400 uppercase tracking-tighter">رصيد زائد</span>
                                                                </div>
                                                            ) : (
                                                                <div className="flex flex-col gap-0.5">
                                                                    <span className="text-sm font-black text-emerald-600 font-sans">0 دج</span>
                                                                    <span className="text-[9px] font-black text-emerald-400 uppercase tracking-tighter">خالص</span>
                                                                </div>
                                                            )}
                                                        </td>
                                                        <td className="p-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${p.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-100 text-gray-500 border border-gray-200'}`}>
                                                                {p.status === 'ACTIVE' ? 'نشط' : 'معطل'}
                                                            </span>
                                                        </td>
                                                        <td className="p-4">
                                                            <div className="flex items-center justify-center gap-2">
                                                                {hasDebt && (
                                                                    <button 
                                                                        onClick={() => {
                                                                            setShowPaymentModal({
                                                                                isGlobal: true,
                                                                                projectId: p.id,
                                                                                invoiceNumber: `تسديد ديون مشروع: ${p.name}`,
                                                                                remaining: projectBalance
                                                                            });
                                                                            setPaymentAmount(projectBalance);
                                                                        }}
                                                                        className="p-2.5 bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-all shadow-md shadow-rose-100 active:scale-95"
                                                                        title="تسديد ديون هذا المشروع (الأقدم فالأحدث)"
                                                                    >
                                                                        <Banknote size={16} />
                                                                    </button>
                                                                )}
                                                                <button 
                                                                    onClick={() => setSelectedProjectForOrders(p)}
                                                                    className="p-2.5 bg-white border border-gray-200 text-blue-600 rounded-xl hover:bg-blue-50 transition-all shadow-sm active:scale-95"
                                                                    title="عرض سجل الطلبيات"
                                                                >
                                                                    <Info size={16} />
                                                                </button>
                                                                <button 
                                                                    onClick={() => toggleProjectStatus(p.id, p.status)}
                                                                    className={`p-2.5 border border-gray-200 rounded-xl transition-all shadow-sm active:scale-95 ${p.status === 'DISABLED' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white'}`}
                                                                    title={p.status === 'DISABLED' ? 'تنشيط المشروع' : 'تعطيل المشروع'}
                                                                >
                                                                    <Power size={16} />
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                )}
                                <button onClick={() => setIsProjectSheetOpen(true)} className="w-full py-16 rounded-[3rem] border-4 border-dashed border-gray-100 text-gray-300 hover:border-blue-100 hover:text-blue-400 hover:bg-blue-50/20 transition-all flex flex-col items-center justify-center gap-2 group">
                                    <Plus size={64} className="group-hover:scale-125 transition-transform duration-500" />
                                    <span className="font-black text-sm uppercase tracking-widest mt-4">إضافة مشروع جديد للعميل</span>
                                </button>
                            </div>
                        )}


                        {activeTab === 'ORDERS' && (() => {
                            const generalOrders = (customer?.orders || []).filter((o: any) => !o.projectId && (o.type === 'SALE' || o.type === 'RETURN_SALE'));
                            const saleOrders = generalOrders.filter((o: any) => o.type === 'SALE');
                            const totalPurchases = saleOrders.reduce((s: number, o: any) => s + (o.grandTotal || o.total || 0), 0);
                            const totalPaid = saleOrders.reduce((s: number, o: any) => s + (o.invoice?.paid || 0), 0);
                            const totalRemaining = totalPurchases - totalPaid;
                            return (
                                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Summary bar */}
                                    <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي الطلبيات</p>
                                            <p className="text-2xl font-black text-gray-900 font-sans">{saleOrders.length}</p>
                                        </div>
                                        <div className="text-center border-x border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي المشتريات</p>
                                            <p className="text-2xl font-black text-gray-900 font-sans">{totalPurchases.toLocaleString()} دج</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">المستحقات المتبقية</p>
                                            <p className={`text-2xl font-black font-sans ${totalRemaining > 0.01 ? 'text-red-600' : 'text-emerald-600'}`}>{totalRemaining.toLocaleString()} دج</p>
                                        </div>
                                    </div>
                                    {/* Orders Table */}
                                    <div className="bg-white border border-gray-100 rounded-[1.5rem] overflow-hidden shadow-sm">
                                        <div className="p-5 border-b border-gray-100 flex items-center gap-3">
                                            <div className="bg-blue-50 p-2 rounded-xl text-blue-600"><ShoppingCart size={18} /></div>
                                            <div>
                                                <h3 className="font-black text-gray-900">طلبيات عامة / بدون مشروع</h3>
                                                <p className="text-[10px] text-gray-400 font-bold mt-0.5">طلبيات لم تُربط بأي مشروع</p>
                                            </div>
                                        </div>
                                        <InvoicesTable
                                            invoices={saleOrders.map((o: any) => {
                                                const returnsValue = (o.items || []).reduce((sum: number, item: any) => sum + ((item.returnedQuantity || 0) * item.unitPrice), 0);
                                                const netTotal = o.grandTotal || o.total || 0;
                                                const paid = o.invoice?.paid || 0;
                                                const remaining = o.invoice?.remaining ?? (netTotal - paid);
                                                return {
                                                    ...o.invoice,
                                                    id: o.invoice?.id,
                                                    invoiceNumber: o.invoice?.invoiceNumber || o.orderNumber,
                                                    customerName: customer.name,
                                                    projectName: 'عام',
                                                    total: netTotal,
                                                    originalTotal: netTotal + returnsValue,
                                                    returnsValue,
                                                    remaining,
                                                    paid,
                                                    status: remaining <= 0 ? (remaining < 0 ? 'CREDIT' : 'PAID') : (paid > 0 ? 'PARTIAL' : 'UNPAID'),
                                                    order: o,
                                                    date: o.orderDate
                                                };
                                            })}
                                            loading={loading}
                                            invoiceType="SALE"
                                            setSelectedInvoice={setSelectedInvoice}
                                            setShowPaymentModal={setShowPaymentModal}
                                            setPaymentAmount={setPaymentAmount}
                                            handleRefundExcess={handleRefundExcess}
                                            setShowHistoryModal={setShowHistoryModal}
                                            fetchPaymentHistory={fetchPaymentHistory}
                                            setShowReturnsModal={setShowReturnsModal}
                                            fetchReturnsHistory={fetchReturnsHistory}
                                        />
                                    </div>
                                </div>
                            );
                        })()}


                        {activeTab === 'PRODUCTS' && (
                            <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl animate-in fade-in duration-500">
                                <h3 className="text-xl font-black text-gray-900 mb-8 flex items-center gap-3">
                                    <div className="bg-orange-50 p-2 rounded-xl text-orange-600"><Star size={20} /></div>
                                    المنتجات الأكثر طلباً من قبل هذا العميل
                                </h3>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {topProducts.length === 0 ? (
                                        <div className="col-span-2 py-20 text-center text-gray-300 flex flex-col items-center gap-4">
                                            <Package size={48} />
                                            <p className="font-black">لا توجد منتجات مسجلة لهذا العميل بعد</p>
                                        </div>
                                    ) : (
                                        topProducts.map((p, idx) => (
                                            <div key={idx} className="bg-gray-50/50 p-6 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-xl transition-all duration-500 flex items-center justify-between group">
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-xl ${
                                                        idx === 0 ? 'bg-amber-100 text-amber-600 shadow-lg shadow-amber-50' : 
                                                        idx === 1 ? 'bg-slate-100 text-slate-600' : 
                                                        idx === 2 ? 'bg-orange-100 text-orange-600' : 
                                                        'bg-gray-100 text-gray-400'
                                                    }`}>
                                                        {idx + 1}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-gray-900 text-lg leading-tight">{p.name}</p>
                                                        <div className="flex flex-col gap-1 mt-1">
                                                            <p className="text-[10px] font-bold text-gray-500">الكمية: <span className="text-gray-900 font-black font-sans">{p.qty.toLocaleString()}</span> وحدة</p>
                                                            <div className="flex items-center gap-3">
                                                                <p className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded-md">أول طلب: <span className="font-sans">{p.firstDate.toLocaleDateString('ar-DZ')}</span></p>
                                                                <p className="text-[9px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-md">آخر طلب: <span className="font-sans">{p.lastDate.toLocaleDateString('ar-DZ')}</span></p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي المبيعات</p>
                                                    <p className="text-xl font-black text-gray-900 font-sans">{p.total.toLocaleString()} دج</p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'SOA' && (
                            <div className="flex flex-col pb-6 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[600px] bg-white rounded-[2.5rem] border border-gray-100 p-8 shadow-sm overflow-x-auto">
                                <div className="flex justify-between items-center mb-6 no-print">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-900 text-white p-3 rounded-2xl shadow-lg"><Printer size={24} /></div>
                                        <div className="text-right">
                                            <h3 className="text-xl font-black text-gray-900">كشف الحساب التفصيلي</h3>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">سجل كامل للحركات المالية والطلبيات</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <button onClick={() => printDocument()} className="bg-gray-900 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg hover:scale-105 transition-all">
                                            <Printer size={16} /> طباعة الكشف
                                        </button>
                                    </div>
                                </div>

                                {/* Filters Row */}
                                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6 no-print bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mr-2">بحث (رقم العملية / المرجع)</label>
                                        <div className="relative">
                                            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                            <input 
                                                type="text" 
                                                placeholder="مثلاً: 2026/04/..."
                                                value={soaSearchQuery || ''}
                                                onChange={(e) => setSoaSearchQuery(e.target.value)}
                                                className="w-full bg-white border border-gray-200 rounded-xl py-2.5 pr-10 pl-4 text-xs font-bold outline-none focus:border-gray-900 transition-all"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mr-2">نوع العملية (البيان)</label>
                                        <select 
                                            value={soaMotifFilter || 'ALL'}
                                            onChange={(e) => setSoaMotifFilter(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:border-gray-900 cursor-pointer"
                                        >
                                            <option value="ALL">كل الأنواع</option>
                                            <option value="SALE">مبيعات</option>
                                            <option value="RETURN">مرتجعات</option>
                                            <option value="PAYMENT">تسديد ديون</option>
                                            <option value="REFUND">استرداد أموال</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mr-2">طريقة الدفع</label>
                                        <select 
                                            value={soaMethodFilter || 'ALL'}
                                            onChange={(e) => setSoaMethodFilter(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:border-gray-900 cursor-pointer"
                                        >
                                            <option value="ALL">كل الطرق</option>
                                            <option value="CASH">نقداً (CASH)</option>
                                            <option value="CHEQUE">شيك (CHEQUE)</option>
                                            <option value="BANK_TRANSFER">تحويل بنكي</option>
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mr-2">المشروع</label>
                                        <select 
                                            value={soaProjectFilter || 'ALL'}
                                            onChange={(e) => setSoaProjectFilter(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-xl py-2.5 px-4 text-xs font-bold outline-none focus:border-gray-900 cursor-pointer"
                                        >
                                            <option value="ALL">كل المشاريع</option>
                                            <option value="GENERAL">عام / بدون مشروع</option>
                                            {customer?.projects?.map((p: any) => (
                                                <option key={p.id} value={p.id.toString()}>{p.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mr-2">من تاريخ</label>
                                        <input 
                                            type="date" 
                                            value={soaDateFrom || ''}
                                            onChange={(e) => setSoaDateFrom(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-xl py-2 px-4 text-xs font-bold outline-none focus:border-gray-900"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black text-gray-400 uppercase mr-2">إلى تاريخ</label>
                                        <input 
                                            type="date" 
                                            value={soaDateTo || ''}
                                            onChange={(e) => setSoaDateTo(e.target.value)}
                                            className="w-full bg-white border border-gray-200 rounded-xl py-2 px-4 text-xs font-bold outline-none focus:border-gray-900"
                                        />
                                    </div>
                                </div>

                                {(() => {
                                    const allTxs: any[] = [];
                                    const usedPaymentIds = new Set<number>();

                                    // 1. Process Orders (Sales & Returns)
                                    (customer.orders || []).forEach((o: any) => {
                                        if (o.type === 'SALE') {
                                            const returnsValue = (o.items || []).reduce((sum: number, item: any) => 
                                                sum + ((item.returnedQuantity || 0) * (item.unitPrice || 0)), 0
                                            );
                                            const netTotal = o.grandTotal || o.total || 0;
                                            const originalTotal = netTotal + returnsValue;

                                            const initialPayment = (o.invoice?.payments || []).find((p: any) => {
                                                const orderTime = new Date(o.orderDate).getTime();
                                                const payTime = new Date(p.paymentDate).getTime();
                                                return Math.abs(orderTime - payTime) < 120000;
                                            });

                                            if (initialPayment) usedPaymentIds.add(initialPayment.id);
                                            const versement = initialPayment ? initialPayment.amount : 0;
                                            
                                            let motif = '';
                                            if (Math.abs(versement - originalTotal) < 0.01) motif = 'دفع كامل (الكل نقداً)';
                                            else if (versement > 0) motif = 'دفع جزئي (عربون وتسديد لاحق)';
                                            else motif = 'تسليف / آجل';

                                            allTxs.push({
                                                date: new Date(o.orderDate),
                                                number: o.orderNumber,
                                                vente: originalTotal,
                                                method: initialPayment?.paymentMethod || '---',
                                                motif: motif,
                                                ref: '---',
                                                versement: versement,
                                                type: 'SALE',
                                                project: o.project?.name || 'عام',
                                                projectId: o.projectId
                                            });
                                        } else if (o.type === 'RETURN_SALE') {
                                            allTxs.push({
                                                date: new Date(o.orderDate),
                                                number: 'Retours',
                                                vente: -(o.grandTotal || o.total || 0),
                                                method: '---',
                                                motif: 'إرجاع سلع',
                                                ref: o.externalNumber || o.notes || o.orderNumber,
                                                versement: 0,
                                                type: 'RETURN',
                                                project: o.project?.name || 'عام',
                                                projectId: o.projectId
                                            });
                                        }
                                    });

                                    // 2. Process Payments (Tasdid & Refunds)
                                    (customer.payments || []).forEach((p: any) => {
                                        if (usedPaymentIds.has(p.id)) return;
                                        const isRefund = p.amount < 0;
                                        allTxs.push({
                                            date: new Date(p.paymentDate),
                                            number: isRefund ? 'Remboursement' : 'Droits',
                                            vente: 0,
                                            method: isRefund ? '---' : p.paymentMethod,
                                            motif: isRefund ? 'استرداد أموال' : 'تسديد ديون',
                                            ref: p.invoice?.order?.orderNumber || p.invoice?.invoiceNumber?.replace('INV/', '') || '---',
                                            versement: p.amount,
                                            type: isRefund ? 'REFUND' : 'PAYMENT',
                                            project: p.invoice?.order?.project?.name || 'عام',
                                            projectId: p.invoice?.order?.projectId || null
                                        });
                                    });

                                    // 3. Sort Chronologically
                                    allTxs.sort((a, b) => a.date.getTime() - b.date.getTime());

                                    // 4. Calculate Full History Balance
                                    let runningBalance = 0;
                                    const historyWithBalance = allTxs.map(tx => {
                                        runningBalance += (tx.vente - tx.versement);
                                        return { ...tx, balance: runningBalance };
                                    });

                                    // 5. Apply Filters
                                    let filteredTxs = historyWithBalance.filter(tx => {
                                        // Date Filter
                                        if (soaDateFrom && tx.date < new Date(soaDateFrom)) return false;
                                        if (soaDateTo) {
                                            const toDate = new Date(soaDateTo);
                                            toDate.setHours(23, 59, 59, 999);
                                            if (tx.date > toDate) return false;
                                        }

                                        // Motif Filter
                                        if (soaMotifFilter && soaMotifFilter !== 'ALL') {
                                            if (tx.type !== soaMotifFilter) return false;
                                        }

                                        // Method Filter
                                        if (soaMethodFilter && soaMethodFilter !== 'ALL') {
                                            if (tx.method !== soaMethodFilter) return false;
                                        }

                                        // Project Filter
                                        if (soaProjectFilter && soaProjectFilter !== 'ALL') {
                                            const hasProject = tx.projectId !== null && tx.projectId !== undefined;
                                            if (soaProjectFilter === 'GENERAL') {
                                                // Show only transactions WITHOUT a project
                                                if (hasProject) return false;
                                            } else {
                                                // Show only transactions WITH this specific project
                                                if (!hasProject || tx.projectId?.toString() !== soaProjectFilter) return false;
                                            }
                                        }

                                        // Search Query
                                        if (soaSearchQuery) {
                                            const q = soaSearchQuery.toLowerCase();
                                            const matchNum = tx.number?.toLowerCase().includes(q);
                                            const matchRef = tx.ref?.toLowerCase().includes(q);
                                            if (!matchNum && !matchRef) return false;
                                        }

                                        return true;
                                    });

                                    // 6. Calculate Initial Balance (Balance just before the first visible transaction)
                                    // 6. Calculate Initial Balance (Balance just before the first visible transaction)
                                    let initialBalance = 0;
                                    if (filteredTxs.length > 0) {
                                        const firstVisibleIndex = historyWithBalance.findIndex(tx => tx === filteredTxs[0]);
                                        if (firstVisibleIndex > 0) {
                                            initialBalance = historyWithBalance[firstVisibleIndex - 1].balance;
                                        }
                                    } else if (historyWithBalance.length > 0) {
                                        if (soaDateFrom) {
                                            const lastBeforeDate = historyWithBalance.filter(tx => tx.date < new Date(soaDateFrom)).pop();
                                            initialBalance = lastBeforeDate ? lastBeforeDate.balance : 0;
                                        }
                                    }

                                    // 7. Reverse for Newest-First Display
                                    const displayedTxs = [...filteredTxs].reverse();

                                    return (
                                        <div className="flex flex-col">
                                            {/* Initial Balance Header */}
                                            <div className="bg-gray-900 text-white p-6 rounded-t-[2rem] flex justify-between items-center shadow-lg no-print">
                                                <div className="flex items-center gap-3">
                                                    <div className="bg-white/10 p-2 rounded-xl"><Activity size={18} /></div>
                                                    <span className="text-xs font-black uppercase tracking-widest opacity-70">الرصيد قبل الفلترة (Solde Initial)</span>
                                                </div>
                                                <span className={`text-2xl font-black font-sans ${initialBalance > 0.01 ? 'text-red-400' : (initialBalance < -0.01 ? 'text-emerald-400' : 'text-white')}`}>
                                                    {initialBalance.toLocaleString()} دج
                                                </span>
                                            </div>

                                            <table className="w-full text-right border-collapse min-w-[1000px] print-area">
                                                <thead>
                                                    <tr className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100">
                                                        <th className="p-4 text-center">N°</th>
                                                        <th className="p-4">تاريخ العملية</th>
                                                        <th className="p-4">رقم العملية</th>
                                                        <th className="p-4 text-center">المشروع</th>
                                                        <th className="p-4">مبلغ البيع (دج)</th>
                                                        <th className="p-4">طريقة الدفع</th>
                                                        <th className="p-4">البيان (Motif)</th>
                                                        <th className="p-4 text-center">المرجع / الطلبية</th>
                                                        <th className="p-4 text-emerald-600">المدفوعات (دج)</th>
                                                        <th className="p-4 bg-gray-100/50 text-gray-900">الرصيد المتبقي (دج)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {displayedTxs.map((tx, idx) => (
                                                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors font-bold text-sm">
                                                            <td className="p-4 text-center text-gray-400 font-sans">{filteredTxs.length - idx}</td>
                                                            <td className="p-4 font-sans">{tx.date.toLocaleDateString('ar-DZ')}</td>
                                                            <td className="p-4 font-sans text-xs">{tx.number}</td>
                                                            <td className="p-4 text-center text-[10px] font-bold text-gray-500 bg-gray-50/50">
                                                                {tx.project}
                                                            </td>
                                                            <td className="p-4 font-sans">
                                                                {tx.vente !== 0 ? (
                                                                    <span className={tx.vente < 0 ? 'text-orange-600' : 'text-gray-900'}>
                                                                        {tx.vente.toLocaleString()}
                                                                    </span>
                                                                ) : '---'}
                                                            </td>
                                                            <td className="p-4 text-xs">
                                                                {tx.method !== '---' ? (
                                                                    <span className="bg-gray-100 px-2 py-1 rounded-lg">{tx.method}</span>
                                                                ) : '---'}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`text-[10px] px-2 py-1 rounded-lg ${
                                                                    tx.type === 'SALE' ? 'bg-blue-50 text-blue-700' :
                                                                    tx.type === 'RETURN' ? 'bg-orange-50 text-orange-700' :
                                                                    tx.type === 'REFUND' ? 'bg-purple-50 text-purple-700' :
                                                                    'bg-emerald-50 text-emerald-700'
                                                                }`}>
                                                                    {tx.motif}
                                                                </span>
                                                            </td>
                                                            <td className="p-4 text-center font-sans text-[11px] text-gray-500">
                                                                {tx.ref}
                                                            </td>
                                                            <td className="p-4 font-sans text-emerald-600">
                                                                {tx.versement !== 0 ? (
                                                                    <span className={tx.versement < 0 ? 'text-purple-600' : ''}>
                                                                        {tx.versement.toLocaleString()}
                                                                    </span>
                                                                ) : '---'}
                                                            </td>
                                                            <td className={`p-4 font-sans bg-gray-50/30 ${tx.balance > 0.01 ? 'text-red-600' : (tx.balance < -0.01 ? 'text-emerald-600' : 'text-gray-400')}`}>
                                                                {Math.abs(tx.balance) < 0.01 ? '0' : tx.balance.toLocaleString()}
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* MODALS */}
                {/* PROJECT ORDERS MODAL */}
                {selectedProjectForOrders && (
                    <div className="fixed inset-0 z-[150] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 no-print">
                        <div className="bg-white w-full max-w-5xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100"><Briefcase size={24} /></div>
                                    <div className="text-right">
                                        <h2 className="text-2xl font-black text-gray-900">{selectedProjectForOrders.name}</h2>
                                        <p className="text-xs font-bold text-gray-400 mt-1 uppercase tracking-widest">سجل الطلبيات المرتبطة بالمشروع</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="relative">
                                        <button 
                                            onClick={() => setIsExportDropdownOpen(!isExportDropdownOpen)}
                                            className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-emerald-100 hover:scale-105 transition-all"
                                        >
                                            <Download size={18} /> تصدير السجل <ChevronDown size={14} className={`transition-transform ${isExportDropdownOpen ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {isExportDropdownOpen && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setIsExportDropdownOpen(false)} />
                                                <div className="absolute top-full left-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 overflow-hidden animate-in fade-in slide-in-from-top-2">
                                                    <button 
                                                        onClick={() => {
                                                            exportProjectOrdersCSV();
                                                            setIsExportDropdownOpen(false);
                                                        }}
                                                        className="w-full px-5 py-3 text-right text-xs font-black text-gray-700 hover:bg-emerald-50 hover:text-emerald-700 flex items-center gap-3 transition-colors"
                                                    >
                                                        <FileSpreadsheet size={16} className="text-emerald-600" /> تصدير Excel (.csv)
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setIsExportDropdownOpen(false);
                                                            const printContent = document.getElementById('project-orders-print-area');
                                                            if (printContent) {
                                                                const original = document.body.innerHTML;
                                                                document.body.innerHTML = printContent.innerHTML;
                                                                printDocument();
                                                                document.body.innerHTML = original;
                                                                window.location.reload();
                                                            }
                                                        }}
                                                        className="w-full px-5 py-3 text-right text-xs font-black text-gray-700 hover:bg-red-50 hover:text-red-700 border-t border-gray-50 flex items-center gap-3 transition-colors"
                                                    >
                                                        <FileText size={16} className="text-red-600" /> تصدير PDF (طباعة)
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                    
                                    <button 
                                        onClick={() => {
                                            const printContent = document.getElementById('project-orders-print-area');
                                            if (printContent) {
                                                const original = document.body.innerHTML;
                                                document.body.innerHTML = printContent.innerHTML;
                                                printDocument();
                                                document.body.innerHTML = original;
                                                window.location.reload();
                                            }
                                        }}
                                        className="bg-gray-900 text-white px-5 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg hover:scale-105 transition-all"
                                    >
                                        <Printer size={18} /> طباعة السجل
                                    </button>
                                    <button onClick={() => setSelectedProjectForOrders(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2 bg-white rounded-xl border border-gray-100 shadow-sm ml-2">
                                        <X size={28} />
                                    </button>
                                </div>
                            </div>

                            <div className="p-0 overflow-y-auto" id="project-orders-print-area">
                                <div className="p-8 hidden print:block border-b-2 border-gray-900 mb-6">
                                    <h1 className="text-3xl font-black text-gray-900 text-center uppercase">كشف طلبيات المشروع</h1>
                                    <div className="flex justify-between mt-6 text-sm font-bold">
                                        <div className="text-right">
                                            <p>العميل: {customer.name}</p>
                                            <p>المشروع: {selectedProjectForOrders.name}</p>
                                        </div>
                                        <div className="text-left">
                                            <p>التاريخ: {new Date().toLocaleDateString('ar-DZ')}</p>
                                        </div>
                                    </div>
                                </div>
                                <InvoicesTable 
                                    invoices={customer.orders?.filter((o: any) => o.projectId === selectedProjectForOrders.id && o.type !== 'RETURN_SALE' && o.type !== 'RETURN_PURCHASE').map((o: any) => {
                                        const returnsValue = (o.items || []).reduce((sum: number, item: any) => sum + ((item.returnedQuantity || 0) * item.unitPrice), 0);
                                        const netTotal = o.total || 0;
                                        const paid = o.invoice?.paid || 0;
                                        const remaining = o.invoice?.remaining ?? (netTotal - paid);

                                        return {
                                            ...o.invoice,
                                            id: o.invoice?.id,
                                            invoiceNumber: o.invoice?.invoiceNumber || o.orderNumber,
                                            customerName: customer.name,
                                            projectName: selectedProjectForOrders.name,
                                            total: netTotal,
                                            originalTotal: netTotal + returnsValue,
                                            returnsValue: returnsValue,
                                            remaining: remaining,
                                            paid: paid,
                                            status: remaining <= 0 ? (remaining < 0 ? 'CREDIT' : 'PAID') : (paid > 0 ? 'PARTIAL' : 'UNPAID'),
                                            order: o,
                                            date: o.orderDate
                                        };
                                    }) || []}
                                    loading={loading}
                                    invoiceType="SALE"
                                    setSelectedInvoice={setSelectedInvoice}
                                    setShowPaymentModal={setShowPaymentModal}
                                    setPaymentAmount={setPaymentAmount}
                                    handleRefundExcess={handleRefundExcess}
                                    setShowHistoryModal={setShowHistoryModal}
                                    fetchPaymentHistory={fetchPaymentHistory}
                                    setShowReturnsModal={setShowReturnsModal}
                                    fetchReturnsHistory={fetchReturnsHistory}
                                />

                            </div>

                            <div className="p-8 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
                                {(() => {
                                    const projectOrders = customer.orders?.filter((o: any) => o.projectId === selectedProjectForOrders.id) || [];
                                    const projectBalance = projectOrders.reduce((sum: number, o: any) => {
                                        if (o.type === 'RETURN_SALE' || o.type === 'RETURN_PURCHASE') return sum;
                                        const netTotal = o.total || 0;
                                        const paid = o.invoice?.paid || 0;
                                        return sum + (netTotal - paid);
                                    }, 0);

                                    return (
                                        <div className="text-right">
                                            <span className="text-[10px] font-black text-gray-400 uppercase block">
                                                {projectBalance > 0 ? 'إجمالي ديون المشروع' : (projectBalance < 0 ? 'إجمالي الرصيد الزائد للمشروع' : 'حالة المشروع المالية')}
                                            </span>
                                            <span className={`text-2xl font-black font-sans ${projectBalance > 0 ? 'text-red-600' : (projectBalance < 0 ? 'text-purple-600' : 'text-emerald-600')}`}>
                                                {Math.abs(projectBalance).toLocaleString()} دج
                                            </span>
                                        </div>
                                    );
                                })()}
                                <button onClick={() => setSelectedProjectForOrders(null)} className="bg-gray-900 text-white px-8 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all">إغلاق النافذة</button>
                            </div>
                        </div>
                    </div>
                )}

                {/* SELECTED INVOICE MODAL (Identical to Invoices page) */}
                {selectedInvoice && (
                    <div className="fixed inset-0 z-[250] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 no-print">
                        <div className="bg-white w-full max-w-4xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh]">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-100"><Eye size={24} /></div>
                                    <div className="text-right">
                                        <h2 className="text-xl font-black text-gray-900">معاينة الطلبية</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedInvoice.invoiceNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const printContent = document.getElementById('invoice-print-area');
                                            if (printContent) {
                                                const original = document.body.innerHTML;
                                                document.body.innerHTML = printContent.innerHTML;
                                                printDocument();
                                                document.body.innerHTML = original;
                                                window.location.reload();
                                            }
                                        }}
                                        className="bg-blue-600 text-white px-6 py-2.5 rounded-xl text-xs font-black flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition-all"
                                    >
                                        <Printer size={18} /> طباعة الفاتورة
                                    </button>
                                    <button onClick={() => setSelectedInvoice(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2 bg-white rounded-xl border border-gray-100 shadow-sm"><X size={24} /></button>
                                </div>
                            </div>
                            <div className="p-8 overflow-y-auto flex-1">
                                <div id="invoice-print-area" className="bg-white p-4">
                                    <div className="text-center mb-10 border-b-2 border-gray-900 pb-6 hidden print:block">
                                        <h1 className="text-4xl font-black text-gray-900 tracking-wide uppercase">مخــزونـي</h1>
                                        <p className="text-gray-600 text-lg font-medium mt-1">لتجارة مواد البناء والتوريدات العامة</p>
                                    </div>

                                    <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6">
                                        <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl flex-1 w-full order-2 md:order-1">
                                            <h2 className="text-2xl font-black text-gray-900 mb-4 tracking-tighter uppercase">
                                                Facture de Vente
                                            </h2>
                                            <p className="text-sm font-bold text-gray-600 mb-1">N° Facture: <span className="text-gray-900 font-sans" dir="ltr">{selectedInvoice.invoiceNumber}</span></p>
                                            <p className="text-sm font-bold text-gray-600">Date: <span className="text-gray-900 font-sans">{formatDate(selectedInvoice.date)}</span></p>
                                        </div>
                                        <div className="border-l-4 border-blue-600 pl-5 flex-1 w-full order-1 md:order-2 text-left" dir="ltr">
                                            <p className="text-xs font-black text-blue-600 mb-1 uppercase tracking-widest">CLIENT:</p>
                                            <p className="text-xl font-black text-gray-900 leading-tight">{customer.name}</p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                {selectedInvoice.projectName && <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">Projet: {selectedInvoice.projectName}</span>}
                                                {customer.phone && <span className="text-xs font-bold bg-gray-50 text-gray-500 px-2 py-0.5 rounded font-sans" dir="ltr">{customer.phone}</span>}
                                            </div>
                                        </div>
                                    </div>

                                    <table className="w-full text-left border-collapse mb-8" dir="ltr">
                                        <thead className="bg-gray-900 text-white">
                                            <tr>
                                                <th className="px-4 py-3 font-bold w-12 text-center rounded-tl-lg">#</th>
                                                <th className="px-4 py-3 font-bold">Désignation</th>
                                                <th className="px-4 py-3 font-bold text-center w-24">Qté</th>
                                                <th className="px-4 py-3 font-bold text-center w-32">P. Unitaire</th>
                                                <th className="px-4 py-3 font-bold text-right w-36 rounded-tr-lg">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="text-gray-800">
                                            {(selectedInvoice.order?.items || []).map((item: any, idx: number) => {
                                                const isReturned = (item.returnedQuantity || 0) > 0;
                                                return (
                                                    <tr key={idx} className={`border-b border-gray-200 hover:bg-gray-50 ${isReturned ? 'bg-red-50/30' : ''}`}>
                                                        <td className="px-4 py-4 text-center text-gray-400 font-sans">{idx + 1}</td>
                                                        <td className="px-4 py-4 font-bold text-left">
                                                            <div>{item.product?.name}</div>
                                                            {isReturned && (
                                                                <div className="text-[10px] text-red-500 font-black">Retour: {item.returnedQuantity} unités</div>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-center font-bold font-sans">
                                                            {isReturned ? (
                                                                <div className="flex flex-col items-center">
                                                                    <span className="text-gray-400 line-through text-xs">{item.quantity}</span>
                                                                    <span className="text-gray-900">{item.quantity - item.returnedQuantity}</span>
                                                                </div>
                                                            ) : (
                                                                item.quantity
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-center font-bold font-sans">{item.unitPrice.toLocaleString()}</td>
                                                        <td className="px-4 py-4 text-right font-black text-gray-900 font-sans">
                                                            {((item.quantity - (item.returnedQuantity || 0)) * item.unitPrice).toLocaleString()}
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                            <tr className="h-20 print:h-40"><td colSpan={5}></td></tr>
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan={3} className="pt-6">
                                                    <div className="bg-gray-50 border-l-4 border-gray-900 p-4 text-left">
                                                        <p className="text-xs font-bold text-gray-500 mb-1">Arrêté la présente facture à la somme de:</p>
                                                        <p className="font-black text-gray-900 uppercase italic text-xs">{numberToFrenchWords(selectedInvoice.total)} Dinars Algériens</p>
                                                    </div>
                                                </td>
                                                <td colSpan={2} className="pt-6">
                                                    <div className="bg-gray-900 text-white p-6 rounded-b-xl flex flex-col items-end shadow-xl">
                                                        <div className="flex justify-between w-full opacity-60 text-xs mb-2">
                                                            <span>Total Original:</span>
                                                            <span className="font-sans">{(selectedInvoice.originalTotal || 0).toLocaleString()}</span>
                                                        </div>
                                                        {selectedInvoice.returnsValue > 0 && (
                                                            <div className="flex justify-between w-full text-red-400 text-xs mb-2 font-black bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                                                                <span>Retours (-):</span>
                                                                <span className="font-sans">- {selectedInvoice.returnsValue.toLocaleString()} DZD</span>
                                                            </div>
                                                        )}
                                                        <div className="flex justify-between w-full opacity-90 text-sm mb-2 font-black pt-2 border-t border-white/10">
                                                            <span>Total Net:</span>
                                                            <span className="font-sans">{selectedInvoice.total.toLocaleString()} DZD</span>
                                                        </div>
                                                        <div className="flex justify-between w-full opacity-60 text-xs mb-4">
                                                            <span>Montant Payé:</span>
                                                            <span className="font-sans">{selectedInvoice.paid.toLocaleString()}</span>
                                                        </div>


                                                        <div className="w-full h-px bg-white/10 mb-4"></div>
                                                        <span className="text-sm font-bold opacity-70">
                                                            {selectedInvoice.remaining < 0 ? 'Crédit Client (Rendu)' : 'Reste à Payer'}
                                                        </span>
                                                        <span className={`text-3xl font-black font-sans leading-none ${selectedInvoice.remaining < 0 ? 'text-purple-400' : 'text-red-400'}`}>
                                                            {Math.abs(selectedInvoice.remaining).toLocaleString()} DZD
                                                        </span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>

                                    <div className="grid grid-cols-2 gap-12 mt-20 px-10 text-center hidden print:grid">
                                        <div className="font-black text-gray-900 border-t-2 border-gray-900 pt-8 uppercase text-xs tracking-widest">Cacheت et Signature</div>
                                        <div className="font-black text-gray-900 border-t-2 border-gray-900 pt-8 uppercase text-xs tracking-widest">Client</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* HISTORY MODAL (Identical to Invoices page) */}
                {showHistoryModal && (
                    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 no-print">
                        <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-gray-900 text-white p-3 rounded-2xl shadow-lg"><History size={24} /></div>
                                    <div className="text-right">
                                        <h2 className="text-xl font-black text-gray-900">سجل مدفوعات الفاتورة</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{showHistoryModal.invoiceNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const printContent = document.getElementById('full-history-print');
                                            if (printContent) {
                                                const original = document.body.innerHTML;
                                                document.body.innerHTML = printContent.innerHTML;
                                                printDocument();
                                                document.body.innerHTML = original;
                                                window.location.reload();
                                            }
                                        }}
                                        className="bg-gray-900 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-800 transition-all shadow-lg no-print"
                                    >
                                        <Printer size={16} /> طباعة السجل
                                    </button>
                                    <button onClick={() => setShowHistoryModal(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2 no-print"><X size={24} /></button>
                                </div>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                                {!showHistoryModal.payments || showHistoryModal.payments.length === 0 ? (
                                    <div className="py-20 text-center text-gray-300 flex flex-col items-center gap-4">
                                        <CreditCard size={48} />
                                        <p className="font-black">لا توجد دفعات مسجلة لهذه الفاتورة بعد</p>
                                    </div>
                                ) : (
                                    <div className="relative space-y-8 pr-4 border-r-2 border-gray-100 mr-2">
                                        {showHistoryModal.payments.map((p: any) => (
                                            <div key={p.id} className="relative">
                                                <div className="absolute top-2 -right-[23px] w-4 h-4 rounded-full bg-blue-600 border-4 border-white shadow-sm ring-2 ring-blue-100"></div>
                                                <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col gap-2 hover:bg-white hover:shadow-lg transition-all group">
                                                    <div className="flex justify-between items-center text-right" dir="rtl">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-lg font-black font-sans ${p.isReturn ? 'text-orange-600' : (p.amount < 0 ? 'text-purple-600' : 'text-gray-900')}`}>
                                                                {p.isReturn ? '-' : ''}{Math.abs(p.amount).toLocaleString()} دج
                                                            </span>
                                                            {!p.isReturn && (
                                                                <button
                                                                    onClick={() => {
                                                                        const printContent = document.getElementById(`receipt-${p.id}`);
                                                                        if (printContent) {
                                                                            const original = document.body.innerHTML;
                                                                            document.body.innerHTML = printContent.innerHTML;
                                                                            printDocument();
                                                                            document.body.innerHTML = original;
                                                                            window.location.reload();
                                                                        }
                                                                    }}
                                                                    className={`flex items-center gap-1.5 px-3 py-1.5 ${p.amount < 0 ? 'bg-purple-600' : 'bg-blue-600'} text-white rounded-lg hover:opacity-90 transition-all shadow-md no-print`}
                                                                >
                                                                    <Printer size={12} />
                                                                    <span className="text-[10px] font-black">طباعة الوصل</span>
                                                                </button>
                                                            )}
                                                        </div>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${p.isReturn ? 'text-orange-600 bg-orange-50' : (p.amount < 0 ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50')}`}>
                                                            {p.isReturn ? 'DÉDUCTION RETOUR' : (p.amount < 0 ? 'Remboursement' : p.paymentMethod)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 justify-end" dir="rtl">
                                                        <span>{new Date(p.paymentDate).toLocaleString('ar-DZ')}</span>
                                                        <Clock size={12} />
                                                    </div>

                                                    {/* Description / Note */}
                                                    <div className={`mt-1 p-2 rounded-lg border ${p.isReturn ? 'bg-orange-100/30 border-orange-200/50' : 'bg-white border-gray-100'} flex flex-col gap-0.5`} dir="rtl">
                                                        <span className={`text-[8px] font-black uppercase tracking-tighter ${p.isReturn ? 'text-orange-600' : 'text-gray-400'}`}>الوصف:</span>
                                                        <p className={`text-[11px] font-black ${p.isReturn ? 'text-orange-900' : 'text-gray-700'} leading-none`}>
                                                            {p.notes || (p.amount < 0 ? 'إرجاع رصيد زائد للعميل' : 'تسديد دفعة مالية')}
                                                        </p>
                                                    </div>
                                                    {(p.paymentMethod === 'CHEQUE' || p.paymentMethod === 'BANK_TRANSFER' || p.chequeNumber) && (
                                                        <div className="mt-2 flex flex-col gap-1 bg-blue-50 border border-blue-100 p-3 rounded-xl text-right" dir="rtl">
                                                            {p.bankName && <div className="text-[10px] font-black text-blue-700 flex items-center gap-1 justify-end">🏛️ {p.bankName}</div>}
                                                            {p.chequeNumber && <div className="text-[11px] font-black text-gray-900 font-sans">№ {p.chequeNumber}</div>}
                                                        </div>
                                                    )}
                                                    {p.isReturn && p.items && (
                                                        <div className="mt-2 p-3 bg-orange-50 border border-orange-100 rounded-xl" dir="rtl">
                                                            <p className="text-[9px] font-black text-orange-800 mb-2 border-b border-orange-200 pb-1 uppercase tracking-tighter text-right">السلع المسترجعة / PRODUITS RETOURNÉS</p>
                                                            <div className="space-y-1">
                                                                {p.items.map((item: any, i: number) => (
                                                                    <div key={i} className="flex justify-between items-center text-[10px] font-bold text-gray-600">
                                                                        <span className="font-sans">({item.quantity}) x {item.unitPrice.toLocaleString()} دج</span>
                                                                        <span className="text-gray-900">{item.product?.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}

                                                    {/* Receipt Template (Hidden) */}
                                                    <div id={`receipt-${p.id}`} className="hidden">
                                                        <div className="p-10 font-sans text-left" dir="ltr">
                                                            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                                                                <div>
                                                                    <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">{p.amount < 0 ? 'REÇU DE REMBOURSEMENT' : 'REÇU DE PAIEMENT'}</h1>
                                                                    <p className="text-gray-500 font-bold">Réf: {p.id}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="text-xl font-black text-blue-600">SKR Stock</p>
                                                                </div>
                                                            </div>
                                                            <div className="space-y-6">
                                                                <div className="flex justify-between border-b border-gray-100 py-4">
                                                                    <span className="text-gray-500 font-bold uppercase text-xs">Date:</span>
                                                                    <span className="font-black font-sans">{new Date(p.paymentDate).toLocaleString('fr-FR')}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b border-gray-100 py-4">
                                                                    <span className="text-gray-500 font-bold uppercase text-xs">Client:</span>
                                                                    <span className="font-black">{customer.name}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b border-gray-100 py-4">
                                                                    <span className="text-gray-500 font-bold uppercase text-xs">Référence Facture:</span>
                                                                    <span className="font-black">{showHistoryModal.invoiceNumber}</span>
                                                                </div>
                                                                <div className="flex justify-between border-b border-gray-100 py-4">
                                                                    <span className="text-gray-500 font-bold uppercase text-xs">Mode:</span>
                                                                    <span className="font-black">{p.paymentMethod}</span>
                                                                </div>
                                                                <div className={`${p.amount < 0 ? 'bg-purple-600' : 'bg-gray-900'} text-white p-8 rounded-3xl mt-10 text-center shadow-2xl shadow-gray-200`}>
                                                                    <p className="text-xs font-bold opacity-60 mb-2 tracking-widest uppercase">MONTANT</p>
                                                                    <p className="text-5xl font-black font-sans">{Math.abs(p.amount).toLocaleString()} DZD</p>
                                                                    <p className="mt-4 text-[10px] font-bold italic opacity-50 uppercase tracking-widest">Arrêté à la somme de: {numberToFrenchWords(Math.abs(p.amount))} Dinars Algériens</p>
                                                                </div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-20 mt-20 text-center">
                                                                <div className="border-t-2 border-gray-900 pt-4 font-black text-gray-900 uppercase text-xs tracking-widest">Cachet et Signature</div>
                                                                <div className="border-t-2 border-gray-900 pt-4 font-black text-gray-900 uppercase text-xs tracking-widest">Signature Client</div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-8 border-t border-gray-50 flex justify-between items-center bg-gray-50/30 no-print">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي المحصل</p>
                                    <p className="text-xl font-black text-green-600 font-sans">{showHistoryModal.paid.toLocaleString()} دج</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase text-left">المتبقي</p>
                                    <p className={`text-xl font-black font-sans text-left ${showHistoryModal.remaining < 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                        {showHistoryModal.remaining.toLocaleString()} دج
                                    </p>
                                    {showHistoryModal.remaining < 0 && (
                                        <button
                                            onClick={() => handleRefundExcess(showHistoryModal)}
                                            className="mt-2 text-[10px] font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-all shadow-md flex items-center gap-1 ml-auto"
                                        >
                                            <Banknote size={12} /> إرجاع الفائض نقداً
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Full History Template for Print (Hidden) */}
                            <div id="full-history-print" className="hidden">
                                <div className="p-10 font-sans text-left" dir="ltr">
                                    <div className="flex justify-between items-center border-b-2 border-gray-900 pb-4 mb-6">
                                        <h1 className="text-2xl font-black uppercase">HISTORIQUE DES PAIEMENTS</h1>
                                        <p className="text-xl font-black text-blue-600 uppercase">SKR Stock</p>
                                    </div>
                                    <div className="mb-10 flex justify-between items-start">
                                        <div>
                                            <p className="text-xs font-bold text-gray-400 uppercase">Client:</p>
                                            <p className="text-xl font-black">{customer.name}</p>
                                            <p className="text-sm font-bold text-gray-600 font-sans">Facture: {showHistoryModal.invoiceNumber}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-bold text-gray-400 uppercase">État actuel:</p>
                                            <p className="text-lg font-black text-red-600 font-sans">Reste: {showHistoryModal.remaining.toLocaleString()} DZD</p>
                                        </div>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-100">
                                            <tr>
                                                <th className="p-3 text-xs font-black uppercase">Date</th>
                                                <th className="p-3 text-xs font-black uppercase">Mode</th>
                                                <th className="p-3 text-xs font-black uppercase text-right">Montant</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {showHistoryModal.payments?.map((p: any) => (
                                                <tr key={p.id} className="border-b border-gray-100">
                                                    <td className="p-3 text-sm font-bold font-sans">{new Date(p.paymentDate).toLocaleDateString('fr-FR')}</td>
                                                    <td className="p-3 text-sm font-bold uppercase">{p.paymentMethod}</td>
                                                    <td className="p-3 text-sm font-black text-right font-sans">{p.amount.toLocaleString()} DZD</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-900 text-white">
                                                <td colSpan={2} className="p-4 text-right font-black uppercase">Total Payé:</td>
                                                <td className="p-4 text-right font-black font-sans">{showHistoryModal.paid.toLocaleString()} DZD</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>

                            <div className="p-8 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي المحصل</p>
                                    <p className="text-xl font-black text-green-600 font-sans">{showHistoryModal.paid.toLocaleString()} دج</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase text-left">المتبقي</p>
                                    <p className={`text-xl font-black font-sans text-left ${showHistoryModal.remaining < 0 ? 'text-purple-600' : 'text-red-600'}`}>
                                        {showHistoryModal.remaining.toLocaleString()} دج
                                    </p>
                                    {showHistoryModal.remaining < 0 && (
                                        <button
                                            onClick={() => handleRefundExcess(showHistoryModal)}
                                            className="mt-2 text-[10px] font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 transition-all shadow-md flex items-center gap-1 ml-auto"
                                        >
                                            <Banknote size={12} /> إرجاع الفائض نقداً
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* RETURNS MODAL (Identical to Invoices page) */}
                {showReturnsModal && (
                    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 no-print">
                        <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-orange-600 text-white p-3 rounded-2xl shadow-lg"><ShoppingBag size={24} /></div>
                                    <div className="text-right">
                                        <h2 className="text-xl font-black text-gray-900">سجل المرتجعات</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{showReturnsModal.invoiceNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const printContent = document.getElementById('full-returns-print');
                                            if (printContent) {
                                                const original = document.body.innerHTML;
                                                document.body.innerHTML = printContent.innerHTML;
                                                printDocument();
                                                document.body.innerHTML = original;
                                                window.location.reload();
                                            }
                                        }}
                                        className="bg-orange-600 text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-orange-700 transition-all shadow-lg"
                                    >
                                        <Printer size={16} /> طباعة السجل
                                    </button>
                                    <button onClick={() => setShowReturnsModal(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2"><X size={24} /></button>
                                </div>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto space-y-4">
                                {!showReturnsModal.returns || showReturnsModal.returns.length === 0 ? (
                                    <div className="py-20 text-center text-gray-300 flex flex-col items-center gap-4">
                                        <RotateCcw size={48} className="animate-spin-slow text-orange-200" />
                                        <p className="font-black">لا توجد مرتجعات مسجلة لهذه الفاتورة</p>
                                    </div>
                                ) : (
                                    showReturnsModal.returns.map((r: any) => (
                                        <div key={r.id} className="bg-orange-50/30 p-5 rounded-2xl border border-orange-100/50 flex flex-col gap-3 group hover:bg-white hover:shadow-xl transition-all">
                                            <div className="flex justify-between items-start">
                                                <div className="text-right">
                                                    <p className="text-lg font-black text-orange-600 font-sans">{r.totalAmount?.toLocaleString()} دج</p>
                                                    <div className="flex items-center gap-2">
                                                        <button
                                                            onClick={() => {
                                                                const printContent = document.getElementById(`return-receipt-${r.id}`);
                                                                if (printContent) {
                                                                    const original = document.body.innerHTML;
                                                                    document.body.innerHTML = printContent.innerHTML;
                                                                    printDocument();
                                                                    document.body.innerHTML = original;
                                                                    window.location.reload();
                                                                }
                                                            }}
                                                            className="bg-orange-600 text-white p-2 rounded-lg hover:scale-110 transition-all shadow-lg no-print"
                                                        >
                                                            <Printer size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-left flex flex-col items-end">
                                                    <span className="text-[10px] font-black text-gray-400 font-sans tracking-tighter">#{r.orderNumber}</span>
                                                    <span className="text-[10px] font-bold text-gray-500">{new Date(r.orderDate).toLocaleString('ar-DZ')}</span>
                                                </div>
                                            </div>
                                            <div className="bg-orange-100/30 p-3 rounded-xl border border-orange-100">
                                                <p className="text-[9px] font-black text-orange-800 mb-2 border-b border-orange-200 pb-1 uppercase tracking-tighter text-right">السلع المسترجعة</p>
                                                <div className="space-y-1">
                                                    {r.items?.map((item: any, i: number) => (
                                                        <div key={i} className="flex justify-between items-center text-[10px] font-bold text-gray-600">
                                                            <span className="font-sans">({item.quantity}) x {item.unitPrice.toLocaleString()} دج</span>
                                                            <span className="text-gray-900">{item.product?.name}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* Individual Return Template (Hidden) */}
                                            <div id={`return-receipt-${r.id}`} className="hidden">
                                                <div className="p-10 font-sans text-left" dir="ltr">
                                                    <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                                                        <h1 className="text-3xl font-black uppercase">BON DE RETOUR</h1>
                                                        <p className="text-xl font-black text-blue-600 uppercase">SKR Stock</p>
                                                    </div>
                                                    <div className="space-y-8">
                                                        <div className="flex justify-between border-b border-gray-100 py-4">
                                                            <span className="text-gray-500 font-bold uppercase text-xs">Réf Retour:</span>
                                                            <span className="font-black font-sans">{r.orderNumber}</span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-gray-100 py-4">
                                                            <span className="text-gray-500 font-bold uppercase text-xs">Date:</span>
                                                            <span className="font-black">{new Date(r.orderDate).toLocaleString('fr-FR')}</span>
                                                        </div>
                                                        <div className="flex justify-between border-b border-gray-100 py-4">
                                                            <span className="text-gray-500 font-bold uppercase text-xs">Client:</span>
                                                            <span className="font-black">{customer.name}</span>
                                                        </div>
                                                        <div className="mt-6">
                                                            <p className="font-black border-b border-gray-200 pb-2 mb-4 uppercase text-xs">Articles Retournés:</p>
                                                            <table className="w-full text-left">
                                                                <thead className="bg-gray-100 font-black text-[10px] uppercase">
                                                                    <tr><th className="p-2">Désignation</th><th className="p-2 text-center">Qté</th><th className="p-2 text-right">P.U</th><th className="p-2 text-right">Total</th></tr>
                                                                </thead>
                                                                <tbody>
                                                                    {r.items?.map((it: any, j: number) => (
                                                                        <tr key={j} className="border-b border-gray-50 font-bold text-xs">
                                                                            <td className="p-2">{it.product?.name}</td><td className="p-2 text-center">{it.quantity}</td><td className="p-2 text-right">{it.unitPrice.toLocaleString()}</td><td className="p-2 text-right">{(it.quantity * it.unitPrice).toLocaleString()}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                                <tfoot>
                                                                    <tr className="bg-gray-900 text-white font-black"><td colSpan={3} className="p-3 text-right uppercase">Valeur du Retour:</td><td className="p-3 text-right">{r.total.toLocaleString()} DZD</td></tr>
                                                                </tfoot>
                                                            </table>
                                                        </div>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-20 mt-20 text-center">
                                                        <div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs tracking-widest">Cachet et Signature</div>
                                                        <div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs tracking-widest">Signature Client</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Full Returns Template for Print (Hidden) */}
                            <div id="full-returns-print" className="hidden">
                                <div className="p-10 font-sans text-left" dir="ltr">
                                    <div className="flex justify-between items-center border-b-2 border-gray-900 pb-4 mb-6 uppercase">
                                        <h1 className="text-2xl font-black">Historique des Retours</h1>
                                        <p className="text-xl font-black text-blue-600">SKR Stock</p>
                                    </div>
                                    <div className="mb-10">
                                        <p className="text-xs font-bold text-gray-400 uppercase">Client:</p>
                                        <p className="text-xl font-black uppercase">{customer.name}</p>
                                        <p className="text-sm font-bold text-gray-600 font-sans">Réf Facture: {showReturnsModal.invoiceNumber}</p>
                                    </div>
                                    <table className="w-full text-left border-collapse">
                                        <thead className="bg-gray-100 uppercase text-[10px] font-black">
                                            <tr><th className="p-3">Date</th><th className="p-3">Réf</th><th className="p-3 text-right">Valeur</th></tr>
                                        </thead>
                                        <tbody>
                                            {showReturnsModal.returns?.map((ret: any) => (
                                                <tr key={ret.id} className="border-b border-gray-100 font-bold text-sm">
                                                    <td className="p-3 font-sans">{new Date(ret.orderDate).toLocaleDateString('fr-FR')}</td>
                                                    <td className="p-3 font-sans">{ret.orderNumber}</td>
                                                    <td className="p-3 text-right font-sans">{ret.total.toLocaleString()} DZD</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                        <tfoot>
                                            <tr className="bg-gray-900 text-white font-black uppercase">
                                                <td colSpan={2} className="p-4 text-right">Total des Retours:</td>
                                                <td className="p-4 text-right">{(showReturnsModal.returns?.reduce((sum: number, r: any) => sum + (r.total || 0), 0) || 0).toLocaleString()} DZD</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}


                {/* PAYMENT MODAL (Exact from Invoices page) */}
                {showPaymentModal && (
                    <div className="fixed inset-0 z-[200] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
                        <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gray-50/30">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">تسجيل دفعة مالية</h2>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{showPaymentModal.invoiceNumber}</p>
                                </div>
                                <button onClick={() => setShowPaymentModal(null)} className="text-gray-400 hover:text-gray-900 transition-colors p-2"><X size={24} /></button>
                            </div>

                            <div className="p-8 flex flex-col gap-6">
                                <div className={`p-6 ${showPaymentModal.isGlobal ? 'bg-amber-50 border-amber-100' : 'bg-blue-50 border-blue-100'} rounded-3xl border flex items-center justify-between`}>
                                    <div>
                                        <p className={`text-[10px] font-black ${showPaymentModal.isGlobal ? 'text-amber-800' : 'text-blue-800'} uppercase mb-1`}>
                                            {showPaymentModal.isGlobal ? 'إجمالي الديون المستحقة' : 'المبلغ المتبقي للفاتورة'}
                                        </p>
                                        <p className={`text-2xl font-black ${showPaymentModal.isGlobal ? 'text-amber-900' : 'text-blue-900'} font-sans`}>{showPaymentModal.remaining.toLocaleString()} دج</p>
                                    </div>
                                    <div className={`${showPaymentModal.isGlobal ? 'bg-amber-600 shadow-amber-200' : 'bg-blue-600 shadow-blue-200'} p-3 rounded-2xl text-white shadow-lg`}>
                                        {showPaymentModal.isGlobal ? <CreditCard size={24} /> : <ArrowDownLeft size={24} />}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">المبلغ المحصل (دج)</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                value={paymentAmount || ''}
                                                onChange={e => setPaymentAmount(Math.min(showPaymentModal.remaining, parseFloat(e.target.value) || 0))}
                                                className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-black font-sans text-lg focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                                placeholder="0"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">وسيلة الدفع</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { id: 'CASH', label: 'نقداً', icon: '💵' },
                                                { id: 'CHEQUE', label: 'شيك', icon: '📝' },
                                                { id: 'BANK_TRANSFER', label: 'تحويل', icon: '🏛️' }
                                            ].map(method => (
                                                <button
                                                    key={method.id}
                                                    type="button"
                                                    onClick={() => setPaymentMethod(method.id as any)}
                                                    className={`py-3 px-2 rounded-2xl border-2 font-black text-xs transition-all flex flex-col items-center gap-1 ${paymentMethod === method.id ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-lg shadow-blue-200/50' : 'border-gray-100 hover:border-gray-200 text-gray-500'}`}
                                                >
                                                    <span className="text-xl">{method.icon}</span>
                                                    {method.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {(paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') && (
                                        <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top duration-300">
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">رقم الوثيقة</label>
                                                <input
                                                    type="text"
                                                    value={chequeNumber}
                                                    onChange={e => setChequeNumber(e.target.value)}
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                                    placeholder="00000000"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">البنك</label>
                                                <select
                                                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all text-sm"
                                                    value={bankName}
                                                    onChange={e => setBankName(e.target.value)}
                                                >
                                                    <option value="">اختر البنك...</option>
                                                    <option value="Algérie Poste (بريد الجزائر)">Algérie Poste (بريد الجزائر)</option>
                                                    <option value="BNA (البنك الوطني الجزائري)">BNA (البنك الوطني الجزائري)</option>
                                                    <option value="CPA (القرض الشعبي الجزائري)">CPA (القرض الشعبي الجزائري)</option>
                                                    <option value="BADR (الفلاحة والتنمية الريفية)">BADR (الفلاحة والتنمية الريفية)</option>
                                                    <option value="BDL (بنك التنمية المحلية)">BDL (بنك التنمية المحلية)</option>
                                                    <option value="CNEP (الصندوق للتوفير والاحتياط)">CNEP (الصندوق للتوفير والاحتياط)</option>
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
                                                    <option value="OTHER">بنك آخر</option>
                                                </select>
                                            </div>
                                        </div>
                                    )}

                                    <div>
                                        <label className="block text-sm font-bold text-gray-700 mb-2 mr-1">ملاحظات (اختياري)</label>
                                        <textarea
                                            value={paymentNotes}
                                            onChange={e => setPaymentNotes(e.target.value)}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 text-sm font-bold focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                                            placeholder="ذكر أي تفاصيل إضافية..."
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 pt-0">
                                <button
                                    onClick={handleRecordPayment}
                                    disabled={isSubmitting || paymentAmount <= 0}
                                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-20 text-white h-16 rounded-2xl font-black text-lg transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3"
                                >
                                    {isSubmitting ? 'جاري الحفظ...' : <><CheckCircle size={24} /> تأكيد استلام المبلغ</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}


                {/* PROJECT SHEET (Creation) */}
                {isProjectSheetOpen && (
                    <div className="fixed inset-0 z-[200] flex justify-end">
                        <div className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm" onClick={() => setIsProjectSheetOpen(false)} />
                        <div className="bg-white w-full max-w-lg h-full z-10 p-10 flex flex-col shadow-2xl animate-in slide-in-from-right duration-500 overflow-y-auto">
                            <div className="flex justify-between items-center mb-10">
                                <h2 className="text-3xl font-black text-gray-900">إضافة مشروع</h2>
                                <button onClick={() => setIsProjectSheetOpen(false)} className="text-gray-400 p-2"><X size={24} /></button>
                            </div>
                            
                            {/* Keyboard Navigation Helper */}
                            {(() => {
                                const handleKeyDown = (e: React.KeyboardEvent, nextId?: string, prevId?: string) => {
                                    if (e.key === 'Enter') {
                                        e.preventDefault();
                                        if (nextId) document.getElementById(nextId)?.focus();
                                    } else if (e.key === 'ArrowRight') {
                                        if (prevId) document.getElementById(prevId)?.focus();
                                    }
                                };
                                return null;
                            })()}

                            <div className="space-y-8 flex-1">
                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between items-center">
                                        <span>اسم المشروع</span>
                                        <span className="text-red-500 font-sans">*</span>
                                    </label>
                                    <input 
                                        id="project-name"
                                        type="text" 
                                        value={projectData.name} 
                                        onChange={e => {
                                            setProjectData({ ...projectData, name: e.target.value });
                                            setProjectTouched(prev => ({ ...prev, name: true }));
                                        }} 
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('project-address')?.focus();
                                            }
                                        }}
                                        className={`w-full bg-gray-50 border rounded-2xl px-6 py-4 font-black outline-none transition-all ${projectTouched.name && !projectValidations.name ? 'border-red-500 bg-red-50' : 'border-gray-100 focus:bg-white focus:border-blue-500'}`} 
                                        placeholder="مثال: بناء فيلا المسيلة..." 
                                        autoFocus
                                    />
                                    {projectTouched.name && !projectValidations.name && (
                                        <p className="text-red-500 text-[10px] font-black animate-in fade-in slide-in-from-top-1">⚠️ يجب أن يتكون الاسم من كلمتين على الأقل</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest flex justify-between items-center">
                                        <span>عنوان المشروع</span>
                                        <span className="text-red-500 font-sans">*</span>
                                    </label>
                                    <input 
                                        id="project-address"
                                        type="text" 
                                        value={projectData.address} 
                                        onChange={e => {
                                            setProjectData({ ...projectData, address: e.target.value });
                                            setProjectTouched(prev => ({ ...prev, address: true }));
                                        }} 
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('project-date')?.focus();
                                            } else if (e.key === 'ArrowRight') {
                                                document.getElementById('project-name')?.focus();
                                            }
                                        }}
                                        className={`w-full bg-gray-50 border rounded-2xl px-6 py-4 font-black outline-none transition-all ${projectTouched.address && !projectValidations.address ? 'border-red-500 bg-red-50' : 'border-gray-100 focus:bg-white focus:border-blue-500'}`} 
                                        placeholder="المنطقة، الشارع، البلدية..." 
                                    />
                                    {projectTouched.address && !projectValidations.address && (
                                        <p className="text-red-500 text-[10px] font-black animate-in fade-in slide-in-from-top-1">⚠️ يجب أن يتكون العنوان من 3 كلمات على الأقل</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">تاريخ البدء</label>
                                    <input 
                                        id="project-date"
                                        type="date" 
                                        value={projectData.startDate} 
                                        onChange={e => setProjectData({ ...projectData, startDate: e.target.value })} 
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                document.getElementById('project-desc')?.focus();
                                            } else if (e.key === 'ArrowRight') {
                                                document.getElementById('project-address')?.focus();
                                            }
                                        }}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black outline-none font-sans" 
                                    />
                                </div>

                                <div className="flex flex-col gap-2">
                                    <label className="text-xs font-black text-gray-400 uppercase tracking-widest">وصف المشروع (اختياري)</label>
                                    <textarea 
                                        id="project-desc"
                                        value={projectData.description} 
                                        onChange={e => setProjectData({ ...projectData, description: e.target.value })} 
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && e.ctrlKey) { // For textarea, maybe Ctrl+Enter for next? 
                                                // User said Enter for next. But textarea usually uses Enter for newline.
                                                // I'll stick to user's "Enter key for the next" even for textarea if it's a small field?
                                                // Actually, if it's a textarea, Enter is for newline.
                                                // I'll use ArrowRight for previous as requested.
                                            } else if (e.key === 'ArrowRight' && e.currentTarget.selectionStart === 0) {
                                                document.getElementById('project-date')?.focus();
                                            }
                                        }}
                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-6 py-4 font-black outline-none min-h-[120px] focus:bg-white focus:border-blue-500 transition-all" 
                                        placeholder="أي تفاصيل إضافية عن المشروع..." 
                                    />
                                </div>
                            </div>
                            <button 
                                onClick={handleCreateProject} 
                                disabled={!projectValidations.name || !projectValidations.address || !projectData.startDate || isSubmitting}
                                className="mt-8 w-full bg-blue-600 disabled:opacity-30 disabled:grayscale disabled:scale-100 text-white py-5 rounded-3xl font-black text-lg shadow-xl shadow-blue-100 hover:scale-105 transition-all"
                            >
                                {isSubmitting ? 'جاري الإنشاء...' : 'إنشاء المشروع وحفظه'}
                            </button>
                        </div>
                    </div>
                )}

                {/* EDIT CUSTOMER SIDEBAR (SHEET STYLE) */}
                {isEditModalOpen && (
                    <>
                        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[200] transition-opacity duration-300" onClick={() => setIsEditModalOpen(false)} />
                        <div className="fixed top-0 bottom-0 left-0 w-full max-w-lg bg-white shadow-2xl z-[210] flex flex-col animate-in slide-in-from-left duration-500 overflow-hidden">
                            {/* Header */}
                            <div className="p-8 w-full flex items-center justify-between bg-[#8b5cf6] text-white shadow-lg">
                                <div>
                                    <h2 className="text-2xl font-black flex items-center gap-3">
                                        <Edit size={28} className="bg-white/20 p-1 rounded-lg" /> تعديل بيانات العميل
                                    </h2>
                                    <p className="text-white/70 text-xs font-bold mt-1 tracking-tight uppercase">تحديث معلومات العميل في قاعدة البيانات</p>
                                </div>
                                <button onClick={() => setIsEditModalOpen(false)} className="bg-white/10 hover:bg-white/20 text-white rounded-2xl p-2 transition-all active:scale-90">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-10 bg-gray-50/30" onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    const form = e.currentTarget;
                                    const focusableElements = Array.from(form.querySelectorAll('input:not([type="hidden"]), select, textarea'));
                                    const index = focusableElements.indexOf(e.target as any);
                                    if (index > -1 && index < focusableElements.length - 1) {
                                        e.preventDefault();
                                        (focusableElements[index + 1] as HTMLElement).focus();
                                    }
                                }
                            }}>
                                
                                {/* Section 1: Basic Info - VIOLET */}
                                <div className="space-y-6 p-6 bg-white border-2 border-violet-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-violet-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-8 bg-violet-500 rounded-full"></div>
                                        <h3 className="text-sm font-black text-violet-600 uppercase tracking-widest">المعلومات الشخصية</h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-5">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">اسم العميل <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={editData.name || ''}
                                                onChange={e => setEditData({ ...editData, name: e.target.value.toUpperCase() })}
                                                onBlur={() => setFieldTouched('name')}
                                                placeholder="مثال: محمد الأمين..."
                                                className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none transition-all
                                                    ${touched.name && !editValidations?.name ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`}
                                                required
                                            />
                                            {touched.name && !editValidations?.name && (
                                                <p className="text-[10px] text-red-500 font-bold mr-2 animate-bounce">
                                                    يجب إدخال اسم العميل (كلمتان على الأقل).
                                                </p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">النشاط التجاري (اختياري)</label>
                                            <input
                                                type="text"
                                                value={editData.activity || ''}
                                                onChange={e => setEditData({ ...editData, activity: e.target.value.toUpperCase() })}
                                                placeholder="أدخل النشاط التجاري هنا..."
                                                className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white transition-all"
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم الهاتف <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <input
                                                    type="text"
                                                    maxLength={10}
                                                    value={editData.phone || ''}
                                                    onChange={e => {
                                                        const val = e.target.value.replace(/\D/g, '');
                                                        if (val.length === 1 && val[0] !== '0') return;
                                                        if (val.length === 2 && !['5', '6', '7'].includes(val[1])) return;
                                                        setEditData({ ...editData, phone: val });
                                                    }}
                                                    onBlur={() => setFieldTouched('phone')}
                                                    placeholder="05 / 06 / 07 ..."
                                                    className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-12 py-3.5 text-gray-900 font-bold font-sans transition-all
                                                        ${touched.phone && !editValidations?.phone ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`}
                                                    dir="ltr"
                                                />
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-violet-400 transition-colors">
                                                    <Phone size={18} />
                                                </div>
                                            </div>
                                            {touched.phone && !editValidations?.phone && (
                                                <p className="text-[10px] text-red-500 font-bold mr-2">رقم الهاتف غير صحيح.</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">البريد الإلكتروني (اختياري)</label>
                                            <input
                                                type="email"
                                                value={editData.email || ''}
                                                onChange={e => setEditData({ ...editData, email: e.target.value })}
                                                onBlur={() => setFieldTouched('email')}
                                                placeholder="example@domain.com"
                                                className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                    ${touched.email && !editValidations?.email ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-violet-400 focus:ring-4 focus:ring-violet-400/10 focus:bg-white'}`}
                                            />
                                        </div>
                                    </div>
                                </div>

                            {/* Section 2: Account Settings - BLUE */}
                            <div className="space-y-6 p-6 bg-white border-2 border-blue-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-blue-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-blue-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest">نوع الحساب والائتمان</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                    <div className="grid grid-cols-2 gap-4">
                                        <button 
                                            onClick={() => setEditData({ ...editData, type: 'REGULAR', creditLimit: 0 })}
                                            className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${editData.type === 'REGULAR' ? 'border-blue-500 bg-blue-50/50 shadow-inner scale-95' : 'border-gray-50 bg-gray-50/30 hover:border-blue-200 hover:bg-white'}`}
                                        >
                                            <div className={`p-2 rounded-xl ${editData.type === 'REGULAR' ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
                                                <Users size={22} />
                                            </div>
                                            <span className={`text-xs font-black ${editData.type === 'REGULAR' ? 'text-blue-700' : 'text-gray-500'}`}>بدون سقف ائتماني</span>
                                        </button>
                                        <button 
                                            onClick={() => setEditData({ ...editData, type: 'LOYAL' })}
                                            className={`p-5 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${editData.type === 'LOYAL' ? 'border-blue-500 bg-blue-50/50 shadow-inner scale-95' : 'border-gray-50 bg-gray-50/30 hover:border-blue-200 hover:bg-white'}`}
                                        >
                                            <div className={`p-2 rounded-xl ${editData.type === 'LOYAL' ? 'bg-blue-500 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>
                                                <CreditCard size={22} />
                                            </div>
                                            <span className={`text-xs font-black ${editData.type === 'LOYAL' ? 'text-blue-700' : 'text-gray-500'}`}>بسقف ائتماني</span>
                                        </button>
                                    </div>

                                    {editData.type === 'LOYAL' && (
                                        <div className="animate-in zoom-in-95 duration-300">
                                            <div className="bg-blue-50/80 p-4 rounded-2xl border-2 border-blue-100 mb-5 flex items-start gap-3">
                                                <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                                                <p className="text-[10px] text-blue-800 font-bold leading-relaxed">
                                                    تحديد سقف ائتماني يسمح للعميل بالتعامل بالدين حتى مبلغ معين. سيتم تنبيهك عند اقتراب العميل من هذا السقف.
                                                </p>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">الحد الائتماني (اختياري)</label>
                                                <div className="relative group">
                                                    <input
                                                        type="text"
                                                        dir="ltr"
                                                        value={String(editData.creditLimit || '').replace(/\D/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
                                                        onChange={e => setEditData({ ...editData, creditLimit: parseFloat(e.target.value.replace(/\D/g, '')) || 0 })}
                                                        onBlur={() => setFieldTouched('creditLimit')}
                                                        placeholder="100 000"
                                                        className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-14 py-3.5 text-gray-900 font-black font-sans text-right focus:outline-none transition-all
                                                            ${touched.creditLimit && !editValidations?.creditLimit ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-blue-400 focus:ring-4 focus:ring-blue-400/10 focus:bg-white'}`}
                                                    />
                                                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-blue-400/50 uppercase tracking-widest group-focus-within:text-blue-500 transition-colors">DZD</span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Section 3: Location - EMERALD */}
                            <div className="space-y-6 p-6 bg-white border-2 border-emerald-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-emerald-200">
                                <div className="flex items-center gap-3">
                                    <div className="w-2 h-8 bg-emerald-500 rounded-full"></div>
                                    <h3 className="text-sm font-black text-emerald-600 uppercase tracking-widest">الموقع الجغرافي</h3>
                                </div>
                                <div className="grid grid-cols-1 gap-5">
                                    {/* Wilaya */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">الولاية <span className="text-red-500">*</span></label>
                                        <select
                                            value={editData.wilaya || ''}
                                            onChange={e => {
                                                const w = ALGERIA_LOCATIONS.find(l => l.name === e.target.value);
                                                const firstCommune = w?.communes?.[0];
                                                setEditData({ ...editData, wilaya: e.target.value, commune: firstCommune?.name || '', postalCode: firstCommune?.postCode || '' });
                                            }}
                                            onBlur={() => setFieldTouched('wilaya')}
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-4 py-3.5 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer
                                                ${touched.wilaya && !editValidations?.wilaya ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-emerald-400 focus:bg-white'}`}
                                        >
                                            <option value="" disabled>اختر الولاية...</option>
                                            {ALGERIA_LOCATIONS.map(w => (
                                                <option key={w.id} value={w.name}>{w.id} - {w.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Commune */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">البلدية <span className="text-red-500">*</span></label>
                                        <select
                                            value={editData.commune || ''}
                                            onChange={e => {
                                                const selectedWilaya = ALGERIA_LOCATIONS.find(l => l.name.toLowerCase() === editData.wilaya?.toLowerCase());
                                                const selectedCommune = selectedWilaya?.communes?.find(c => c.name === e.target.value);
                                                setEditData({ ...editData, commune: e.target.value, postalCode: selectedCommune?.postCode || '' });
                                            }}
                                            onBlur={() => setFieldTouched('commune')}
                                            className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-4 py-3.5 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer
                                                ${touched.commune && !editValidations?.commune ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-emerald-400 focus:bg-white'}`}
                                        >
                                            <option value="" disabled>اختر البلدية...</option>
                                            {(ALGERIA_LOCATIONS.find(l => l.name.toLowerCase() === editData.wilaya?.toLowerCase())?.communes || []).map(c => (
                                                <option key={c.name} value={c.name}>{c.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Postal Code (auto-filled) */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">الرمز البريدي</label>
                                        <div className="relative">
                                            <input
                                                type="text"
                                                dir="ltr"
                                                readOnly
                                                value={editData.postalCode || ''}
                                                placeholder="يُملأ تلقائياً"
                                                className="w-full bg-emerald-50/60 border-2 border-emerald-100 rounded-[1.2rem] px-5 py-3.5 text-emerald-700 font-black font-mono text-center focus:outline-none cursor-default select-all"
                                            />
                                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-emerald-400/70 uppercase tracking-widest">CP</span>
                                        </div>
                                    </div>
                                    {/* Address detail */}
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">العنوان بالتفصيل</label>
                                        <div className="relative group">
                                            <input
                                                type="text"
                                                value={editData.address || ''}
                                                onChange={e => setEditData({ ...editData, address: e.target.value.toUpperCase() })}
                                                placeholder="اختياري (الشارع، رقم الباب...)"
                                                className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-400/10 focus:bg-white transition-all"
                                            />
                                            <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-emerald-400 transition-colors" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                                {/* Section 4: Legal & Tax - AMBER */}
                                <div className="space-y-6 p-6 bg-white border-2 border-amber-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-amber-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-8 bg-amber-500 rounded-full"></div>
                                        <h3 className="text-sm font-black text-amber-600 uppercase tracking-widest">المعلومات الجبائية والقانونية</h3>
                                    </div>
                                    <div className="grid grid-cols-1 gap-5">
                                        {/* RC Field */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم السجل التجاري (RC)</label>
                                            <input
                                                type="text"
                                                value={editData.rc || ''}
                                                onChange={e => setEditData({ ...editData, rc: e.target.value.toUpperCase() })}
                                                onBlur={() => setFieldTouched('rc')}
                                                placeholder="WW/YY-NNNNNNN B"
                                                className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                    ${rcInfo ? (rcInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                            />
                                            {rcInfo && (
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${rcInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                    {rcInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                    <p className="text-[10px] font-bold">{rcInfo.valid ? rcInfo.breakdown : rcInfo.error}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* NIF Field */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم التعريف الجبائي (NIF)</label>
                                            <input
                                                type="text"
                                                value={editData.nif || ''}
                                                onChange={e => setEditData({ ...editData, nif: e.target.value.replace(/\s/g, '') })}
                                                onBlur={() => setFieldTouched('nif')}
                                                placeholder="15 أو 20 رقماً..."
                                                className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                    ${nifInfo ? (nifInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                            />
                                            {nifInfo && (
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${nifInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                    {nifInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                    <p className="text-[10px] font-bold">{nifInfo.valid ? nifInfo.breakdown : nifInfo.error}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* AI Field */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم المادة (AI)</label>
                                            <input
                                                type="text"
                                                value={editData.ai || ''}
                                                onChange={e => setEditData({ ...editData, ai: e.target.value.toUpperCase() })}
                                                onBlur={() => setFieldTouched('ai')}
                                                placeholder="مثال: B 123456"
                                                className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                    ${aiInfo ? (aiInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                            />
                                            {aiInfo && (
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${aiInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                    {aiInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                    <p className="text-[10px] font-bold">{aiInfo.valid ? aiInfo.breakdown : aiInfo.error}</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* NIS Field */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم التعريف الإحصائي (NIS)</label>
                                            <input
                                                type="text"
                                                value={editData.nis || ''}
                                                onChange={e => setEditData({ ...editData, nis: e.target.value.replace(/\s/g, '') })}
                                                onBlur={() => setFieldTouched('nis')}
                                                placeholder="15 أو 18 رقماً..."
                                                className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold font-sans focus:outline-none transition-all
                                                    ${nisInfo ? (nisInfo.valid ? 'border-emerald-200 focus:border-emerald-400 bg-emerald-50/20' : 'border-red-200 focus:border-red-400 bg-red-50/20') : 'border-transparent focus:border-amber-400'}`}
                                            />
                                            {nisInfo && (
                                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${nisInfo.valid ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'}`}>
                                                    {nisInfo.valid ? <Check size={12} /> : <X size={12} />}
                                                    <p className="text-[10px] font-bold">{nisInfo.valid ? nisInfo.breakdown : nisInfo.error}</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-8 border-t border-gray-100 bg-white flex gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                                <button
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-[1.2rem] font-black text-sm hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    إلغاء
                                </button>
                                <button
                                    onClick={handleEditCustomer}
                                    disabled={!isEditValid || isSubmitting}
                                    className={`flex-[2] py-4 rounded-[1.2rem] font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95
                                        ${isEditValid 
                                            ? 'bg-[#8b5cf6] text-white shadow-violet-200 hover:bg-[#7c3aed] hover:shadow-violet-300' 
                                            : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'}`}
                                >
                                    {isSubmitting ? 'جاري الحفظ...' : <><Edit size={20} /> حفظ التعديلات</>}
                                </button>
                            </div>
                        </div>
                    </>
                )}


                {/* RETURN MODAL */}
                {returnModal && (
                    <div className="fixed inset-0 z-[300] bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4">
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-amber-50">
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900">تأكيد الاسترجاع</h2>
                                    <p className="text-xs font-bold text-amber-600 mt-1">{returnModal.item.product?.name}</p>
                                </div>
                                <button onClick={() => setReturnModal(null)} className="text-gray-400 hover:text-gray-900 p-2"><X size={24} /></button>
                            </div>
                            <div className="p-8 flex flex-col gap-6">
                                <div className="p-5 bg-amber-50 rounded-3xl border border-amber-100 flex justify-between items-center">
                                    <div>
                                        <p className="text-[10px] font-black text-amber-700 uppercase mb-1">الحد الأقصى للاسترجاع</p>
                                        <p className="text-2xl font-black text-amber-900 font-sans">{returnModal.maxQty} <span className="text-sm">{returnModal.item.product?.unit || 'وحدة'}</span></p>
                                    </div>
                                    <div className="bg-amber-500 p-3 rounded-2xl text-white"><RotateCcw size={24} /></div>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-gray-700 mb-2">الكمية المُسترجعة</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="number"
                                            value={returnQty}
                                            min={1}
                                            max={returnModal.maxQty}
                                            onChange={e => setReturnQty(Math.min(returnModal.maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
                                            className="flex-1 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 font-black font-sans text-lg focus:bg-white focus:ring-4 focus:ring-amber-100 outline-none"
                                        />
                                        <button onClick={() => setReturnQty(returnModal.maxQty)} className="text-xs font-black bg-amber-100 text-amber-700 px-4 py-3 rounded-2xl hover:bg-amber-200 transition-all whitespace-nowrap">
                                            الكل ({returnModal.maxQty})
                                        </button>
                                    </div>
                                </div>
                                <div className="p-4 bg-gray-50 rounded-2xl flex justify-between items-center">
                                    <span className="text-sm font-black text-gray-600">قيمة الاسترجاع:</span>
                                    <span className="text-xl font-black text-amber-600 font-sans">{(returnQty * (returnModal.item.unitPrice || 0)).toLocaleString()} دج</span>
                                </div>
                                <button
                                    onClick={handleReturn}
                                    disabled={isReturning || returnQty <= 0}
                                    className="w-full bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white h-16 rounded-2xl font-black text-lg transition-all shadow-xl shadow-amber-100 flex items-center justify-center gap-3"
                                >
                                    {isReturning ? 'جاري الاسترجاع...' : <><RotateCcw size={22} /> تأكيد الاسترجاع</>}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
