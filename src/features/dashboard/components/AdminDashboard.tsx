import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  HardHat,
  ClipboardList,
  CheckCircle2,
  Briefcase,
  DollarSign,
  Crown,
  Download,
  FileText,
  Receipt,
  TrendingUp,
  ArrowUpRight,
} from 'lucide-react';
import {
  KPICard,
  StatCard,
  ProjectProgressChart,
  ActivityFeed,
  DashboardHeader,
  SegmentedIndicator,
} from '../components';
import { useGetAdminDashboardQuery } from '@/store/dashboardApi';
import { SEO } from '@/shared/components/seo/SEO';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Skeleton } from '@/shared/components/ui/Skeleton';
import { cn } from '@/shared/utils';
import type { DashboardFilter } from '@/shared/types';

function AdminDashboardSkeleton() {
  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-center justify-between rounded-3xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="space-y-3">
          <Skeleton className="h-7 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
        <Skeleton className="h-10 w-40 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={index} className="border-gray-100 shadow-sm rounded-3xl">
            <CardContent className="p-6">
              <Skeleton className="h-12 w-12 rounded-2xl" />
              <div className="mt-6 space-y-3">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-9 w-20" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-3xl border-gray-100 shadow-sm">
        <CardContent className="p-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
        </CardContent>
      </Card>
    </div>
  );
}

export function AdminDashboard() {
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>('monthly');
  const [customRange, setCustomRange] = useState<{ start: Date; end: Date } | null>(null);

  const { currentData: data, isFetching, error, refetch } = useGetAdminDashboardQuery({
    filter: activeFilter,
    ...(activeFilter === 'custom' && customRange ? {
      customStartDate: customRange.start.toISOString(),
      customEndDate: customRange.end.toISOString(),
    } : {}),
  });
  const isLoading = isFetching && !data;

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(val);

  const kpis = data?.kpis || {
    companies: '0',
    activeProjects: '0',
    workforce: '0',
    totalBudget: 0,
    payrollCost: 0,
    totalExpenses: 0,
  };

  const usage = data?.subscriptionUsage;
  const taskCards = data?.taskCards || [];
  const forecast = data?.projectCompletionForecast;
  const taskIndicators = data?.taskIndicators;
  const activities = data?.recentActivity ?? [];
  const workforceStatus = data?.workforceStatus ?? [];

  const reportShortcuts = [
    { type: 'payroll', label: 'Payroll', icon: FileText, hint: 'Team wages and approved payouts' },
    { type: 'project_invoices', label: 'Project Invoices', icon: ClipboardList, hint: 'Project budget and billing' },
    { type: 'worker_performance', label: 'Worker Performance', icon: TrendingUp, hint: 'Attendance and task track' },
    { type: 'expense', label: 'Expenses', icon: Receipt, hint: 'Site receipts and reimbursements' },
  ];

  return (
    <div className="space-y-8 pb-12">
      <SEO title="Company Dashboard" />

      {/* Header */}
      <DashboardHeader
        onFilterChange={(f) => {
          if (f !== 'custom') {
            setActiveFilter(f as DashboardFilter);
            setCustomRange(null);
          }
        }}
        onCustomDateChange={(start, end) => {
          setCustomRange({ start, end });
          setActiveFilter('custom');
        }}
      />
      <p className="text-sm text-gray-500">
        The filter applies to tasks created in the selected period and recent activity.
        Task charts show their current completion by creation month. Preset periods use UTC.
        Company, project, workforce, budget, plan usage and today&apos;s attendance show current totals.
      </p>

      {error && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          <span>Failed to load admin dashboard data.</span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="border-red-200 text-red-700 hover:bg-red-100"
          >
            Retry
          </Button>
        </div>
      )}

      {isLoading && !data && <AdminDashboardSkeleton />}

      {!isLoading && data && (
        <>
          {/* Top Row - Scoped KPIs */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="My Companies"
              value={kpis.companies}
              trend={0}
              icon={Building2}
              color="blue"
            />
            <KPICard
              title="Active Projects"
              value={kpis.activeProjects}
              trend={0}
              icon={Briefcase}
              color="blue"
            />
            <KPICard
              title="My Workforce"
              value={kpis.workforce}
              trend={0}
              icon={HardHat}
              color="green"
            />
            <KPICard
              title="Project Budget"
              value={formatCurrency(kpis.totalBudget)}
              trend={0}
              icon={DollarSign}
              color="purple"
            />
          </div>

          {/* Subscription Plan Usage & Limit Widget */}
          {usage && (
            <Card className="rounded-3xl border-gray-100 shadow-sm overflow-hidden bg-gradient-to-br from-slate-900 to-[#1D4F6D] text-white">
              <CardContent className="p-6 lg:p-8">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center border border-white/20">
                      <Crown className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-black text-white">{usage.planName}</h3>
                        <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] uppercase font-bold">
                          {usage.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-300 mt-1">
                        {usage.currentPeriodEnd
                          ? `Renewal date: ${new Date(usage.currentPeriodEnd).toLocaleDateString()}`
                          : 'Active Subscription'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      size="sm"
                      onClick={() => navigate('/subscription-plans')}
                      className="bg-white text-slate-900 hover:bg-slate-100 font-bold rounded-xl text-xs gap-1.5 shadow-lg"
                    >
                      <ArrowUpRight className="h-4 w-4 text-[#1D4F6D]" />
                      Upgrade Plan
                    </Button>
                  </div>
                </div>

                {/* Limit Progress Bars */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
                  {/* Companies Limit */}
                  <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Companies Created</span>
                      <span className="font-bold text-white">
                        {usage.companies.used} / {usage.companies.max ?? '∞'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${usage.companies.max ? Math.min((usage.companies.used / usage.companies.max) * 100, 100) : 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Projects Limit */}
                  <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Projects Allowed</span>
                      <span className="font-bold text-white">
                        {usage.projects.used} / {usage.projects.max ?? '∞'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-emerald-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${usage.projects.max ? Math.min((usage.projects.used / usage.projects.max) * 100, 100) : 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Workers / Users Limit */}
                  <div className="space-y-2 bg-white/5 p-4 rounded-2xl border border-white/10">
                    <div className="flex justify-between text-xs font-semibold text-slate-300">
                      <span>Workforce Limit</span>
                      <span className="font-bold text-white">
                        {usage.workers.used} / {usage.workers.max ?? '∞'}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
                      <div
                        className="h-full bg-purple-400 rounded-full transition-all duration-500"
                        style={{
                          width: `${usage.workers.max ? Math.min((usage.workers.used / usage.workers.max) * 100, 100) : 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Second Row - Task Performance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {taskCards.map((card) => (
              <StatCard
                key={card.title}
                title={card.title}
                value={card.value}
                // The admin endpoint has no period comparison: its legacy
                // trend field contains placeholders or a completion rate.
                icon={card.title === 'Active Tasks' ? ClipboardList : CheckCircle2}
                color={card.color}
                bgGradient={card.bgGradient}
                isCurrency={card.isCurrency}
                isCount={card.isCount}
              />
            ))}
          </div>

          {/* Third Row - Charts & Indicators */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <ProjectProgressChart filter={activeFilter} forecast={forecast} />
            <SegmentedIndicator activeFilter={activeFilter} taskIndicators={taskIndicators} />
          </div>

          {/* Reports & Analytics Shortcuts */}
          <Card className="rounded-3xl border-gray-100 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">
                Reports &amp; Analytics
              </CardTitle>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => navigate('/reports')}
                  className="bg-[#1D4F6D] hover:bg-[#163f57] font-bold rounded-xl"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Open Reports
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {reportShortcuts.map((report) => {
                const Icon = report.icon;
                return (
                  <button
                    key={report.type}
                    type="button"
                    onClick={() => navigate(`/reports?type=${report.type}`)}
                    className="group rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-[#1D4F6D]/20 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="rounded-2xl bg-slate-50 p-3 transition-colors group-hover:bg-[#1D4F6D]/10">
                        <Icon className="h-5 w-5 text-[#1D4F6D]" />
                      </div>
                      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 group-hover:text-[#1D4F6D]">
                        View
                      </span>
                    </div>
                    <div className="mt-4">
                      <h3 className="text-sm font-bold text-gray-900 group-hover:text-[#1D4F6D] transition-colors">
                        {report.label}
                      </h3>
                      <p className="mt-1 text-xs leading-5 text-gray-500">{report.hint}</p>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Bottom Row - Activity Feed & Workforce Status */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ActivityFeed activities={activities} />

            {/* Workforce Status Table */}
            <Card className="h-full border-gray-100 shadow-sm rounded-3xl overflow-hidden transition-all hover:shadow-md">
              <CardHeader className="flex flex-row items-center justify-between pb-4 bg-gray-50/30">
                <CardTitle className="text-lg font-bold text-gray-900 tracking-tight">
                  Workforce Status
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/workforce')}
                  className="text-xs font-bold text-[#1D4F6D] hover:bg-blue-50 underline"
                >
                  View All
                </Button>
              </CardHeader>
              <CardContent className="p-0 flex-1">
                {workforceStatus.length > 0 ? (
                  <div className="divide-y divide-gray-50">
                    {workforceStatus.map((worker, i) => (
                      <div
                        key={worker.id}
                        className="flex items-center justify-between px-6 py-4 hover:bg-gray-50/80 transition-all cursor-default group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div
                              className={cn(
                                'h-2.5 w-2.5 absolute right-0 bottom-0 rounded-full ring-2 ring-white shadow-sm',
                                worker.status === 'on_time' ? 'bg-green-500' : 'bg-blue-500',
                              )}
                            />
                            <img
                              src={worker.avatarUrl ?? `https://i.pravatar.cc/150?u=${i + 20}`}
                              alt=""
                              className="h-11 w-11 rounded-full bg-gray-100 border border-gray-100 group-hover:scale-105 transition-transform"
                            />
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-900 group-hover:text-[#1D4F6D] transition-colors leading-none">
                              {worker.fullName}
                            </p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1.5 leading-none">
                              {(worker.projectName ?? 'Active Site')} • {(worker.role ?? worker.department ?? 'Worker')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm font-black text-gray-900">{worker.hoursWorked}</p>
                            <p
                              className={cn(
                                'text-[10px] font-bold uppercase tracking-wider mt-1',
                                worker.status === 'on_time' ? 'text-green-600' : 'text-blue-600',
                              )}
                            >
                              {worker.status === 'on_time' ? 'On Time' : 'Overtime'}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center text-sm text-gray-400">
                    No workers currently clocked in today.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
