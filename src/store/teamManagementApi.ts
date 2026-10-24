import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { config } from '@/config/env';

interface ApiEnvelope<T> {
    success?: boolean;
    statusCode?: number;
    message?: string;
    data: T;
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AdminStats {
    totalAdmins: number;
    active: number;
    pendingInvitations: number;
    pendingApproval: number;
}

export interface ManagerStats {
    totalManagers: number;
    active: number;
    totalProjectsManaged: number;
}

export interface SuperAdminUserCompany {
    id: string;
    name: string;
    industry?: string | null;
    email?: string | null;
    phone?: string | null;
    logoUrl?: string | null;
    projectsCount: number;
    managersCount: number;
    workersCount: number;
    isActive?: boolean;
    createdAt?: string;
}

export interface SuperAdminUser {
    id: string;
    name: string;
    fullName: string;
    email: string;
    phone?: string | null;
    avatarUrl?: string | null;
    role: string;
    displayRole?: string;
    status: string;
    totalCompany: number;
    totalManager: number;
    totalWorker: number;
    project: number;
    totalProject: number;
    subscriptionType: string;
    isExemptFromSubscription: boolean;
    companies?: SuperAdminUserCompany[];
    createdAt: string;
    lastLoginAt?: string | null;
}

export interface WorkforceStats {
    totalWorkforce: number;
    workforceTrend: string;
    activeToday: number;
    activeTodayPercent: string;
    onLeave: number;
    leaveTrend: string;
    avgAttendance: string;
    attendanceTrend: string;
}

export interface RequestedBy {
    id: string;
    fullName: string;
    email: string;
    role: string;
    avatarUrl: string | null;
}

export interface PendingInvitation {
    id: string;
    email: string | null;
    phone: string | null;
    role: string;
    status: string;
    expiresAt: string;
    createdAt: string;
    requestedBy: RequestedBy;
}

export interface InviteRequest {
    email?: string;
    phone?: string;
    role: string;
}

export interface InviteResponse {
    message: string;
    invitationId?: string;
    userId?: string;
}

export interface AdminUser {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    avatarUrl: string | null;
    lastLoginAt: string | null;
    isExemptFromSubscription?: boolean;
}

export interface AdminDetail {
    id: string;
    tenantId: string | null;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    isExemptFromSubscription?: boolean;
    employeeId: string | null;
    department: string | null;
    dateOfBirth: string | null;
    address: string | null;
    bio: string | null;
    hourlyRate: number | null;
    joinDate: string | null;
    avatarUrl: string | null;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
    companies: {
        id: string;
        role: string;
        joinedAt: string;
        company: {
            id: string;
            name: string;
            industry: string | null;
            isActive: boolean;
        };
    }[];
    userSettings: {
        language: string;
        timezone: string;
        dateFormat: string;
        currency: string;
    } | null;
}
export interface AdminListParams {
    search?: string;
    status?: string;
}

export interface PendingInvitationParams {
    role?: string;
    search?: string;
}

export interface ManagerUser {
    id: string;
    fullName: string;
    email: string;
    phone: string | null;
    role: string;
    status: string;
    avatarUrl: string | null;
    lastLoginAt: string | null;
    projectMemberships: {
        projectId: string;
        project: { id: string; name: string };
    }[];
}

export interface ManagerListParams {
    search?: string;
    status?: string;
}

export interface WorkerDocumentItem {
    id: string;
    name: string;
    category: string;
    date: string;
    size: string;
    status: string;
    url?: string;
    source?: 'document' | 'certification';
    uploadedAt?: string;
}

export interface UploadWorkerDocumentPayload {
    workerId: string;
    file: File;
    category?: string;
    name?: string;
}

export interface DeleteWorkerDocumentPayload {
    workerId: string;
    documentId: string;
}


// ── API ───────────────────────────────────────────────────────────────────────

export const teamManagementApi = createApi({
    reducerPath: 'teamManagementApi',
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
    tagTypes: ['AdminStats', 'ManagerStats', 'WorkforceStats', 'PendingInvitations', 'AdminList', 'AdminDetail', 'ManagerList', 'WorkerDocuments'],
    endpoints: (builder) => ({

        // GET /super_admin/team/admins/stats
        getAdminStats: builder.query<AdminStats, void>({
            query: () => '/super_admin/team/admins/stats',
            transformResponse: (res: ApiEnvelope<AdminStats>) => res.data,
            providesTags: ['AdminStats'],
        }),

        // GET /super_admin/team/admins?search=&status=
        getAdminList: builder.query<AdminUser[], AdminListParams>({
            query: ({ search, status } = {}) => ({
                url: '/super_admin/team/admins',
                params: {
                    ...(search ? { search } : {}),
                    ...(status && status !== 'all' ? { status } : {}),
                },
            }),
            transformResponse: (res: ApiEnvelope<AdminUser[]>) => res.data,
            providesTags: ['AdminList'],
        }),

        // GET /super_admin/team/managers/stats
        getManagerStats: builder.query<ManagerStats, void>({
            query: () => '/super_admin/team/managers/stats',
            transformResponse: (res: ApiEnvelope<ManagerStats>) => res.data,
            providesTags: ['ManagerStats'],
        }),

        // GET /super_admin/team/workforce/stats
        getWorkforceStats: builder.query<WorkforceStats, void>({
            query: () => '/super_admin/team/workforce/stats',
            transformResponse: (res: ApiEnvelope<WorkforceStats>) => res.data,
            providesTags: ['WorkforceStats'],
        }),

        // GET /super_admin/team/invitations/pending?role=admin&search=
        getPendingInvitations: builder.query<PendingInvitation[], PendingInvitationParams>({
            query: ({ role, search } = {}) => ({
                url: '/super_admin/team/invitations/pending',
                params: {
                    ...(role ? { role } : {}),
                    ...(search ? { search } : {}),
                },
            }),
            transformResponse: (res: any) => {
                console.log('pendingInvitations raw:', res);
                return res.data ?? res;
            },
            providesTags: ['PendingInvitations'],
        }),

        // GET /super_admin/team/users/:id
        getAdminDetail: builder.query<AdminDetail, string>({
            query: (id) => `/super_admin/team/users/${id}`,
            transformResponse: (res: ApiEnvelope<AdminDetail>) => res.data,
            providesTags: (_result, _err, id) => [{ type: 'AdminDetail', id }],
        }),

        // PATCH /super-admin/users/:id/toggle-subscription-exemption
        toggleSubscriptionExemption: builder.mutation<{ isExemptFromSubscription: boolean }, string>({
            query: (id) => ({
                url: `/super-admin/users/${id}/toggle-subscription-exemption`,
                method: 'PATCH',
            }),
            invalidatesTags: (_result, _err, id) => [{ type: 'AdminDetail', id }, 'AdminList'],
        }),

        // GET /super-admin/users
        getSuperAdminUsers: builder.query<SuperAdminUser[], { role?: string } | void>({
            query: (args) => {
                const params = args?.role ? `?role=${args.role}` : '';
                return `/super-admin/users${params}`;
            },
            transformResponse: (res: ApiEnvelope<SuperAdminUser[]> | SuperAdminUser[]) => {
                if (Array.isArray(res)) return res;
                return res?.data ?? [];
            },
            providesTags: ['AdminList'],
        }),

        // PATCH /super-admin/users/:id/status
        updateSuperAdminUserStatus: builder.mutation<{ id: string; status: string }, { id: string; status: string }>({
            query: ({ id, status }) => ({
                url: `/super-admin/users/${id}/status`,
                method: 'PATCH',
                body: { status },
            }),
            transformResponse: (res: any) => res?.data ?? res,
            invalidatesTags: ['AdminList', 'AdminDetail'],
        }),

        // POST /auth/invite
        sendInvite: builder.mutation<InviteResponse, InviteRequest>({
            query: (body) => ({
                url: '/auth/invite',
                method: 'POST',
                body,
            }),
            transformResponse: (res: ApiEnvelope<InviteResponse>) => res.data,
            invalidatesTags: ['PendingInvitations', 'AdminStats', 'AdminList'],
        }),

        // POST /auth/invitations/:id/resend
        resendInvitation: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/auth/invitations/${id}/resend`,
                method: 'POST',
            }),
            transformResponse: (res: ApiEnvelope<{ message: string }>) => res.data,
            invalidatesTags: ['PendingInvitations'],
        }),

        // DELETE /auth/invitations/:id
        cancelInvitation: builder.mutation<{ message: string }, string>({
            query: (id) => ({
                url: `/auth/invitations/${id}`,
                method: 'DELETE',
            }),
            transformResponse: (res: ApiEnvelope<{ message: string }>) => res.data,
            invalidatesTags: ['PendingInvitations', 'AdminStats'],
        }),

        // PATCH /super_admin/team/users/:id/status
        updateUserStatus: builder.mutation<AdminUser, { id: string; status: string }>({
            query: ({ id, status }) => ({
                url: `/super_admin/team/users/${id}/status`,
                method: 'PATCH',
                body: { status },
            }),
            transformResponse: (res: ApiEnvelope<AdminUser>) => res.data,
            invalidatesTags: (_result, _err, { id }) => [
                'AdminList',
                'AdminStats',
                { type: 'AdminDetail', id },
            ],
        }),
        // GET /super_admin/team/managers?search=&status=
        getManagerList: builder.query<ManagerUser[], ManagerListParams>({
            query: ({ search, status } = {}) => ({
                url: '/super_admin/team/managers',
                params: {
                    ...(search ? { search } : {}),
                    ...(status && status !== 'all' ? { status } : {}),
                },
            }),
            transformResponse: (res: ApiEnvelope<ManagerUser[]>) => res.data,
            providesTags: ['ManagerList'],
        }),

        // GET /super_admin/team/users/:id/documents
        getWorkerDocuments: builder.query<WorkerDocumentItem[], { workerId: string; search?: string; category?: string } | string>({
            query: (arg) => {
                const workerId = typeof arg === 'string' ? arg : arg.workerId;
                const search = typeof arg === 'object' ? arg.search : undefined;
                const category = typeof arg === 'object' ? arg.category : undefined;
                return {
                    url: `/super_admin/team/users/${workerId}/documents`,
                    params: {
                        ...(search ? { search } : {}),
                        ...(category && category !== 'all' ? { category } : {}),
                    },
                };
            },
            transformResponse: (res: any) => (Array.isArray(res) ? res : res?.data ?? []),
            providesTags: ['WorkerDocuments'],
        }),

        // POST /super_admin/team/users/:id/documents
        uploadWorkerDocument: builder.mutation<WorkerDocumentItem, UploadWorkerDocumentPayload>({
            query: ({ workerId, file, category, name }) => {
                const formData = new FormData();
                formData.append('file', file);
                if (category) formData.append('category', category);
                if (name) formData.append('name', name);

                return {
                    url: `/super_admin/team/users/${workerId}/documents`,
                    method: 'POST',
                    body: formData,
                };
            },
            transformResponse: (res: any) => res?.data ?? res,
            invalidatesTags: ['WorkerDocuments', 'AdminDetail'],
        }),

        // DELETE /super_admin/team/users/:id/documents/:documentId
        deleteWorkerDocument: builder.mutation<{ message: string }, DeleteWorkerDocumentPayload>({
            query: ({ workerId, documentId }) => ({
                url: `/super_admin/team/users/${workerId}/documents/${documentId}`,
                method: 'DELETE',
            }),
            transformResponse: (res: any) => res?.data ?? res,
            invalidatesTags: ['WorkerDocuments', 'AdminDetail'],
        }),
        // POST /super_admin/switch/my-company
        switchToMyCompany: builder.mutation<{ accessToken: string; user: any; company: any }, { companyName?: string } | void>({
            query: (body) => ({
                url: '/super_admin/switch/my-company',
                method: 'POST',
                body: body || {},
            }),
            transformResponse: (res: any) => res?.data ?? res,
        }),

        // POST /super_admin/switch/return
        returnToSuperAdmin: builder.mutation<{ accessToken: string; user: any }, void>({
            query: () => ({
                url: '/super_admin/switch/return',
                method: 'POST',
            }),
            transformResponse: (res: any) => res?.data ?? res,
        }),

        // GET /super_admin/switch/my-company
        getMyCompanyStatus: builder.query<{ hasCompany: boolean; company: any }, void>({
            query: () => '/super_admin/switch/my-company',
            transformResponse: (res: any) => res?.data ?? res,
        }),
    }),

});

export const {
    useGetAdminStatsQuery,
    useGetAdminListQuery,
    useGetManagerStatsQuery,
    useGetWorkforceStatsQuery,
    useGetPendingInvitationsQuery,
    useGetAdminDetailQuery,
    useSendInviteMutation,
    useResendInvitationMutation,
    useCancelInvitationMutation,
    useUpdateUserStatusMutation,
    useGetManagerListQuery,
    useGetWorkerDocumentsQuery,
    useUploadWorkerDocumentMutation,
    useDeleteWorkerDocumentMutation,
    useGetSuperAdminUsersQuery,
    useToggleSubscriptionExemptionMutation,
    useUpdateSuperAdminUserStatusMutation,
    useSwitchToMyCompanyMutation,
    useReturnToSuperAdminMutation,
    useGetMyCompanyStatusQuery,
} = teamManagementApi;