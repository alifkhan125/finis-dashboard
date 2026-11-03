/**
 * Dashboard Specific Types
 */

export type DashboardFilter = 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';
export type DashboardPeriod = 'today' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface DashboardStatsResponse {
    period: {
        type: DashboardPeriod;
        start: string;
        end: string;
    };
    stats: {
        activeCompanies: {
            value: number;
            change: number;
        };
        activeProjects: {
            value: number;
            change: number;
        };
        totalWorkforce: {
            value: number;
            change: number;
        };
        payrollCost: {
            value: number;
            change: number;
        };
        totalAdmins?: {
            value: number;
            change: number;
        };
    };
    indicators: {
        attendanceRate: {
            value: number;
            presentCount: number;
            totalCount: number;
        };
        geofenceAlerts: {
            value: number;
            unresolvedCount: number;
            totalCount: number;
        };
    };
    projectCompletionForecast: {
        overallCompletion: number;
        avgCompletion: number;
        bestMonth: { month: number; value: number } | null;
        data: Array<{
            month: string;
            completionPct: number;
            total: number;
            completed: number;
        }>;
    };
    taskIndicators: {
        totalTasks: number;
        activeTasks: {
            value: number;
            change: number;
        };
        pendingApprovals: {
            value: number;
            change: number;
        };
        completed: {
            value: number;
            change: number;
        };
        efficiency: number;
        teamSize: number;
        onTimePct: number;
        atRisk: number;
    };
    subscriptionOverview?: {
        cards: {
            totalRevenue: number;
            monthlyRevenue: number;
            yearlyRevenue: number;
            soldCount: number;
            activeSubscriptions: number;
            expiredPaused: number;
            totalTenants: number;
        };
        revenueByPlan: Array<{
            planId: string;
            planName: string;
            salesCount: number;
            revenue: number;
            monthlyCount: number;
            yearlyCount: number;
        }>;
    };
}

export interface DashboardActivityItem {
    type: string;
    actor: {
        id: string;
        fullName: string;
        avatarUrl?: string | null;
    };
    description: string;
    subject: string;
    project: string | null;
    occurredAt: string;
}

export interface DashboardWorkforceItem {
    id: string;
    fullName: string;
    avatarUrl?: string | null;
    department: string | null;
    projectName: string | null;
    role: string | null;
    hoursWorked: string;
    status: 'on_time' | 'overtime';
    checkInTime: string | null;
}

export interface SuperAdminAttendanceRecord {
    id: string;
    date: string;
    status: 'present' | 'late' | 'absent' | string;
    totalHours: number;
    calculation?: Record<string, any>;
    worker: {
        id: string;
        fullName: string;
        avatarUrl?: string | null;
        role: string | null;
        projectName?: string | null;
    };
    session: {
        checkInTime: string | null;
        checkOutTime: string | null;
        inLat: number | null;
        inLng: number | null;
        outLat: number | null;
        outLng: number | null;
        zoneSeconds: number;
    } | null;
}

export interface SuperAdminAttendanceSummary {
    total: number;
    present: number;
    late: number;
    absent: number;
    leave: number;
    activeCheckIns: number;
    totalHours: number;
    attendanceRate: number;
}

export interface SuperAdminAttendanceResponse {
    stats: SuperAdminAttendanceSummary;
    data: SuperAdminAttendanceRecord[];
    meta: {
        total: number;
        page: number;
        limit: number;
        totalPages: number;
    };
}

export interface DashboardPaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
}

export interface DashboardPaginatedResponse<T> {
    data: T[];
    meta: DashboardPaginationMeta;
}

export interface DashboardOverviewViewModel {
    kpis: {
        companies: string;
        projects: string;
        workforce: string;
        payroll: string;
        trends: number[];
    };
    taskCards: Array<{
        title: string;
        value: number;
        trend: number;
        color: string;
        bgGradient: string;
        isCurrency?: boolean;
        isCount?: boolean;
    }>;
    projectCompletionForecast: DashboardStatsResponse['projectCompletionForecast'];
    taskIndicators: DashboardStatsResponse['taskIndicators'];
    subscriptionOverview?: DashboardStatsResponse['subscriptionOverview'];
    recentActivity: DashboardActivityItem[];
    workforceStatus: DashboardWorkforceItem[];
}
