import { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Building2,
  CalendarClock,
  Clock3,
  Layers,
  RefreshCw,
  Search,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Link } from 'react-router-dom';
import { buildRoute } from '@/config/routes';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Table } from '@/shared/components/ui/Table';
import { Select } from '@/shared/components/ui/Select';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';
import { getFullUrl, formatStatus, capitalize, cn } from '@/shared/utils';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { TenantBrandingModal } from '@/shared/components/layout/TenantBrandingModal';
import { useAppSelector } from '@/store/hooks';
import { selectAuthToken } from '@/store/authSlice';
import {
  getTenantById,
  getSubscriptionPurchases,
  getTenantManagementOverview,
  getSubscriptionSalesTrend,
  getTenants,
  type SubscriptionPurchaseApi,
  type TenantApi,
  type SubscriptionSalesTrendApi,
} from '../services/subscriptionApi';

function formatMoney(value?: number | null) {
  if (value === null || value === undefined) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value?: string | null) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString();
}

function statusClass(status?: string | null) {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700';
    case 'past_due':
      return 'bg-amber-100 text-amber-700';
    case 'cancelled':
      return 'bg-rose-100 text-rose-700';
    case 'trial':
      return 'bg-blue-100 text-blue-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
}

function buildTrendFromPurchases(
  purchases: SubscriptionPurchaseApi[],
  period: 'weekly' | 'monthly' | 'yearly',
) {
  const now = new Date();
  const start = new Date(now);

  if (period === 'yearly') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'monthly') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else {
    start.setDate(now.getDate() - 6);
    start.setHours(0, 0, 0, 0);
  }

  const bucketMap = new Map<string, { label: string; revenue: number; salesCount: number }>();
  const addBucket = (key: string, label: string) => {
    if (!bucketMap.has(key)) bucketMap.set(key, { label, revenue: 0, salesCount: 0 });
    return bucketMap.get(key)!;
  };

  const sourcePurchases = purchases.filter((purchase) => {
    const date = new Date(purchase.subscription?.currentPeriodStart ?? purchase.subscription?.currentPeriodEnd ?? '');
    return !Number.isNaN(date.getTime()) && date >= start && date <= now;
  });

  for (const purchase of sourcePurchases) {
    const date = new Date(purchase.subscription?.currentPeriodStart ?? purchase.subscription?.currentPeriodEnd ?? '');
    if (Number.isNaN(date.getTime())) continue;

    if (period === 'yearly') {
      const key = `${date.getFullYear()}-${date.getMonth() + 1}`;
      const label = date.toLocaleString('en-US', { month: 'short' });
      const bucket = addBucket(key, label);
      bucket.revenue += Number(purchase.subscription?.billedAmount ?? 0);
      bucket.salesCount += 1;
    } else if (period === 'monthly') {
      const key = date.toISOString().slice(0, 10);
      const label = String(date.getDate());
      const bucket = addBucket(key, label);
      bucket.revenue += Number(purchase.subscription?.billedAmount ?? 0);
      bucket.salesCount += 1;
    } else {
      const key = date.toISOString().slice(0, 10);
      const label = date.toLocaleDateString('en-US', { weekday: 'short' });
      const bucket = addBucket(key, label);
      bucket.revenue += Number(purchase.subscription?.billedAmount ?? 0);
      bucket.salesCount += 1;
    }
  }

  const labels =
    period === 'yearly'
      ? Array.from({ length: 12 }, (_, index) => new Date(now.getFullYear(), index, 1).toLocaleString('en-US', { month: 'short' }))
      : period === 'monthly'
        ? Array.from({ length: 31 }, (_, index) => String(index + 1))
        : Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return date.toLocaleDateString('en-US', { weekday: 'short' });
          });

  return labels.map((label) => {
    const match = [...bucketMap.values()].find((item) => item.label === label);
    return {
      name: label,
      revenue: match?.revenue ?? 0,
      salesCount: match?.salesCount ?? 0,
    };
  });
}

export function TenantsPage() {
  const token = useAppSelector(selectAuthToken);
  const [tenants, setTenants] = useState<TenantApi[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTenant, setSelectedTenant] = useState<TenantApi | null>(null);
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedTenantLoading, setSelectedTenantLoading] = useState(false);
  const [salesPeriod, setSalesPeriod] = useState<'weekly' | 'monthly' | 'yearly'>('weekly');
  const [salesTrend, setSalesTrend] = useState<SubscriptionSalesTrendApi | null>(null);
  const [salesOverview, setSalesOverview] = useState<{
    totalRevenue: number;
    monthlyRevenue: number;
    yearlyRevenue: number;
    soldCount: number;
    activeSubscriptions: number;
    expiredPaused: number;
    totalTenants: number;
    totalUsers?: number;
    activeUsers?: number;
    expiredUsers?: number;
    revenueByPlan: Array<{ planId: string; planName: string; salesCount: number; revenue: number; monthlyCount: number; yearlyCount: number }>;
    recentActiveUsers?: number;
  } | null>(null);
  const [purchases, setPurchases] = useState<SubscriptionPurchaseApi[]>([]);

  const loadTenantDetails = async (tenantId: string) => {
    setSelectedTenantLoading(true);
    try {
      const response = await getTenantById(tenantId, token || undefined);
      const detailedTenant = response?.data ?? null;
      if (detailedTenant) {
        setSelectedTenant(detailedTenant);
        setTenants((prev) => prev.map((tenant) => (tenant.id === detailedTenant.id ? { ...tenant, ...detailedTenant } : tenant)));
      }
    } finally {
      setSelectedTenantLoading(false);
    }
  };

  const loadTenants = async () => {
    setLoading(true);
    try {
      const [tenantsResponse, overviewResponse, purchasesResponse] = await Promise.all([
        getTenants(token || undefined, {
        page: 1,
        limit: 100,
        search: searchQuery || undefined,
        }),
        getTenantManagementOverview(token || undefined),
        getSubscriptionPurchases(token || undefined, {
          page: 1,
          limit: 100,
          search: searchQuery || undefined,
        }),
      ]);

      const nextTenants = Array.isArray(tenantsResponse?.data) ? tenantsResponse.data : [];
      const nextPurchases = Array.isArray(purchasesResponse?.data) ? purchasesResponse.data : [];
      setTenants(nextTenants);
      setPurchases(nextPurchases);
      if (!selectedTenant && nextTenants.length > 0) {
        void loadTenantDetails(nextTenants[0].id);
      }
      const overview = overviewResponse?.data?.cards;
      const revenueByPlan = overviewResponse?.data?.revenueByPlan ?? [];
      setSalesOverview(
        overview
          ? {
              totalRevenue: overview.totalRevenue ?? 0,
              monthlyRevenue: overview.monthlyRevenue ?? 0,
              yearlyRevenue: overview.yearlyRevenue ?? 0,
              soldCount: overview.soldCount ?? 0,
              activeSubscriptions: overview.activeSubscriptions ?? 0,
              expiredPaused: overview.expiredPaused ?? 0,
              totalTenants: overview.totalTenants ?? 0,
              totalUsers: overview.totalUsers ?? 0,
              activeUsers: overview.activeUsers ?? 0,
              expiredUsers: overview.expiredUsers ?? 0,
              recentActiveUsers: overviewResponse?.data?.recentActiveUsers ?? 0,
              revenueByPlan,
            }
          : null,
      );
    } finally {
      setLoading(false);
    }
  };

  const loadSalesTrend = async (period: 'weekly' | 'monthly' | 'yearly') => {
    const response = await getSubscriptionSalesTrend(token || undefined, period);
    setSalesTrend(response?.data ?? null);
  };

  useEffect(() => {
    void loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    void loadSalesTrend(salesPeriod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, salesPeriod]);

  const filteredTenants = useMemo(
    () =>
      (Array.isArray(tenants) ? tenants : []).filter((tenant) => {
        const matchesSearch = tenant.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || tenant.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [searchQuery, statusFilter, tenants],
  );

  const stats = useMemo(() => {
    const safeTenants = Array.isArray(tenants) ? tenants : [];
    const active = safeTenants.filter((t) => t.status === 'active').length;
    const expired = safeTenants.filter((t) => {
      const subStatus = t.subscription?.status ?? null;
      return subStatus === 'cancelled' || subStatus === 'past_due' || t.status === 'suspended';
    }).length;
    const totalUsers = safeTenants.reduce((sum, t) => sum + (t.userCount || 0), 0);
    const totalCompanies = safeTenants.reduce((sum, t) => sum + (t.companyCount || 0), 0);
    const fallbackTotal = salesOverview?.totalTenants ?? safeTenants.length;
    return {
      total: fallbackTotal,
      active: salesOverview?.activeSubscriptions ?? active,
      expired: salesOverview?.expiredPaused ?? expired,
      totalUsers: salesOverview?.totalUsers ?? totalUsers,
      activeUsers: salesOverview?.activeUsers ?? active,
      expiredUsers: salesOverview?.expiredUsers ?? expired,
      totalCompanies,
    };
  }, [tenants, salesOverview]);

  const salesChartData = useMemo(() => {
    const trendData = salesTrend?.data ?? [];
    if (trendData.length > 0) {
      return trendData.map((item) => ({
        name: item.label,
        revenue: item.revenue,
        salesCount: item.salesCount,
      }));
    }
    return buildTrendFromPurchases(purchases, salesPeriod);
  }, [salesTrend, purchases, salesPeriod]);

  const kpis = [
    { label: 'Total tenants', value: stats.total, icon: Building2, tone: 'text-[#1D4F6D]', bg: 'bg-[#1D4F6D]/10' },
    { label: 'Active subscriptions', value: stats.active, icon: ShieldCheck, tone: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Expired / paused', value: stats.expired, icon: Clock3, tone: 'text-rose-600', bg: 'bg-rose-50' },
    { label: 'Total users', value: stats.totalUsers, icon: Users, tone: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total companies', value: stats.totalCompanies, icon: Layers, tone: 'text-violet-600', bg: 'bg-violet-50' },
  ];

  return (
    <div className="relative space-y-8 overflow-hidden">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top_left,rgba(29,79,109,0.12),transparent_35%),radial-gradient(circle_at_top_right,rgba(139,92,246,0.08),transparent_32%),linear-gradient(180deg,#f8fbfe_0%,#ffffff_65%)]" />
      <div className="pointer-events-none absolute right-[-120px] top-24 -z-10 h-72 w-72 rounded-full bg-[#1D4F6D]/5 blur-3xl" />
      <div className="pointer-events-none absolute left-[-120px] top-72 -z-10 h-72 w-72 rounded-full bg-violet-200/20 blur-3xl" />
      <PageHeader
        title="Tenants"
        description="Subscription sales flow, active users, expired users, and total users"
        icon={Building2}
      >
        <Button variant="outline" onClick={loadTenants} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </PageHeader>

      {/* Revenue hero — the ledger */}
      <Card className="relative overflow-hidden rounded-[32px] border-gray-100/80 bg-white/95 shadow-[0_20px_70px_-30px_rgba(15,23,42,0.25)] backdrop-blur">
        <div
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{
            backgroundImage: 'repeating-linear-gradient(180deg, #1D4F6D 0px, #1D4F6D 6px, transparent 6px, transparent 14px)',
          }}
        />
        <div className="grid grid-cols-1 lg:grid-cols-[340px,1fr]">
          <div
            className="relative border-b border-gray-100 p-7 lg:border-b-0 lg:border-r"
            style={{
              backgroundImage:
                'repeating-linear-gradient(180deg, rgba(29,79,109,0.05) 0px, rgba(29,79,109,0.05) 1px, transparent 1px, transparent 29px)',
            }}
          >
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em] text-gray-400">
              <Wallet className="h-3.5 w-3.5" />
              Total recognized revenue
            </div>
            <div className="mt-3 text-4xl font-black leading-none tracking-tight text-gray-900 tabular-nums">
              {formatMoney(salesOverview?.totalRevenue)}
            </div>
            <p className="mt-2 text-sm text-gray-500">Across every active and historical tenant subscription.</p>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#1D4F6D]" /> Monthly
                </div>
                <div className="mt-1 text-lg font-black text-gray-900 tabular-nums">{formatMoney(salesOverview?.monthlyRevenue)}</div>
              </div>
              <div className="rounded-2xl bg-white px-4 py-3 shadow-sm">
                <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-500" /> Yearly
                </div>
                <div className="mt-1 text-lg font-black text-gray-900 tabular-nums">{formatMoney(salesOverview?.yearlyRevenue)}</div>
              </div>
            </div>

            <div className="mt-6 border-t border-dashed border-gray-200 pt-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div>
                  <div className="text-lg font-black text-gray-900 tabular-nums">{stats.totalUsers}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Users</div>
                </div>
                <div>
                  <div className="text-lg font-black text-emerald-600 tabular-nums">{stats.activeUsers}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Active</div>
                </div>
                <div>
                  <div className="text-lg font-black text-rose-600 tabular-nums">{stats.expiredUsers}</div>
                  <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-400">Expired</div>
                </div>
              </div>
            </div>
          </div>

          <div className="p-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-black tracking-tight text-gray-900">Subscription sales by date</h2>
                <p className="mt-1 text-sm text-gray-500">See how much subscription money was sold on each day, week, or month.</p>
              </div>
              <div className="flex items-center gap-2 rounded-2xl bg-gray-50 p-1 text-xs font-semibold text-gray-500">
                {(['weekly', 'monthly', 'yearly'] as const).map((period) => (
                  <button
                    key={period}
                    type="button"
                    onClick={() => setSalesPeriod(period)}
                    className={`rounded-xl px-3 py-2 capitalize transition ${
                      salesPeriod === period ? 'bg-white text-[#1D4F6D] shadow-sm' : 'hover:text-gray-900'
                    }`}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 h-[280px]">
              {salesChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={salesChartData} margin={{ top: 10, right: 10, left: 0, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 700 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6B7280', fontSize: 12, fontWeight: 700 }} />
                    <Tooltip
                      cursor={{ fill: 'rgba(29,79,109,0.06)' }}
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const data = payload[0].payload as { name: string; revenue: number; salesCount: number };
                        return (
                          <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-xl">
                            <div className="text-xs font-bold uppercase tracking-[0.18em] text-gray-400">{data.name}</div>
                            <div className="mt-2 space-y-1 text-sm">
                              <div className="flex items-center justify-between gap-8"><span className="text-gray-500">Sales</span><span className="font-black text-gray-900 tabular-nums">{data.salesCount}</span></div>
                              <div className="flex items-center justify-between gap-8"><span className="text-gray-500">Revenue</span><span className="font-black text-[#1D4F6D] tabular-nums">{formatMoney(data.revenue)}</span></div>
                            </div>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="revenue" fill="#1D4F6D" radius={[10, 10, 0, 0]} name="Revenue" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50 text-sm text-gray-500">
                  No sales trend data found.
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {kpis.map(({ label, value, icon: Icon, tone, bg }) => (
          <Card key={label} className="rounded-3xl border-gray-100/80 bg-white/95 p-5 shadow-sm">
            <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>
              <Icon className={`h-4.5 w-4.5 ${tone}`} />
            </div>
            <div className="mt-3 text-2xl font-black text-gray-900 tabular-nums">{value}</div>
            <div className="mt-0.5 text-xs font-semibold text-gray-500">{label}</div>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="rounded-3xl border-gray-100/80 bg-white/95 p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="flex-1">
            <Input
              placeholder="Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              startIcon={<Search className="w-4 h-4" />}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full lg:w-48"
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'trial', label: 'Trial' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'cancelled', label: 'Cancelled' },
            ]}
          />
        </div>
      </Card>

      {/* Tenant table */}
      <Card className="overflow-hidden rounded-[32px] border-gray-100/80 bg-white/95 shadow-[0_18px_60px_-34px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-gray-100 p-6">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Tenant subscriptions</h3>
            <p className="mt-1 text-sm text-gray-500">Select a tenant to inspect plan, interval, and billing period.</p>
          </div>
          <Badge className="bg-slate-100 text-slate-700">
            {filteredTenants.length} {filteredTenants.length === 1 ? 'tenant' : 'tenants'}
          </Badge>
        </div>
        <Table
          data={filteredTenants}
          columns={[
            {
              key: 'name',
              header: 'Tenant',
              render: (tenant) => (
                <button
                  type="button"
                  onClick={() => void loadTenantDetails(tenant.id)}
                  className="flex items-center gap-3 text-left group"
                >
                  <Avatar className="h-10 w-10 rounded-xl border-2 border-white shadow-sm">
                    <AvatarImage src={getFullUrl((tenant as any).logo)} />
                    <AvatarFallback className="rounded-xl bg-[#1D4F6D]/10 font-bold text-[#1D4F6D]">
                      {tenant.name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="font-bold text-gray-900 group-hover:text-[#1D4F6D]">{tenant.name}</div>
                    <div className="text-[11px] font-medium text-gray-400">Joined {formatDate(tenant.createdAt)}</div>
                  </div>
                </button>
              ),
            },
            {
              key: 'plan',
              header: 'Plan',
              render: (tenant) => (
                <div className="space-y-1">
                  <Badge variant="default">{tenant.plan?.name ?? 'N/A'}</Badge>
                  <div className="text-[11px] text-gray-500">
                    {capitalize(tenant.subscription?.planInterval) || '—'} · {formatMoney(tenant.subscription?.billedAmount ?? tenant.plan?.priceMonthly)}
                  </div>
                </div>
              ),
            },
            {
              key: 'status',
              header: 'Status',
              render: (tenant) => <Badge className={cn(statusClass(tenant.subscription?.status), 'capitalize')}>{formatStatus(tenant.subscription?.status) || 'None'}</Badge>,
            },
            {
              key: 'billing',
              header: 'Billing Period',
              render: (tenant) => (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2 text-gray-900">
                    <CalendarClock className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(tenant.subscription?.currentPeriodStart)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-900">
                    <Clock3 className="h-4 w-4 text-gray-400" />
                    <span>{formatDate(tenant.subscription?.currentPeriodEnd)}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'counts',
              header: 'Users / Companies',
              render: (tenant) => (
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold tabular-nums">{tenant.userCount ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    <span className="font-semibold tabular-nums">{tenant.companyCount ?? 0}</span>
                  </div>
                </div>
              ),
            },
            {
              key: 'actions',
              header: 'Actions',
              render: (tenant) => (
                <div className="flex items-center gap-2">
                  <Link to={buildRoute.tenantDetail(tenant.id)}>
                    <Button size="sm" variant="outline">
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      View
                    </Button>
                  </Link>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Subscription snapshot */}
      <Card className="overflow-hidden rounded-[32px] border-[#1D4F6D]/10 bg-gradient-to-br from-[#1D4F6D]/5 via-white to-violet-50/60 shadow-[0_18px_60px_-34px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-[#1D4F6D]/10 bg-white/60 p-6 backdrop-blur">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full bg-[#1D4F6D]/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#1D4F6D]">
              <div className="h-1.5 w-1.5 rounded-full bg-[#1D4F6D]" />
              Subscription snapshot
            </div>
            <h3 className="mt-3 text-lg font-black tracking-tight text-gray-900">Selected tenant billing details</h3>
            <p className="mt-1 text-sm text-gray-500">Current plan, interval, status, and billing period at a glance.</p>
          </div>
          <Badge className="bg-[#1D4F6D] text-white shadow-sm">
            {selectedTenantLoading ? 'Loading...' : selectedTenant ? selectedTenant.name : 'No tenant selected'}
          </Badge>
        </div>
        {selectedTenantLoading ? (
          <div className="p-6">
            <div className="grid gap-4 md:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-24 rounded-2xl bg-gray-50 animate-pulse" />
              ))}
            </div>
          </div>
        ) : selectedTenant ? (
          <div className="grid gap-4 p-6 md:grid-cols-4">
            <div className="rounded-2xl border border-[#1D4F6D]/10 bg-white p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-[#1D4F6D]">Plan</div>
              <div className="mt-2 text-lg font-black text-gray-900">{selectedTenant.plan?.name ?? 'N/A'}</div>
            </div>
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-emerald-700">Billed Amount</div>
              <div className="mt-2 text-lg font-black text-gray-900 tabular-nums">{formatMoney(selectedTenant.subscription?.billedAmount ?? selectedTenant.plan?.priceMonthly)}</div>
            </div>
            <div className="rounded-2xl border border-violet-200 bg-violet-50/80 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-violet-700">Interval</div>
              <div className="mt-2 text-lg font-black capitalize text-gray-900">{selectedTenant.subscription?.planInterval ?? '—'}</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-amber-700">Status</div>
              <div className="mt-2">
                <Badge className={`${statusClass(selectedTenant.subscription?.status)} shadow-sm`}>{selectedTenant.subscription?.status ?? 'none'}</Badge>
              </div>
            </div>
            <div className="rounded-2xl border border-sky-200 bg-sky-50/80 p-4 md:col-span-2 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-sky-700">Period Start</div>
              <div className="mt-2 text-base font-semibold text-gray-900">{formatDate(selectedTenant.subscription?.currentPeriodStart)}</div>
            </div>
            <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 md:col-span-2 shadow-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-rose-700">Period End</div>
              <div className="mt-2 text-base font-semibold text-gray-900">{formatDate(selectedTenant.subscription?.currentPeriodEnd)}</div>
            </div>
            <div className="rounded-2xl border border-[#1D4F6D]/10 bg-white/90 p-4 md:col-span-4 shadow-sm">
              <div className="flex items-start gap-3 rounded-2xl bg-gradient-to-r from-[#1D4F6D]/10 via-white to-violet-50 p-4">
                <BarChart3 className="mt-0.5 h-5 w-5 text-[#1D4F6D]" />
                <div>
                  <div className="text-sm font-bold text-[#1D4F6D]">Subscription note</div>
                  <div className="mt-1 text-sm text-gray-600">
                    This snapshot reflects the latest billing data synced from the backend. Select View on any tenant to open its full profile.
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 p-10 text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#1D4F6D]/10">
              <Building2 className="h-5 w-5 text-[#1D4F6D]" />
            </div>
            <p className="text-sm text-gray-500">
              No tenant selected. Choose any row in the table above to see its subscription snapshot here.
            </p>
          </div>
        )}
      </Card>

      <TenantBrandingModal
        isOpen={isBrandingModalOpen}
        onClose={() => setIsBrandingModalOpen(false)}
        tenant={selectedTenant as any}
      />
    </div>
  );
}
