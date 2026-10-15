import React, { useState, useEffect, useMemo } from 'react';
import {
  FileText,
  Download,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  Layers,
  ArrowUpRight,
  Receipt,
  CreditCard,
  RefreshCw,
  Search,
  Filter,
  Ban,
  PieChart,
  Percent,
} from 'lucide-react';
import { apiClient } from '@/services/api/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Input } from '@/shared/components/ui/Input';

interface ProfitabilityData {
  project: {
    id: string;
    name: string;
    companyName: string;
    status: string;
    financialStatus: string;
  };
  revenue: {
    contractAmount: number;
    totalInvoiced: number;
    totalReceived: number;
  };
  expenses: {
    totalExpenses: number;
    byCategory: {
      material: number;
      subcontractor: number;
      other: number;
    };
    breakdown: Array<{
      id: string;
      date: string;
      category: string;
      title: string;
      submittedBy: string;
      amount: number;
    }>;
  };
  profitability: {
    grossProfit: number;
    grossMarginPercent: number;
    cashProfit: number;
    cashMarginPercent: number;
  };
}

interface ProjectStatementViewProps {
  projectId: string;
}

interface StatementData {
  project: {
    id: string;
    name: string;
    companyName: string;
    location: string | null;
    description: string | null;
    startDate: string | null;
    endDate: string | null;
    status: string;
    financialStatus: 'unpaid' | 'partially_paid' | 'fully_paid';
    progress: number;
  };
  summary: {
    originalContract: number;
    changeOrdersCount: number;
    changeOrdersTotal: number;
    totalContractAmount: number;
    completedWorkValue: number;
    incompleteWorkValue: number;
    totalSubTasksCount: number;
    completedSubTasksCount: number;
    progressPercent: number;
    totalInvoiced: number;
    unbilledCompletedValue: number;
    totalReceived: number;
    contractBalance: number;
    financialStatus: 'unpaid' | 'partially_paid' | 'fully_paid';
  };
  subTasks: Array<{
    id: string;
    taskId: string;
    taskTitle: string;
    title: string;
    status: string;
    approvalDecision: string;
    price: number;
    unitName: string | null;
    floorName: string | null;
    locationLabel?: string;
    workerName: string | null;
    completedAt: string | null;
    isInvoiced: boolean;
    invoices: Array<{
      invoiceId: string;
      invoiceNumber: string;
      status: string;
    }>;
  }>;
  changeOrders: Array<{
    id: string;
    number: string;
    title: string;
    description: string | null;
    status: string;
    total: number;
    approvedAt: string | null;
    createdByName: string;
  }>;
  invoices: Array<{
    id: string;
    invoiceNumber: string;
    status: string;
    startDate: string;
    endDate: string;
    billableUnits: number;
    total: number;
    allocated: number;
    due: number;
    issuedAt: string | null;
    paidAt: string | null;
  }>;
  payments: Array<{
    id: string;
    paymentNumber: string;
    amount: number;
    allocatedAmount: number;
    unallocatedAmount: number;
    method: string;
    status: string;
    paidAt: string;
    notes: string | null;
    recordedByName: string;
    allocations: Array<{
      invoiceNumber: string;
      amount: number;
      allocatedAt: string;
    }>;
  }>;
}

export function ProjectStatementView({ projectId }: ProjectStatementViewProps) {
  const [data, setData] = useState<StatementData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending' | 'invoiced'>('all');
  const [activeSection, setActiveSection] = useState<'scope' | 'changeOrders' | 'invoices' | 'payments' | 'profitability'>('scope');
  const [profitability, setProfitability] = useState<ProfitabilityData | null>(null);
  const [isProfitLoading, setIsProfitLoading] = useState(false);

  const fetchStatement = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await apiClient.get<any>(`/admin/projects/${projectId}/statement`);
      const payload = res.data?.data || res.data || res;
      setData(payload);
    } catch (err: any) {
      console.error('Failed to load project statement', err);
      setError(err?.response?.data?.message || err?.message || 'Failed to load project statement');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProfitability = async () => {
    try {
      setIsProfitLoading(true);
      const res = await apiClient.get<any>(`/admin/projects/${projectId}/profitability`);
      const payload = res.data?.data || res.data || res;
      setProfitability(payload);
    } catch (err: any) {
      console.error('Failed to load project profitability', err);
    } finally {
      setIsProfitLoading(false);
    }
  };

  useEffect(() => {
    if (activeSection === 'profitability') {
      fetchProfitability();
    }
  }, [activeSection, projectId]);

  const handleDownloadReceipt = async (paymentId: string, paymentNumber: string) => {
    try {
      const res = await apiClient.get<Blob>(`/admin/invoices/payments/${paymentId}/receipt`, {
        responseType: 'blob',
      });
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Receipt_${paymentNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download payment receipt PDF: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleVoidPayment = async (paymentId: string, paymentNumber: string) => {
    const reason = prompt(
      `Are you sure you want to VOID payment ${paymentNumber}?\n\nVoiding will revert invoice allocations and restore the project's contract balance.`,
      'Incorrect payment entry'
    );
    if (reason === null) return;

    try {
      await apiClient.post(`/admin/invoices/payments/${paymentId}/void`, { reason });
      fetchStatement();
      if (activeSection === 'profitability') {
        fetchProfitability();
      }
    } catch (err: any) {
      alert('Failed to void payment: ' + (err?.response?.data?.message || err?.message || 'Error'));
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchStatement();
    }
  }, [projectId]);

  const handleExportPdf = async () => {
    try {
      setIsExporting(true);
      const res = await apiClient.get<Blob>(`/admin/projects/${projectId}/statement/export`, {
        responseType: 'blob',
      });
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data as any], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Statement_${data?.project.name || 'Project'}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert('Failed to download statement PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  const filteredSubTasks = useMemo(() => {
    if (!data?.subTasks) return [];
    return data.subTasks.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.taskTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.workerName && item.workerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (item.unitName && item.unitName.toLowerCase().includes(searchQuery.toLowerCase()));

      if (!matchSearch) return false;

      if (statusFilter === 'completed') {
        return item.status === 'completed';
      }
      if (statusFilter === 'pending') {
        return item.status !== 'completed';
      }
      if (statusFilter === 'invoiced') {
        return item.isInvoiced;
      }
      return true;
    });
  }, [data?.subTasks, searchQuery, statusFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
        <p className="text-sm text-gray-500 font-medium">Generating financial audit & statement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className="p-8 text-center border-red-100 bg-red-50/20">
        <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-gray-900 mb-1">Failed to Load Statement</h3>
        <p className="text-sm text-gray-500 mb-4">{error || 'Data could not be retrieved.'}</p>
        <Button onClick={fetchStatement} variant="outline" className="gap-2">
          <RefreshCw className="h-4 w-4" /> Try Again
        </Button>
      </Card>
    );
  }

  const { summary } = data;
  const isFullySettled = summary.contractBalance <= 0;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 rounded-3xl text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <FileText className="h-5 w-5 text-indigo-300" />
            </div>
            <h2 className="text-xl font-black tracking-tight">Project Financial Statement & Audit</h2>
          </div>
          <p className="text-xs text-slate-300 max-w-xl">
            Live contract balance ledger. Itemized breakdown of approved work, extra change orders, completed work value, and payment settlements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={fetchStatement}
            variant="outline"
            className="border-white/20 bg-white/5 hover:bg-white/10 text-white text-xs h-9"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Refresh
          </Button>
          <Button
            onClick={handleExportPdf}
            disabled={isExporting}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-bold text-xs h-9 shadow-lg shadow-indigo-500/25"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            {isExporting ? 'Generating PDF...' : 'Download Statement PDF'}
          </Button>
        </div>
      </div>

      {/* Financial Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contract */}
        <Card className="border-slate-100 shadow-sm rounded-2xl p-5 relative overflow-hidden bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Contract</span>
            <div className="h-8 w-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${summary.totalContractAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Base: ${summary.originalContract.toLocaleString()}</span>
            <span className="text-indigo-600 font-semibold">+{summary.changeOrdersCount} Change Orders</span>
          </div>
        </Card>

        {/* Completed Work Value */}
        <Card className="border-slate-100 shadow-sm rounded-2xl p-5 relative overflow-hidden bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Work</span>
            <div className="h-8 w-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">
            ${summary.completedWorkValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>{summary.completedSubTasksCount} of {summary.totalSubTasksCount} tasks done</span>
            <span className="text-emerald-600 font-bold">{summary.progressPercent}%</span>
          </div>
        </Card>

        {/* Incomplete Work Value */}
        <Card className="border-slate-100 shadow-sm rounded-2xl p-5 relative overflow-hidden bg-white">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Incomplete Work</span>
            <div className="h-8 w-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700">
            ${summary.incompleteWorkValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Services in progress / planned</span>
            <span className="text-amber-600 font-medium">Unbilled</span>
          </div>
        </Card>

        {/* Total Received & Balance */}
        <Card className={`border-slate-100 shadow-sm rounded-2xl p-5 relative overflow-hidden ${isFullySettled ? 'bg-emerald-50/30' : 'bg-white'}`}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Contract Balance</span>
            <Badge
              variant={isFullySettled ? 'success' : summary.totalReceived > 0 ? 'secondary' : 'warning'}
              className="font-bold uppercase text-[10px]"
            >
              {summary.financialStatus.replace('_', ' ')}
            </Badge>
          </div>
          <div className={`text-2xl font-black ${isFullySettled ? 'text-emerald-700' : 'text-rose-600'}`}>
            ${summary.contractBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="mt-2 text-xs text-slate-500 flex items-center justify-between">
            <span>Received: ${summary.totalReceived.toLocaleString()}</span>
            <span>{isFullySettled ? 'Fully Settled' : 'Due remaining'}</span>
          </div>
        </Card>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <button
          onClick={() => setActiveSection('scope')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'scope'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Layers className="h-3.5 w-3.5" />
          Work Scope Breakdown ({data.subTasks.length})
        </button>
        <button
          onClick={() => setActiveSection('changeOrders')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'changeOrders'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <TrendingUp className="h-3.5 w-3.5" />
          Change Orders ({data.changeOrders.length})
        </button>
        <button
          onClick={() => setActiveSection('invoices')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'invoices'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <Receipt className="h-3.5 w-3.5" />
          Progress Invoices ({data.invoices.length})
        </button>
        <button
          onClick={() => setActiveSection('payments')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'payments'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Payment Ledger ({data.payments.length})
        </button>
        <button
          onClick={() => setActiveSection('profitability')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeSection === 'profitability'
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
              : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <PieChart className="h-3.5 w-3.5" />
          Profit & Margin Analysis
        </button>
      </div>

      {/* SECTION 1: Scope Breakdown */}
      {activeSection === 'scope' && (
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <CardTitle className="text-base font-bold text-gray-900">
                Itemized Work Scope & Service Status
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Displays both completed and unfinished tasks. Completed tasks are eligible for progress invoicing; incomplete services remain clearly marked.
              </p>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative min-w-[200px]">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter tasks, workers, units..."
                  className="pl-8 text-xs h-8 rounded-lg"
                />
              </div>

              <div className="flex bg-gray-200/60 p-0.5 rounded-lg text-xs font-bold">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  All ({data.subTasks.length})
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === 'completed' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Completed ({summary.completedSubTasksCount})
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === 'pending' ? 'bg-white text-amber-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Pending ({summary.totalSubTasksCount - summary.completedSubTasksCount})
                </button>
                <button
                  onClick={() => setStatusFilter('invoiced')}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    statusFilter === 'invoiced' ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-600'
                  }`}
                >
                  Invoiced
                </button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">#</th>
                    <th className="px-6 py-3.5">Task / Subtask</th>
                    <th className="px-6 py-3.5">Location</th>
                    <th className="px-6 py-3.5">Worker</th>
                    <th className="px-6 py-3.5">Work Status</th>
                    <th className="px-6 py-3.5">Billing Status</th>
                    <th className="px-6 py-3.5 text-right">Value ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredSubTasks.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        No work items match the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredSubTasks.map((item, index) => {
                      const isDone = item.status === 'completed';
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-6 py-3.5 text-gray-400 font-medium">{index + 1}</td>
                          <td className="px-6 py-3.5">
                            <div className="font-bold text-gray-900">{item.title}</div>
                            <div className="text-[11px] text-gray-500">{item.taskTitle}</div>
                          </td>
                          <td className="px-6 py-3.5 text-gray-600">
                            {item.locationLabel || [item.floorName, item.unitName].filter(Boolean).join(' / ') || 'General'}
                          </td>
                          <td className="px-6 py-3.5 text-gray-600">{item.workerName || 'Unassigned'}</td>
                          <td className="px-6 py-3.5">
                            {isDone ? (
                              <Badge variant="success" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                              </Badge>
                            ) : (
                              <Badge variant="warning" className="bg-amber-50 text-amber-700 border-amber-200">
                                <Clock className="h-3 w-3 mr-1" /> Service Incomplete
                              </Badge>
                            )}
                          </td>
                          <td className="px-6 py-3.5">
                            {item.isInvoiced ? (
                              <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 border-indigo-200">
                                Invoiced ({item.invoices[0]?.invoiceNumber || 'INV'})
                              </Badge>
                            ) : isDone ? (
                              <Badge variant="outline" className="text-emerald-600 border-emerald-200">
                                Ready to Bill
                              </Badge>
                            ) : (
                              <span className="text-gray-400 text-[11px]">Not billable yet</span>
                            )}
                          </td>
                          <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                            ${(item.price || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
      )}

      {/* SECTION 2: Change Orders */}
      {activeSection === 'changeOrders' && (
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100">
            <CardTitle className="text-base font-bold text-gray-900">
              Approved Change Orders & Extra Work
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Field custom tasks approved by admin automatically create change orders and increase the project contract value.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">CO Number</th>
                    <th className="px-6 py-3.5">Title & Description</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Approved By</th>
                    <th className="px-6 py-3.5">Approved Date</th>
                    <th className="px-6 py-3.5 text-right">Amount ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.changeOrders.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                        No change orders recorded for this project.
                      </td>
                    </tr>
                  ) : (
                    data.changeOrders.map((co) => (
                      <tr key={co.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3.5 font-bold text-indigo-700">{co.number}</td>
                        <td className="px-6 py-3.5">
                          <div className="font-bold text-gray-900">{co.title}</div>
                          {co.description && <div className="text-[11px] text-gray-500">{co.description}</div>}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge variant="success" className="uppercase font-bold text-[10px]">
                            {co.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">{co.createdByName}</td>
                        <td className="px-6 py-3.5 text-gray-600">
                          {co.approvedAt ? new Date(co.approvedAt).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                          +${co.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 3: Invoices History */}
      {activeSection === 'invoices' && (
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100">
            <CardTitle className="text-base font-bold text-gray-900">
              Progress Invoices Summary
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Official progress invoices issued to the client. Paid invoices settle specific line items.
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-3.5">Invoice #</th>
                    <th className="px-6 py-3.5">Billing Period</th>
                    <th className="px-6 py-3.5">Status</th>
                    <th className="px-6 py-3.5">Billable Units</th>
                    <th className="px-6 py-3.5 text-right">Total ($)</th>
                    <th className="px-6 py-3.5 text-right">Allocated ($)</th>
                    <th className="px-6 py-3.5 text-right">Due ($)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.invoices.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
                        No progress invoices generated yet.
                      </td>
                    </tr>
                  ) : (
                    data.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-gray-50/50">
                        <td className="px-6 py-3.5 font-bold text-indigo-700">{inv.invoiceNumber}</td>
                        <td className="px-6 py-3.5 text-gray-600">
                          {new Date(inv.startDate).toLocaleDateString()} - {new Date(inv.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-3.5">
                          <Badge
                            variant={
                              inv.status === 'paid'
                                ? 'success'
                                : inv.status === 'voided'
                                ? 'destructive'
                                : inv.status === 'partially_paid'
                                ? 'secondary'
                                : 'warning'
                            }
                            className="uppercase font-bold text-[10px]"
                          >
                            {inv.status}
                          </Badge>
                        </td>
                        <td className="px-6 py-3.5 text-gray-600">{inv.billableUnits} items</td>
                        <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                          ${inv.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-right text-emerald-600 font-semibold">
                          ${inv.allocated.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-rose-600">
                          ${inv.due.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* SECTION 4: Payments Ledger */}
      {activeSection === 'payments' && (
        <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
          <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100">
            <CardTitle className="text-base font-bold text-gray-900">
              Payment & Deposit Ledger
            </CardTitle>
            <p className="text-xs text-gray-500 mt-1">
              Recorded client deposits decrease the total contract balance. Unallocated funds remain available for future invoices.
            </p>
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
                    <th className="px-6 py-3.5">Recorded By</th>
                    <th className="px-6 py-3.5 text-right">Amount ($)</th>
                    <th className="px-6 py-3.5 text-right">Allocated ($)</th>
                    <th className="px-6 py-3.5 text-right">Unallocated Deposit ($)</th>
                    <th className="px-6 py-3.5 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {data.payments.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-6 py-12 text-center text-gray-400">
                        No payments recorded yet.
                      </td>
                    </tr>
                  ) : (
                    data.payments.map((p) => {
                      const isVoided = p.status === 'voided';
                      return (
                        <tr key={p.id} className={`hover:bg-gray-50/50 ${isVoided ? 'opacity-60 bg-gray-50/20' : ''}`}>
                          <td className="px-6 py-3.5 font-bold text-indigo-700">{p.paymentNumber}</td>
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
                          <td className="px-6 py-3.5 text-gray-600">{p.recordedByName}</td>
                          <td className="px-6 py-3.5 text-right font-bold text-gray-900">
                            ${Number(p.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-3.5 text-right text-emerald-600 font-semibold">
                            ${Number(p.allocatedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-3.5 text-right font-bold text-indigo-600">
                            ${Number(p.unallocatedAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="px-6 py-3.5">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                onClick={() => handleDownloadReceipt(p.id, p.paymentNumber)}
                                title="Download Official Money Receipt PDF"
                                className="p-1.5 rounded-lg text-gray-600 hover:text-indigo-700 hover:bg-indigo-50 transition-colors"
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              {!isVoided && (
                                <button
                                  onClick={() => handleVoidPayment(p.id, p.paymentNumber)}
                                  title="Void Payment & Restore Contract Balance"
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
      )}

      {/* SECTION 5: Profit & Margin Analysis */}
      {activeSection === 'profitability' && (
        <div className="space-y-6">
          {isProfitLoading && !profitability ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
              <p className="text-xs text-gray-500 font-medium">Computing revenue, direct expenses and profit margins...</p>
            </div>
          ) : profitability ? (
            <>
              {/* Profit Metrics Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Gross Profit */}
                <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50/50 to-white shadow-sm rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-indigo-900 uppercase tracking-wider">Gross Profit</span>
                    <DollarSign className="h-4 w-4 text-indigo-600" />
                  </div>
                  <div className="text-2xl font-black text-indigo-950">
                    ${Number(profitability.profitability?.grossProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-indigo-600 font-semibold mt-1 flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Gross Margin: {Number(profitability.profitability?.grossMarginPercent || 0)}%
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Contract Value - Total Expenses</p>
                </Card>

                {/* Cash Profit */}
                <Card className="border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white shadow-sm rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">Cash Profit</span>
                    <TrendingUp className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className={`text-2xl font-black ${Number(profitability.profitability?.cashProfit || 0) >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ${Number(profitability.profitability?.cashProfit || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-emerald-600 font-semibold mt-1 flex items-center gap-1">
                    <Percent className="h-3 w-3" />
                    Cash Margin: {Number(profitability.profitability?.cashMarginPercent || 0)}%
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Total Received - Total Expenses</p>
                </Card>

                {/* Total Direct Costs / Expenses */}
                <Card className="border-rose-100 bg-gradient-to-br from-rose-50/50 to-white shadow-sm rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-rose-900 uppercase tracking-wider">Direct Project Costs</span>
                    <CreditCard className="h-4 w-4 text-rose-600" />
                  </div>
                  <div className="text-2xl font-black text-rose-700">
                    ${Number(profitability.expenses?.totalExpenses ?? (profitability as any).costs?.totalExpenses ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {(profitability.expenses?.breakdown || []).length} approved expense claims
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Materials, labor & site expenses</p>
                </Card>

                {/* Total Cash Collected */}
                <Card className="border-slate-100 bg-white shadow-sm rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue Collected</span>
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="text-2xl font-black text-slate-900">
                    ${Number(profitability.revenue?.totalReceived ?? (profitability as any).revenue?.collectedRevenue ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    of ${Number(profitability.revenue?.contractAmount || 0).toLocaleString()} total contract
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">Invoiced to date: ${Number(profitability.revenue?.totalInvoiced ?? (profitability as any).revenue?.invoicedRevenue ?? 0).toLocaleString()}</p>
                </Card>
              </div>

              {/* Expense Category Distribution Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Material Purchases</span>
                    <div className="text-lg font-black text-slate-900">
                      ${Number(profitability.expenses?.byCategory?.material || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-600">Material</Badge>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Subcontractor Labor</span>
                    <div className="text-lg font-black text-slate-900">
                      ${Number(profitability.expenses?.byCategory?.subcontractor || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-600">Subcontractor</Badge>
                </div>
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Other Site Expenses</span>
                    <div className="text-lg font-black text-slate-900">
                      ${Number(profitability.expenses?.byCategory?.other || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold text-slate-600">Other</Badge>
                </div>
              </div>

              {/* Itemized Direct Expenses Table */}
              <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden">
                <CardHeader className="bg-gray-50/50 p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-gray-900">Direct Cost Itemization</CardTitle>
                    <p className="text-xs text-gray-500 mt-1">
                      Approved field reimbursements, receipts, and material logs charged against this project.
                    </p>
                  </div>
                  <Button onClick={fetchProfitability} variant="outline" size="sm" className="text-xs gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" /> Refresh
                  </Button>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-gray-50 text-gray-500 font-bold uppercase tracking-wider border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-3.5">Date</th>
                          <th className="px-6 py-3.5">Category</th>
                          <th className="px-6 py-3.5">Description / Title</th>
                          <th className="px-6 py-3.5">Submitted By</th>
                          <th className="px-6 py-3.5 text-right">Amount ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(!profitability.expenses?.breakdown || profitability.expenses.breakdown.length === 0) ? (
                          <tr>
                            <td colSpan={5} className="px-6 py-12 text-center text-gray-400">
                              No expense records found for this project.
                            </td>
                          </tr>
                        ) : (
                          profitability.expenses.breakdown.map((item) => (
                            <tr key={item.id} className="hover:bg-gray-50/50">
                              <td className="px-6 py-3.5 text-gray-600">{new Date(item.date).toLocaleDateString()}</td>
                              <td className="px-6 py-3.5">
                                <Badge variant="secondary" className="uppercase font-bold text-[10px]">
                                  {item.category}
                                </Badge>
                              </td>
                              <td className="px-6 py-3.5 font-bold text-gray-900">{item.title}</td>
                              <td className="px-6 py-3.5 text-gray-600">{item.submittedBy}</td>
                              <td className="px-6 py-3.5 text-right font-black text-rose-700">
                                ${Number(item.amount || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="p-8 text-center border-gray-100">
              <p className="text-xs text-gray-500">Failed to load profitability information.</p>
              <Button onClick={fetchProfitability} variant="outline" size="sm" className="mt-3">
                Try Again
              </Button>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
