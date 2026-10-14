import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  CreditCard,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  DollarSign,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { apiClient } from '@/services/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Input } from '@/shared/components/ui/Input';

interface ProjectInvoicesViewProps {
  projectId: string;
}

interface InvoiceItem {
  id: string;
  invoiceNumber: string;
  status: 'draft' | 'issued' | 'partially_paid' | 'paid' | 'cancelled' | 'voided';
  startDate: string;
  endDate: string;
  billableUnits: number;
  subtotal: number;
  total: number;
  notes: string | null;
  issuedAt: string | null;
  paidAt: string | null;
  createdAt: string;
  allocations?: Array<{
    amount: number;
  }>;
}

interface PaymentRecord {
  id: string;
  paymentNumber: string;
  amount: number;
  allocatedAmount: number;
  unallocatedAmount: number;
  method: string;
  status: string;
  paidAt: string;
  notes: string | null;
}

interface BillablePreview {
  count: number;
  totalAmount: number;
  items: Array<{
    subTaskId: string;
    taskId: string;
    taskTitle: string;
    title: string;
    unitName: string | null;
    floorName: string | null;
    workerName: string | null;
    completedAt: string;
    price: number;
  }>;
}

export function ProjectInvoicesView({ projectId }: ProjectInvoicesViewProps) {
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [selectedInvoiceForAlloc, setSelectedInvoiceForAlloc] = useState<InvoiceItem | null>(null);

  // Create Invoice Form state
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [previewData, setPreviewData] = useState<BillablePreview | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isSubmittingInvoice, setIsSubmittingInvoice] = useState(false);

  // Record Payment Form state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentDate, setPaymentDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [paymentNotes, setPaymentNotes] = useState('');
  const [targetInvoiceId, setTargetInvoiceId] = useState('');
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  // Allocate Modal Form state
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [allocateAmount, setAllocateAmount] = useState('');
  const [allocateNotes, setAllocateNotes] = useState('');
  const [isSubmittingAllocation, setIsSubmittingAllocation] = useState(false);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [invRes, payRes] = await Promise.all([
        apiClient.get<any>('/admin/invoices', { projectId }),
        apiClient.get<any>(`/admin/projects/${projectId}/payments`),
      ]);

      const rawInvoices = invRes.data?.data || invRes.data || invRes;
      const rawPayments = payRes.data?.data || payRes.data || payRes;

      setInvoices(Array.isArray(rawInvoices) ? rawInvoices : []);
      setPayments(Array.isArray(rawPayments) ? rawPayments : []);
    } catch (err) {
      console.error('Error fetching invoices/payments', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchData();
    }
  }, [projectId]);

  // Live billable tasks preview when dates change or modal opens
  const fetchBillablePreview = async () => {
    if (!startDate || !endDate) return;
    try {
      setIsPreviewLoading(true);
      const res = await apiClient.get<any>('/admin/invoices/billable-tasks', {
        projectId,
        startDate,
        endDate,
      });
      const data = res.data?.data || res.data || res;
      setPreviewData(data);
    } catch (err) {
      console.error('Failed to preview billable tasks', err);
      setPreviewData(null);
    } finally {
      setIsPreviewLoading(false);
    }
  };

  useEffect(() => {
    if (isCreateModalOpen) {
      fetchBillablePreview();
    }
  }, [isCreateModalOpen, startDate, endDate]);

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!previewData || previewData.count === 0) {
      alert('Cannot create invoice: no completed and approved tasks in this date range.');
      return;
    }

    try {
      setIsSubmittingInvoice(true);
      await apiClient.post('/admin/invoices', {
        projectId,
        startDate,
        endDate,
        notes: invoiceNotes,
        status: 'issued',
      });
      setIsCreateModalOpen(false);
      setInvoiceNotes('');
      fetchData();
    } catch (err: any) {
      alert('Failed to issue invoice: ' + (err?.response?.data?.message || err?.message || 'Error'));
    } finally {
      setIsSubmittingInvoice(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(paymentAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid payment amount');
      return;
    }

    try {
      setIsSubmittingPayment(true);
      await apiClient.post('/admin/invoices/payments', {
        projectId,
        amount: amountNum,
        method: paymentMethod,
        paidAt: paymentDate,
        notes: paymentNotes,
        allocateToInvoiceId: targetInvoiceId || undefined,
      });
      setIsPaymentModalOpen(false);
      setPaymentAmount('');
      setPaymentNotes('');
      setTargetInvoiceId('');
      fetchData();
    } catch (err: any) {
      alert('Failed to record payment: ' + (err?.response?.data?.message || err?.message || 'Error'));
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleAllocatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceForAlloc || !selectedPaymentId) return;
    const amountNum = parseFloat(allocateAmount);
    if (!amountNum || amountNum <= 0) {
      alert('Please enter a valid allocation amount');
      return;
    }

    try {
      setIsSubmittingAllocation(true);
      await apiClient.post('/admin/invoices/payments/allocate', {
        paymentId: selectedPaymentId,
        invoiceId: selectedInvoiceForAlloc.id,
        amount: amountNum,
        notes: allocateNotes,
      });
      setIsAllocateModalOpen(false);
      setSelectedInvoiceForAlloc(null);
      setSelectedPaymentId('');
      setAllocateAmount('');
      setAllocateNotes('');
      fetchData();
    } catch (err: any) {
      alert('Allocation failed: ' + (err?.response?.data?.message || err?.message || 'Error'));
    } finally {
      setIsSubmittingAllocation(false);
    }
  };

  const handleDownloadInvoicePdf = async (inv: InvoiceItem) => {
    try {
      const res = await apiClient.get<Blob>(`/admin/invoices/${inv.id}/export`, {
        responseType: 'blob',
      });
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${inv.invoiceNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to export invoice PDF: ' + (err?.message || 'Error'));
    }
  };

  const handleVoidInvoice = async (inv: InvoiceItem) => {
    const reason = prompt(
      `Are you sure you want to VOID invoice ${inv.invoiceNumber}?\n\nVoiding will release all its completed subtasks back to the billable pool so they can be re-invoiced. Any allocated funds will be returned to the client's unallocated deposit.`,
      'Cancelled by billing admin',
    );
    if (reason === null) return;

    try {
      await apiClient.post(`/admin/invoices/${inv.id}/void`, { reason });
      fetchData();
    } catch (err: any) {
      alert('Failed to void invoice: ' + (err?.response?.data?.message || err?.message || 'Error'));
    }
  };

  const handleDownloadReceipt = async (p: PaymentRecord) => {
    try {
      const res = await apiClient.get<Blob>(`/admin/invoices/payments/${p.id}/receipt`, {
        responseType: 'blob',
      });
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${p.paymentNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download receipt: ' + (err?.message || 'Error'));
    }
  };

  const handleVoidPayment = async (p: PaymentRecord) => {
    const reason = prompt(
      `Are you sure you want to VOID payment ${p.paymentNumber}?\n\nVoiding will reverse allocations made to any invoices and restore the contract balance.`,
      'Incorrect payment entry or bounced cheque',
    );
    if (reason === null) return;

    try {
      await apiClient.post(`/admin/invoices/payments/${p.id}/void`, { reason });
      fetchData();
    } catch (err: any) {
      alert('Failed to void payment: ' + (err?.response?.data?.message || err?.message || 'Error'));
    }
  };

  // Metrics
  const nonVoidedInvoices = invoices.filter((i) => i.status !== 'voided');
  const totalBilled = nonVoidedInvoices.reduce((sum, i) => sum + i.total, 0);

  const getInvoiceAllocated = (inv: InvoiceItem) =>
    (inv.allocations || []).reduce((sum, a) => sum + Number(a.amount || 0), 0);

  const totalAllocated = nonVoidedInvoices.reduce((sum, inv) => sum + getInvoiceAllocated(inv), 0);
  const totalDue = Math.max(0, totalBilled - totalAllocated);

  const totalUnallocatedDeposits = payments
    .filter((p) => p.status !== 'voided')
    .reduce((sum, p) => sum + Number(p.unallocatedAmount || 0), 0);

  const availablePaymentsForAlloc = payments.filter((p) => Number(p.unallocatedAmount) > 0);

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-teal-900 via-cyan-900 to-slate-900 p-6 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <Receipt className="h-5 w-5 text-cyan-300" />
            </div>
            <h2 className="text-xl font-black tracking-tight">Progress Invoices & Client Billing</h2>
          </div>
          <p className="text-xs text-cyan-100 max-w-xl">
            Bill exclusively for completed and approved field work. Strict anti-double billing protection guarantees no subtask is ever charged twice.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button
            onClick={() => setIsPaymentModalOpen(true)}
            variant="outline"
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs h-9"
          >
            <CreditCard className="h-3.5 w-3.5 mr-1.5" />
            Record Payment
          </Button>
          <Button
            onClick={() => setIsCreateModalOpen(true)}
            className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-bold text-xs h-9 shadow-lg shadow-cyan-500/25"
          >
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Create Progress Invoice
          </Button>
        </div>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-sm rounded-2xl p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</span>
            <Receipt className="h-4 w-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${totalBilled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">{nonVoidedInvoices.length} active invoices</div>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-2xl p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Paid / Allocated</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-700">
            ${totalAllocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Applied to invoices</div>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-2xl p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Outstanding Invoices</span>
            <Clock className="h-4 w-4 text-rose-500" />
          </div>
          <div className={`text-2xl font-black ${totalDue > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
            ${totalDue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">{totalDue > 0 ? 'Due from client' : 'All invoices settled'}</div>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-2xl p-5 bg-white">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Available Deposits</span>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-black text-indigo-700">
            ${totalUnallocatedDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-400 mt-1">Ready for invoice allocation</div>
        </Card>
      </div>

      {/* Invoices List Card */}
      <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-gray-900">Project Progress Invoices</CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Itemized billing records generated from completed task quantities.
            </p>
          </div>
          <Button onClick={fetchData} variant="outline" size="sm" className="text-xs gap-1.5">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5">Invoice #</th>
                  <th className="px-6 py-3.5">Billing Period</th>
                  <th className="px-6 py-3.5">Items</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Total ($)</th>
                  <th className="px-6 py-3.5 text-right">Allocated ($)</th>
                  <th className="px-6 py-3.5 text-right">Due ($)</th>
                  <th className="px-6 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400">
                      No progress invoices created yet. Click "Create Progress Invoice" to start billing completed work.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => {
                    const allocated = getInvoiceAllocated(inv);
                    const due = Math.max(0, inv.total - allocated);
                    const isVoided = inv.status === 'voided';
                    const isPaid = inv.status === 'paid' || (due === 0 && !isVoided);

                    return (
                      <tr key={inv.id} className={`hover:bg-gray-50/50 ${isVoided ? 'opacity-60 bg-gray-50/30' : ''}`}>
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-cyan-900 flex items-center gap-1.5">
                            {inv.invoiceNumber}
                          </div>
                          <div className="text-[10px] text-gray-400">
                            Created: {new Date(inv.createdAt).toLocaleDateString()}
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">
                          {new Date(inv.startDate).toLocaleDateString()} - {new Date(inv.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3.5 text-gray-600 font-medium">
                          {inv.billableUnits} subtasks
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge
                            variant={
                              isVoided
                                ? 'destructive'
                                : isPaid
                                ? 'success'
                                : inv.status === 'partially_paid'
                                ? 'secondary'
                                : 'warning'
                            }
                            className="uppercase font-bold text-[10px]"
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                          ${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-right text-emerald-600 font-semibold">
                          ${allocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-rose-600">
                          {isVoided ? '$0.00' : `$${due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                        </td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleDownloadInvoicePdf(inv)}
                              title="Download PDF Invoice"
                              className="p-1.5 rounded-lg text-gray-500 hover:text-cyan-700 hover:bg-cyan-50 transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>

                            {!isVoided && due > 0 && availablePaymentsForAlloc.length > 0 && (
                              <button
                                onClick={() => {
                                  setSelectedInvoiceForAlloc(inv);
                                  setAllocateAmount(String(due));
                                  setIsAllocateModalOpen(true);
                                }}
                                title="Allocate Available Deposit to this Invoice"
                                className="p-1.5 rounded-lg text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 transition-colors"
                              >
                                <DollarSign className="h-4 w-4" />
                              </button>
                            )}

                            {!isVoided && inv.status !== 'paid' && (
                              <button
                                onClick={() => handleVoidInvoice(inv)}
                                title="Void Invoice (releases items)"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Client Payments & Deposit Ledger Card */}
      <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold text-gray-900">Recorded Client Deposits & Payments</CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Payments decrease the total contract balance. Unallocated funds can be applied toward current or future invoices.
            </p>
          </div>
          <Button
            onClick={() => setIsPaymentModalOpen(true)}
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
          >
            <CreditCard className="h-3.5 w-3.5" /> Record Payment
          </Button>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="px-6 py-3.5">Payment #</th>
                  <th className="px-6 py-3.5">Date Paid</th>
                  <th className="px-6 py-3.5">Method</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Amount ($)</th>
                  <th className="px-6 py-3.5 text-right">Allocated ($)</th>
                  <th className="px-6 py-3.5 text-right">Unallocated Deposit ($)</th>
                  <th className="px-6 py-3.5">Notes</th>
                  <th className="px-6 py-3.5 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                      No client payments or deposits recorded yet.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const isVoided = p.status === 'voided';
                    return (
                      <tr key={p.id} className={`hover:bg-gray-50/50 ${isVoided ? 'opacity-60 bg-gray-50/20' : ''}`}>
                        <td className="px-6 py-3.5 font-bold text-emerald-700">{p.paymentNumber}</td>
                        <td className="px-6 py-3.5 text-gray-600">{new Date(p.paidAt).toLocaleDateString()}</td>
                        <td className="px-6 py-3.5 uppercase font-semibold text-gray-700">{p.method.replace('_', ' ')}</td>
                        <td className="px-6 py-3.5">
                          <Badge
                            variant={isVoided ? 'destructive' : 'success'}
                            className="uppercase font-bold text-[10px]"
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                          ${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-right text-emerald-600 font-semibold">
                          ${Number(p.allocatedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-indigo-600">
                          ${Number(p.unallocatedAmount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-gray-500 max-w-xs truncate">{p.notes || '-'}</td>
                        <td className="px-6 py-3.5">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleDownloadReceipt(p)}
                              title="Download Money Receipt PDF"
                              className="p-1.5 rounded-lg text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            {!isVoided && (
                              <button
                                onClick={() => handleVoidPayment(p)}
                                title="Void Payment"
                                className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Ban className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* MODAL 1: Create Progress Invoice */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Create Progress Invoice"
        maxWidth="2xl"
      >
        <form onSubmit={handleCreateInvoice} className="space-y-6">
          <div className="bg-cyan-50 p-4 rounded-2xl border border-cyan-100 flex items-start gap-3">
            <ShieldCheck className="h-5 w-5 text-cyan-700 shrink-0 mt-0.5" />
            <div className="text-xs text-cyan-900 leading-relaxed">
              <p className="font-bold mb-0.5">Strict Anti-Double Billing Protection</p>
              Invoices are built dynamically from completed and approved subtasks within your chosen date range. Any task already billed on an active invoice is automatically excluded.
            </div>
          </div>

          {/* Date range pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
                className="text-xs"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1.5 block">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>

          {/* Billable preview section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Billable Tasks in Selected Period
              </h4>
              {isPreviewLoading && <span className="text-xs text-cyan-600 animate-pulse">Checking eligible work...</span>}
            </div>

            {previewData && previewData.count > 0 ? (
              <div className="border border-gray-100 rounded-2xl overflow-hidden bg-gray-50/50">
                <div className="p-3.5 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    {previewData.count} Completed Subtasks Eligible
                  </span>
                  <span className="text-base font-black text-emerald-700">
                    Total: ${previewData.totalAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-gray-100 text-xs">
                  {previewData.items.map((item, idx) => (
                    <div key={item.subTaskId} className="p-3 flex items-center justify-between hover:bg-white transition-colors">
                      <div>
                        <div className="font-bold text-gray-900">{idx + 1}. {item.title}</div>
                        <div className="text-[11px] text-gray-500">
                          {item.taskTitle} • {[item.floorName, item.unitName].filter(Boolean).join(' / ') || 'General'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-gray-900">${Number(item.price || 0).toFixed(2)}</div>
                        <div className="text-[10px] text-gray-400">
                          Done: {new Date(item.completedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : !isPreviewLoading && (
              <div className="p-6 border-2 border-dashed border-amber-200 bg-amber-50/40 rounded-2xl text-center space-y-1">
                <AlertCircle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-sm font-bold text-gray-900">No Billable Tasks Found</p>
                <p className="text-xs text-gray-500 max-w-sm mx-auto">
                  There are no completed, approved, and unbilled subtasks in this date range. Incomplete services cannot be billed. Try extending the date range.
                </p>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1.5 block">Invoice Notes (Optional)</label>
            <Input
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
              placeholder="e.g. Progress billing for Phase 1 drywall and paint"
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmittingInvoice || !previewData || previewData.count === 0}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
            >
              {isSubmittingInvoice
                ? 'Issuing Invoice...'
                : `Issue Invoice ($${(previewData?.totalAmount || 0).toFixed(2)})`}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: Record Client Payment */}
      <Modal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        title="Record Client Payment / Deposit"
        maxWidth="lg"
      >
        <form onSubmit={handleRecordPayment} className="space-y-4">
          <p className="text-xs text-gray-500">
            Records incoming client funds into the project ledger. This immediately decreases the total contract balance. You may also allocate directly to an issued invoice.
          </p>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">Payment Amount ($) *</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="5000.00"
              required
              className="text-sm font-bold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Method</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full text-xs h-9 px-3 rounded-lg border border-gray-200 bg-white"
              >
                <option value="bank_transfer">Bank Transfer</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="card">Credit / Debit Card</option>
                <option value="e_transfer">E-Transfer</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-700 mb-1 block">Date Paid</label>
              <Input
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                required
                className="text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">
              Allocate Immediately to Invoice (Optional)
            </label>
            <select
              value={targetInvoiceId}
              onChange={(e) => setTargetInvoiceId(e.target.value)}
              className="w-full text-xs h-9 px-3 rounded-lg border border-gray-200 bg-white"
            >
              <option value="">Keep as unallocated project deposit</option>
              {nonVoidedInvoices
                .filter((inv) => inv.status !== 'paid')
                .map((inv) => {
                  const due = Math.max(0, inv.total - getInvoiceAllocated(inv));
                  return (
                    <option key={inv.id} value={inv.id}>
                      {inv.invoiceNumber} (Remaining Due: ${due.toFixed(2)})
                    </option>
                  );
                })}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">Notes / Reference</label>
            <Input
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. Check #40291 or Wire Transfer Confirmation"
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsPaymentModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingPayment} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              {isSubmittingPayment ? 'Recording...' : 'Record Payment'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: Allocate Funds to Specific Invoice */}
      <Modal
        isOpen={isAllocateModalOpen}
        onClose={() => setIsAllocateModalOpen(false)}
        title={`Apply Deposit to ${selectedInvoiceForAlloc?.invoiceNumber || 'Invoice'}`}
        maxWidth="md"
      >
        <form onSubmit={handleAllocatePayment} className="space-y-4">
          <p className="text-xs text-gray-500">
            Select an unallocated deposit to apply towards this invoice.
          </p>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">Select Payment / Deposit Source</label>
            <select
              value={selectedPaymentId}
              onChange={(e) => setSelectedPaymentId(e.target.value)}
              required
              className="w-full text-xs h-9 px-3 rounded-lg border border-gray-200 bg-white"
            >
              <option value="">Choose a payment with available balance</option>
              {availablePaymentsForAlloc.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.paymentNumber} (${Number(p.unallocatedAmount || 0).toFixed(2)} available) - Paid {new Date(p.paidAt).toLocaleDateString()}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">Amount to Allocate ($)</label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={allocateAmount}
              onChange={(e) => setAllocateAmount(e.target.value)}
              required
              className="text-sm font-bold"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-700 mb-1 block">Notes (Optional)</label>
            <Input
              value={allocateNotes}
              onChange={(e) => setAllocateNotes(e.target.value)}
              placeholder="e.g. Applied deposit towards drywall invoice"
              className="text-xs"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setIsAllocateModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmittingAllocation || !selectedPaymentId} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
              {isSubmittingAllocation ? 'Applying...' : 'Apply Funds'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
