import { useEffect, useMemo, useState } from 'react';
import { Download, Eye, ArrowRight } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Table, Column } from '@/shared/components/ui/Table';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { formatStatus } from '@/shared/utils';
import { config } from '@/config/env';
import { selectAuthToken } from '@/store/authSlice';
import { useAppSelector } from '@/store/hooks';

type PayrollSummaryResponse = {
  summary: {
    totalWorkers: number;
    totalHours: number;
    totalHoursDisplay: string;
    averageHourlyRate: number;
    grossPay: number;
    totalDeductions: number;
    totalPay: number;
  };
  workers: Array<{
    payrollId: string;
    project: { id: string; name: string } | null;
    worker: {
      id: string;
      fullName: string;
      avatarUrl?: string | null;
      department?: string | null;
      hourlyRate?: number | null;
    };
    payPeriodStart: string;
    payPeriodEnd: string;
    hours: number;
    hoursDisplay: string;
    grossPay: number;
    deductions: number;
    netPay: number;
    status: string;
    processedAt?: string | null;
  }>;
};

type PayrollWorkerRow = PayrollSummaryResponse['workers'][number] & { id: string };

type PayrollStub = {
  payrollId: string;
  worker: { id: string; fullName: string; department?: string | null; hourlyRate?: number | null };
  project: { id: string; name: string } | null;
  payPeriod: { start: string; end: string };
  earnings: {
    regularHours: number;
    regularHoursDisplay: string;
    regularPay: number;
    overtimeHours: number;
    overtimeHoursDisplay: string;
    overtimePay: number;
    grossPay: number;
  };
  deductions: { totalDeductions: number };
  netPay: number;
  employerCost: number;
  status: 'draft' | 'approved' | 'paid';
  processedAt?: string | null;
};

async function fetchPayrollSummary(token: string, params: { date?: string; month?: string; year?: string }) {
  const url = new URL(`${config.apiBaseUrl}/admin/payroll/approved-summary`);
  if (params.date) {
    url.searchParams.set('date', params.date);
  } else {
    if (params.month) url.searchParams.set('month', params.month);
    if (params.year) url.searchParams.set('year', params.year);
  }

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || 'Failed to load payroll summary');
  }
  return data.data as PayrollSummaryResponse;
}

async function fetchPayStub(token: string, payrollId: string) {
  const response = await fetch(`${config.apiBaseUrl}/admin/payroll/${payrollId}/stub`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || 'Failed to load pay stub');
  }
  return data.data as PayrollStub;
}

export function PayrollReport() {
  const token = useAppSelector(selectAuthToken);
  const now = useMemo(() => new Date(), []);
  const [date, setDate] = useState('');
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<PayrollSummaryResponse | null>(null);
  const [selectedStub, setSelectedStub] = useState<PayrollStub | null>(null);
  const [stubLoading, setStubLoading] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!token) return;
      setLoading(true);
      try {
        const data = await fetchPayrollSummary(token, { date: date || undefined, month, year });
        setSummary(data);
      } catch {
        setSummary(null);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [token, date, month, year]);

  const workerRows: PayrollWorkerRow[] = useMemo(
    () => (summary?.workers ?? []).map((w) => ({ ...w, id: w.payrollId })),
    [summary?.workers]
  );

  const columns: Column<PayrollWorkerRow>[] = [
    {
      key: 'worker',
      header: 'Worker',
      sortable: true,
      render: (record) => (
        <div>
          <div className="font-medium">{record.worker.fullName}</div>
          <div className="text-xs text-gray-500">{record.project?.name ?? 'Unassigned'}</div>
        </div>
      ),
    },
    {
      key: 'period',
      header: 'Pay Period',
      render: (record) => (
        <div className="text-sm">
          {new Date(record.payPeriodStart).toLocaleDateString()} - {new Date(record.payPeriodEnd).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'hours',
      header: 'Hours',
      sortable: true,
      render: (record) => <span>{record.hoursDisplay}</span>,
    },
    {
      key: 'grossPay',
      header: 'Gross Pay',
      sortable: true,
      render: (record) => <span>${record.grossPay.toFixed(2)}</span>,
    },
    {
      key: 'deductions',
      header: 'Deductions',
      render: (record) => <span className="text-red-600">-${record.deductions.toFixed(2)}</span>,
    },
    {
      key: 'netPay',
      header: 'Net Pay',
      sortable: true,
      render: (record) => <span className="font-bold text-green-600">${record.netPay.toFixed(2)}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (record) => <Badge variant={record.status === 'approved' ? 'success' : record.status === 'paid' ? 'default' : 'secondary'} className="capitalize">{formatStatus(record.status)}</Badge>,
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (record) => (
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={async () => {
              if (!token) return;
              setStubLoading(true);
              try {
                setSelectedStub(await fetchPayStub(token, record.payrollId));
              } finally {
                setStubLoading(false);
              }
            }}
          >
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost">
            <Download className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <Card className="p-0 overflow-hidden rounded-3xl border-gray-100 shadow-sm">
        <div className="border-b border-gray-100 bg-gradient-to-b from-slate-50 to-white p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Payroll Summary</h3>
              <p className="text-sm text-gray-500">Approved payroll summary by exact date or month/year range</p>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="date"
                className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
              <select className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm" value={month} onChange={(e) => setMonth(e.target.value)}>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {new Date(2024, i, 1).toLocaleString(undefined, { month: 'long' })}
                  </option>
                ))}
              </select>
              <select className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm" value={year} onChange={(e) => setYear(e.target.value)}>
                {[2024, 2025, 2026].map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
              <Button
                variant="outline"
                onClick={() => setDate('')}
                className="h-11"
                disabled={!date}
              >
                Clear Date
              </Button>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
            <div className="rounded-2xl bg-blue-50 p-5">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Total Hours</div>
              <div className="mt-2 text-3xl font-black text-blue-900">{loading ? '...' : summary?.summary.totalHoursDisplay ?? '0h 0m'}</div>
            </div>
            <div className="rounded-2xl bg-emerald-50 p-5">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">Gross Pay</div>
              <div className="mt-2 text-3xl font-black text-emerald-900">${loading ? '...' : (summary?.summary.grossPay ?? 0).toLocaleString()}</div>
            </div>
            <div className="rounded-2xl bg-amber-50 p-5">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Deductions</div>
              <div className="mt-2 text-3xl font-black text-amber-900">${loading ? '...' : (summary?.summary.totalDeductions ?? 0).toLocaleString()}</div>
            </div>
            <div className="rounded-2xl bg-violet-50 p-5">
              <div className="text-xs font-bold uppercase tracking-[0.18em] text-violet-600">Avg Hourly Rate</div>
              <div className="mt-2 text-3xl font-black text-violet-900">${loading ? '...' : (summary?.summary.averageHourlyRate ?? 0).toFixed(2)}</div>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-100 px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-900">Workers</div>
              <div className="text-xs text-gray-500">{summary?.workers.length ?? 0} payroll rows</div>
            </div>
            <Button variant="outline" className="gap-2">
              Process payroll
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Table data={workerRows} columns={columns} className="border-none" />
      </Card>

      <Modal
        isOpen={Boolean(selectedStub)}
        onClose={() => setSelectedStub(null)}
        title="Pay Stub"
        maxWidth="2xl"
      >
        {stubLoading || !selectedStub ? (
          <div className="py-12 text-center text-sm text-gray-500">Loading pay stub...</div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-2xl bg-gray-50 p-5 text-center">
              <div className="text-xl font-bold text-gray-900">{selectedStub.worker.fullName}</div>
              <div className="text-sm text-gray-500">{selectedStub.worker.department ?? 'Worker'}</div>
              <div className="mt-2 text-xs text-gray-400">
                Pay Period: {new Date(selectedStub.payPeriod.start).toLocaleDateString()} - {new Date(selectedStub.payPeriod.end).toLocaleDateString()}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-sm text-gray-500">Regular Hours</div>
                <div className="mt-1 text-xl font-bold text-gray-900">{selectedStub.earnings.regularHoursDisplay}</div>
                <div className="mt-1 text-xs text-gray-400">${selectedStub.earnings.regularPay.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-sm text-gray-500">Overtime Hours</div>
                <div className="mt-1 text-xl font-bold text-gray-900">{selectedStub.earnings.overtimeHoursDisplay}</div>
                <div className="mt-1 text-xs text-gray-400">${selectedStub.earnings.overtimePay.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-sm text-gray-500">Gross Pay</div>
                <div className="mt-1 text-xl font-bold text-gray-900">${selectedStub.earnings.grossPay.toFixed(2)}</div>
              </div>
              <div className="rounded-2xl border border-gray-100 p-4">
                <div className="text-sm text-gray-500">Deductions</div>
                <div className="mt-1 text-xl font-bold text-gray-900">${selectedStub.deductions.totalDeductions.toFixed(2)}</div>
              </div>
            </div>

            <div className="rounded-2xl bg-[#1D4F6D] p-5 text-white">
              <div className="text-xs uppercase tracking-[0.2em] text-white/70">Net Pay</div>
              <div className="mt-1 text-4xl font-black">${selectedStub.netPay.toFixed(2)}</div>
            </div>

            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setSelectedStub(null)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
