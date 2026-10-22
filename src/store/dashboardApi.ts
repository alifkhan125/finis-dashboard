import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { config } from '@/config/env';
import { API_ENDPOINTS } from '@/services';
import type {
    DashboardActivityItem,
    DashboardFilter,
    DashboardPaginatedResponse,
    DashboardStatsResponse,
    DashboardWorkforceItem,
    SuperAdminAttendanceResponse,
} from '@/shared/types';

interface ApiEnvelope<T> {
    success?: boolean;
    statusCode?: number;
    message?: string;
    data: T;
}

export interface DashboardQueryArgs {
    filter: DashboardFilter;
    customStartDate?: string;
    customEndDate?: string;
}

export interface PaginationQueryArgs {
    page?: number;
    limit?: number;
}

const toDashboardPeriod = (filter: DashboardFilter) => {
    return filter;
};

export const dashboardApi = createApi({
    reducerPath: 'dashboardApi',
    baseQuery: fetchBaseQuery({
        baseUrl: config.apiBaseUrl,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('auth_token');
            if (token) {
                headers.set('Authorization', `Bearer ${token}`);
            }
            return headers;
        },
    }),
    tagTypes: ['Dashboard'],
    endpoints: (builder) => ({
        getDashboardOverview: builder.query<DashboardStatsResponse, DashboardQueryArgs>({
            query: ({ filter, customStartDate, customEndDate }) => {
                const params: Record<string, string> = {
                    period: toDashboardPeriod(filter),
                };

                if (filter === 'custom' && customStartDate && customEndDate) {
                    params.startDate = customStartDate;
                    params.endDate = customEndDate;
                }

                return {
                    url: API_ENDPOINTS.SUPER_ADMIN.DASHBOARD,
                    params,
                };
            },
            transformResponse: (response: ApiEnvelope<DashboardStatsResponse> | DashboardStatsResponse): DashboardStatsResponse => {
                if ('success' in response && 'data' in response) {
                    return response.data;
                }

                return response as DashboardStatsResponse;
            },
            providesTags: ['Dashboard'],
        }),
        getRecentActivity: builder.query<DashboardPaginatedResponse<DashboardActivityItem>, PaginationQueryArgs | void>({
            query: (queryArgs = {}) => ({
                url: API_ENDPOINTS.SUPER_ADMIN.DASHBOARD_RECENT_ACTIVITY,
                params: {
                    page: (queryArgs as PaginationQueryArgs)?.page ?? 1,
                    limit: (queryArgs as PaginationQueryArgs)?.limit ?? 6,
                },
            }),
            transformResponse: (
                response: ApiEnvelope<DashboardPaginatedResponse<DashboardActivityItem>> | DashboardPaginatedResponse<DashboardActivityItem>,
            ): DashboardPaginatedResponse<DashboardActivityItem> => {
                if ('success' in response && 'data' in response) {
                    return response.data;
                }

                return response as DashboardPaginatedResponse<DashboardActivityItem>;
            },
            providesTags: ['Dashboard'],
        }),
        getWorkforceStatus: builder.query<DashboardPaginatedResponse<DashboardWorkforceItem>, PaginationQueryArgs | void>({
            query: (queryArgs = {}) => ({
                url: API_ENDPOINTS.SUPER_ADMIN.DASHBOARD_WORKFORCE_STATUS,
                params: {
                    page: (queryArgs as PaginationQueryArgs)?.page ?? 1,
                    limit: (queryArgs as PaginationQueryArgs)?.limit ?? 6,
                },
            }),
            transformResponse: (
                response: ApiEnvelope<DashboardPaginatedResponse<DashboardWorkforceItem>> | DashboardPaginatedResponse<DashboardWorkforceItem>,
            ): DashboardPaginatedResponse<DashboardWorkforceItem> => {
                if ('success' in response && 'data' in response) {
                    return response.data;
                }
                return response as DashboardPaginatedResponse<DashboardWorkforceItem>;
            },
            providesTags: ['Dashboard'],
        }),
        getAdminDashboard: builder.query<AdminDashboardData, DashboardQueryArgs | void>({
            query: (args) => ({
                url: '/admin/dashboard',
                params: args ? {
                    period: args.filter,
                    ...(args.filter === 'custom' ? {
                        startDate: args.customStartDate,
                        endDate: args.customEndDate,
                    } : {}),
                } : undefined,
            }),
            transformResponse: (
                response: ApiEnvelope<AdminDashboardData> | AdminDashboardData,
            ): AdminDashboardData => {
                if ('success' in response && 'data' in response) {
                    return response.data;
                }
                return response as AdminDashboardData;
            },
            providesTags: ['Dashboard'],
        }),
        getAttendanceSummary: builder.query<SuperAdminAttendanceResponse, { date?: string; page?: number; limit?: number } | void>({
            query: (queryArgs = {}) => ({
                url: API_ENDPOINTS.SUPER_ADMIN.DASHBOARD_ATTENDANCE_SUMMARY,
                params: {
                    ...(queryArgs as { date?: string; page?: number; limit?: number }),
                },
            }),
            transformResponse: (
                response: any,
            ): SuperAdminAttendanceResponse => {
                if (response && 'stats' in response && 'data' in response) {
                    return {
                        stats: response.stats,
                        data: Array.isArray(response.data) ? response.data : [],
                        meta: response.meta ?? {
                            total: response.stats?.total ?? (Array.isArray(response.data) ? response.data.length : 0),
                            page: 1,
                            limit: 100,
                            totalPages: 1,
                        },
                    };
                }
                if (response?.data && typeof response.data === 'object' && 'stats' in response.data && 'data' in response.data) {
                    return response.data as SuperAdminAttendanceResponse;
                }
                if (response && typeof response === 'object' && 'stats' in response) {
                    return response as SuperAdminAttendanceResponse;
                }
                const dataList = Array.isArray(response)
                    ? response
                    : (Array.isArray(response?.data) ? response.data : []);
                return {
                    stats: response?.stats ?? {
                        total: dataList.length,
                        present: dataList.length,
                        late: 0,
                        absent: 0,
                        activeCheckIns: 0,
                        attendanceRate: dataList.length > 0 ? 100 : 0,
                    },
                    data: dataList,
                    meta: response?.meta ?? {
                        total: dataList.length,
                        page: 1,
                        limit: 100,
                        totalPages: 1,
                    },
                };
            },
            providesTags: ['Dashboard'],
        }),
        getAttendanceRecords: builder.query<SuperAdminAttendanceResponse, { date?: string; page?: number; limit?: number } | void>({
            query: (queryArgs = {}) => ({
                url: API_ENDPOINTS.SUPER_ADMIN.DASHBOARD_ATTENDANCE_RECORDS,
                params: {
                    ...(queryArgs as { date?: string; page?: number; limit?: number }),
                },
            }),
            transformResponse: (
                response: any,
            ): SuperAdminAttendanceResponse => {
                if (response && 'stats' in response && 'data' in response) {
                    return {
                        stats: response.stats,
                        data: Array.isArray(response.data) ? response.data : [],
                        meta: response.meta ?? {
                            total: response.stats?.total ?? (Array.isArray(response.data) ? response.data.length : 0),
                            page: 1,
                            limit: 100,
                            totalPages: 1,
                        },
                    };
                }
                if (response?.data && typeof response.data === 'object' && 'stats' in response.data && 'data' in response.data) {
                    return response.data as SuperAdminAttendanceResponse;
                }
                if (response && typeof response === 'object' && 'stats' in response) {
                    return response as SuperAdminAttendanceResponse;
                }
                const dataList = Array.isArray(response)
                    ? response
                    : (Array.isArray(response?.data) ? response.data : []);
                return {
                    stats: response?.stats ?? {
                        total: dataList.length,
                        present: dataList.length,
                        late: 0,
                        absent: 0,
                        activeCheckIns: 0,
                        attendanceRate: dataList.length > 0 ? 100 : 0,
                    },
                    data: dataList,
                    meta: response?.meta ?? {
                        total: dataList.length,
                        page: 1,
                        limit: 100,
                        totalPages: 1,
                    },
                };
            },
            providesTags: ['Dashboard'],
        }),
    }),
});

export interface SubscriptionUsageItem {
    used: number;
    max: number | null;
}

export interface AdminSubscriptionUsage {
    planName: string;
    status: string;
    currentPeriodEnd: string | null;
    isExpired: boolean;
    companies: SubscriptionUsageItem;
    projects: SubscriptionUsageItem;
    workers: SubscriptionUsageItem;
}

export interface AdminDashboardData {
    stats: {
        activeProjects: number;
        workersOnSite: number;
        payrollPending: number;
        inventoryAlerts: number;
    };
    kpis: {
        companies: string;
        activeProjects: string;
        workforce: string;
        totalBudget: number;
        payrollCost: number;
        totalExpenses: number;
    };
    subscriptionUsage: AdminSubscriptionUsage;
    taskCards: Array<{
        title: string;
        value: string;
        trend: number;
        color: 'blue' | 'green' | 'amber';
        bgGradient: string;
        isCount?: boolean;
        isCurrency?: boolean;
    }>;
    taskIndicators: DashboardStatsResponse['taskIndicators'];
    projectCompletionForecast: DashboardStatsResponse['projectCompletionForecast'];
    recentActivity: DashboardActivityItem[];
    workforceStatus: DashboardWorkforceItem[];
}

export const {
    useGetDashboardOverviewQuery,
    useGetAdminDashboardQuery,
    useGetRecentActivityQuery,
    useGetWorkforceStatusQuery,
    useGetAttendanceSummaryQuery,
    useGetAttendanceRecordsQuery,
} = dashboardApi;

