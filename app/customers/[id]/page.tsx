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
import DateRangePicker from '@/components/DateRangePicker';


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
    
    // Form states for returns (from Invoices page)
    const [returnQtys, setReturnQtys] = useState<Record<number, number>>({});
    const [showReturnModal, setShowReturnModal] = useState<any | null>(null);
    const [showReturnSuccessModal, setShowReturnSuccessModal] = useState(false);
    const [lastReturnResult, setLastReturnResult] = useState<any | null>(null);
    const [showReturnsHistoryModal, setShowReturnsHistoryModal] = useState<any | null>(null);
    const [showRefundConfirmModal, setShowRefundConfirmModal] = useState<any | null>(null);
    const [showRefundSuccessModal, setShowRefundSuccessModal] = useState(false);
    
    // Payment Form (Exact from Invoices page)
    const [paymentAmount, setPaymentAmount] = useState<number>(0);
    const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'BANK_TRANSFER' | 'CHEQUE'>('CASH');
    const [chequeNumber, setChequeNumber] = useState('');
    const [bankName, setBankName] = useState('');
    const [paymentBank, setPaymentBank] = useState('BADR');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);
    const [projectData, setProjectData] = useState({ 
        name: '', 
        description: '', 
        address: '', 
        wilaya: '',
        commune: '',
        postalCode: '',
        startDate: new Date().toISOString().split('T')[0] 
    });

    const [expandedProjects, setExpandedProjects] = useState<number[]>([]);
    
    // SOA Filters
    const [soaSearchQuery, setSoaSearchQuery] = useState('');
    const [soaMotifFilter, setSoaMotifFilter] = useState('ALL');
    const [soaMethodFilter, setSoaMethodFilter] = useState('ALL');
    const [soaDateFrom, setSoaDateFrom] = useState('');
    const [soaDateTo, setSoaDateTo] = useState('');
    const [soaProjectFilter, setSoaProjectFilter] = useState('ALL');
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

    // Project Order Filters (within modal)
    const [projectOrderSearch, setProjectOrderSearch] = useState('');
    const [projectOrderStatusFilter, setProjectOrderStatusFilter] = useState('ALL');
    const [projectOrderDateFrom, setProjectOrderDateFrom] = useState('');
    const [projectOrderDateTo, setProjectOrderDateTo] = useState('');
    const [projectOrderCurrentPage, setProjectOrderCurrentPage] = useState(1);
    const projectOrderItemsPerPage = 10;

    // Project Filters/Sort
    const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ACTIVE');
    const [projectFinanceFilter, setProjectFinanceFilter] = useState<'ALL' | 'PAID' | 'DEBT' | 'SURPLUS'>('ALL');
    const [projectSortBy, setProjectSortBy] = useState<'RECENT' | 'OLD' | 'ALPHA' | 'ORDERS' | 'PURCHASES'>('RECENT');
    const [projectSearchQuery, setProjectSearchQuery] = useState('');
    const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);

    const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
    const dropdownRef = React.useRef<HTMLDivElement>(null);
    const modalDropdownRef = React.useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const isInsideMain = dropdownRef.current && dropdownRef.current.contains(event.target as Node);
            const isInsideModal = modalDropdownRef.current && modalDropdownRef.current.contains(event.target as Node);
            
            if (!isInsideMain && !isInsideModal) {
                setActiveDropdown(null);
            }
        };
        if (activeDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [activeDropdown]);

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
        wilaya: true, // Optional
        commune: true, // Optional
        description: true, // Optional (but let's keep validation logic if needed)
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
                setPayments(await payRes.json());
            }
            // Fetch settings for receipts
            const settRes = await fetch('/api/settings');
            if (settRes.ok) setSettings(await settRes.json());
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchCustomer();
    }, [id]);

    useEffect(() => {
        if (customer) {
            setSoaRange((prev: any) => ({ ...prev, start: new Date(customer.createdAt).toISOString().split('T')[0] }));
        }
    }, [customer]);

    const fetchPaymentHistory = async (invoice: any) => {
        try {
            const response = await fetch(`/api/invoices/${invoice.id}/payments`);
            if (response.ok) {
                const data = await response.json();
                const updatedInvoice = { ...invoice, payments: data };
                setShowHistoryModal(updatedInvoice);
            }
        } catch (error) {
            console.error('Error fetching payment history:', error);
        }
    };

    const fetchReturnsHistory = async (invoiceId: number) => {
        try {
            const response = await fetch(`/api/invoices/${invoiceId}/returns`);
            if (response.ok) {
                const data = await response.json();
                setShowReturnsHistoryModal(data);
            }
        } catch (error) {
            console.error('Error fetching returns history:', error);
        }
    };


    const handleRefundExcess = async (inv: any) => {
        const remaining = Number(inv.remaining ?? (inv.total - (inv.paid || 0)));
        if (remaining >= 0) {
            alert('لا يوجد رصيد زائد لإرجاعه');
            return;
        }
        setShowRefundConfirmModal(inv);
    };

    const confirmRefund = async () => {
        const inv = showRefundConfirmModal;
        if (!inv) return;

        const remaining = Number(inv.remaining ?? (inv.total - (inv.paid || 0)));
        setIsSubmitting(true);
        try {
            const res = await fetch('/api/payments', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    invoiceId: inv.id,
                    customerId: id,
                    amount: remaining, 
                    paymentMethod: 'CASH',
                    notes: 'إرجاع الرصيد الزائد نقداً (تصفية حساب)'
                })
            });

            if (res.ok) {
                setShowRefundConfirmModal(null);
                setShowRefundSuccessModal(true);
                fetchCustomer();
                if (showHistoryModal && showHistoryModal.id === inv.id) {
                    fetchPaymentHistory(inv);
                }
            } else {
                const err = await res.json();
                alert(err.error || 'فشلت عملية الإرجاع');
            }
        } catch (e) {
            console.error('Refund error:', e);
            alert('خطأ في الاتصال بالخادم');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleReturnQtyChange = (itemId: number, val: number, max: number) => {
        setReturnQtys(prev => ({ ...prev, [itemId]: Math.max(0, Math.min(val, max)) }));
    };

    const handleReturnAll = () => {
        if (!showReturnModal) return;
        const newQtys: Record<number, number> = {};
        showReturnModal.items.forEach((item: any) => {
            const maxReturnable = item.quantity - (item.returnedQuantity || 0);
            if (maxReturnable > 0) {
                newQtys[item.id] = maxReturnable;
            }
        });
        setReturnQtys(newQtys);
    };

    const handleReturnSubmit = async () => {
        if (!showReturnModal) return;
        const selectedItems = showReturnModal.items.filter((i: any) => (returnQtys[i.id] || 0) > 0);
        if (selectedItems.length === 0) {
            alert('يجب اختيار كمية مرتجعة واحدة على الأقل');
            return;
        }

        setIsSubmitting(true);
        try {
            const res = await fetch(`/api/orders/${showReturnModal.id}/return`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    items: selectedItems.map((i: any) => ({
                        orderItemId: i.id,
                        returnQty: returnQtys[i.id]
                    }))
                })
            });
            if (res.ok) {
                const result = await res.json();
                setLastReturnResult(result);
                setShowReturnModal(null);
                setShowReturnSuccessModal(true);
                fetchCustomer();
            } else {
                const err = await res.json();
                alert(`❌ خطأ: ${err.error}`);
            }
        } catch (e) {
            alert('حدث خطأ في الاتصال');
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
                    bankName: (paymentMethod === 'CHEQUE' || paymentMethod === 'BANK_TRANSFER') ? paymentBank : null,
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

        if (!projectValidations.name) { 
            setProjectTouched({ name: true }); 
            return; 
        }
        try {
            let combinedAddress = '';
            if (projectData.wilaya || projectData.commune) {
                combinedAddress = `${projectData.wilaya || ''}${projectData.wilaya && projectData.commune ? ', ' : ''}${projectData.commune || ''}${projectData.postalCode ? ` (${projectData.postalCode})` : ''}`;
            }
            
            const res = await fetch(`/api/customers/${id}/projects`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...projectData,
                    address: combinedAddress
                })
            });
            if (res.ok) {
                setIsProjectSheetOpen(false);
                fetchCustomer();
                setProjectData({ 
                    name: '', 
                    description: '', 
                    address: '', 
                    startDate: new Date().toISOString().split('T')[0] 
                });
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

        // 0. Search Filter
        if (projectSearchQuery.trim()) {
            const query = projectSearchQuery.toLowerCase().trim();
            result = result.filter(p => 
                p.name.toLowerCase().includes(query) ||
                (p.description || '').toLowerCase().includes(query) ||
                (p.address || '').toLowerCase().includes(query)
            );
        }

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
    }, [customer, projectStatusFilter, projectFinanceFilter, projectSortBy, projectSearchQuery]);

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
                    <div 
                        onClick={() => setIsCustomerDetailsOpen(!isCustomerDetailsOpen)}
                        className="px-8 py-10 flex flex-col items-center text-center gap-4 bg-emerald-50/40 cursor-pointer hover:bg-emerald-50 transition-all group relative"
                    >
                        <div className="absolute left-8 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-emerald-600 transition-all">
                            {isCustomerDetailsOpen ? <ChevronUp size={24} /> : <ChevronDown size={24} />}
                        </div>
                        {/* Name + Activity + Edit Button */}
                        <div className="w-full flex items-center justify-between gap-6 max-w-4xl no-print">
                            <div className="flex-1" /> {/* Spacer */}
                            <div className="flex flex-col items-center gap-2 flex-1">
                                <h2 className="text-3xl font-black text-gray-900 tracking-tight">{customer.name}</h2>
                                <span className="px-4 py-1.5 bg-white shadow-sm text-gray-600 rounded-full text-[11px] font-black uppercase tracking-wider border border-emerald-100">
                                    {customer.activity || 'شركة خاصة'}
                                </span>
                            </div>
                            <div className="flex-1 flex justify-end">
                                <button 
                                    onClick={(e) => { 
                                        e.stopPropagation();
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

                    {isCustomerDetailsOpen && (
                        <div className="px-8 pb-8 flex flex-col gap-8 animate-in fade-in slide-in-from-top-4 duration-500">


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
                )}
            </div>


                <div className="mt-8 flex flex-col gap-6">
                    <div className="flex items-center gap-8 no-print border-b border-gray-100 px-4">
                        <button 
                            onClick={() => setActiveTab('PROJECTS')} 
                            className={`pb-4 px-2 text-sm font-black transition-all flex items-center gap-2 relative ${activeTab === 'PROJECTS' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Briefcase size={16} /> المشاريع
                            {activeTab === 'PROJECTS' && <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900 rounded-full animate-in slide-in-from-bottom-1 duration-300"></div>}
                        </button>
                        
                        <button 
                            onClick={() => setActiveTab('ORDERS')} 
                            className={`pb-4 px-2 text-sm font-black transition-all flex items-center gap-2 relative ${activeTab === 'ORDERS' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <ShoppingCart size={16} /> طلبيات عامة
                            {(() => {
                                const generalOrders = (customer?.orders || []).filter((o: any) => !o.projectId && o.type === 'SALE');
                                if (generalOrders.length > 0) {
                                    return <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${activeTab === 'ORDERS' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>{generalOrders.length}</span>;
                                }
                                return null;
                            })()}
                            {activeTab === 'ORDERS' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-full animate-in slide-in-from-bottom-1 duration-300"></div>}
                        </button>
                        
                        <button 
                            onClick={() => setActiveTab('PRODUCTS')} 
                            className={`pb-4 px-2 text-sm font-black transition-all flex items-center gap-2 relative ${activeTab === 'PRODUCTS' ? 'text-orange-600' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Star size={16} /> المنتجات الأكثر طلباً
                            {activeTab === 'PRODUCTS' && <div className="absolute bottom-0 left-0 w-full h-1 bg-orange-600 rounded-full animate-in slide-in-from-bottom-1 duration-300"></div>}
                        </button>
                        
                        <button 
                            onClick={() => setActiveTab('SOA')} 
                            className={`pb-4 px-2 text-sm font-black transition-all flex items-center gap-2 relative ${activeTab === 'SOA' ? 'text-[#8b5cf6]' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            <Printer size={16} /> كشف الحساب
                            {activeTab === 'SOA' && <div className="absolute bottom-0 left-0 w-full h-1 bg-[#8b5cf6] rounded-full animate-in slide-in-from-bottom-1 duration-300"></div>}
                        </button>
                    </div>

                    <div className="min-h-[400px]">
                        {activeTab === 'PROJECTS' && (
                            <div className="flex flex-col pb-6 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-8 rounded-[2.5rem] border-2 border-gray-900 shadow-xl">
                                {/* Project Sub-Tabs Header */}
                                <div className="flex items-center justify-between no-print border-b border-gray-100 px-4 mb-2">
                                    <div className="flex items-center gap-8">
                                        <button 
                                            onClick={() => setProjectStatusFilter('ACTIVE')} 
                                            className={`pb-4 px-2 text-sm font-black transition-all flex items-center gap-2 relative ${projectStatusFilter === 'ACTIVE' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            المشاريع النشطة
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${projectStatusFilter === 'ACTIVE' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {(customer?.projects || []).filter((p: any) => p.status === 'ACTIVE').length}
                                            </span>
                                            {projectStatusFilter === 'ACTIVE' && <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900 rounded-full animate-in slide-in-from-bottom-1 duration-300"></div>}
                                        </button>
                                        
                                        <button 
                                            onClick={() => setProjectStatusFilter('DISABLED')} 
                                            className={`pb-4 px-2 text-sm font-black transition-all flex items-center gap-2 relative ${projectStatusFilter === 'DISABLED' ? 'text-amber-600' : 'text-gray-400 hover:text-gray-600'}`}
                                        >
                                            الأرشيف
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${projectStatusFilter === 'DISABLED' ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-500'}`}>
                                                {(customer?.projects || []).filter((p: any) => p.status === 'DISABLED').length}
                                            </span>
                                            {projectStatusFilter === 'DISABLED' && <div className="absolute bottom-0 left-0 w-full h-1 bg-amber-600 rounded-full animate-in slide-in-from-bottom-1 duration-300"></div>}
                                        </button>
                                    </div>

                                    <button 
                                        onClick={() => setIsProjectSheetOpen(true)} 
                                        className="mb-4 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-[11px] flex items-center gap-2 shadow-sm hover:bg-gray-800 transition-all"
                                    >
                                        <Plus size={14} /> إضافة مشروع جديد
                                    </button>
                                </div>

                                {/* Filter & Sort Bar */}
                                <div className="bg-gray-50/50 p-4 rounded-3xl border border-gray-100 shadow-sm">
                                    <div className="flex flex-wrap items-center gap-4 no-print" ref={dropdownRef}>
                                        {/* Search Field */}
                                        <div className="relative group flex-1 min-w-[280px]">
                                            <div className="absolute right-3 top-1/2 -translate-y-1/2 bg-gray-900 p-2 rounded-xl text-white transition-all shadow-md shadow-gray-200">
                                                <Search size={20} />
                                            </div>
                                            <input 
                                                type="text"
                                                placeholder="ابحث باسم المشروع، الموقع أو الوصف..."
                                                value={projectSearchQuery}
                                                onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                className="w-full h-[52px] bg-white border border-gray-200 rounded-2xl pr-16 pl-4 text-[11px] font-black outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
                                            />
                                            {projectSearchQuery && (
                                                <button 
                                                    onClick={() => setProjectSearchQuery('')}
                                                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-900 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Finance Status Filter */}
                                        <div className="relative group min-w-[180px]">
                                            <button
                                                onClick={() => setActiveDropdown(activeDropdown === 'proj_finance' ? null : 'proj_finance')}
                                                className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                            >
                                                <div className="bg-purple-50 p-1.5 rounded-lg text-purple-600">
                                                    <Activity size={14} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">الحالة المالية</p>
                                                    <p className="text-[10px] font-black text-gray-900 mt-1">
                                                        {projectFinanceFilter === 'ALL' ? 'كل الحالات' : 
                                                         projectFinanceFilter === 'DEBT' ? 'عليه ديون' : 
                                                         projectFinanceFilter === 'PAID' ? 'مسواة' : 'رصيد زائد'}
                                                    </p>
                                                </div>
                                                <ChevronDown size={14} className={`text-gray-300 transition-transform ${activeDropdown === 'proj_finance' ? 'rotate-180' : ''}`} />
                                            </button>
                                            
                                            {activeDropdown === 'proj_finance' && (
                                                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] py-2 animate-in zoom-in-95 duration-200">
                                                    <button onClick={() => { setProjectFinanceFilter('ALL'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${projectFinanceFilter === 'ALL' ? 'bg-purple-50 text-purple-600' : 'hover:bg-gray-50 text-gray-700'}`}>كل الحالات المالية</button>
                                                    <button onClick={() => { setProjectFinanceFilter('DEBT'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${projectFinanceFilter === 'DEBT' ? 'bg-rose-50 text-rose-600' : 'hover:bg-gray-50 text-gray-700'}`}>مشاريع عليها ديون</button>
                                                    <button onClick={() => { setProjectFinanceFilter('PAID'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${projectFinanceFilter === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-gray-50 text-gray-700'}`}>مشاريع مسواة</button>
                                                    <button onClick={() => { setProjectFinanceFilter('SURPLUS'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2 text-[10px] font-bold transition-colors ${projectFinanceFilter === 'SURPLUS' ? 'bg-blue-50 text-blue-600' : 'hover:bg-gray-50 text-gray-700'}`}>مشاريع فيها رصيد زائد</button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Sorting Filter */}
                                        <div className="relative group min-w-[180px]">
                                            <button
                                                onClick={() => setActiveDropdown(activeDropdown === 'proj_sort' ? null : 'proj_sort')}
                                                className={`w-full h-[52px] flex items-center gap-3 border rounded-2xl px-4 transition-all text-right group ${projectSortBy === 'RECENT' ? 'bg-amber-400 border-amber-500 shadow-lg shadow-amber-100' : 'bg-[#8b5cf6] border-[#8b5cf6] shadow-lg shadow-purple-100 hover:shadow-purple-200'}`}
                                            >
                                                <div className={`p-1.5 rounded-lg ${projectSortBy === 'RECENT' ? 'bg-black/10 text-amber-900' : 'bg-white/10 text-amber-400'}`}>
                                                    <SortDesc size={14} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className={`text-[9px] font-black uppercase tracking-tighter leading-none ${projectSortBy === 'RECENT' ? 'text-amber-900/60' : 'text-gray-400'}`}>ترتيب حسب</p>
                                                    <p className={`text-[10px] font-black mt-1 ${projectSortBy === 'RECENT' ? 'text-amber-950' : 'text-white'}`}>
                                                        {projectSortBy === 'RECENT' ? 'الأحدث' : 
                                                         projectSortBy === 'OLD' ? 'الأقدم' : 
                                                         projectSortBy === 'ALPHA' ? 'أبجدياً' : 
                                                         projectSortBy === 'ORDERS' ? 'الأكثر طلباً' : 'الأكبر قيمة'}
                                                    </p>
                                                </div>
                                                <ChevronDown size={14} className={`transition-transform ${projectSortBy === 'RECENT' ? 'text-amber-900/40' : 'text-gray-500'} ${activeDropdown === 'proj_sort' ? 'rotate-180' : ''}`} />
                                            </button>
                                            
                                            {activeDropdown === 'proj_sort' && (
                                                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] py-2 animate-in zoom-in-95 duration-200">
                                                    <button onClick={() => { setProjectSortBy('RECENT'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2.5 text-[10px] font-black transition-colors ${projectSortBy === 'RECENT' ? 'bg-amber-400 text-amber-950' : 'hover:bg-gray-50 text-gray-700'}`}>الأحدث (تاريخ البدء)</button>
                                                    <button onClick={() => { setProjectSortBy('OLD'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2.5 text-[10px] font-black transition-colors ${projectSortBy === 'OLD' ? 'bg-amber-400 text-amber-950' : 'hover:bg-gray-50 text-gray-700'}`}>الأقدم (تاريخ البدء)</button>
                                                    <button onClick={() => { setProjectSortBy('ALPHA'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2.5 text-[10px] font-black transition-colors ${projectSortBy === 'ALPHA' ? 'bg-amber-400 text-amber-950' : 'hover:bg-gray-50 text-gray-700'}`}>أبجدياً (الاسم)</button>
                                                    <button onClick={() => { setProjectSortBy('ORDERS'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2.5 text-[10px] font-black transition-colors ${projectSortBy === 'ORDERS' ? 'bg-amber-400 text-amber-950' : 'hover:bg-gray-50 text-gray-700'}`}>الأكثر طلباً</button>
                                                    <button onClick={() => { setProjectSortBy('PURCHASES'); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2.5 text-[10px] font-black transition-colors ${projectSortBy === 'PURCHASES' ? 'bg-amber-400 text-amber-950' : 'hover:bg-gray-50 text-gray-700'}`}>الأكبر قيمة</button>
                                                </div>
                                            )}
                                        </div>
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

                            </div>
                        )}


                        {activeTab === 'ORDERS' && (() => {
                            const generalOrders = (customer?.orders || []).filter((o: any) => !o.projectId && (o.type === 'SALE' || o.type === 'RETURN_SALE'));
                            const saleOrders = generalOrders.filter((o: any) => o.type === 'SALE');
                            const totalPurchases = saleOrders.reduce((s: number, o: any) => s + (o.grandTotal || o.total || 0), 0);
                            const totalPaid = saleOrders.reduce((s: number, o: any) => s + (o.invoice?.paid || 0), 0);
                            const totalRemaining = totalPurchases - totalPaid;
                            return (
                                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-blue-50/20 p-8 rounded-[2.5rem] border-2 border-blue-600 shadow-xl">
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
                            <div className="bg-white p-8 rounded-[2.5rem] border-2 border-orange-600 shadow-xl animate-in fade-in duration-500">
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
                            <div className="flex flex-col pb-6 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[600px] bg-white rounded-[2.5rem] border-2 border-[#8b5cf6] p-8 shadow-xl overflow-x-auto">
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
                    <div className={`fixed inset-0 z-[150] bg-gray-900/80 backdrop-blur-md flex justify-center items-center p-4 md:p-6 no-print animate-in fade-in duration-300 ${
                        (selectedInvoice || showPaymentModal || showHistoryModal || showReturnsHistoryModal || showReturnModal || showReturnSuccessModal || showRefundConfirmModal || showRefundSuccessModal) ? 'hidden' : ''
                    }`}>
                        <div className="bg-[#f8fafc] w-full max-w-[95vw] h-full max-h-[95vh] rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-500 flex flex-col border border-white">
                            
                            {/* White Header - Matches Invoices Page Style */}
                            <div className="bg-white p-6 md:p-8 border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-6">
                                <div className="flex items-center gap-4 w-full lg:w-auto">
                                    <div className="bg-violet-600 text-white p-3.5 rounded-2xl shadow-lg shadow-violet-100">
                                        <ShoppingBag size={28} />
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-2xl font-black text-violet-600">سجل الطلبيات والمستندات المرتبطة</h2>
                                        <div className="flex items-center gap-2 mt-1">
                                            <p className="text-[#fbb815] text-xs font-bold uppercase tracking-widest">{selectedProjectForOrders.name}</p>
                                            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                                            <p className="text-gray-400 text-[10px] font-bold">إدارة تتبع المشروع</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 w-full lg:w-auto justify-end">
                                    <div className="relative group">
                                        <button className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
                                            <Download size={16} className="text-blue-600"/> تصدير السجل
                                            <ChevronDown size={14} className="opacity-50" />
                                        </button>
                                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                                            <button 
                                                onClick={() => { exportProjectOrdersCSV(); }} 
                                                className="w-full text-right px-5 py-3.5 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-3 border-b border-gray-50 transition-colors"
                                            >
                                                <FileSpreadsheet size={16} className="text-emerald-600"/> Excel (.xlsx)
                                            </button>
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
                                                className="w-full text-right px-5 py-3.5 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-3 transition-colors"
                                            >
                                                <FileText size={16} className="text-rose-600"/> PDF (طباعة)
                                            </button>
                                        </div>
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
                                        className="bg-violet-600 text-white px-6 py-3 rounded-xl font-black text-xs flex items-center gap-2 hover:bg-violet-700 transition-all shadow-lg shadow-violet-100 active:scale-95"
                                    >
                                        <Printer size={18} /> طباعة السجل
                                    </button>
                                    <button onClick={() => setSelectedProjectForOrders(null)} className="text-gray-400 hover:text-gray-900 transition-all p-2.5 bg-white rounded-xl border border-gray-100 shadow-sm mr-2 active:scale-90">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Unified Filter Bar */}
                            <div className="px-4 md:px-8 py-4 no-print bg-gray-50/30">
                                <div className="bg-white border-2 border-gray-900 rounded-[2rem] p-3 flex flex-col lg:flex-row gap-3 items-center shadow-xl shadow-gray-100" ref={modalDropdownRef}>
                                    {/* Search */}
                                    <div className="relative flex-1 group w-full">
                                        <input 
                                            type="text" 
                                            placeholder="بحث برقم فاتورة، اسم العميل..." 
                                            value={projectOrderSearch} 
                                            onChange={(e) => { setProjectOrderSearch(e.target.value); setProjectOrderCurrentPage(1); }} 
                                            className="w-full h-[52px] bg-gray-50/50 border border-transparent focus:bg-white focus:border-violet-600 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none"
                                        />
                                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-gray-900 rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none group-focus-within:scale-110 transition-transform">
                                            <Search size={20} strokeWidth={3} />
                                        </div>
                                    </div>

                                    {/* Divider for Desktop */}
                                    <div className="hidden lg:block w-px h-10 bg-gray-100 mx-2" />

                                    {/* Status Filter */}
                                    <div className="relative group min-w-[180px] w-full lg:w-auto">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setActiveDropdown(activeDropdown === 'project-status' ? null : 'project-status'); }}
                                            className="w-full h-[52px] flex items-center gap-3 bg-white hover:bg-gray-50 rounded-2xl px-4 transition-all text-right"
                                        >
                                            <div className="bg-gray-100 p-1.5 rounded-lg text-gray-900">
                                                <Filter size={14} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">حالة الفاتورة</p>
                                                <p className="text-[11px] font-black text-gray-900 mt-1">
                                                    {projectOrderStatusFilter === 'ALL' ? 'الكل' : 
                                                     projectOrderStatusFilter === 'PAID' ? 'خالص بالكامل' : 
                                                     projectOrderStatusFilter === 'UNPAID' ? 'غير مدفوع' :
                                                     projectOrderStatusFilter === 'PARTIAL' ? 'مدفوع جزئياً' :
                                                     projectOrderStatusFilter === 'CREDIT' ? 'رصيد زائد' : projectOrderStatusFilter}
                                                </p>
                                            </div>
                                            <ChevronDown size={14} className={`text-gray-300 transition-transform ${activeDropdown === 'project-status' ? 'rotate-180' : ''}`} />
                                        </button>
                                        
                                        {activeDropdown === 'project-status' && (
                                            <>
                                                <div className="fixed inset-0 z-10" onClick={() => setActiveDropdown(null)} />
                                                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-20 py-2 animate-in zoom-in-95 duration-200">
                                                    <button onClick={(e) => { e.stopPropagation(); setProjectOrderStatusFilter('ALL'); setProjectOrderCurrentPage(1); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2.5 text-[11px] font-bold transition-colors ${projectOrderStatusFilter === 'ALL' ? 'bg-violet-50 text-violet-600' : 'hover:bg-gray-50 text-gray-700'}`}>الكل</button>
                                                    <button onClick={(e) => { e.stopPropagation(); setProjectOrderStatusFilter('PAID'); setProjectOrderCurrentPage(1); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2.5 text-[11px] font-bold transition-colors ${projectOrderStatusFilter === 'PAID' ? 'bg-emerald-50 text-emerald-600' : 'hover:bg-gray-50 text-emerald-700'}`}>خالص بالكامل</button>
                                                    <button onClick={(e) => { e.stopPropagation(); setProjectOrderStatusFilter('PARTIAL'); setProjectOrderCurrentPage(1); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2.5 text-[11px] font-bold transition-colors ${projectOrderStatusFilter === 'PARTIAL' ? 'bg-amber-50 text-amber-600' : 'hover:bg-gray-50 text-amber-700'}`}>مدفوع جزئياً</button>
                                                    <button onClick={(e) => { e.stopPropagation(); setProjectOrderStatusFilter('UNPAID'); setProjectOrderCurrentPage(1); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2.5 text-[11px] font-bold transition-colors ${projectOrderStatusFilter === 'UNPAID' ? 'bg-rose-50 text-rose-600' : 'hover:bg-gray-50 text-rose-700'}`}>غير مدفوع</button>
                                                    <button onClick={(e) => { e.stopPropagation(); setProjectOrderStatusFilter('CREDIT'); setProjectOrderCurrentPage(1); setActiveDropdown(null); }} className={`w-full text-right px-4 py-2.5 text-[11px] font-bold transition-colors ${projectOrderStatusFilter === 'CREDIT' ? 'bg-purple-50 text-purple-600' : 'hover:bg-gray-50 text-purple-700'}`}>رصيد زائد</button>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {/* Divider for Desktop */}
                                    <div className="hidden lg:block w-px h-10 bg-gray-100 mx-2" />

                                    {/* Date Range Picker */}
                                    <DateRangePicker 
                                        startDate={projectOrderDateFrom}
                                        endDate={projectOrderDateTo}
                                        onChange={(start, end) => { setProjectOrderDateFrom(start); setProjectOrderDateTo(end); setProjectOrderCurrentPage(1); }}
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-[#f8fafc] p-4 md:p-8" id="project-orders-print-area">
                                {/* Print Header (Hidden on screen) */}
                                <div className="p-10 hidden print:block border-b-4 border-gray-900 mb-10 bg-white">
                                    <div className="flex justify-between items-center mb-8">
                                        <div className="text-right">
                                            <h1 className="text-4xl font-black text-gray-900 tracking-tight uppercase">سجل طلبيات المشروع</h1>
                                            <p className="text-gray-500 font-bold mt-1 uppercase tracking-widest text-sm">Project Orders Ledger</p>
                                        </div>
                                        <div className="text-left">
                                            <p className="text-2xl font-black text-blue-600">SKR Stock</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-8 bg-gray-50 p-6 rounded-3xl border border-gray-100">
                                        <div className="text-right space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase">العميل / Client</p>
                                            <p className="text-xl font-black text-gray-900">{customer.name}</p>
                                        </div>
                                        <div className="text-right space-y-1">
                                            <p className="text-[10px] font-black text-gray-400 uppercase">المشروع / Projet</p>
                                            <p className="text-xl font-black text-blue-600">{selectedProjectForOrders.name}</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 flex justify-end">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">التاريخ: {new Date().toLocaleDateString('ar-DZ')}</p>
                                    </div>
                                </div>

                                <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden min-h-[400px] flex flex-col">
                                    {(() => {
                                        const filteredInvoices = customer.orders?.filter((o: any) => {
                                            if (o.projectId !== selectedProjectForOrders.id || o.type === 'RETURN_SALE' || o.type === 'RETURN_PURCHASE') return false;
                                            
                                            if (projectOrderSearch) {
                                                const q = projectOrderSearch.toLowerCase();
                                                const matchNum = (o.invoice?.invoiceNumber || o.orderNumber)?.toLowerCase().includes(q);
                                                const matchCust = customer.name.toLowerCase().includes(q);
                                                if (!matchNum && !matchCust) return false;
                                            }

                                            const returnsValue = (o.items || []).reduce((sum: number, item: any) => sum + ((item.returnedQuantity || 0) * item.unitPrice), 0);
                                            const netTotal = o.total || 0;
                                            const originalTotal = netTotal + returnsValue;
                                            const paid = o.invoice?.paid || 0;
                                            const remaining = o.invoice?.remaining ?? (netTotal - paid);
                                            
                                            let status = 'UNPAID';
                                            if (remaining === 0) status = 'PAID';
                                            else if (remaining < 0) status = 'CREDIT';
                                            else if (remaining > 0 && remaining < originalTotal) status = 'PARTIAL';
                                            else status = 'UNPAID';

                                            if (projectOrderStatusFilter !== 'ALL' && status !== projectOrderStatusFilter) return false;

                                            const orderDate = new Date(o.orderDate);
                                            orderDate.setHours(0,0,0,0);
                                            if (projectOrderDateFrom) {
                                                const from = new Date(projectOrderDateFrom);
                                                from.setHours(0,0,0,0);
                                                if (orderDate < from) return false;
                                            }
                                            if (projectOrderDateTo) {
                                                const to = new Date(projectOrderDateTo);
                                                to.setHours(23,59,59,999);
                                                if (orderDate > to) return false;
                                            }
                                            return true;
                                        }).map((o: any) => {
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
                                        }) || [];

                                        const totalPages = Math.ceil(filteredInvoices.length / projectOrderItemsPerPage) || 1;
                                        const startIndex = (projectOrderCurrentPage - 1) * projectOrderItemsPerPage;
                                        const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + projectOrderItemsPerPage);

                                        return (
                                            <>
                                                <InvoicesTable 
                                                    invoices={paginatedInvoices}
                                                    loading={loading}
                                                    invoiceType="SALE"
                                                    setSelectedInvoice={setSelectedInvoice}
                                                    setShowPaymentModal={setShowPaymentModal}
                                                    setPaymentAmount={setPaymentAmount}
                                                    handleRefundExcess={handleRefundExcess}
                                                    setShowHistoryModal={setShowHistoryModal}
                                                    fetchPaymentHistory={fetchPaymentHistory}
                                                    setShowReturnsModal={setShowReturnsHistoryModal}
                                                    fetchReturnsHistory={fetchReturnsHistory}
                                                    setShowReturnProcessModal={(inv: any) => {
                                                        const ord = inv.order;
                                                        if (ord) {
                                                            const init: any = {};
                                                            ord.items.forEach((it: any) => { init[it.id] = 0; });
                                                            setReturnQtys(init);
                                                            setShowReturnModal(ord);
                                                        }
                                                    }}
                                                />
                                                
                                                {/* Pagination - Exact kima Fawatir Page style */}
                                                {filteredInvoices.length > 0 && (
                                                    <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-white px-8 py-6 border-t border-gray-100 no-print">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center border border-violet-100">
                                                                <FileText size={18} className="text-violet-600" />
                                                            </div>
                                                            <p className="text-xs font-black text-gray-500">
                                                                عرض <span className="text-gray-900 font-sans">{(projectOrderCurrentPage - 1) * projectOrderItemsPerPage + 1}</span> إلى <span className="text-gray-900 font-sans">{Math.min(projectOrderCurrentPage * projectOrderItemsPerPage, filteredInvoices.length)}</span> من أصل <span className="text-violet-600 font-sans">{filteredInvoices.length}</span> فاتورة
                                                            </p>
                                                        </div>

                                                        <div className="flex items-center gap-2 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100">
                                                            <button 
                                                                onClick={() => setProjectOrderCurrentPage(prev => Math.max(1, prev - 1))}
                                                                disabled={projectOrderCurrentPage === 1}
                                                                className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 rounded-xl disabled:opacity-30 transition-all border border-gray-100 shadow-sm disabled:cursor-not-allowed group"
                                                            >
                                                                <ChevronUp className="rotate-90 group-active:scale-90 transition-transform" size={18} />
                                                            </button>
                                                            
                                                            <div className="flex items-center gap-1 px-4">
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">الصفحة</span>
                                                                <span className="text-sm font-black text-violet-600 font-sans px-2">{projectOrderCurrentPage}</span>
                                                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">من</span>
                                                                <span className="text-sm font-black text-gray-900 font-sans px-2">{totalPages}</span>
                                                            </div>

                                                            <button 
                                                                onClick={() => setProjectOrderCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                                disabled={projectOrderCurrentPage >= totalPages}
                                                                className="w-10 h-10 flex items-center justify-center bg-white hover:bg-gray-50 text-gray-700 rounded-xl disabled:opacity-30 transition-all border border-gray-100 shadow-sm disabled:cursor-not-allowed group"
                                                            >
                                                                <ChevronUp className="-rotate-90 group-active:scale-90 transition-transform" size={18} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Redesigned Compact Footer with Project Stats */}
                            <div className="p-6 bg-white border-t border-gray-100 shadow-[0_-15px_40px_rgba(0,0,0,0.02)]">
                                {(() => {
                                    const projectOrders = customer.orders?.filter((o: any) => o.projectId === selectedProjectForOrders.id) || [];
                                    const salesOrders = projectOrders.filter((o: any) => o.type === 'SALE');
                                    
                                    const totalPurchases = salesOrders.reduce((sum: number, o: any) => sum + (o.grandTotal || o.total || 0), 0);
                                    
                                    const projectBalance = salesOrders.reduce((sum: number, o: any) => {
                                        const netTotal = o.grandTotal || o.total || 0;
                                        const paid = o.invoice?.paid || 0;
                                        return sum + (netTotal - paid);
                                    }, 0);

                                    return (
                                        <div className="grid grid-cols-1 md:grid-cols-4 items-center gap-8 px-4 md:px-10">
                                            {/* Project Stats Label */}
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-violet-100 shrink-0">
                                                    <BarChart3 size={24} />
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">إحصائيات</p>
                                                    <p className="text-sm font-black text-gray-900 uppercase">ملخص المشروع</p>
                                                </div>
                                            </div>

                                            {/* Total Purchases */}
                                            <div className="text-right border-r border-gray-100 pr-8">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">إجمالي المشتريات</p>
                                                <p className="text-xl font-black text-gray-900 font-sans tracking-tight">{totalPurchases.toLocaleString()} <span className="text-[10px] text-gray-400 uppercase mr-1">DZD</span></p>
                                            </div>

                                            {/* Financial Status */}
                                            <div className="text-right border-r border-gray-100 pr-8">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">الحالة المالية</p>
                                                <div className="flex items-center gap-2 justify-end">
                                                    {projectBalance === 0 ? (
                                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase">خالص تماماً</span>
                                                    ) : (
                                                        <p className="text-xl font-black text-rose-600 font-sans tracking-tight">
                                                            {projectBalance.toLocaleString()} <span className="text-[10px] text-gray-400 uppercase mr-1">DZD</span>
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Orders Count */}
                                            <div className="text-right border-r border-gray-100 pr-8">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">عدد الطلبيات</p>
                                                <p className="text-xl font-black text-gray-900 font-sans tracking-tight">{salesOrders.length}</p>
                                            </div>
                                        </div>
                                    )})()}
                                </div>
                            </div>
                        </div>
                    )}


                {/* PROJECT SHEET (Creation) */}
                {isProjectSheetOpen && (
                    <>
                        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[200] transition-opacity duration-300" onClick={() => setIsProjectSheetOpen(false)} />
                        <div className="fixed top-0 bottom-0 left-0 w-full max-w-lg bg-white shadow-2xl z-[210] flex flex-col animate-in slide-in-from-left duration-500 overflow-hidden">
                            {/* Header */}
                            <div className="p-8 w-full flex items-center justify-between bg-gray-900 text-white shadow-lg">
                                <div>
                                    <h2 className="text-2xl font-black flex items-center gap-3">
                                        <Plus size={28} className="bg-white/20 p-1 rounded-lg" /> إضافة مشروع جديد
                                    </h2>
                                    <p className="text-white/70 text-xs font-bold mt-1 tracking-tight uppercase">تعريف مشروع جديد لهذا العميل في النظام</p>
                                </div>
                                <button onClick={() => setIsProjectSheetOpen(false)} className="bg-white/10 hover:bg-white/20 text-white rounded-2xl p-2 transition-all active:scale-90">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-gray-50/30" onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    const form = e.currentTarget;
                                    const focusableElements = Array.from(form.querySelectorAll('input:not([type="hidden"]), textarea'));
                                    const index = focusableElements.indexOf(e.target as any);
                                    if (index > -1 && index < focusableElements.length - 1) {
                                        e.preventDefault();
                                        (focusableElements[index + 1] as HTMLElement).focus();
                                    }
                                }
                            }}>
                                {/* Basic Info Section */}
                                <div className="space-y-6 p-6 bg-white border-2 border-gray-100 rounded-[2rem] shadow-sm transition-all hover:shadow-md hover:border-gray-200">
                                    <div className="flex items-center gap-3">
                                        <div className="w-2 h-8 bg-gray-900 rounded-full"></div>
                                        <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">معلومات المشروع</h3>
                                    </div>

                                    <div className="grid grid-cols-1 gap-5">
                                        {/* Project Name */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">اسم المشروع <span className="text-red-500">*</span></label>
                                            <div className="relative group">
                                                <input 
                                                    id="project-name"
                                                    type="text" 
                                                    value={projectData.name} 
                                                    onChange={e => {
                                                        setProjectData({ ...projectData, name: e.target.value.toUpperCase() });
                                                        setProjectTouched(prev => ({ ...prev, name: true }));
                                                    }} 
                                                    placeholder="مثال: بناء فيلا المسيلة..." 
                                                    autoFocus
                                                    className={`w-full bg-gray-50/50 border-2 rounded-[1.2rem] px-5 py-3.5 text-gray-900 font-bold focus:outline-none transition-all
                                                        ${projectTouched.name && !projectValidations.name ? 'border-red-200 bg-red-50/50' : 'border-transparent focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 focus:bg-white'}`}
                                                />
                                                <Briefcase size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
                                            </div>
                                            {projectTouched.name && !projectValidations.name && (
                                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-50 text-red-600 animate-in slide-in-from-top-1">
                                                    <AlertCircle size={12} />
                                                    <p className="text-[10px] font-bold text-red-500">يجب أن يتكون الاسم من كلمتين على الأقل</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Location Selection */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* Wilaya */}
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">الولاية (اختياري)</label>
                                                <select
                                                    value={projectData.wilaya || ''}
                                                    onChange={e => {
                                                        const w = ALGERIA_LOCATIONS.find(l => l.name === e.target.value);
                                                        const firstCommune = w?.communes?.[0];
                                                        setProjectData({ ...projectData, wilaya: e.target.value, commune: firstCommune?.name || '', postalCode: firstCommune?.postCode || '' });
                                                    }}
                                                    className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-4 py-3.5 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer focus:border-gray-900 focus:bg-white"
                                                >
                                                    <option value="">لا توجد ولاية مختارة...</option>
                                                    {ALGERIA_LOCATIONS.map(w => (
                                                        <option key={w.id} value={w.name}>{w.id} - {w.name}</option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Commune */}
                                            <div className="space-y-2">
                                                <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">البلدية (اختياري)</label>
                                                <select
                                                    value={projectData.commune || ''}
                                                    onChange={e => {
                                                        const selectedWilaya = ALGERIA_LOCATIONS.find(l => l.name.toLowerCase() === projectData.wilaya?.toLowerCase());
                                                        const selectedCommune = selectedWilaya?.communes?.find(c => c.name === e.target.value);
                                                        setProjectData({ ...projectData, commune: e.target.value, postalCode: selectedCommune?.postCode || '' });
                                                    }}
                                                    className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-4 py-3.5 text-sm font-bold focus:outline-none transition-all appearance-none cursor-pointer focus:border-gray-900 focus:bg-white"
                                                >
                                                    <option value="">لا توجد بلدية مختارة...</option>
                                                    {(ALGERIA_LOCATIONS.find(l => l.name.toLowerCase() === projectData.wilaya?.toLowerCase())?.communes || []).map(c => (
                                                        <option key={c.name} value={c.name}>{c.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Postal Code (auto-filled) */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">الرمز البريدي (تلقائي)</label>
                                            <input
                                                type="text"
                                                dir="ltr"
                                                readOnly
                                                value={projectData.postalCode || ''}
                                                className="w-full bg-emerald-50/60 border-2 border-emerald-100 rounded-[1.2rem] px-5 py-3.5 text-emerald-700 font-black font-mono text-center focus:outline-none cursor-default"
                                            />
                                        </div>

                                        {/* Start Date */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">تاريخ البدء (تلقائي)</label>
                                            <div className="relative opacity-60">
                                                <input 
                                                    id="project-date"
                                                    type="date" 
                                                    readOnly
                                                    value={projectData.startDate} 
                                                    className="w-full bg-gray-100 border-2 border-transparent rounded-[1.2rem] px-5 py-3.5 text-gray-500 font-bold font-sans focus:outline-none cursor-not-allowed"
                                                />
                                            </div>
                                        </div>

                                        {/* Project Description */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">وصف المشروع (اختياري)</label>
                                            <textarea 
                                                id="project-desc"
                                                value={projectData.description} 
                                                onChange={e => setProjectData({ ...projectData, description: e.target.value })} 
                                                placeholder="أي تفاصيل إضافية عن المشروع..." 
                                                className="w-full bg-gray-50/50 border-2 border-transparent rounded-[1.2rem] px-6 py-4 text-sm font-bold focus:outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 focus:bg-white transition-all min-h-[140px]" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="p-8 border-t border-gray-100 bg-white flex gap-4 shadow-[0_-10px_40px_-15px_rgba(0,0,0,0.05)]">
                                <button
                                    onClick={() => setIsProjectSheetOpen(false)}
                                    className="flex-1 bg-gray-100 text-gray-500 py-4 rounded-[1.2rem] font-black text-sm hover:bg-gray-200 transition-all active:scale-95"
                                >
                                    إلغاء
                                </button>
                                <button 
                                    onClick={handleCreateProject} 
                                    disabled={!projectValidations.name || isSubmitting}
                                    className={`flex-[2] py-4 rounded-[1.2rem] font-black text-sm flex items-center justify-center gap-3 transition-all shadow-xl active:scale-95
                                        ${(!projectValidations.name || isSubmitting)
                                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                            : 'bg-gray-900 text-white shadow-gray-200 hover:bg-gray-800 hover:shadow-gray-300'}`}
                                >
                                    {isSubmitting ? 'جاري الإنشاء...' : <><Check size={20} /> إنشاء المشروع وحفظه</>}
                                </button>
                            </div>
                        </div>
                    </>
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


                {/* Invoice Detail Modal */}
                {selectedInvoice && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-[#8b5cf6] p-3 rounded-2xl text-white shadow-lg shadow-violet-200"><FileText size={24} /></div>
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900">تفاصيل الفاتورة</h2>
                                        <p className="text-gray-500 text-xs font-bold tracking-tight">رقم: {selectedInvoice.invoiceNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { const el = document.getElementById('inv-print-area'); if(el){const o=document.body.innerHTML;document.body.innerHTML=el.innerHTML;window.print();document.body.innerHTML=o;window.location.reload();}}} className="flex items-center gap-2 px-6 py-3 bg-[#8b5cf6] text-white rounded-2xl font-black text-sm hover:bg-[#7c3aed] transition-all shadow-lg active:scale-95"><Printer size={18} /> طباعة الفاتورة</button>
                                    <button onClick={() => setSelectedInvoice(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={24} /></button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto p-6 bg-gray-100/50">
                                <div id="inv-print-area" className="bg-white shadow-xl mx-auto rounded-xl p-8">
                                    <div className="flex flex-col md:flex-row justify-between items-start mb-8 gap-6 text-left" dir="ltr">
                                        <div className="bg-gray-50 border border-gray-200 p-5 rounded-xl flex-1">
                                            <h2 className="text-xl font-black text-gray-900 mb-2 uppercase">Facture de Vente</h2>
                                            <p className="text-sm font-bold text-gray-600">N° <span className="font-sans" dir="ltr">{selectedInvoice.invoiceNumber}</span></p>
                                            <p className="text-sm font-bold text-gray-600">Date: <span className="font-sans">{formatDate(selectedInvoice.invoiceDate)}</span></p>
                                        </div>
                                        <div className="border-l-4 border-[#8b5cf6] pl-5 flex-1 text-left">
                                            <p className="text-xs font-black text-[#8b5cf6] mb-1 uppercase tracking-widest">Client:</p>
                                            <p className="text-xl font-black text-gray-900">{selectedInvoice.customer?.name || selectedInvoice.customerName || 'Client'}</p>
                                            {selectedInvoice.order?.project?.name && <span className="text-xs font-bold bg-violet-50 text-violet-700 px-2 py-0.5 rounded mt-1 inline-block">Projet: {selectedInvoice.order.project.name}</span>}
                                        </div>
                                    </div>
                                    <table className="w-full text-left border-collapse mb-6" dir="ltr">
                                        <thead className="bg-gray-900 text-white">
                                            <tr>
                                                <th className="px-4 py-3 font-bold w-10 text-center">#</th>
                                                <th className="px-4 py-3 font-bold">Désignation</th>
                                                <th className="px-4 py-3 font-bold text-center w-20">Qté</th>
                                                <th className="px-4 py-3 font-bold text-center w-28">P.U.</th>
                                                <th className="px-4 py-3 font-bold text-right w-32">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {(selectedInvoice.order?.items || []).map((item: any, idx: number) => {
                                                const ret = item.returnedQuantity || 0;
                                                const net = item.quantity - ret;
                                                return (
                                                    <tr key={idx} className={`border-b border-gray-100 hover:bg-gray-50 ${ret > 0 ? 'bg-red-50/20' : ''}`}>
                                                        <td className="px-4 py-3 text-center text-gray-400 font-sans text-sm">{idx + 1}</td>
                                                        <td className="px-4 py-3 font-bold text-sm">
                                                            {item.product?.name}
                                                            {ret > 0 && <div className="text-[10px] text-red-500 font-black">Retour: {ret}</div>}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold font-sans text-sm">
                                                            {ret > 0 ? <><span className="line-through text-gray-400 text-xs mr-1">{item.quantity}</span>{net}</> : item.quantity}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-bold font-sans text-sm">{(item.unitPrice||0).toLocaleString()}</td>
                                                        <td className="px-4 py-3 text-right font-black font-sans text-sm">{(net*(item.unitPrice||0)).toLocaleString()}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr dir="ltr" className="text-left">
                                                <td colSpan={3} className="pt-4 align-top">
                                                    <div className="bg-gray-50 border-l-4 border-gray-900 p-4">
                                                        <p className="text-xs font-bold text-gray-500 mb-1">Arrêté la présente facture à la somme de:</p>
                                                        <p className="font-black text-gray-900 italic text-xs uppercase">{numberToFrenchWords(selectedInvoice.total||0)} Dinars Algériens</p>
                                                    </div>
                                                </td>
                                                <td colSpan={2} className="pt-4">
                                                    <div className="bg-gray-900 text-white p-5 rounded-xl flex flex-col items-end">
                                                        <div className="flex justify-between w-full opacity-60 text-xs mb-2"><span>Total:</span><span className="font-sans">{(selectedInvoice.total||0).toLocaleString()} DZD</span></div>
                                                        <div className="flex justify-between w-full opacity-60 text-xs mb-3"><span>Payé:</span><span className="font-sans">{(selectedInvoice.paid||0).toLocaleString()}</span></div>
                                                        <div className="w-full h-px bg-white/10 mb-3"></div>
                                                        <span className="text-xs font-bold opacity-70">{(selectedInvoice.remaining||0) < 0 ? 'Crédit (Rendu)' : 'Reste à Payer'}</span>
                                                        <span className={`text-2xl font-black font-sans ${(selectedInvoice.remaining||0) < 0 ? 'text-purple-400' : 'text-red-400'}`}>{Math.abs(selectedInvoice.remaining||0).toLocaleString()} DZD</span>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}



                {/* Returns History Modal */}
                {showReturnsHistoryModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-rose-500 p-3 rounded-2xl text-white shadow-lg"><RotateCcw size={24} /></div>
                                    <div><h2 className="text-xl font-black text-gray-900">سجل المرتجعات</h2><p className="text-gray-500 text-xs font-bold tracking-tight">عرض تفاصيل عمليات الإرجاع</p></div>
                                </div>
                                <button onClick={() => setShowReturnsHistoryModal(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={20} /></button>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto" dir="rtl">
                                {!showReturnsHistoryModal || showReturnsHistoryModal.length === 0 ? (
                                    <div className="py-20 text-center text-gray-300 flex flex-col items-center gap-4"><RotateCcw size={48} /><p className="font-black">لا توجد مرتجعات مسجلة</p></div>
                                ) : (
                                    <div className="space-y-6 text-right">
                                        {showReturnsHistoryModal.map((ret: any) => (
                                            <div key={ret.id} className="bg-gray-50 p-6 rounded-[2rem] border border-gray-100 flex flex-col gap-4">
                                                <div className="flex justify-between items-center"><span className="font-black text-gray-900 font-sans text-lg">{ret.orderNumber}</span><span className="text-[10px] font-black text-gray-400 font-sans">{formatDate(ret.orderDate)}</span></div>
                                                <div className="space-y-2">{ret.items?.map((item: any, i: number) => (<div key={i} className="flex justify-between items-center text-xs"><span className="text-gray-600 font-bold">{item.product?.name}</span><span className="font-black text-rose-600">{item.quantity} {item.product?.unit}</span></div>))}</div>
                                                <div className="pt-4 border-t border-gray-200 flex justify-between items-center"><span className="text-[10px] font-black text-gray-400 uppercase">إجمالي المرتجع</span><span className="font-black text-gray-900 font-sans">{(ret.total || 0).toLocaleString()} دج</span></div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Return Process Modal */}
                {showReturnModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[210] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-rose-600 p-3 rounded-2xl text-white shadow-lg"><RotateCcw size={24} /></div>
                                    <div><h2 className="text-xl font-black text-gray-900">استرجاع طلبية</h2><p className="text-gray-500 text-xs font-bold tracking-tight">رقم: {showReturnModal.orderNumber}</p></div>
                                </div>
                                <button onClick={() => setShowReturnModal(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={20} /></button>
                            </div>
                            <div className="p-8 overflow-y-auto max-h-[70vh]" dir="rtl">
                                <div className="mb-6 bg-gray-50 p-5 rounded-2xl border border-gray-100 grid grid-cols-2 gap-4 text-right">
                                    <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">إجمالي الطلبية</p><p className="font-black text-gray-900 font-sans">{(showReturnModal.total || 0).toLocaleString()} دج</p></div>
                                    <div><p className="text-[10px] font-black text-gray-400 uppercase mb-1">العميل</p><p className="font-black text-gray-900">{showReturnModal.customer?.name || showReturnModal.customerName || 'عابر'}</p></div>
                                </div>
                                <div className="space-y-4 text-right">
                                    <h3 className="text-sm font-black text-gray-700">اختر الكميات المرتجعة</h3>
                                    <div className="space-y-3">
                                        {showReturnModal.items.map((item: any) => {
                                            const maxReturnable = item.quantity - (item.returnedQuantity || 0);
                                            if (maxReturnable <= 0) return null;
                                            return (
                                                <div key={item.id} className="bg-white border border-gray-100 p-4 rounded-2xl flex items-center justify-between hover:bg-rose-50/30 transition-all">
                                                    <div className="flex flex-col text-right"><span className="font-black text-gray-900">{item.product?.name}</span><span className="text-[10px] font-bold text-gray-400 uppercase">الأصلية: {item.quantity} | المتبقي: {maxReturnable}</span></div>
                                                    <div className="flex items-center gap-4">
                                                        <div className="text-left font-sans font-black text-rose-500 text-sm">{( (returnQtys[item.id] || 0) * item.unitPrice).toLocaleString()} <span className="text-[10px] opacity-50 uppercase">DZD</span></div>
                                                        <input type="number" value={returnQtys[item.id] || 0} onClick={e => (e.target as HTMLInputElement).select()} onChange={e => handleReturnQtyChange(item.id, parseInt(e.target.value) || 0, maxReturnable)} className="w-20 h-10 bg-gray-50 border border-gray-200 rounded-xl text-center font-black font-sans focus:border-rose-500 outline-none transition-all" min={0} max={maxReturnable} />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 border-t border-gray-100 flex items-center justify-between bg-gray-50/30 text-right" dir="rtl">
                                <div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase">إجمالي المرتجع</p>
                                    <p className="text-2xl font-black text-rose-600 font-sans">
                                        {showReturnModal.items.reduce((sum: number, i: any) => sum + (returnQtys[i.id] || 0) * i.unitPrice, 0).toLocaleString()} دج
                                    </p>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={handleReturnAll}
                                        className="px-6 py-3.5 bg-white border border-gray-200 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-50 transition-all shadow-sm"
                                    >
                                        استرجاع الكل
                                    </button>
                                    <button 
                                        onClick={handleReturnSubmit} 
                                        disabled={isSubmitting || showReturnModal.items.reduce((sum: number, i: any) => sum + (returnQtys[i.id] || 0), 0) === 0} 
                                        className="bg-rose-600 text-white px-8 py-3.5 rounded-2xl font-black text-sm shadow-xl hover:bg-rose-700 disabled:opacity-50 transition-all flex items-center gap-2"
                                    >
                                        {isSubmitting ? 'جاري المعالجة...' : 'تأكيد الاسترجاع'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Return Success Modal */}
                {showReturnSuccessModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col items-center p-10 animate-in zoom-in-95 duration-300 text-center">
                            <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                <CheckCircle size={60} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 mb-2">تم الاسترجاع بنجاح</h2>
                            <p className="text-gray-500 text-sm font-bold mb-8">تم تسجيل المرتجع وتحديث المخزون بنجاح</p>
                            
                            <div className="flex flex-col gap-3 w-full">
                                <button 
                                    onClick={() => {
                                        const el = document.getElementById('return-receipt-print');
                                        if (el) {
                                            const original = document.body.innerHTML;
                                            document.body.innerHTML = el.innerHTML;
                                            window.print();
                                            document.body.innerHTML = original;
                                            window.location.reload();
                                        }
                                    }}
                                    className="w-full bg-[#8b5cf6] text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-violet-200 hover:bg-[#7c3aed] transition-all flex items-center justify-center gap-2"
                                >
                                    <Printer size={18} /> طباعة وصل الاسترجاع
                                </button>
                                <button 
                                    onClick={() => {
                                        setShowReturnSuccessModal(false);
                                        window.location.reload();
                                    }}
                                    className="w-full bg-gray-100 text-gray-600 py-4 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                                >
                                    حسناً، فهمت
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Refund Confirmation Modal */}
                {showRefundConfirmModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="p-8 flex flex-col items-center text-center">
                                <div className="w-20 h-20 bg-purple-50 text-purple-600 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                                    <Banknote size={40} strokeWidth={2.5} />
                                </div>
                                <h2 className="text-xl font-black text-gray-900 mb-2">تأكيد إرجاع الفائض</h2>
                                <p className="text-gray-500 text-sm font-bold leading-relaxed mb-8">
                                    هل أنت متأكد من إرجاع مبلغ <span className="text-purple-600 font-black font-sans">{Math.abs(showRefundConfirmModal.remaining).toLocaleString()} دج</span> نقداً؟
                                    <br />
                                    <span className="text-gray-400 text-xs font-medium">سيتم تصفير رصيد الفاتورة نهائياً.</span>
                                </p>
                                
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button 
                                        onClick={() => setShowRefundConfirmModal(null)}
                                        className="h-14 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all"
                                    >
                                        إلغاء
                                    </button>
                                    <button 
                                        onClick={confirmRefund}
                                        disabled={isSubmitting}
                                        className="h-14 bg-purple-600 text-white rounded-2xl font-black text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all flex items-center justify-center gap-2"
                                    >
                                        {isSubmitting ? <RotateCcw size={18} className="animate-spin" /> : 'تأكيد الإرجاع'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Hidden Return Receipt Template */}
                {lastReturnResult && (
                    <div id="return-receipt-print" className="hidden">
                        <div className="p-10 font-sans text-left" dir="ltr">
                            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                                <div>
                                    <h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">BON DE RETOUR</h1>
                                    <p className="text-gray-500 font-bold">Réf: {lastReturnResult.id}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xl font-black text-blue-600">{settings?.storeName || 'مخزون'}</p>
                                </div>
                            </div>
                            <div className="space-y-6">
                                <div className="flex justify-between border-b border-gray-100 py-4">
                                    <span className="text-gray-500 font-bold uppercase text-xs">Date:</span>
                                    <span className="font-black font-sans">{new Date().toLocaleString('fr-FR')}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 py-4">
                                    <span className="text-gray-500 font-bold uppercase text-xs">Client:</span>
                                    <span className="font-black">{showReturnModal?.customer?.name || showReturnModal?.customerName || 'Client'}</span>
                                </div>
                                <div className="flex justify-between border-b border-gray-100 py-4">
                                    <span className="text-gray-500 font-bold uppercase text-xs">Commande d'origine:</span>
                                    <span className="font-black font-sans">{showReturnModal?.orderNumber}</span>
                                </div>
                            </div>

                            <table className="w-full mt-10 border-collapse">
                                <thead>
                                    <tr className="bg-gray-100 border-b-2 border-gray-900">
                                        <th className="p-3 text-left text-xs font-black uppercase">Produit</th>
                                        <th className="p-3 text-center text-xs font-black uppercase">Qté</th>
                                        <th className="p-3 text-right text-xs font-black uppercase">P.U.</th>
                                        <th className="p-3 text-right text-xs font-black uppercase">Total</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lastReturnResult.items?.map((item: any, i: number) => (
                                        <tr key={i} className="border-b border-gray-100">
                                            <td className="p-3 text-sm font-bold">{item.product?.name}</td>
                                            <td className="p-3 text-sm text-center font-black font-sans">{item.quantity}</td>
                                            <td className="p-3 text-sm text-right font-bold font-sans">{(item.unitPrice || 0).toLocaleString()}</td>
                                            <td className="p-3 text-sm text-right font-black font-sans">{(item.total || (item.quantity * item.unitPrice)).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gray-900 text-white font-black">
                                        <td colSpan={3} className="p-4 text-right uppercase text-xs">Montant Total Retourné:</td>
                                        <td className="p-4 text-right font-sans">{(lastReturnResult.total || 0).toLocaleString()} DZD</td>
                                    </tr>
                                </tfoot>
                            </table>

                            <div className="grid grid-cols-2 gap-20 mt-20 text-center">
                                <div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs">Signature Magasin</div>
                                <div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs">Signature Client</div>
                            </div>
                        </div>
                    </div>
                )}
                {/* Refund Success Modal */}
                {showRefundSuccessModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl flex flex-col items-center p-10 animate-in zoom-in-95 duration-300 text-center">
                            <div className="w-24 h-24 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mb-6 animate-bounce">
                                <CheckCircle size={60} strokeWidth={2.5} />
                            </div>
                            <h2 className="text-xl font-black text-gray-900 mb-2">تمت العملية بنجاح</h2>
                            <p className="text-gray-500 text-sm font-bold mb-8">تم إرجاع المبلغ وتصفية حساب الفاتورة بنجاح</p>
                            
                            <button 
                                onClick={() => {
                                    setShowRefundSuccessModal(false);
                                    window.location.reload();
                                }}
                                className="w-full bg-purple-600 text-white py-4 rounded-2xl font-black text-sm shadow-lg shadow-purple-200 hover:bg-purple-700 transition-all"
                            >
                                حسناً، فهمت
                            </button>
                        </div>
                    </div>
                )}
                {/* PAYMENT MODAL (Restored) */}
                {showPaymentModal && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-600 p-4 rounded-[1.5rem] text-white shadow-xl shadow-emerald-100 animate-pulse">
                                        <Banknote size={32} />
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-2xl font-black text-gray-900 leading-none">تسجيل دفعة مالية</h2>
                                        <p className="text-gray-500 text-[10px] font-bold mt-2 uppercase tracking-widest">تحديث الرصيد المالي للزبون</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowPaymentModal(false)} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl p-3 transition-all active:scale-90">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="p-10 space-y-8" dir="rtl">
                                {/* Payment Input */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-3">
                                        <label className="block text-sm font-black text-gray-700 mr-1 uppercase tracking-tighter">المبلغ المدفوع (دج) <span className="text-emerald-500">*</span></label>
                                        <div className="relative group">
                                            <input
                                                type="number"
                                                value={paymentAmount || ''}
                                                onChange={e => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                                className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-8 py-5 text-2xl font-black text-emerald-600 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-50 focus:outline-none transition-all"
                                                placeholder="0.00"
                                            />
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 font-black text-gray-300 group-focus-within:text-emerald-500 transition-colors uppercase text-xs">DZD</div>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <label className="block text-sm font-black text-gray-700 mr-1 uppercase tracking-tighter">طريقة الدفع</label>
                                        <div className="relative group">
                                            <select
                                                value={paymentMethod}
                                                onChange={e => setPaymentMethod(e.target.value)}
                                                className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-8 py-5 text-lg font-black text-gray-900 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all appearance-none cursor-pointer"
                                            >
                                                <option value="CASH">نقداً (Espèce)</option>
                                                <option value="TRANSFER">تحويل بنكي (Virement)</option>
                                                <option value="CHEQUE">شيك (Chèque)</option>
                                            </select>
                                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-gray-900 transition-colors">
                                                <ChevronDown size={20} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {paymentMethod !== 'CASH' && (
                                    <div className="animate-in slide-in-from-top-4 duration-300 space-y-6">
                                        <div className="space-y-3">
                                            <label className="block text-sm font-black text-gray-700 mr-1">البنك المختص</label>
                                            <div className="relative group">
                                                <select
                                                    value={paymentBank}
                                                    onChange={e => setPaymentBank(e.target.value)}
                                                    className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-8 py-5 text-lg font-black text-gray-900 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all appearance-none cursor-pointer"
                                                >
                                                    <option value="BADR">BADR (بنك الفلاحة والتنمية الريفية)</option>
                                                    <option value="CCP">CCP (بريد الجزائر)</option>
                                                    <option value="BNA">BNA (البنك الوطني الجزائري)</option>
                                                    <option value="CPA">CPA (القرض الشعبي الجزائري)</option>
                                                    <option value="BDL">BDL (بنك التنمية المحلية)</option>
                                                    <option value="CNEP">CNEP (الصندوق الوطني للتوفير والاحتياط)</option>
                                                    <option value="BEA">BEA (بنك الجزائر الخارجي)</option>
                                                    <option value="SOCIETE_GENERALE">Société Générale Algérie</option>
                                                    <option value="BNP">BNP Paribas El Djazaïr</option>
                                                    <option value="AGB">Gulf Bank Algérie (AGB)</option>
                                                    <option value="NATIXIS">Natixis Algérie</option>
                                                    <option value="AL_BARAKA">Al Baraka (بنك البركة)</option>
                                                    <option value="AL_SALAM">Al Salam Bank (مصرف السلام)</option>
                                                    <option value="TRUST">Trust Bank Algeria</option>
                                                    <option value="HOUSING">Housing Bank Algeria</option>
                                                    <option value="FRANSABANK">Fransabank El Djazaïr</option>
                                                    <option value="OTHER">بنك آخر</option>
                                                </select>
                                                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-gray-900 transition-colors">
                                                    <ChevronDown size={20} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="space-y-3">
                                            <label className="block text-sm font-black text-gray-700 mr-1 uppercase tracking-tighter">
                                                {paymentMethod === 'CHEQUE' ? "رقم الشيك البنكي" : "رقم الحوالة / المرجع"}
                                            </label>
                                            <div className="relative group">
                                                <input 
                                                    type="text" 
                                                    value={chequeNumber} 
                                                    onChange={e => setChequeNumber(e.target.value)} 
                                                    className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-8 py-5 text-lg font-black text-gray-900 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all"
                                                    placeholder="0000000000"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    <label className="block text-sm font-black text-gray-700 mr-1 uppercase tracking-tighter">ملاحظات (اختياري)</label>
                                    <textarea
                                        value={paymentNotes}
                                        onChange={e => setPaymentNotes(e.target.value)}
                                        className="w-full bg-gray-50 border-2 border-transparent rounded-[1.5rem] px-8 py-5 text-lg font-bold text-gray-900 focus:bg-white focus:border-gray-900 focus:ring-4 focus:ring-gray-100 focus:outline-none transition-all min-h-[120px] resize-none"
                                        placeholder="تفاصيل إضافية عن العملية..."
                                    />
                                </div>
                            </div>

                            <div className="p-10 pt-0">
                                <button
                                    onClick={handleRecordPayment}
                                    disabled={isSubmitting || paymentAmount <= 0}
                                    className="w-full bg-gray-900 hover:bg-black disabled:opacity-20 text-white h-20 rounded-[1.5rem] font-black text-xl transition-all shadow-2xl shadow-gray-200 flex items-center justify-center gap-4 group"
                                >
                                    {isSubmitting ? (
                                        <div className="w-8 h-8 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <CheckCircle size={28} className="group-hover:scale-110 transition-transform" />
                                            تأكيد تسجيل الدفعة
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* SELECTED INVOICE MODAL (Restored) */}
                {selectedInvoice && (
                    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-md z-[260] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[3rem] w-full max-w-5xl h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-500 border border-white/20">
                            {/* Header */}
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0 z-10">
                                <div className="flex items-center gap-6">
                                    <div className="bg-gray-900 p-5 rounded-[2rem] text-white shadow-2xl shadow-gray-200">
                                        <FileText size={32} />
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-3xl font-black text-gray-900 leading-none">تفاصيل الفاتورة</h2>
                                        <p className="text-gray-500 text-[10px] font-black mt-3 uppercase tracking-[0.2em]">رقم: {selectedInvoice.orderNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => {
                                            const el = document.getElementById('invoice-print-area');
                                            if (el) {
                                                const originalBody = document.body.innerHTML;
                                                document.body.innerHTML = el.innerHTML;
                                                window.print();
                                                document.body.innerHTML = originalBody;
                                                window.location.reload();
                                            }
                                        }}
                                        className="flex items-center gap-3 bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-xl shadow-blue-100 group"
                                    >
                                        <Printer size={20} className="group-hover:rotate-12 transition-transform" /> طباعة الفاتورة
                                    </button>
                                    <button onClick={() => setSelectedInvoice(null)} className="bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-gray-900 rounded-2xl p-4 transition-all">
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-10 space-y-12 bg-gray-50/30" id="invoice-print-area">
                                {/* Invoice Header for Print */}
                                <div className="hidden print:block mb-10 border-b-2 border-gray-900 pb-8">
                                    <div className="flex justify-between items-start">
                                        <div className="text-right">
                                            <h1 className="text-4xl font-black text-gray-900 mb-2">{settings?.storeName || 'مخزوني'}</h1>
                                            <p className="text-gray-500 font-bold">{settings?.storeAddress || 'الجزائر'}</p>
                                            <p className="text-gray-500 font-bold">{settings?.phone || ''}</p>
                                        </div>
                                        <div className="text-left">
                                            <h2 className="text-2xl font-black uppercase tracking-widest">Facture</h2>
                                            <p className="text-gray-500 font-bold">N°: {selectedInvoice.orderNumber}</p>
                                            <p className="text-gray-500 font-bold">Date: {new Date(selectedInvoice.createdAt).toLocaleDateString('fr-FR')}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Content (Same as before) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                    {/* Financial Status Summary */}
                                    <div className="bg-white p-8 rounded-[2.5rem] border-2 border-gray-100 shadow-sm space-y-6">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="w-2 h-6 bg-emerald-500 rounded-full"></div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">الملخص المالي</h3>
                                        </div>
                                        
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center bg-gray-50 p-5 rounded-2xl">
                                                <span className="text-gray-500 font-bold">إجمالي الفاتورة:</span>
                                                <span className="text-xl font-black font-sans">{(selectedInvoice.grandTotal || selectedInvoice.total || 0).toLocaleString()} دج</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-emerald-50 p-5 rounded-2xl">
                                                <span className="text-emerald-600 font-bold">المبلغ المدفوع:</span>
                                                <span className="text-xl font-black text-emerald-700 font-sans">{(selectedInvoice.invoice?.paid || 0).toLocaleString()} دج</span>
                                            </div>
                                            <div className="flex justify-between items-center bg-rose-50 p-5 rounded-2xl">
                                                <span className="text-rose-600 font-bold">المبلغ المتبقي:</span>
                                                <span className="text-2xl font-black text-rose-700 font-sans">{( (selectedInvoice.grandTotal || selectedInvoice.total || 0) - (selectedInvoice.invoice?.paid || 0) ).toLocaleString()} دج</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Items Table Section */}
                                    <div className="bg-white rounded-[2.5rem] border-2 border-gray-100 shadow-sm overflow-hidden flex flex-col">
                                        <div className="p-6 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
                                            <div className="w-2 h-6 bg-gray-900 rounded-full"></div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">قائمة السلع</h3>
                                        </div>
                                        <div className="flex-1 overflow-x-auto">
                                            <table className="w-full text-right" dir="rtl">
                                                <thead className="bg-gray-900 text-white text-[10px] font-black uppercase tracking-widest">
                                                    <tr>
                                                        <th className="px-6 py-4">المنتج</th>
                                                        <th className="px-6 py-4 text-center">الكمية</th>
                                                        <th className="px-6 py-4 text-left">السعر</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {selectedInvoice.items?.map((item: any, idx: number) => (
                                                        <tr key={idx} className="hover:bg-gray-50/50 transition-all group">
                                                            <td className="px-6 py-5 font-black text-gray-900">{item.product?.name || 'منتج مجهول'}</td>
                                                            <td className="px-6 py-5 text-center font-black font-sans text-blue-600">{item.quantity}</td>
                                                            <td className="px-6 py-5 text-left font-black font-sans text-gray-900">{(item.unitPrice || 0).toLocaleString()}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* HISTORY MODAL (Restored) */}
                {showHistoryModal && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-4xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-8 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-blue-600 p-4 rounded-[1.5rem] text-white shadow-xl shadow-blue-100">
                                        <History size={32} />
                                    </div>
                                    <div className="text-right">
                                        <h2 className="text-2xl font-black text-gray-900 leading-none">سجل المدفوعات</h2>
                                        <p className="text-gray-500 text-[10px] font-bold mt-2 uppercase tracking-widest">عرض تاريخ العمليات المالية للزبون</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowHistoryModal(false)} className="bg-white border border-gray-200 hover:bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl p-3 transition-all">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8" dir="rtl">
                                {customer.payments && customer.payments.length > 0 ? (
                                    <div className="space-y-4">
                                        {customer.payments.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((p: any) => (
                                            <div key={p.id} className="bg-white border-2 border-gray-50 p-6 rounded-[1.5rem] flex items-center justify-between hover:border-blue-100 transition-all group">
                                                <div className="flex items-center gap-6">
                                                    <div className="w-14 h-14 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                                        <Banknote size={24} />
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-sm font-black text-gray-900">دفعة مالية - {p.method === 'CASH' ? 'نقداً' : p.method === 'TRANSFER' ? 'تحويل بنكي' : 'شيك'}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">التاريخ: {new Date(p.createdAt).toLocaleString('fr-FR')}</p>
                                                    </div>
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-xl font-black text-emerald-600 font-sans tracking-tight">+{p.amount.toLocaleString()} دج</p>
                                                    {p.notes && <p className="text-[10px] font-bold text-gray-400 mt-1 max-w-[200px] truncate">{p.notes}</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-center p-20">
                                        <div className="w-24 h-24 bg-gray-50 rounded-[2rem] flex items-center justify-center text-gray-200 mb-6">
                                            <History size={48} />
                                        </div>
                                        <h3 className="text-lg font-black text-gray-900">لا توجد دفعات مسجلة</h3>
                                        <p className="text-gray-400 text-sm font-bold mt-2">لم يتم تسجيل أي عمليات دفع مالية لهذا العميل حتى الآن</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
