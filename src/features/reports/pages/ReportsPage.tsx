import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Building2,
  Calendar,
  CircleDollarSign,
  Download,
  FileText,
  Loader2,
  Save,
  TrendingUp,
  Receipt,
} from 'lucide-react';
import { apiClient, API_ENDPOINTS } from '@/services';
import { config } from '@/config/env';
import { selectAuthUser } from '@/store/authSlice';
import { useAppSelector } from '@/store/hooks';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Select } from '@/shared/components/ui/Select';
import { DatePicker } from '@/shared/components/ui/DatePicker';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, Column } from '@/shared/components/ui/Table';
import { useDebounce } from '@/shared/hooks';

type ReportType = 'payroll' | 'project_invoices' | 'worker_performance' | 'expense';
type ReportFrequency = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
type ApiRole = 'admin' | 'super_admin' | string;

interface ApiEnvelope<T> {
  success?: boolean;
  statusCode?: number;
  message?: string;
  data: T;
}

interface ReportPeriod {
  start: string;
  end: string;
}

interface PayrollReportData {
  type: 'payroll';
  frequency: ReportFrequency;
  period: ReportPeriod;
  generatedAt: string;
  summary: {
    totalWorkers: number;
    totalHours: number;
    totalGrossPay: number;
    totalDeductions: number;
    totalNetPay: number;
    totalEmployerCost: number;
    byStatus: {
      draft: number;
      approved: number;
      paid: number;
    };
  };
  workers: Array<{
    worker: {
      id: string;
      fullName: string;
      avatarUrl?: string | null;
      department?: string | null;
      hourlyRate?: number | null;
    };
    totalGrossPay: number;
    totalNetPay: number;
    totalDeductions: number;
    totalHours: number;
    payrolls: Array<{
      payrollId: string;
      period: string;
      grossPay: number;
      deductions: number;
      netPay: number;
      status: 'draft' | 'approved' | 'paid';
    }>;
  }>;
}

interface ProjectInvoicesReportData {
  type: 'project_invoices';
  frequency: ReportFrequency;
  period: ReportPeriod;
  generatedAt: string;
  summary: {
    totalProjects: number;
    totalBudget: number;
    totalSpent: number;
    totalRemaining: number;
    totalBillableSubTasks?: number;
    totalInvoiceAmount?: number;
    byStatus: {
      planning: number;
      active: number;
      on_hold: number;
      completed: number;
      cancelled: number;
    };
  };
  projects: Array<{
    id: string;
    name: string;
    company: {
      id: string;
      name: string;
      logoUrl?: string | null;
    };
    status: string;
    progress?: number | null;
    startDate?: string | null;
    endDate?: string | null;
    budget?: number | null;
    spent?: number | null;
    remaining?: number | null;
    approvedExpenses: number;
    billableSubTaskCount?: number;
    invoiceTotal?: number;
    invoiceLines?: Array<{
      subTaskId: string;
      taskId: string;
      taskTitle: string;
      title: string;
      quantity: number;
      unitValue: number;
      lineTotal: number;
      completedAt?: string | null;
      unit?: { id: string; name: string; floor?: { id: string; name: string } | null } | null;
      worker?: { id: string; fullName: string } | null;
    }>;
    taskCompletion: number;
    counts: {
      teamMembers: number;
      tasks: number;
      floors: number;
    };
  }>;
}

interface WorkerPerformanceReportData {
  type: 'worker_performance';
  frequency: ReportFrequency;
  period: ReportPeriod;
  generatedAt: string;
  summary: {
    totalWorkers: number;
    avgAttendanceRate: string;
    avgTaskCompletion: string;
    topPerformer: {
      id: string;
      fullName: string;
      avatarUrl?: string | null;
      department?: string | null;
    } | null;
  };
  workers: Array<{
    worker: {
      id: string;
      fullName: string;
      avatarUrl?: string | null;
      department?: string | null;
    };
    attendance: {
      totalDays: number;
      presentDays: number;
      attendanceRate: string;
      totalHours: number;
    };
    tasks: {
      total: number;
      completed: number;
      inProgress: number;
      completionRate: string;
    };
    subTasks: {
      total: number;
      completed: number;
      inProgress: number;
      completionRate: string;
    };
    reports: {
      total: number;
      approved: number;
      approvalRate: string;
    };
    performanceScore: string;
  }>;
}

interface ExpenseReportData {
  type: 'expense';
  frequency: ReportFrequency;
  period: ReportPeriod;
  generatedAt: string;
  summary: {
    total: number;
    totalAmount: number;
    approvedAmount: number;
    pendingAmount: number;
    rejectedAmount: number;
    byCategory: Record<string, number>;
  };
  expenses: Array<{
    id: string;
    worker: {
      id: string;
      fullName: string;
      avatarUrl?: string | null;
      department?: string | null;
    } | null;
    description: string;
    category: string;
    amount: number;
    project: {
      id: string;
      name: string;
    } | null;
    date: string;
    status: string;
    receiptUrl?: string | null;
  }>;
}

type ReportData = PayrollReportData | ProjectInvoicesReportData | WorkerPerformanceReportData | ExpenseReportData;

interface ReportConfig {
  type: ReportType;
  label: string;
  description: string;
  icon: typeof FileText;
}

interface CompanyOption {
  id: string;
  name: string;
}

interface ProjectOption {
  id: string;
  name: string;
}

const REPORTS: ReportConfig[] = [
  { type: 'payroll', label: 'Payroll Reports', description: 'Worker pay, hours, and deductions', icon: CircleDollarSign },
  { type: 'project_invoices', label: 'Project Invoices', description: 'Budgets, spend, and progress', icon: Building2 },
  { type: 'worker_performance', label: 'Worker Performance', description: 'Attendance and task metrics', icon: TrendingUp },
  { type: 'expense', label: 'Expense Reports', description: 'Reimbursements, categories, and receipts', icon: Receipt },
];

const FREQUENCIES: Array<{ value: ReportFrequency; label: string }> = [
  { value: 'daily', label: 'Daily Summary' },
  { value: 'weekly', label: 'Weekly Report' },
  { value: 'monthly', label: 'Monthly Overview' },
  { value: 'quarterly', label: 'Quarterly Overview' },
  { value: 'yearly', label: 'Yearly Overview' },
];

function isEnvelope<T>(value: ApiEnvelope<T> | T): value is ApiEnvelope<T> {
  return Boolean(value && typeof value === 'object' && 'data' in value);
}

function getReportPath(role: ApiRole, action: 'generate' | 'export') {
  if (role === 'super_admin') {
    return action === 'generate'
      ? API_ENDPOINTS.REPORTS.SUPER_ADMIN.GENERATE
      : API_ENDPOINTS.REPORTS.SUPER_ADMIN.EXPORT;
  }

  return action === 'generate'
    ? API_ENDPOINTS.REPORTS.ADMIN.GENERATE
    : API_ENDPOINTS.REPORTS.ADMIN.EXPORT;
}

function downloadPdf(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function formatMoney(value: number | null | undefined) {
  return `$${(value ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPeriodDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function unwrapList<T>(response: unknown): T[] {
  if (Array.isArray(response)) return response as T[];
  if (response && typeof response === 'object' && 'data' in response) {
    const data = (response as { data?: unknown }).data;
    if (Array.isArray(data)) return data as T[];
  }
  return [];
}

function getAutoRange(frequency: ReportFrequency, baseDate = new Date()) {
  const start = new Date(baseDate);
  const end = new Date(baseDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);

  switch (frequency) {
    case 'daily':
      return { start, end };
    case 'weekly': {
      const day = start.getDay();
      const diffToMonday = (day + 6) % 7;
      start.setDate(start.getDate() - diffToMonday);
      end.setDate(start.getDate() + 6);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'monthly':
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    case 'quarterly': {
      const quarterStartMonth = Math.floor(start.getMonth() / 3) * 3;
      start.setMonth(quarterStartMonth, 1);
      end.setMonth(quarterStartMonth + 3, 0);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    }
    case 'yearly':
      start.setMonth(0, 1);
      end.setMonth(11, 31);
      end.setHours(23, 59, 59, 999);
      return { start, end };
    default:
      return { start, end };
  }
}

export function ReportsPage() {
  const authUser = useAppSelector(selectAuthUser);
  const role = authUser?.role === 'super_admin' ? 'super_admin' : 'admin';

  const [searchParams] = useSearchParams();
  const queryType = searchParams.get('type');
  const [reportType, setReportType] = useState<ReportType>(() => {
    if (queryType && ['payroll', 'project_invoices', 'worker_performance', 'expense'].includes(queryType)) {
      return queryType as ReportType;
    }
    return 'payroll';
  });

  useEffect(() => {
    if (queryType && ['payroll', 'project_invoices', 'worker_performance', 'expense'].includes(queryType)) {
      setReportType(queryType as ReportType);
      setReportData(null);
    }
  }, [queryType]);
  const [periodType, setPeriodType] = useState<ReportFrequency>('monthly');
  const [startDate, setStartDate] = useState<Date | undefined>(() => getAutoRange('monthly').start);
  const [endDate, setEndDate] = useState<Date | undefined>(() => getAutoRange('monthly').end);
  const [companyId, setCompanyId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [companyOptions, setCompanyOptions] = useState<CompanyOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<ProjectOption[]>([]);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingInvoice, setIsSavingInvoice] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const debouncedCompanyId = useDebounce(companyId, 200);
  const endpointBase = useMemo(() => getReportPath(role, 'generate'), [role]);
  const exportEndpoint = useMemo(() => getReportPath(role, 'export'), [role]);
  const companyListEndpoint = role === 'super_admin' ? API_ENDPOINTS.SUPER_ADMIN.COMPANIES.LIST : API_ENDPOINTS.COMPANIES.LIST;
  const projectListEndpoint = useMemo(() => {
    if (!debouncedCompanyId) return null;
    return role === 'super_admin'
      ? API_ENDPOINTS.SUPER_ADMIN.COMPANIES.PROJECTS(debouncedCompanyId)
      : API_ENDPOINTS.COMPANIES.PROJECTS(debouncedCompanyId);
  }, [debouncedCompanyId, role]);

  const selectedReport = REPORTS.find((report) => report.type === reportType) ?? REPORTS[0];

  // Load company options once for the current role.
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const response = await apiClient.get<{ id: string; name: string }[] | { data: { id: string; name: string }[] }>(
          companyListEndpoint,
          { page: 1, limit: 200 },
        );
        const companies = unwrapList<CompanyOption>(response.data).map((company) => ({
          id: company.id,
          name: company.name,
        }));
        if (!cancelled) {
          setCompanyOptions(companies);
        }
      } catch {
        if (!cancelled) {
          setCompanyOptions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyListEndpoint]);

  // Load project options after a company is selected.
  useEffect(() => {
    let cancelled = false;

    if (!projectListEndpoint) {
      setProjectOptions([]);
      return undefined;
    }

    void (async () => {
      try {
        const response = await apiClient.get<{ id: string; name: string }[] | { data: { id: string; name: string }[] }>(
          projectListEndpoint,
        );
        const projects = unwrapList<ProjectOption>(response.data).map((project) => ({
          id: project.id,
          name: project.name,
        }));
        if (!cancelled) {
          setProjectOptions(projects);
        }
      } catch {
        if (!cancelled) {
          setProjectOptions([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectListEndpoint]);

  const applyPeriodFrequency = (frequency: ReportFrequency) => {
    setPeriodType(frequency);
    const range = getAutoRange(frequency);
    setStartDate(range.start);
    setEndDate(range.end);
  };

  const handleCompanyChange = (value: string) => {
    setCompanyId(value);
    setProjectId('');
    setReportData(null);
    setError(null);
    setSaveMessage(null);
  };

  const handleProjectChange = (value: string) => {
    setProjectId(value);
    setReportData(null);
    setError(null);
    setSaveMessage(null);
  };

  const loadReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await apiClient.get<ApiEnvelope<ReportData> | ReportData>(endpointBase, {
        type: reportType,
        frequency: periodType,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        ...(companyId ? { companyId } : {}),
        ...(projectId ? { projectId } : {}),
      });

      const payload = isEnvelope(response.data) ? response.data.data : response.data;
      setReportData(payload as ReportData);
    } catch (err) {
      setReportData(null);
      setError(err instanceof Error ? err.message : 'Failed to load report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    setIsExporting(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const url = new URL(`${config.apiBaseUrl}${exportEndpoint}`);
      url.searchParams.set('type', reportType);
      url.searchParams.set('startDate', startDate.toISOString());
      url.searchParams.set('endDate', endDate.toISOString());
      if (companyId) url.searchParams.set('companyId', companyId);
      if (projectId) url.searchParams.set('projectId', projectId);

      const response = await fetch(url.toString(), {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      const contentType = response.headers.get('content-type') ?? '';
      if (!response.ok) {
        if (contentType.includes('application/json')) {
          const data = await response.json();
          throw new Error(data?.message || 'Failed to export report');
        }
        throw new Error('Failed to export report');
      }

      if (!contentType.includes('application/pdf')) {
        const data = contentType.includes('application/json') ? await response.json() : await response.text();
        throw new Error((data as any)?.message || 'Export did not return a PDF');
      }

      const pdfBlob = await response.blob();
      downloadPdf(`report-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`, pdfBlob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report');
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveInvoice = async () => {
    if (reportData?.type !== 'project_invoices') return;
    if (!startDate || !endDate) {
      setError('Please select both start and end dates.');
      return;
    }

    const targetProjectId = projectId || (reportData.projects.length === 1 ? reportData.projects[0].id : '');
    if (!targetProjectId) {
      setError('Please select one project before saving an invoice.');
      return;
    }

    setIsSavingInvoice(true);
    setError(null);
    setSaveMessage(null);

    try {
      const response = await apiClient.post<ApiEnvelope<{ invoiceNumber: string }> | { invoiceNumber: string }>(
        '/admin/invoices',
        {
          projectId: targetProjectId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      );
      const payload = isEnvelope(response.data) ? response.data.data : response.data;
      setSaveMessage(`Invoice ${payload.invoiceNumber} saved.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save invoice');
    } finally {
      setIsSavingInvoice(false);
    }
  };

  const summaryCards = useMemo(() => {
    if (!reportData) return [];

    switch (reportData.type) {
      case 'payroll':
        return [
          { label: 'Workers', value: reportData.summary.totalWorkers.toString(), tone: 'blue' },
          { label: 'Hours', value: reportData.summary.totalHours.toFixed(2), tone: 'cyan' },
          { label: 'Gross Pay', value: formatMoney(reportData.summary.totalGrossPay), tone: 'emerald' },
          { label: 'Net Pay', value: formatMoney(reportData.summary.totalNetPay), tone: 'violet' },
        ];
      case 'project_invoices':
        return [
          { label: 'Projects', value: reportData.summary.totalProjects.toString(), tone: 'blue' },
          { label: 'Billable Units', value: String(reportData.summary.totalBillableSubTasks ?? 0), tone: 'cyan' },
          { label: 'Invoice Total', value: formatMoney(reportData.summary.totalInvoiceAmount), tone: 'emerald' },
          { label: 'Remaining', value: formatMoney(reportData.summary.totalRemaining), tone: 'violet' },
        ];
      case 'worker_performance':
        return [
          { label: 'Workers', value: reportData.summary.totalWorkers.toString(), tone: 'blue' },
          { label: 'Attendance', value: reportData.summary.avgAttendanceRate, tone: 'emerald' },
          { label: 'Task Completion', value: reportData.summary.avgTaskCompletion, tone: 'cyan' },
          { label: 'Top Performer', value: reportData.summary.topPerformer?.fullName ?? 'N/A', tone: 'violet' },
        ];
      case 'expense':
        return [
          { label: 'Expenses', value: reportData.summary.total.toString(), tone: 'blue' },
          { label: 'Total Amount', value: formatMoney(reportData.summary.totalAmount), tone: 'amber' },
          { label: 'Approved', value: formatMoney(reportData.summary.approvedAmount), tone: 'emerald' },
          { label: 'Pending', value: formatMoney(reportData.summary.pendingAmount), tone: 'violet' },
        ];
      default:
        return [];
    }
  }, [reportData]);

  const renderTable = () => {
    if (!reportData) {
      return (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-12 text-center">
          <FileText className="mx-auto mb-3 h-12 w-12 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900">No Report Generated</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-gray-500">
            Choose a report type, date range, and click Generate Report to load live backend data.
          </p>
        </div>
      );
    }

    if (reportData.type === 'payroll') {
      const tableData = reportData.workers.map(w => ({ ...w, id: w.worker.id }));
      const columns: Column<typeof tableData[0]>[] = [
        {
          key: 'worker',
          header: 'Worker',
          render: (record) => (
            <div>
              <div className="font-medium text-gray-900">{record.worker.fullName}</div>
              <div className="text-xs text-gray-500">{record.worker.department ?? 'Worker'}</div>
            </div>
          ),
        },
        {
          key: 'hours',
          header: 'Hours',
          render: (record) => (
            <div className="text-sm text-gray-700">
              {(record.totalHours ?? 0).toFixed(2)}
            </div>
          ),
        },
        {
          key: 'grossPay',
          header: 'Gross Pay',
          render: (record) => <span className="font-semibold">{formatMoney(record.totalGrossPay)}</span>,
        },
        {
          key: 'netPay',
          header: 'Net Pay',
          render: (record) => {
            const hasPaidPayroll = record.payrolls.some((payroll) => payroll.status === 'paid');
            return hasPaidPayroll ? (
              <span className="font-semibold text-emerald-600">{formatMoney(record.totalNetPay)}</span>
            ) : (
              <Badge variant="secondary">Pending</Badge>
            );
          },
        },
        {
          key: 'payrolls',
          header: 'Payrolls',
          render: (record) => (
            <Badge variant="secondary">{record.payrolls.length} record{record.payrolls.length === 1 ? '' : 's'}</Badge>
          ),
        },
      ];

      return <Table data={tableData} columns={columns} />;
    }

    if (reportData.type === 'project_invoices') {
      const columns: Column<ProjectInvoicesReportData['projects'][number]>[] = [
        {
          key: 'name',
          header: 'Project',
          render: (record) => (
            <div>
              <div className="font-medium text-gray-900">{record.name}</div>
              <div className="text-xs text-gray-500">{record.company.name}</div>
            </div>
          ),
        },
        {
          key: 'progress',
          header: 'Progress',
          render: (record) => (
            <div className="flex items-center gap-2">
              <div className="h-2 w-20 rounded-full bg-gray-200">
                <div className="h-2 rounded-full bg-blue-600" style={{ width: `${record.progress ?? 0}%` }} />
              </div>
              <span className="text-xs text-gray-500">{record.progress ?? 0}%</span>
            </div>
          ),
        },
        {
          key: 'billableSubTaskCount',
          header: 'Billable Units',
          render: (record) => <span className="font-semibold">{record.billableSubTaskCount ?? 0}</span>,
        },
        {
          key: 'invoiceTotal',
          header: 'Invoice Total',
          render: (record) => <span className="font-semibold text-emerald-700">{formatMoney(record.invoiceTotal)}</span>,
        },
        {
          key: 'remaining',
          header: 'Remaining',
          render: (record) => <span className="font-semibold text-amber-600">{formatMoney(record.remaining)}</span>,
        },
        {
          key: 'status',
          header: 'Status',
          render: (record) => <Badge variant="secondary">{record.status}</Badge>,
        },
      ];

      return <Table data={reportData.projects} columns={columns} />;
    }

    if (reportData.type === 'worker_performance') {
      const tableData = reportData.workers.map(w => ({ ...w, id: w.worker.id }));
      const columns: Column<typeof tableData[0]>[] = [
        {
          key: 'worker',
          header: 'Worker',
          render: (record) => (
            <div>
              <div className="font-medium text-gray-900">{record.worker.fullName}</div>
              <div className="text-xs text-gray-500">{record.worker.department ?? 'Worker'}</div>
            </div>
          ),
        },
        {
          key: 'attendance',
          header: 'Attendance',
          render: (record) => <span className="font-semibold text-emerald-600">{record.attendance?.attendanceRate ?? '0%'}</span>,
        },
        {
          key: 'subTasks',
          header: 'Sub-task',
          render: (record) => (
            <span className="text-sm text-gray-700">
              {record.subTasks.completed}/{record.subTasks.total}
            </span>
          ),
        },
        {
          key: 'reports',
          header: 'Reports',
          render: (record) => (
            <span className="text-sm text-gray-700">
              {record.reports?.approved ?? 0}/{record.reports?.total ?? 0}
            </span>
          ),
        },
        {
          key: 'performanceScore',
          header: 'Score',
          render: (record) => <Badge variant="secondary">{record.performanceScore ?? '0%'}</Badge>,
        },
      ];

      return <Table data={tableData} columns={columns} />;
    }

    const columns: Column<ExpenseReportData['expenses'][number]>[] = [
      {
        key: 'worker',
        header: 'Worker',
        render: (record) => (
          <div>
            <div className="font-medium text-gray-900">{record.worker?.fullName ?? 'N/A'}</div>
            <div className="text-xs text-gray-500">{record.worker?.department ?? 'Worker'}</div>
          </div>
        ),
      },
      {
        key: 'description',
        header: 'Description',
        render: (record) => (
          <span className="text-sm font-medium text-gray-800 line-clamp-1" title={record.description}>
            {record.description || 'Expense'}
          </span>
        ),
      },
      {
        key: 'project',
        header: 'Project',
        render: (record) => <span className="text-sm text-gray-700">{record.project?.name ?? 'N/A'}</span>,
      },
      {
        key: 'category',
        header: 'Category',
        render: (record) => <Badge variant="secondary">{record.category}</Badge>,
      },
      {
        key: 'amount',
        header: 'Amount',
        render: (record) => <span className="font-semibold text-gray-900">{formatMoney(record.amount)}</span>,
      },
      {
        key: 'status',
        header: 'Status',
        render: (record) => {
          const s = (record.status || '').toLowerCase();
          const colorClass = s === 'paid'
            ? 'bg-emerald-100 text-emerald-800'
            : s === 'approved'
            ? 'bg-blue-100 text-blue-800'
            : s === 'rejected'
            ? 'bg-red-100 text-red-800'
            : 'bg-amber-100 text-amber-800';
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium uppercase tracking-wider ${colorClass}`}>
              {record.status}
            </span>
          );
        },
      },
      {
        key: 'date',
        header: 'Date',
        render: (record) => <span className="text-sm text-gray-700">{formatPeriodDate(record.date)}</span>,
      },
      {
        key: 'receiptUrl',
        header: 'Receipt',
        render: (record) => record.receiptUrl ? (
          <a
            href={record.receiptUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center text-xs font-bold text-[#1D4F6D] hover:underline"
          >
            View Receipt
          </a>
        ) : (
          <span className="text-xs text-gray-400">No Receipt</span>
        ),
      },
    ];

    return <Table data={reportData.expenses} columns={columns} />;
  };

  const reportSubtitle = reportData
    ? `Generated ${new Date(reportData.generatedAt).toLocaleString()} for ${formatPeriodDate(reportData.period.start)} - ${formatPeriodDate(reportData.period.end)}`
    : 'Generate comprehensive insights for your organization';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Reports & Analytics"
        description={reportSubtitle}
        icon={FileText}
      >
        <Button variant="outline" disabled title="Schedule is UI only for now">
          <Calendar className="mr-2 h-4 w-4" />
          Schedule
        </Button>
        <Button
          variant="outline"
          onClick={handleExport}
          disabled={isExporting}
          className="border-gray-200 text-gray-700 hover:bg-gray-50"
        >
          {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
          Export All
        </Button>
      </PageHeader>

      {error && (
        <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {saveMessage && (
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {saveMessage}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {REPORTS.map((report) => {
          const Icon = report.icon;
          const isSelected = reportType === report.type;

          return (
            <Card
              key={report.type}
              className={`cursor-pointer border-2 p-4 transition-all ${
                isSelected
                  ? 'border-[#1D4F6D] bg-[#1D4F6D]/5 shadow-md'
                  : 'border-transparent hover:border-gray-200 hover:shadow-sm'
              }`}
              onClick={() => {
                setReportType(report.type);
                setReportData(null);
                setError(null);
              }}
            >
              <div className="flex items-start gap-3.5">
                <div className={`rounded-xl p-2.5 shrink-0 ${isSelected ? 'bg-[#1D4F6D]/10' : 'bg-gray-100'}`}>
                  <Icon className={`h-5 w-5 ${isSelected ? 'text-[#1D4F6D]' : 'text-gray-600'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={`font-semibold text-sm sm:text-base leading-snug truncate ${isSelected ? 'text-[#1D4F6D]' : 'text-gray-900'}`}>
                    {report.label}
                  </h3>
                  <p className={`mt-1 text-xs line-clamp-2 ${isSelected ? 'text-[#1D4F6D]/80' : 'text-gray-500'}`}>
                    {report.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Card className="border-l-4 border-l-[#1D4F6D] p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-end">
          <div className="grid flex-1 grid-cols-1 gap-6 md:grid-cols-5">
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Period Frequency</label>
              <Select
                value={periodType}
                onChange={(e) => applyPeriodFrequency(e.target.value as ReportFrequency)}
                options={FREQUENCIES.map((freq) => ({ value: freq.value, label: freq.label }))}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">Start Date</label>
              <DatePicker date={startDate} setDate={setStartDate} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">End Date</label>
              <DatePicker date={endDate} setDate={setEndDate} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Company
              </label>
              <Select
                value={companyId}
                onChange={(e) => handleCompanyChange(e.target.value)}
                placeholder="All Companies"
                options={[
                  { value: '', label: 'All Companies' },
                  ...companyOptions.map((company) => ({ value: company.id, label: company.name })),
                ]}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Project
              </label>
              <Select
                value={projectId}
                onChange={(e) => handleProjectChange(e.target.value)}
                placeholder={companyId ? 'All Projects' : 'Select Company First'}
                disabled={!companyId}
                options={[
                  { value: '', label: 'All Projects' },
                  ...projectOptions.map((project) => ({ value: project.id, label: project.name })),
                ]}
              />
            </div>
          </div>

          <Button
            size="lg"
            className="min-w-[170px] bg-[#1D4F6D] hover:bg-[#163f57]"
            onClick={loadReport}
            disabled={isLoading}
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
            {isLoading ? 'Processing...' : 'Generate Report'}
          </Button>
        </div>
      </Card>

      {reportData && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {summaryCards.map((card) => (
            <Card key={card.label} className="rounded-3xl border-gray-100 shadow-sm">
              <div className="p-5">
                <div className={`text-xs font-bold uppercase tracking-[0.18em] text-${card.tone}-600`}>
                  {card.label}
                </div>
                <div className={`mt-2 text-2xl font-black text-${card.tone === 'cyan' ? 'cyan' : card.tone}-900`}>
                  {card.value}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card className="overflow-hidden rounded-3xl border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 bg-gray-50/40 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">{selectedReport.label}</h3>
              <p className="text-sm text-gray-500">{selectedReport.description}</p>
            </div>
            {reportData && (
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{reportData.type}</span> report from{' '}
                  {formatPeriodDate(reportData.period.start)} to {formatPeriodDate(reportData.period.end)}
                </div>
                {reportData.type === 'project_invoices' && (authUser?.role === 'admin' || authUser?.role === 'super_admin') && (
                  <Button
                    variant="outline"
                    onClick={handleSaveInvoice}
                    disabled={isSavingInvoice}
                    className="border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    {isSavingInvoice ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Invoice
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="p-0">
          {renderTable()}
        </div>
      </Card>
    </div>
  );
}
