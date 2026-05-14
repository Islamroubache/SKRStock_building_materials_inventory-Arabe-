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
    Filter, ArrowDownAZ, SortDesc, Search, Download, FileSpreadsheet, Users, Archive
} from 'lucide-react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import * as xlsx from 'xlsx';
import { ALGERIA_LOCATIONS } from '@/lib/constants/algeria-locations';
import { numberToFrenchWords } from '@/lib/number-to-french-words';
import { printDocument } from '@/lib/print-helper';
import { InvoicesTable, StatusBadge } from '@/components/InvoicesTable';
import DateRangePicker from '@/components/DateRangePicker';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';


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
    const [paymentBank, setPaymentBank] = useState('');
    const [paymentNotes, setPaymentNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settings, setSettings] = useState<any>(null);

    const [isProjectSheetOpen, setIsProjectSheetOpen] = useState(false);
    const [archiveProjectModal, setArchiveProjectModal] = useState<any | null>(null);
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
    const [soaCurrentPage, setSoaCurrentPage] = useState(1);
    const soaItemsPerPage = 15;

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

    // General Order Filters
    const [generalOrderSearch, setGeneralOrderSearch] = useState('');
    const [generalOrderStatusFilter, setGeneralOrderStatusFilter] = useState('ALL');
    const [generalOrderDateFrom, setGeneralOrderDateFrom] = useState('');
    const [generalOrderDateTo, setGeneralOrderDateTo] = useState('');
    const [generalOrderCurrentPage, setGeneralOrderCurrentPage] = useState(1);
    // Project Filters/Sort
    const [projectStatusFilter, setProjectStatusFilter] = useState<'ALL' | 'ACTIVE' | 'DISABLED'>('ACTIVE');
    const [projectFinanceFilter, setProjectFinanceFilter] = useState<'ALL' | 'PAID' | 'DEBT' | 'SURPLUS'>('ALL');
    const [projectSortBy, setProjectSortBy] = useState<'RECENT' | 'OLD' | 'ALPHA' | 'ORDERS' | 'PURCHASES'>('RECENT');
    const [projectSearchQuery, setProjectSearchQuery] = useState('');
    const [projectCurrentPage, setProjectCurrentPage] = useState(1);
    const projectItemsPerPage = 10;
    const [isCustomerDetailsOpen, setIsCustomerDetailsOpen] = useState(false);

    useEffect(() => {
        setProjectCurrentPage(1);
    }, [projectStatusFilter, projectFinanceFilter, projectSortBy, projectSearchQuery]);

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
        if (nif.length < 14 || nif.length > 20) return { valid: false, error: "يجب أن يكون بين 14 و 20 رقماً" };
        return { valid: true, breakdown: "صحيح" };
    };

    const validateNIS = (nis: string) => {
        if (!nis) return null;
        if (!/^\d+$/.test(nis)) return { valid: false, error: "يجب أن يحتوي على أرقام فقط بدون مسافات" };
        if (nis.length < 15 || nis.length > 20) return { valid: false, error: "يجب أن يكون بين 15 و 20 رقماً" };
        return { valid: true, breakdown: "صحيح" };
    };

    const validateRC = (rc: string) => {
        if (!rc) return null;
        // Format: WWXX-XX(A or B)XXXXXXX (where WW = wilaya 01-69)
        const match = rc.match(/^(\d{2})(\d{2})-(\d{2})([AB])(\d{7})$/i);
        if (match) {
            const wilCode = parseInt(match[1]);
            if (wilCode < 1 || wilCode > 69) return { valid: false, error: `كود الولاية (${match[1]}) غير صحيح (01-69)` };
            return { valid: true, breakdown: "صحيح" };
        }
        return { valid: false, error: "الصيغة غير صحيحة. مثال: 2821-51A4344821" };
    };

    const validateAI = (ai: string) => {
        if (!ai) return null;
        const cleanAI = ai.replace(/\s/g, '');
        if (!/^\d+$/.test(cleanAI)) return { valid: false, error: "رقم المادة يجب أن يحتوي على أرقام فقط" };
        if (cleanAI.length < 11 || cleanAI.length > 13) return { valid: false, error: "رقم المادة يجب أن يكون بين 11 و 13 رقماً" };
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
                    customerId: parseInt(id as string),
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

    const handleExportExcelSOA = (data: any[]) => {
        const exportData = data.map(tx => ({
            'التاريخ': tx.date.toLocaleDateString('ar-DZ'),
            'المرجع / الطلبية': tx.ref,
            'رقم العملية': tx.number,
            'البيان (نوع العملية)': tx.motif,
            'طريقة الدفع': tx.method,
            'المشروع': tx.project,
            'مبلغ البيع': tx.vente,
            'المبلغ المقبوض': tx.versement,
            'الرصيد': tx.balance
        }));
        const ws = xlsx.utils.json_to_sheet(exportData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "StatementOfAccount");
        xlsx.writeFile(wb, `كشف_حساب_${customer.name}_${new Date().toLocaleDateString()}.xlsx`);
    };

    const handleExportPDFSOA = (data: any[]) => {
        const doc = new jsPDF('l', 'mm', 'a4');
        const dateStr = new Date().toLocaleDateString('ar-DZ').replace(/\//g, '-');
        
        doc.setFont("helvetica", "bold");
        doc.setFontSize(18);
        doc.text(`Releve de Compte - ${customer.name} (${dateStr})`, 14, 20);

        const headers = [
            ['Date', 'Réf / Commande', 'N° Opération', 'Motif', 'Méthode', 'Projet', 'Vente (DZD)', 'Versé (DZD)', 'Solde (DZD)']
        ];

        const tableData = data.map(tx => [
            tx.date.toLocaleDateString('fr-FR'),
            tx.ref,
            tx.number,
            tx.motif,
            tx.method,
            tx.project,
            tx.vente.toLocaleString(),
            tx.versement.toLocaleString(),
            tx.balance.toLocaleString()
        ]);

        autoTable(doc, {
            head: headers,
            body: tableData,
            startY: 30,
            theme: 'grid',
            headStyles: { fillColor: [139, 92, 246] }, // Purple 500
            styles: { font: 'helvetica', fontSize: 8 },
            columnStyles: {
                6: { halign: 'right' },
                7: { halign: 'right' },
                8: { halign: 'right' }
            }
        });

        doc.save(`كشف_حساب_${customer.name}_${dateStr}.pdf`);
    };

    const handleRecordPayment = async (e: React.FormEvent) => {
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
                creditLimit: parseFloat(String(editData.creditLimit)) || 0,
                isTvaSubject: editData.isTvaSubject ?? true
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

                <div className="bg-white rounded-[2rem] border-2 border-emerald-500 shadow-xl shadow-gray-100 overflow-hidden">
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
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <Phone size={11} /> اتصال وتواصل
                                </div>
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
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <FileText size={11} /> الوثائق القانونية
                                </div>
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
                                <div className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                    <CreditCard size={11} /> تحليل الرصيد والائتمان
                                </div>
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
                    <div className="flex items-center gap-8 no-print px-4">
                        {(() => {
                            const isOverdue = (o: any) => {
                                const inv = o?.invoice;
                                if (!inv) return false;
                                const remaining = Number(inv.remaining ?? ((o.grandTotal || o.total || 0) - (inv.paid || 0)));
                                return inv.status !== 'PAID' && remaining > 0 && inv.dueDate && new Date(inv.dueDate) <= new Date();
                            };
                            const hasOverdueProjects = (customer?.orders || []).some((o: any) => o.projectId && isOverdue(o));

                            return (
                                <button 
                                    onClick={() => setActiveTab('PROJECTS')} 
                                    className={`pb-4 px-2 text-sm font-black transition-all flex items-center gap-2 relative ${activeTab === 'PROJECTS' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <Briefcase size={16} /> المشاريع
                                    {hasOverdueProjects && <span className="absolute top-0 left-0 w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-200 animate-pulse"></span>}
                                    {activeTab === 'PROJECTS' && <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-900 rounded-full animate-in slide-in-from-bottom-1 duration-300"></div>}
                                </button>
                            );
                        })()}
                        
                        {(() => {
                            const generalOrders = (customer?.orders || []).filter((o: any) => !o.projectId && (o.type === 'SALE' || o.type === 'RETURN_SALE'));
                            if (generalOrders.length === 0) return null;
                            const isOverdue = (o: any) => {
                                const inv = o?.invoice;
                                if (!inv) return false;
                                const remaining = Number(inv.remaining ?? ((o.grandTotal || o.total || 0) - (inv.paid || 0)));
                                return inv.status !== 'PAID' && remaining > 0 && inv.dueDate && new Date(inv.dueDate) <= new Date();
                            };
                            const hasOverdueGeneral = generalOrders.some((o: any) => isOverdue(o));

                            return (
                                <button 
                                    onClick={() => setActiveTab('ORDERS')} 
                                    className={`pb-4 px-2 text-sm font-black transition-all flex items-center gap-2 relative ${activeTab === 'ORDERS' ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'}`}
                                >
                                    <ShoppingCart size={16} /> طلبيات عامة
                                    {hasOverdueGeneral && <span className="absolute top-0 left-0 w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-200 animate-pulse"></span>}
                                    {activeTab === 'ORDERS' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-full animate-in slide-in-from-bottom-1 duration-300"></div>}
                                </button>
                            );
                        })()}
                        

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
                            selectedProjectForOrders ? (
                <div className={`bg-white p-8 w-full rounded-[2.5rem] shadow-xl border-2 border-blue-600 overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-6 duration-500 flex flex-col min-h-[600px] gap-6 ${
                        (selectedInvoice || showPaymentModal || showHistoryModal || showReturnsHistoryModal || showReturnModal || showReturnSuccessModal || showRefundConfirmModal || showRefundSuccessModal) ? 'hidden' : ''
                    }`}>
                            
                            {/* White Header - Matches General Orders Page Style */}
                            <div className="bg-white border-b border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-6 relative pb-6 no-print">
                                <div className="flex items-center gap-4 w-full lg:w-auto">
                                    <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-200">
                                        <ShoppingBag size={24} />
                                    </div>
                                    <div className="text-right">
                                        <h3 className="text-xl font-black text-blue-600">سجل الطلبيات</h3>
                                        <p className="text-[10px] font-black uppercase tracking-widest mt-1">
                                            <span className="text-gray-900">إدارة و تتبع المشروع - </span>
                                            <span className="text-[#fbb815]">{selectedProjectForOrders.name}</span>
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
                                    {/* Export Dropdown */}
                                    <div className="relative group">
                                        <button className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
                                            <Download size={16} className="text-blue-600"/> تصدير
                                        </button>
                                        <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                            <button 
                                                onClick={() => { exportProjectOrdersCSV(); }} 
                                                className="w-full text-right px-5 py-4 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-3 border-b border-gray-50 transition-colors"
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
                                                className="w-full text-right px-5 py-4 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-3 transition-colors"
                                            >
                                                <FileText size={16} className="text-rose-600"/> PDF (.pdf)
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
                                        className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-blue-700 hover:scale-105 transition-all active:scale-95"
                                    >
                                        <Printer size={16} /> طباعة القائمة
                                    </button>
                                    <button onClick={() => setSelectedProjectForOrders(null)} className="text-gray-400 hover:text-gray-900 transition-all p-2 bg-white rounded-xl hover:bg-gray-50 border border-transparent mr-2 active:scale-90 absolute top-4 left-4 md:static md:top-auto md:left-auto">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Unified Filter Bar */}
                            <div className="px-6 py-5 no-print bg-white rounded-[1.5rem] mb-2 border border-gray-100 shadow-sm flex flex-col gap-4">
                                <div className="flex flex-col lg:flex-row gap-3 items-center" ref={modalDropdownRef}>
                                    {/* Search */}
                                    <div className="relative flex-1 min-w-[300px] group">
                                        <input 
                                            type="text" 
                                            placeholder="بحث برقم فاتورة،" 
                                            value={projectOrderSearch} 
                                            onChange={(e) => { setProjectOrderSearch(e.target.value); setProjectOrderCurrentPage(1); }} 
                                            className="w-full h-[52px] bg-white border border-gray-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none shadow-sm"
                                        />
                                        <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none">
                                            <Search size={20} strokeWidth={3} />
                                        </div>
                                    </div>

                                    {/* Status Dropdown */}
                                    <div className="relative group min-w-[160px]">
                                        <button
                                            type="button"
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveDropdown(activeDropdown === 'project-status' ? null : 'project-status'); }}
                                            className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                        >
                                            <div className="bg-blue-600/10 p-1.5 rounded-lg text-blue-600">
                                                <Filter size={14} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">حالة الفاتورة</p>
                                                <p className="text-[10px] font-black text-gray-900 mt-1">
                                                    {projectOrderStatusFilter === 'ALL' ? 'الكل' : 
                                                     projectOrderStatusFilter === 'PAID' ? 'خالص بالكامل' : 
                                                     projectOrderStatusFilter === 'PARTIAL' ? 'مدفوع جزئياً' : 
                                                     projectOrderStatusFilter === 'UNPAID' ? 'غير مدفوع' : 
                                                     projectOrderStatusFilter === 'CREDIT' ? 'رصيد زائد' : projectOrderStatusFilter}
                                                </p>
                                            </div>
                                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${activeDropdown === 'project-status' ? 'rotate-180' : ''}`} />
                                        </button>
                                        {activeDropdown === 'project-status' && (
                                            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProjectOrderStatusFilter('ALL'); setProjectOrderCurrentPage(1); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-blue-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">الكل</button>
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProjectOrderStatusFilter('UNPAID'); setProjectOrderCurrentPage(1); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-red-50 text-[10px] font-black text-red-600 border-b border-gray-50 transition-colors">غير مدفوع</button>
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProjectOrderStatusFilter('PARTIAL'); setProjectOrderCurrentPage(1); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-amber-50 text-[10px] font-black text-amber-600 border-b border-gray-50 transition-colors">مدفوع جزئياً</button>
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProjectOrderStatusFilter('PAID'); setProjectOrderCurrentPage(1); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-[10px] font-black text-emerald-600 border-b border-gray-50 transition-colors">خالص بالكامل</button>
                                                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setProjectOrderStatusFilter('CREDIT'); setProjectOrderCurrentPage(1); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-purple-50 text-[10px] font-black text-purple-600 transition-colors">رصيد زائد</button>
                                            </div>
                                        )}
                                    </div>

                                    {/* DateRangePicker */}
                                    <DateRangePicker 
                                        startDate={projectOrderDateFrom}
                                        endDate={projectOrderDateTo}
                                        onChange={(start, end) => { setProjectOrderDateFrom(start); setProjectOrderDateTo(end); setProjectOrderCurrentPage(1); }}
                                        theme="yellow"
                                    />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-white" id="project-orders-print-area">
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
                                                    headerClassName="bg-blue-600 border-b border-blue-500"
                                                    setShowReturnProcessModal={(inv: any) => {
                                                        const ord = inv.order;
                                                        if (ord) {
                                                            const init: any = {};
                                                            ord.items.forEach((it: any) => { init[it.id] = 0; });
                                                            setReturnQtys(init);
                                                            setShowReturnModal(ord);
                                                        }
                                                    }}
                                                    footer={
                                                        filteredInvoices.length > 0 ? (
                                                            <div className="p-4 border-t border-gray-100 flex items-center justify-between no-print bg-white">
                                                                <span className="text-xs font-bold text-gray-400">
                                                                    إظهار {(projectOrderCurrentPage - 1) * projectOrderItemsPerPage + 1} إلى {Math.min(projectOrderCurrentPage * projectOrderItemsPerPage, filteredInvoices.length)} من أصل {filteredInvoices.length} فاتورة
                                                                </span>
                                                                <div className="flex gap-2">
                                                                    <button 
                                                                        onClick={() => setProjectOrderCurrentPage(p => Math.max(1, p - 1))}
                                                                        disabled={projectOrderCurrentPage === 1}
                                                                        className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        السابق
                                                                    </button>
                                                                    <span className="px-4 py-2 bg-blue-600/10 text-blue-600 text-xs font-black rounded-xl border border-blue-600/20">
                                                                        {projectOrderCurrentPage} / {totalPages}
                                                                    </span>
                                                                    <button 
                                                                        onClick={() => setProjectOrderCurrentPage(p => Math.min(totalPages, p + 1))}
                                                                        disabled={projectOrderCurrentPage === totalPages}
                                                                        className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                                    >
                                                                        التالي
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        ) : null
                                                    }
                                                />
                                        );
                                    })()}
                                </div>
                            </div>

                            {/* Summary bar */}
                            <div className="p-0">
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
                                        <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm grid grid-cols-3 gap-4 mx-6 mb-6">
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي الطلبيات</p>
                                                <p className="text-2xl font-black font-sans text-blue-600">{salesOrders.length}</p>
                                            </div>
                                            <div className="text-center border-x border-gray-100">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي المشتريات</p>
                                                <p className="text-2xl font-black font-sans text-gray-900">{totalPurchases.toLocaleString()} دج</p>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">المستحقات المتبقية</p>
                                                <p className={`text-2xl font-black font-sans ${projectBalance > 0.01 ? 'text-rose-500' : 'text-emerald-500'}`}>{projectBalance.toLocaleString()} دج</p>
                                            </div>
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                        ) : (
                        <div className="flex flex-col pb-6 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-8 rounded-[2.5rem] border-2 border-gray-900 shadow-xl">
                                {/* Project Header */}
                                <div className="flex items-center justify-between no-print mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-gray-900 text-white p-3 rounded-2xl shadow-lg shadow-gray-200">
                                            <Briefcase size={24} />
                                        </div>
                                        <div className="text-right">
                                            <h3 className="text-xl font-black text-gray-900">
                                                {projectStatusFilter === 'ACTIVE' ? 'المشاريع النشطة' : 'أرشيف المشاريع'}
                                            </h3>
                                            <p className="text-[10px] font-black text-[#fbb815] uppercase tracking-widest mt-1">
                                                {projectStatusFilter === 'ACTIVE' ? 'مشاريع قيد الإنجاز' : 'المشاريع المغلقة أو المعطلة'}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {projectStatusFilter === 'ACTIVE' ? (
                                            <button 
                                                onClick={() => setProjectStatusFilter('DISABLED')} 
                                                className="bg-amber-100 text-amber-700 hover:bg-amber-200 px-5 py-2.5 rounded-xl font-black text-[11px] flex items-center gap-2 shadow-sm transition-all"
                                            >
                                                <Package size={14} /> الأرشيف
                                                <span className="bg-white/50 px-1.5 py-0.5 rounded-md">
                                                    {(customer?.projects || []).filter((p: any) => p.status === 'DISABLED').length}
                                                </span>
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => setProjectStatusFilter('ACTIVE')} 
                                                className="bg-emerald-100 text-emerald-700 hover:bg-emerald-200 px-5 py-2.5 rounded-xl font-black text-[11px] flex items-center gap-2 shadow-sm transition-all"
                                            >
                                                <Briefcase size={14} /> المشاريع النشطة
                                                <span className="bg-white/50 px-1.5 py-0.5 rounded-md">
                                                    {(customer?.projects || []).filter((p: any) => p.status === 'ACTIVE').length}
                                                </span>
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => setIsProjectSheetOpen(true)} 
                                            className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-black text-[11px] flex items-center gap-2 shadow-sm hover:bg-gray-800 transition-all"
                                        >
                                            <Plus size={14} /> إضافة مشروع جديد
                                        </button>
                                    </div>
                                </div>

                                {/* Filter & Sort Bar */}
                                <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm">
                                    <div className="flex flex-wrap items-center gap-4 no-print" ref={dropdownRef}>
                                        {/* Search Field */}
                                        <div className="relative group flex-1 min-w-[280px]">
                                            <input 
                                                type="text"
                                                placeholder="ابحث باسم المشروع، الموقع أو الوصف..."
                                                value={projectSearchQuery}
                                                onChange={(e) => setProjectSearchQuery(e.target.value)}
                                                className="w-full h-[52px] bg-white border border-gray-200 rounded-2xl pr-14 pl-4 text-[11px] font-black outline-none focus:border-gray-900 focus:ring-4 focus:ring-gray-900/5 transition-all shadow-sm"
                                            />
                                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-gray-900 rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none">
                                                <Search size={20} strokeWidth={3} />
                                            </div>
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

                                {(() => {
                                    const projectTotalPages = Math.max(1, Math.ceil(filteredAndSortedProjects.length / projectItemsPerPage));
                                    const paginatedProjects = filteredAndSortedProjects.slice((projectCurrentPage - 1) * projectItemsPerPage, projectCurrentPage * projectItemsPerPage);

                                    return filteredAndSortedProjects.length === 0 ? (
                                        <div className="py-20 text-center bg-white rounded-[2.5rem] border border-gray-100 border-dashed">
                                            <Briefcase size={48} className="mx-auto text-gray-200 mb-4" />
                                            <p className="font-black text-gray-400">لا توجد مشاريع تطابق الفلاتر المختارة</p>
                                        </div>
                                    ) : (
                                    <div className="bg-white border border-gray-100 rounded-[2.5rem] overflow-hidden shadow-xl">
                                        <table className="w-full text-right border-collapse" dir="rtl">
                                            <thead>
                                                <tr className="bg-gray-900 border-b border-gray-800">
                                                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest w-16 text-center">#</th>
                                                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">المشروع / الموقع</th>
                                                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">تاريخ البدء</th>
                                                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">الطلبيات</th>
                                                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">إجمالي المشتريات</th>
                                                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest">المستحقات</th>
                                                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">الحالة</th>
                                                <th className="px-8 py-6 text-xs font-black text-gray-400 uppercase tracking-widest text-center">الإجراءات</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {paginatedProjects.map((p: any, idx: number) => {
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
                                                                    disabled={p.status !== 'DISABLED' && Math.abs(projectBalance) > 0.01}
                                                                    onClick={() => {
                                                                        if (p.status === 'DISABLED') {
                                                                            toggleProjectStatus(p.id, p.status);
                                                                        } else {
                                                                            setArchiveProjectModal(p);
                                                                        }
                                                                    }}
                                                                    className={`p-2.5 border border-gray-200 rounded-xl transition-all shadow-sm active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed ${p.status === 'DISABLED' ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100' : 'bg-gray-50 text-gray-400 hover:bg-gray-900 hover:text-white'}`}
                                                                    title={p.status === 'DISABLED' ? 'تنشيط المشروع' : (Math.abs(projectBalance) > 0.01 ? 'لا يمكن أرشفة المشروع (يوجد رصيد غير مسوى)' : 'أرشفة المشروع')}
                                                                >
                                                                    {p.status === 'DISABLED' ? <Power size={16} /> : <Archive size={16} />}
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                    <div className="p-4 border-t border-gray-100 flex items-center justify-between no-print bg-white">
                                        <span className="text-xs font-bold text-gray-400">
                                            إظهار {(projectCurrentPage - 1) * projectItemsPerPage + 1} إلى {Math.min(projectCurrentPage * projectItemsPerPage, filteredAndSortedProjects.length)} من أصل {filteredAndSortedProjects.length} مشروع
                                        </span>
                                        <div className="flex gap-2">
                                            <button 
                                                onClick={() => setProjectCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={projectCurrentPage === 1}
                                                className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                السابق
                                            </button>
                                            <span className="px-4 py-2 bg-gray-900/5 text-gray-900 text-xs font-black rounded-xl border border-gray-900/10">
                                                {projectCurrentPage} / {projectTotalPages}
                                            </span>
                                            <button 
                                                onClick={() => setProjectCurrentPage(p => Math.min(projectTotalPages, p + 1))}
                                                disabled={projectCurrentPage === projectTotalPages}
                                                className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                                التالي
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                );
                                })()}

                            </div>
                            )
                        )}


                        {activeTab === 'ORDERS' && (() => {
                            const generalOrders = (customer?.orders || []).filter((o: any) => !o.projectId && (o.type === 'SALE' || o.type === 'RETURN_SALE'));
                            const saleOrders = generalOrders.filter((o: any) => o.type === 'SALE');
                            
                            const mappedGeneralInvoices = saleOrders.map((o: any) => {
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
                                    date: o.orderDate,
                                    invoiceDate: o.invoice?.invoiceDate || o.orderDate
                                };
                            });

                            const filteredGeneralInvoices = mappedGeneralInvoices.filter((inv: any) => {
                                const matchesSearch = !generalOrderSearch || 
                                    (inv.invoiceNumber || '').toLowerCase().includes(generalOrderSearch.toLowerCase()) ||
                                    (inv.order?.orderNumber || '').toLowerCase().includes(generalOrderSearch.toLowerCase());
                                    
                                let matchesStatus = true;
                                if (generalOrderStatusFilter !== 'ALL') {
                                    const r = Number(inv.remaining ?? (inv.total - (inv.paid || 0)));
                                    const orig = inv.total || 0;
                                    if (generalOrderStatusFilter === 'PAID') matchesStatus = r === 0;
                                    else if (generalOrderStatusFilter === 'PARTIAL') matchesStatus = r > 0 && r < orig;
                                    else if (generalOrderStatusFilter === 'UNPAID') matchesStatus = r >= orig;
                                    else if (generalOrderStatusFilter === 'CREDIT') matchesStatus = r < 0;
                                }

                                let matchesDate = true;
                                if (generalOrderDateFrom && generalOrderDateTo) {
                                    const d = new Date(inv.date || inv.invoiceDate);
                                    matchesDate = d >= new Date(generalOrderDateFrom) && d <= new Date(generalOrderDateTo);
                                }
                                
                                return matchesSearch && matchesStatus && matchesDate;
                            });

                            const totalPurchases = filteredGeneralInvoices.reduce((s: number, inv: any) => s + (inv.total || 0), 0);
                            const totalPaid = filteredGeneralInvoices.reduce((s: number, inv: any) => s + (inv.paid || 0), 0);
                            const totalRemaining = totalPurchases - totalPaid;

                            const generalOrderItemsPerPage = 20;
                            const generalOrderTotalPages = Math.ceil(filteredGeneralInvoices.length / generalOrderItemsPerPage) || 1;
                            const generalOrderStartIndex = (generalOrderCurrentPage - 1) * generalOrderItemsPerPage;
                            const paginatedGeneralInvoices = filteredGeneralInvoices.slice(generalOrderStartIndex, generalOrderStartIndex + generalOrderItemsPerPage);

                            return (
                                <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 bg-white p-8 rounded-[2.5rem] border-2 border-blue-600 shadow-xl">
                                    {/* Page Header */}
                                    <div className="flex justify-between items-center mb-2 no-print">
                                        <div className="flex items-center gap-4">
                                            <div className="bg-blue-600 text-white p-3 rounded-2xl shadow-lg shadow-blue-200"><ShoppingCart size={24} /></div>
                                            <div className="text-right">
                                                <h3 className="text-xl font-black text-blue-600">طلبيات عامة / بدون مشروع</h3>
                                                <p className="text-[10px] font-black text-[#fbb815] uppercase tracking-widest mt-1">طلبيات لم تُربط بأي مشروع</p>
                                            </div>
                                        </div>
                                        {/* Action Buttons */}
                                        <div className="flex items-center gap-2">
                                            {/* Export Dropdown */}
                                            <div className="relative group">
                                                <button className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
                                                    <Download size={16} className="text-blue-600"/> تصدير
                                                </button>
                                                <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                                    <button
                                                        onClick={() => {
                                                            const ws = xlsx.utils.json_to_sheet(filteredGeneralInvoices.map((inv: any) => ({
                                                                'رقم الفاتورة': inv.invoiceNumber,
                                                                'التاريخ': formatDate(inv.createdAt),
                                                                'المبلغ الإجمالي': inv.total,
                                                                'الحالة': inv.status,
                                                            })));
                                                            const wb = xlsx.utils.book_new();
                                                            xlsx.utils.book_append_sheet(wb, ws, 'طلبيات عامة');
                                                            xlsx.writeFile(wb, `طلبيات-عامة-${customer?.name || ''}.xlsx`);
                                                        }}
                                                        className="w-full text-right px-5 py-4 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-3 border-b border-gray-50 transition-colors"
                                                    >
                                                        <FileSpreadsheet size={16} className="text-emerald-600"/> Excel (.xlsx)
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            const doc = new jsPDF({ orientation: 'landscape' });
                                                            autoTable(doc, {
                                                                head: [['رقم الفاتورة', 'التاريخ', 'المبلغ الإجمالي', 'الحالة']],
                                                                body: filteredGeneralInvoices.map((inv: any) => [
                                                                    inv.invoiceNumber,
                                                                    formatDate(inv.createdAt),
                                                                    `${inv.total} دج`,
                                                                    inv.status,
                                                                ]),
                                                                styles: { font: 'helvetica', fontSize: 9 },
                                                                headStyles: { fillColor: [37, 99, 235] },
                                                            });
                                                            doc.save(`طلبيات-عامة-${customer?.name || ''}.pdf`);
                                                        }}
                                                        className="w-full text-right px-5 py-4 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-3 transition-colors"
                                                    >
                                                        <FileText size={16} className="text-rose-600"/> PDF (.pdf)
                                                    </button>
                                                </div>
                                            </div>
                                            {/* Print Button */}
                                            <button
                                                onClick={() => printDocument()}
                                                className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 hover:bg-blue-700 hover:scale-105 transition-all active:scale-95"
                                            >
                                                <Printer size={16} /> طباعة القائمة
                                            </button>
                                        </div>
                                    </div>

                                    {/* Unified Filter Bar */}
                                    <div className="px-6 py-5 no-print bg-white rounded-[1.5rem] mb-2 border border-gray-100 shadow-sm flex flex-col gap-4">
                                        <div className="flex flex-col lg:flex-row gap-3 items-center" ref={dropdownRef}>
                                            {/* Search */}
                                            <div className="relative flex-1 min-w-[300px] group">
                                                <input 
                                                    type="text" 
                                                    placeholder="بحث برقم فاتورة..."
                                                    value={generalOrderSearch} 
                                                    onChange={(e) => setGeneralOrderSearch(e.target.value)} 
                                                    className="w-full h-[52px] bg-white border border-gray-200 focus:border-blue-300 focus:ring-4 focus:ring-blue-500/10 rounded-2xl pr-14 pl-4 text-sm font-bold transition-all outline-none shadow-sm"
                                                />
                                                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none">
                                                    <Search size={20} strokeWidth={3} />
                                                </div>
                                            </div>

                                            {/* Status Dropdown */}
                                            <div className="relative group min-w-[160px]">
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); setActiveDropdown(activeDropdown === 'gen_status' ? null : 'gen_status'); }}
                                                    className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                                >
                                                    <div className="bg-blue-600/10 p-1.5 rounded-lg text-blue-600">
                                                        <Filter size={14} />
                                                    </div>
                                                    <div className="flex-1">
                                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter leading-none">حالة الفاتورة</p>
                                                        <p className="text-[10px] font-black text-gray-900 mt-1">
                                                            {generalOrderStatusFilter === 'ALL' ? 'الكل' : 
                                                             generalOrderStatusFilter === 'PAID' ? 'خالص بالكامل' : 
                                                             generalOrderStatusFilter === 'PARTIAL' ? 'مدفوع جزئي' : 
                                                             generalOrderStatusFilter === 'UNPAID' ? 'غير مدفوع' : 
                                                             generalOrderStatusFilter === 'CREDIT' ? 'رصيد زائد' : 'الكل'}
                                                        </p>
                                                    </div>
                                                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${activeDropdown === 'gen_status' ? 'rotate-180' : ''}`} />
                                                </button>
                                                {activeDropdown === 'gen_status' && (
                                                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGeneralOrderStatusFilter('ALL'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-blue-50 text-[10px] font-black text-gray-700 border-b border-gray-50 transition-colors">الكل</button>
                                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGeneralOrderStatusFilter('UNPAID'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-red-50 text-[10px] font-black text-red-600 border-b border-gray-50 transition-colors">غير مدفوع</button>
                                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGeneralOrderStatusFilter('PARTIAL'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-amber-50 text-[10px] font-black text-amber-600 border-b border-gray-50 transition-colors">مدفوع جزئي</button>
                                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGeneralOrderStatusFilter('PAID'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-emerald-50 text-[10px] font-black text-emerald-600 border-b border-gray-50 transition-colors">خالص بالكامل</button>
                                                        <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setGeneralOrderStatusFilter('CREDIT'); setActiveDropdown(null); }} className="w-full text-right px-4 py-3 hover:bg-purple-50 text-[10px] font-black text-purple-600 transition-colors">رصيد زائد</button>
                                                    </div>
                                                )}
                                            </div>

                                            {/* DateRangePicker */}
                                            <DateRangePicker 
                                                startDate={generalOrderDateFrom}
                                                endDate={generalOrderDateTo}
                                                onChange={(start, end) => { setGeneralOrderDateFrom(start); setGeneralOrderDateTo(end); setGeneralOrderCurrentPage(1); }}
                                                theme="yellow"
                                            />
                                        </div>
                                    </div>

                                    {/* Orders Table */}
                                    <div className="w-full">
                                        <InvoicesTable
                                            invoices={paginatedGeneralInvoices}
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
                                            headerClassName="bg-blue-600 border-b border-blue-500"
                                            setShowReturnProcessModal={(inv: any) => {
                                                const ord = inv.order;
                                                if (ord) {
                                                    const init: any = {};
                                                    ord.items.forEach((it: any) => { init[it.id] = 0; });
                                                    setReturnQtys(init);
                                                    setShowReturnModal(ord);
                                                }
                                            }}
                                            footer={
                                                filteredGeneralInvoices.length > 0 ? (
                                                    <div className="p-4 border-t border-gray-100 flex items-center justify-between no-print bg-white">
                                                        <span className="text-xs font-bold text-gray-400">
                                                            إظهار {(generalOrderCurrentPage - 1) * generalOrderItemsPerPage + 1} إلى {Math.min(generalOrderCurrentPage * generalOrderItemsPerPage, filteredGeneralInvoices.length)} من أصل {filteredGeneralInvoices.length} فاتورة
                                                        </span>
                                                        <div className="flex gap-2">
                                                            <button 
                                                                onClick={() => setGeneralOrderCurrentPage(p => Math.max(1, p - 1))}
                                                                disabled={generalOrderCurrentPage === 1}
                                                                className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                السابق
                                                            </button>
                                                            <span className="px-4 py-2 bg-blue-600/10 text-blue-600 text-xs font-black rounded-xl border border-blue-600/20">
                                                                {generalOrderCurrentPage} / {generalOrderTotalPages}
                                                            </span>
                                                            <button 
                                                                onClick={() => setGeneralOrderCurrentPage(p => Math.min(generalOrderTotalPages, p + 1))}
                                                                disabled={generalOrderCurrentPage === generalOrderTotalPages}
                                                                className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            >
                                                                التالي
                                                            </button>
                                                        </div>
                                                    </div>
                                                ) : null
                                            }
                                        />
                                    </div>
                                    {/* Summary bar */}
                                    <div className="bg-white border border-gray-100 rounded-[1.5rem] p-5 shadow-sm grid grid-cols-3 gap-4">
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي الطلبيات</p>
                                            <p className="text-2xl font-black font-sans text-blue-600">{saleOrders.length}</p>
                                        </div>
                                        <div className="text-center border-x border-gray-100">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">إجمالي المشتريات</p>
                                            <p className="text-2xl font-black font-sans text-gray-900">{totalPurchases.toLocaleString()} دج</p>
                                        </div>
                                        <div className="text-center">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">المستحقات المتبقية</p>
                                            <p className={`text-2xl font-black font-sans ${totalRemaining > 0.01 ? 'text-rose-500' : 'text-emerald-500'}`}>{totalRemaining.toLocaleString()} دج</p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}


                        {activeTab === 'SOA' && (
                            <div className="flex flex-col pb-6 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[600px] bg-white rounded-[2.5rem] border-2 border-[#8b5cf6] p-8 shadow-xl">
                                <div className="flex justify-between items-center mb-6 no-print">
                                    <div className="flex items-center gap-4">
                                        <div className="bg-[#8b5cf6] text-white p-3 rounded-2xl shadow-lg shadow-purple-100"><FileText size={24} /></div>
                                        <div className="text-right">
                                            <h3 className="text-xl font-black text-[#8b5cf6]">كشف الحساب التفصيلي</h3>
                                            <p className="text-[10px] font-black text-[#fbb815] uppercase tracking-widest mt-1">سجل كامل للحركات المالية والطلبيات</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-3">
                                        <div className="relative group">
                                            <button className="bg-white border border-gray-200 text-gray-700 px-5 py-3 rounded-2xl font-black text-xs shadow-sm flex items-center gap-2 hover:bg-gray-50 transition-all">
                                                <Download size={16} className="text-[#8b5cf6]"/> تصدير
                                            </button>
                                            <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20">
                                                <button onClick={() => { const d = (document as any).filteredSOAData || []; handleExportExcelSOA(d); }} className="w-full text-right px-5 py-4 hover:bg-emerald-50 text-xs font-bold text-gray-700 flex items-center gap-3 border-b border-gray-50 transition-colors">
                                                    <FileSpreadsheet size={16} className="text-emerald-600"/> Excel (.xlsx)
                                                </button>
                                                <button onClick={() => { const d = (document as any).filteredSOAData || []; handleExportPDFSOA(d); }} className="w-full text-right px-5 py-4 hover:bg-rose-50 text-xs font-bold text-gray-700 flex items-center gap-3 transition-colors">
                                                    <FileText size={16} className="text-rose-600"/> PDF (.pdf)
                                                </button>
                                            </div>
                                        </div>
                                        <button onClick={() => printDocument()} className="bg-[#8b5cf6] text-white px-6 py-3 rounded-2xl font-black text-xs flex items-center gap-2 shadow-lg shadow-purple-100 hover:bg-[#7c3aed] hover:scale-105 transition-all active:scale-95">
                                            <Printer size={16} /> طباعة الكشف
                                        </button>
                                    </div>
                                </div>

                                {/* Filters Row */}
                                <div ref={dropdownRef} className="bg-white border border-gray-200 rounded-3xl p-5 shadow-sm flex flex-col gap-5 no-print mb-4 overflow-visible">
                                    <div className="flex flex-wrap items-end gap-4">
                                        {/* Search Filter (Exact Orders style) */}
                                        <div className="relative group flex-[4] min-w-[500px]">
                                            <input 
                                                type="text" 
                                                placeholder="بحث برقم العملية أو المرجع..."
                                                value={soaSearchQuery || ''}
                                                onChange={(e) => setSoaSearchQuery(e.target.value)}
                                                className="w-full h-[52px] bg-white border border-gray-200 rounded-2xl pr-14 pl-4 text-sm font-black placeholder:font-black placeholder:text-gray-500 outline-none focus:border-[#8b5cf6] focus:ring-4 focus:ring-[#8b5cf6]/5 transition-all shadow-sm"
                                            />
                                            <div className="absolute right-1.5 top-1/2 -translate-y-1/2 h-11 w-11 bg-[#8b5cf6] rounded-xl flex items-center justify-center shadow-sm text-white pointer-events-none group-focus-within:scale-110 transition-transform">
                                                <Search size={20} strokeWidth={3} />
                                            </div>
                                        </div>

                                        {/* Motif Filter (Exact Orders style) */}
                                        <div className="relative group flex-1 min-w-[200px]">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setActiveDropdown(activeDropdown === 'soa-motif' ? null : 'soa-motif');
                                                }}
                                                className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                            >
                                                <div className="bg-[#8b5cf6]/10 p-1.5 rounded-lg text-[#8b5cf6]">
                                                    <Activity size={14} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter leading-none">نوع العملية</p>
                                                    <p className="text-[10px] font-medium text-gray-900 mt-1">
                                                        {soaMotifFilter === 'ALL' ? 'كل الأنواع' : 
                                                         soaMotifFilter === 'SALE' ? 'مبيعات' : 
                                                         soaMotifFilter === 'RETURN' ? 'مرتجعات' :
                                                         soaMotifFilter === 'PAYMENT' ? 'تسديد ديون' : 'استرداد أموال'}
                                                    </p>
                                                </div>
                                                <ChevronDown size={14} className={`text-gray-300 transition-transform ${activeDropdown === 'soa-motif' ? 'rotate-180' : ''}`} />
                                            </button>
                                            {activeDropdown === 'soa-motif' && (
                                                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] py-2 animate-in zoom-in-95 duration-200">
                                                    {[
                                                        { id: 'ALL', label: 'كل الأنواع' },
                                                        { id: 'SALE', label: 'مبيعات' },
                                                        { id: 'RETURN', label: 'مرتجعات' },
                                                        { id: 'PAYMENT', label: 'تسديد ديون' },
                                                        { id: 'REFUND', label: 'استرداد أموال' }
                                                    ].map(m => (
                                                        <button 
                                                            key={m.id}
                                                            type="button"
                                                            onClick={(e) => { 
                                                                e.preventDefault();
                                                                e.stopPropagation(); 
                                                                setSoaMotifFilter(m.id); 
                                                                setActiveDropdown(null); 
                                                            }} 
                                                            className={`w-full text-right px-5 py-2.5 text-[10px] font-bold transition-colors ${soaMotifFilter === m.id ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'hover:bg-gray-50 text-gray-700'}`}
                                                        >
                                                            {m.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Payment Method Filter (Exact Orders style) */}
                                        <div className="relative group flex-1 min-w-[200px]">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setActiveDropdown(activeDropdown === 'soa-method' ? null : 'soa-method');
                                                }}
                                                className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                            >
                                                <div className="bg-[#8b5cf6]/10 p-1.5 rounded-lg text-[#8b5cf6]">
                                                    <CreditCard size={14} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter leading-none">طريقة الدفع</p>
                                                    <p className="text-[10px] font-medium text-gray-900 mt-1">
                                                        {soaMethodFilter === 'ALL' ? 'كل الطرق' : 
                                                         soaMethodFilter === 'CASH' ? 'نقداً (CASH)' : 
                                                         soaMethodFilter === 'CHEQUE' ? 'شيك (CHEQUE)' : 'تحويل بنكي'}
                                                    </p>
                                                </div>
                                                <ChevronDown size={14} className={`text-gray-300 transition-transform ${activeDropdown === 'soa-method' ? 'rotate-180' : ''}`} />
                                            </button>
                                            {activeDropdown === 'soa-method' && (
                                                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] py-2 animate-in zoom-in-95 duration-200">
                                                    {['ALL', 'CASH', 'CHEQUE', 'BANK_TRANSFER'].map(m => (
                                                        <button 
                                                            key={m}
                                                            type="button"
                                                            onClick={(e) => { 
                                                                e.preventDefault();
                                                                e.stopPropagation(); 
                                                                setSoaMethodFilter(m); 
                                                                setActiveDropdown(null); 
                                                            }} 
                                                            className={`w-full text-right px-5 py-2.5 text-[10px] font-bold transition-colors ${soaMethodFilter === m ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'hover:bg-gray-50 text-gray-700'}`}
                                                        >
                                                            {m === 'ALL' ? 'كل الطرق' : m === 'CASH' ? 'نقداً' : m === 'CHEQUE' ? 'شيك' : 'تحويل بنكي'}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Project Filter (Exact Orders style) */}
                                        <div className="relative group flex-1 min-w-[200px]">
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    setActiveDropdown(activeDropdown === 'soa-project' ? null : 'soa-project');
                                                }}
                                                className="w-full h-[52px] flex items-center gap-3 bg-white border border-gray-200 rounded-2xl px-4 shadow-sm hover:shadow-md transition-all text-right"
                                            >
                                                <div className="bg-[#8b5cf6]/10 p-1.5 rounded-lg text-[#8b5cf6]">
                                                    <Briefcase size={14} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[9px] font-medium text-gray-400 uppercase tracking-tighter leading-none">المشروع</p>
                                                    <p className="text-[10px] font-medium text-gray-900 mt-1 truncate max-w-[120px]">
                                                        {soaProjectFilter === 'ALL' ? 'كل المشاريع' : 
                                                         soaProjectFilter === 'GENERAL' ? 'بدون مشروع' : 
                                                         (customer?.projects?.find((p: any) => p.id.toString() === soaProjectFilter)?.name || 'غير معروف')}
                                                    </p>
                                                </div>
                                                <ChevronDown size={14} className={`text-gray-300 transition-transform ${activeDropdown === 'soa-project' ? 'rotate-180' : ''}`} />
                                            </button>
                                            {activeDropdown === 'soa-project' && (
                                                <div className="absolute top-full mt-2 w-full bg-white border border-gray-100 rounded-2xl shadow-2xl z-[100] py-2 animate-in zoom-in-95 duration-200 max-h-[300px] overflow-y-auto">
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSoaProjectFilter('ALL'); setActiveDropdown(null); }} 
                                                        className={`w-full text-right px-5 py-2.5 text-[10px] font-bold transition-colors ${soaProjectFilter === 'ALL' ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'hover:bg-gray-50 text-gray-700'}`}
                                                    >
                                                        كل المشاريع
                                                    </button>
                                                    <button 
                                                        type="button"
                                                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSoaProjectFilter('GENERAL'); setActiveDropdown(null); }} 
                                                        className={`w-full text-right px-5 py-2.5 text-[10px] font-bold transition-colors ${soaProjectFilter === 'GENERAL' ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'hover:bg-gray-50 text-gray-700'}`}
                                                    >
                                                        بدون مشروع
                                                    </button>
                                                    {customer?.projects?.filter((p: any) => p.status === 'ACTIVE').map((p: any) => (
                                                        <button 
                                                            key={p.id}
                                                            type="button"
                                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setSoaProjectFilter(p.id.toString()); setActiveDropdown(null); }} 
                                                            className={`w-full text-right px-5 py-2.5 text-[10px] font-bold transition-colors ${soaProjectFilter === p.id.toString() ? 'bg-[#8b5cf6]/10 text-[#8b5cf6]' : 'hover:bg-gray-50 text-gray-700'}`}
                                                        >
                                                            {p.name}
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Date Range Picker Filter (Exact weight/style) */}
                                        <div className="flex-[1.5] min-w-[240px]">
                                            <DateRangePicker 
                                                startDate={soaDateFrom}
                                                endDate={soaDateTo}
                                                onChange={(start, end) => { setSoaDateFrom(start); setSoaDateTo(end); }}
                                            />
                                        </div>
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
                                                ref: o.orderNumber,
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

                                    (document as any).filteredSOAData = filteredTxs;

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

                                    const totalSoaPages = Math.max(1, Math.ceil(displayedTxs.length / soaItemsPerPage));
                                    const validCurrentPage = Math.min(soaCurrentPage, totalSoaPages);
                                    const paginatedTxs = displayedTxs.slice((validCurrentPage - 1) * soaItemsPerPage, validCurrentPage * soaItemsPerPage);

                                    return (
                                        <div className="flex flex-col bg-white rounded-[2.5rem] border border-gray-100 shadow-xl overflow-hidden">
                                            {/* Initial Balance Header */}
                                            <div className="bg-[#8b5cf6] text-white p-6 rounded-t-[2rem] flex justify-between items-center shadow-lg shadow-purple-100 no-print">
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
                                                        <th className="p-4 text-center">المرجع / الطلبية</th>
                                                        <th className="p-4">رقم العملية</th>
                                                        <th className="p-4 text-center">المشروع</th>
                                                        <th className="p-4">مبلغ البيع (دج)</th>
                                                        <th className="p-4">طريقة الدفع</th>
                                                        <th className="p-4 text-center">البيان (Motif)</th>
                                                        <th className="p-4 text-emerald-600">المدفوعات (دج)</th>
                                                        <th className="p-4 bg-gray-100/50 text-gray-900">الرصيد المتبقي (دج)</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {paginatedTxs.map((tx, idx) => (
                                                        <tr key={idx} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors font-bold text-sm">
                                                            <td className="p-4 text-center text-gray-400 font-sans">{filteredTxs.length - ((validCurrentPage - 1) * soaItemsPerPage + idx)}</td>
                                                            <td className="p-4 font-sans">{tx.date.toLocaleDateString('ar-DZ')}</td>
                                                            <td className="p-4 text-center font-sans text-[11px]">
                                                                <span className="bg-gray-50 px-2 py-1 rounded-lg border border-gray-100 text-gray-500">{tx.ref}</span>
                                                            </td>
                                                            <td className="p-4">
                                                                <span className={`text-xs font-black px-2 py-1 rounded-lg font-sans ${tx.number === 'Droits' || tx.number === 'Remboursement' || tx.number === 'Retours' ? 'text-gray-400 bg-gray-50' : 'text-blue-600 bg-blue-50'}`}>{tx.number}</span>
                                                            </td>
                                                            <td className="p-4 text-center text-[10px] font-bold text-gray-500 bg-gray-50/50">
                                                                {tx.project}
                                                            </td>
                                                            <td className="p-4 font-sans text-left">
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
                                                            <td className="p-4 text-center">
                                                                <span className={`text-[10px] px-2 py-1 rounded-lg ${
                                                                    tx.type === 'SALE' ? 'bg-blue-50 text-blue-700' :
                                                                    tx.type === 'RETURN' ? 'bg-orange-50 text-orange-700' :
                                                                    tx.type === 'REFUND' ? 'bg-purple-50 text-purple-700' :
                                                                    'bg-emerald-50 text-emerald-700'
                                                                }`}>
                                                                    {tx.motif}
                                                                </span>
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
                                            
                                            {/* Pagination Controls */}
                                            {totalSoaPages > 1 && (
                                                <div className="p-4 border-t border-gray-100 flex items-center justify-between no-print bg-white rounded-b-[2rem]">
                                                    <span className="text-xs font-bold text-gray-400">
                                                        إظهار {(validCurrentPage - 1) * soaItemsPerPage + 1} إلى {Math.min(validCurrentPage * soaItemsPerPage, displayedTxs.length)} من أصل {displayedTxs.length} عملية
                                                    </span>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => setSoaCurrentPage(p => Math.max(1, p - 1))}
                                                            disabled={validCurrentPage === 1}
                                                            className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            السابق
                                                        </button>
                                                        <span className="px-4 py-2 bg-[#8b5cf6]/10 text-[#8b5cf6] text-xs font-black rounded-xl border border-[#8b5cf6]/20">
                                                            {validCurrentPage} / {totalSoaPages}
                                                        </span>
                                                        <button 
                                                            onClick={() => setSoaCurrentPage(p => Math.min(totalSoaPages, p + 1))}
                                                            disabled={validCurrentPage === totalSoaPages}
                                                            className="px-4 py-2 bg-gray-50 border border-gray-200 text-gray-700 text-xs font-black rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            التالي
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })()}
                            </div>
                        )}
                    </div>
                </div>

                {/* MODALS */}
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
                                        {/* TVA Toggle */}
                                        <div className="bg-amber-50/50 p-4 rounded-[1.2rem] border border-amber-100 flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-black text-amber-900 mb-1">خاضع للضريبة (TVA)</h4>
                                                <p className="text-[10px] text-amber-600 font-bold">تحديد ما إذا كان هذا العميل سيتم احتساب الـ TVA في فواتيره (النظام الحقيقي)</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => setEditData({ ...editData, isTvaSubject: editData.isTvaSubject !== undefined ? !editData.isTvaSubject : false })}
                                                className={`relative w-14 h-8 rounded-full transition-colors ${(editData.isTvaSubject ?? true) ? 'bg-amber-500' : 'bg-gray-300'}`}
                                            >
                                                <div className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform ${(editData.isTvaSubject ?? true) ? 'left-1' : 'left-7'}`}></div>
                                            </button>
                                        </div>

                                        {/* RC Field */}
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-black text-gray-400 uppercase tracking-tighter mr-1">رقم السجل التجاري (RC)</label>
                                            <input
                                                type="text"
                                                value={editData.rc || ''}
                                                onChange={e => setEditData({ ...editData, rc: e.target.value.toUpperCase() })}
                                                onBlur={() => setFieldTouched('rc')}
                                                placeholder="WWXX-XXA/BXXXXXXX"
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
                                                placeholder="14 إلى 20 رقماً..."
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
                                                placeholder="11 إلى 13 رقماً..."
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
                                                placeholder="15 إلى 20 رقماً..."
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
                {/* PAYMENT MODAL */}
                {showPaymentModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300" dir="rtl">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-200">
                                        <CreditCard size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900">تسجيل دفعة</h2>
                                        <p className="text-gray-500 text-xs font-bold tracking-tight">الفاتورة: {showPaymentModal.orderNumber}</p>
                                    </div>
                                </div>
                                <button onClick={() => setShowPaymentModal(null)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={20} /></button>
                            </div>
                            <form onSubmit={(e) => { e.preventDefault(); handleRecordPayment(); }} className="p-8 space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pr-2">المبلغ المدفوع (دج)</label>
                                    <input 
                                        type="number" 
                                        value={paymentAmount || ''}
                                        onClick={e => (e.target as HTMLInputElement).select()}
                                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                                        className="w-full h-14 bg-gray-50 border border-gray-200 rounded-2xl px-6 text-lg font-black text-emerald-600 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none text-left"
                                        required
                                        placeholder="0.00"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3 pr-2">طريقة الدفع</label>
                                    <div className="grid grid-cols-3 gap-3">
                                        {['CASH', 'CHEQUE', 'TRANSFER'].map((method) => (
                                            <button
                                                key={method}
                                                type="button"
                                                onClick={() => setPaymentMethod(method as any)}
                                                className={`p-4 rounded-2xl border-2 transition-all font-black text-[10px] ${paymentMethod === method ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-gray-100 text-gray-400'}`}
                                            >
                                                {method === 'CASH' ? 'نقداً' : method === 'CHEQUE' ? 'شيك' : 'تحويل'}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {(paymentMethod === 'CHEQUE' || paymentMethod === 'TRANSFER') && (
                                    <div className="space-y-3 animate-in slide-in-from-top-2 duration-300">
                                        <div className="relative">
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                                                <FileText size={18} />
                                            </div>
                                            <input 
                                                type="text" 
                                                placeholder={paymentMethod === 'CHEQUE' ? "رقم الشيك البنكي" : "رقم الحوالة / المرجع"} 
                                                value={chequeNumber} 
                                                onChange={e => setChequeNumber(e.target.value)} 
                                                className="w-full h-12 bg-white border border-gray-200 rounded-xl pr-12 pl-4 text-sm font-bold focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all outline-none shadow-sm" 
                                            />
                                        </div>
                                        <div className="relative group">
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500 group-focus-within:text-emerald-600 transition-colors pointer-events-none">
                                                <Building2 size={18} />
                                            </div>
                                            <select 
                                                value={paymentBank} 
                                                onChange={e => setPaymentBank(e.target.value)} 
                                                className="w-full h-12 bg-white border border-gray-200 rounded-xl pr-12 pl-10 text-sm font-black appearance-none outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/5 transition-all cursor-pointer shadow-sm hover:border-gray-300"
                                            >
                                                <option value="">اختر البنك أو المؤسسة المالية...</option>
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
                                            <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                                                <ChevronDown size={16} />
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <button 
                                    type="submit" 
                                    disabled={
                                        isSubmitting || 
                                        paymentAmount <= 0 || 
                                        ((paymentMethod === 'CHEQUE' || paymentMethod === 'TRANSFER') && (!chequeNumber || !paymentBank))
                                    } 
                                    className="w-full h-14 rounded-2xl font-black shadow-lg transition-all flex items-center justify-center gap-2 bg-emerald-500 text-white hover:bg-emerald-600 disabled:bg-gray-100 disabled:text-gray-400 disabled:shadow-none disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? <RotateCcw className="animate-spin" size={20} /> : 'تأكيد العملية'}
                                </button>
                            </form>
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

                {/* HISTORY MODAL */}
                {showHistoryModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="bg-gray-900 p-3 rounded-2xl text-white shadow-lg"><History size={24} /></div>
                                    <div>
                                        <h2 className="text-xl font-black text-gray-900">سجل المدفوعات</h2>
                                        <p className="text-gray-500 text-xs font-bold tracking-tight">الفاتورة: {showHistoryModal.invoiceNumber}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => { const el = document.getElementById('full-history-print-cust'); if(el){const o=document.body.innerHTML;document.body.innerHTML=el.innerHTML;window.print();document.body.innerHTML=o;window.location.reload();}}} className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl font-black text-xs hover:bg-gray-800 transition-all"><Printer size={14} /> طباعة السجل</button>
                                    <button onClick={() => setShowHistoryModal(false)} className="p-2 hover:bg-gray-200 rounded-xl text-gray-400 transition-all"><X size={20} /></button>
                                </div>
                            </div>
                            <div className="p-8 max-h-[60vh] overflow-y-auto">
                                {!showHistoryModal.payments || showHistoryModal.payments.length === 0 ? (
                                    <div className="py-20 text-center text-gray-300 flex flex-col items-center gap-4"><CreditCard size={48} /><p className="font-black">لا توجد دفعات مسجلة</p></div>
                                ) : (
                                    <div className="relative space-y-8 pr-4 border-r-2 border-gray-100 mr-2">
                                        {showHistoryModal.payments.map((p: any) => (
                                            <div key={p.id} className="relative">
                                                <div className={`absolute top-2 -right-[23px] w-4 h-4 rounded-full ${p.isReturn ? 'bg-orange-500' : (p.amount < 0 ? 'bg-purple-600' : 'bg-blue-600')} border-4 border-white shadow-sm ring-2`}></div>
                                                <div className={`${p.isReturn ? 'bg-orange-50/50 border-orange-100' : 'bg-gray-50 border-gray-100'} p-5 rounded-2xl border flex flex-col gap-2 hover:bg-white hover:shadow-lg transition-all`}>
                                                    <div className="flex justify-between items-center" dir="rtl">
                                                        <div className="flex items-center gap-3">
                                                            <span className={`text-lg font-black font-sans ${p.isReturn ? 'text-orange-600' : (p.amount < 0 ? 'text-purple-600' : 'text-gray-900')}`}>
                                                                {(p.isReturn || p.amount < 0) ? '-' : '+'}{Math.abs(p.amount).toLocaleString()} دج
                                                            </span>
                                                            <button onClick={() => { const el = document.getElementById(`receipt-cust-${p.id}`); if(el){const o=document.body.innerHTML;document.body.innerHTML=el.innerHTML;window.print();document.body.innerHTML=o;window.location.reload();}}} className={`flex items-center gap-1.5 px-3 py-1.5 ${p.isReturn ? 'bg-orange-600' : (p.amount < 0 ? 'bg-purple-600' : 'bg-blue-600')} text-white rounded-lg text-[10px] font-black`}><Printer size={12} /> طباعة الوصل</button>
                                                        </div>
                                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${p.isReturn ? 'text-orange-600 bg-orange-50' : (p.amount < 0 ? 'text-purple-600 bg-purple-50' : 'text-blue-600 bg-blue-50')}`}>
                                                            {p.isReturn ? 'DÉDUCTION RETOUR' : (p.amount < 0 ? 'Remboursement' : p.paymentMethod)}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-400 justify-end" dir="rtl">
                                                        <span>{new Date(p.paymentDate).toLocaleString('ar-DZ')}</span>
                                                        <Clock size={12} />
                                                    </div>
                                                    <div className={`mt-1 p-2 rounded-lg border ${p.isReturn ? 'bg-orange-100/30 border-orange-200/50' : 'bg-white border-gray-100'} flex flex-col gap-1`} dir="rtl">
                                                        <span className={`text-[8px] font-black uppercase tracking-tighter ${p.isReturn ? 'text-orange-600' : 'text-gray-400'}`}>الوصف:</span>
                                                        <p className={`text-[11px] font-black ${p.isReturn ? 'text-orange-900' : 'text-gray-700'} leading-none mb-1`}>{p.notes || (p.amount < 0 ? 'إرجاع رصيد زائد للعميل' : 'تسديد دفعة مالية')}</p>
                                                        {(p.paymentMethod === 'CHEQUE' || p.paymentMethod === 'BANK_TRANSFER') && (
                                                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 pt-1 border-t border-gray-50">
                                                                <div className="flex items-center gap-1"><span className="text-[9px] text-gray-400 font-bold">الرقم:</span><span className="text-[10px] text-blue-600 font-black font-sans">{p.chequeNumber}</span></div>
                                                                <div className="flex items-center gap-1"><span className="text-[9px] text-gray-400 font-bold">البنك:</span><span className="text-[10px] text-gray-700 font-black">{p.bankName}</span></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    {p.isReturn && p.items && (
                                                        <div className="mt-2 p-3 bg-orange-50 border border-orange-100 rounded-xl" dir="rtl">
                                                            <p className="text-[9px] font-black text-orange-800 mb-2 border-b border-orange-200 pb-1 uppercase tracking-tighter text-right">السلع المسترجعة / PRODUITS RETOURNÉS</p>
                                                            <div className="space-y-1">
                                                                {p.items.map((item: any, i: number) => (
                                                                    <div key={i} className="flex justify-between items-center text-[10px] font-bold text-gray-600">
                                                                        <span className="font-sans">({item.quantity}) x {(item.unitPrice || 0).toLocaleString()} دج</span>
                                                                        <span className="text-gray-900">{item.product?.name}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                    {/* Hidden Receipt */}
                                                    <div id={`receipt-cust-${p.id}`} className="hidden">
                                                        <div className="p-10 font-sans text-left" dir="ltr">
                                                            <div className="flex justify-between items-start border-b-2 border-gray-900 pb-6 mb-8">
                                                                <div><h1 className="text-3xl font-black text-gray-900 mb-2 uppercase">{p.amount < 0 ? 'REÇU DE REMBOURSEMENT' : 'REÇU DE PAIEMENT'}</h1><p className="text-gray-500 font-bold">Réf: {p.id}</p></div>
                                                                <div className="text-right"><p className="text-xl font-black text-blue-600">{settings?.storeName || 'مخزون'}</p></div>
                                                            </div>
                                                            <div className="space-y-6">
                                                                <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Date:</span><span className="font-black font-sans">{new Date(p.paymentDate).toLocaleString('fr-FR')}</span></div>
                                                                <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Facture:</span><span className="font-black">{showHistoryModal.invoiceNumber}</span></div>
                                                                <div className="flex justify-between border-b border-gray-100 py-4"><span className="text-gray-500 font-bold uppercase text-xs">Mode:</span><span className="font-black">{p.paymentMethod}</span></div>
                                                                <div className={`${p.amount < 0 ? 'bg-purple-600' : 'bg-gray-900'} text-white p-8 rounded-3xl mt-10 text-center shadow-2xl`}><p className="text-xs font-bold opacity-60 mb-2 tracking-widest uppercase">MONTANT</p><p className="text-5xl font-black font-sans">{Math.abs(p.amount).toLocaleString()} DZD</p></div>
                                                            </div>
                                                            <div className="grid grid-cols-2 gap-20 mt-16 text-center"><div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs">Cachet et Signature</div><div className="border-t-2 border-gray-900 pt-4 font-black uppercase text-xs">Signature Client</div></div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <div className="p-8 border-t border-gray-50 flex justify-between items-center bg-gray-50/30">
                                <div><p className="text-[10px] font-black text-gray-400 uppercase">إجمالي المحصل</p><p className="text-xl font-black text-green-600 font-sans">{(showHistoryModal.paid || 0).toLocaleString()} دج</p></div>
                                <div className="text-left">
                                    <p className="text-[10px] font-black text-gray-400 uppercase">المتبقي</p>
                                    <p className={`text-xl font-black font-sans ${(showHistoryModal.remaining||0) < 0 ? 'text-purple-600' : 'text-red-600'}`}>{Math.abs(showHistoryModal.remaining||0).toLocaleString()} دج</p>
                                    {showHistoryModal.remaining < 0 && <button onClick={() => handleRefundExcess(showHistoryModal)} className="mt-2 text-[10px] font-black bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 shadow-md flex items-center gap-1 ml-auto"><Banknote size={12} /> إرجاع الفائض</button>}
                                </div>
                            </div>
                            {/* Hidden Full History */}
                            <div id="full-history-print-cust" className="hidden">
                                <div className="p-10 font-sans text-left" dir="ltr">
                                    <div className="flex justify-between items-center border-b-2 border-gray-900 pb-4 mb-6"><h1 className="text-2xl font-black uppercase">HISTORIQUE DES PAIEMENTS</h1><p className="text-xl font-black text-blue-600 uppercase">{settings?.storeName || 'مخزون'}</p></div>
                                    <div className="mb-10 flex justify-between items-start"><div><p className="text-xs font-bold text-gray-400 uppercase">Client:</p><p className="text-xl font-black">{showHistoryModal.customer?.name || showHistoryModal.customerName || 'عابر'}</p><p className="text-sm font-bold text-gray-600 font-sans">Facture: {showHistoryModal.invoiceNumber}</p></div><div className="text-right"><p className="text-xs font-bold text-gray-400 uppercase">État actuel:</p><p className={`text-lg font-black font-sans ${showHistoryModal.remaining < 0 ? 'text-purple-600' : 'text-red-600'}`}>Reste: {Math.abs(showHistoryModal.remaining||0).toLocaleString()} DZD</p></div></div>
                                    <table className="w-full text-left border-collapse"><thead className="bg-gray-100"><tr><th className="p-3 text-xs font-black uppercase">Date</th><th className="p-3 text-xs font-black uppercase">Mode / Type</th><th className="p-3 text-xs font-black uppercase text-right">Montant</th></tr></thead><tbody>{showHistoryModal.payments?.map((p: any) => (<tr key={p.id} className="border-b border-gray-100"><td className="p-3 text-sm font-bold font-sans">{new Date(p.paymentDate).toLocaleDateString('fr-FR')}</td><td className="p-3 text-sm font-bold uppercase">{p.isReturn ? 'RETOUR' : p.paymentMethod}</td><td className="p-3 text-sm font-black text-right font-sans">{(p.isReturn || p.amount < 0) ? '-' : '+'}{Math.abs(p.amount).toLocaleString()} DZD</td></tr>))}</tbody><tfoot><tr className="bg-gray-900 text-white"><td colSpan={2} className="p-4 text-right font-black uppercase">Total Payé:</td><td className="p-4 text-right font-black font-sans">{(showHistoryModal.paid||0).toLocaleString()} DZD</td></tr></tfoot></table>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {archiveProjectModal && (
                    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[250] flex items-center justify-center p-4 animate-in fade-in duration-300">
                        <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-300">
                            <div className="p-8 flex flex-col items-center text-center gap-4">
                                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mb-2">
                                    <Archive size={32} />
                                </div>
                                <h2 className="text-2xl font-black text-gray-900">أرشفة المشروع</h2>
                                <p className="text-gray-500 font-bold text-sm">
                                    هل أنت متأكد من رغبتك في أرشفة مشروع <span className="text-gray-900 font-black">{archiveProjectModal.name}</span>؟
                                    <br/><br/>
                                    لن يظهر هذا المشروع في قائمة المشاريع النشطة، ولكن يمكنك دائماً استعادته من الأرشيف.
                                </p>
                            </div>
                            <div className="p-6 bg-gray-50 flex items-center gap-3 border-t border-gray-100">
                                <button 
                                    onClick={() => setArchiveProjectModal(null)}
                                    className="flex-1 py-3 text-gray-500 font-black hover:bg-gray-200 rounded-xl transition-all"
                                >
                                    إلغاء
                                </button>
                                <button 
                                    onClick={() => {
                                        toggleProjectStatus(archiveProjectModal.id, archiveProjectModal.status);
                                        setArchiveProjectModal(null);
                                    }}
                                    className="flex-1 py-3 bg-amber-500 text-white font-black hover:bg-amber-600 rounded-xl shadow-lg shadow-amber-200 transition-all flex items-center justify-center gap-2"
                                >
                                    <Archive size={18} /> تأكيد الأرشفة
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
