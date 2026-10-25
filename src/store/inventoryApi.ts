import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import { config } from '@/config/env';

type ApiEnvelope<T> = { data: T } | { success?: boolean; data: T };

export interface ProjectOption {
    id: string;
    name: string;
}

export interface InventoryProject {
    id: string;
    name: string;
}

export interface InventoryItemResponse {
    id: string;
    name: string;
    category?: string | null;
    location?: string | null;
    currentQty: number;
    minStockQty: number;
    unit?: string | null;
    stockStatus: 'OUT_OF_STOCK' | 'CRITICAL' | 'LOW_STOCK' | 'IN_STOCK';
    project: InventoryProject;
    updatedAt: string;
    unresolvedDamages?: number;
}

export interface UsageLogResponse {
    id: string;
    inventoryId: string;
    userId: string;
    projectId?: string | null;
    qtyChange: number;
    reason?: string | null;
    loggedAt: string;
    inventory: {
        id: string;
        name: string;
        unit?: string | null;
        project: InventoryProject;
    };
    user?: {
        id: string;
        fullName: string;
    } | null;
}

export interface DamageResponse {
    id: string;
    inventoryId: string;
    reportedBy: string;
    description?: string | null;
    qtyDamaged: number;
    photoUrl?: string | null;
    status: 'unresolved' | 'in_repair' | 'resolved' | 'written_off';
    resolvedAt?: string | null;
    reportedAt: string;
    inventory: {
        id: string;
        name: string;
        category?: string | null;
        project: InventoryProject;
    };
}

export interface InventorySummaryResponse {
    totalProducts: number;
    lowStockAlerts: number;
    unresolvedDamages: number;
}

export interface InventoryDetailsResponse {
    projects: ProjectOption[];
    summary: InventorySummaryResponse;
    inventory: {
        data: InventoryItemResponse[];
        meta: { total: number; page: number; limit: number; totalPages: number };
    };
    usageHistory: {
        data: UsageLogResponse[];
        meta: { total: number; page: number; limit: number; totalPages: number };
    };
    damages: {
        data: DamageResponse[];
        meta: { total: number; page: number; limit: number; totalPages: number };
    };
}

export interface InventoryQuery {
    projectId?: string;
    search?: string;
    category?: string;
    location?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
}

export interface PaginationQuery {
    projectId?: string;
    page?: number;
    limit?: number;
}

export interface CreateInventoryItemInput {
    name: string;
    category?: string;
    location?: string;
    currentQty?: number;
    minStockQty?: number;
    unit?: string;
}

export type UpdateInventoryItemInput = Partial<CreateInventoryItemInput>;
export interface UpdateStockInput {
    quantity: number;
    reason?: string;
}
export interface CreateDamageInput {
    inventoryId: string;
    description?: string;
    qtyDamaged: number;
    photoUrl?: string;
}
export interface UpdateDamageStatusInput {
    status: 'unresolved' | 'in_repair' | 'resolved' | 'written_off';
}

function unwrap<T>(response: ApiEnvelope<T> | T): T {
    if (response && typeof response === 'object' && 'data' in response) return response.data;
    return response as T;
}

export const inventoryApi = createApi({
    reducerPath: 'inventoryApi',
    baseQuery: fetchBaseQuery({
        baseUrl: config.apiBaseUrl,
        prepareHeaders: (headers) => {
            const token = localStorage.getItem('auth_token');
            if (token) headers.set('Authorization', `Bearer ${token}`);
            return headers;
        },
    }),
    tagTypes: ['Inventory'],
    endpoints: (builder) => ({
        getProjects: builder.query<ProjectOption[], void>({
            query: () => ({ url: '/inventory/projects' }),
            transformResponse: (response: any) => {
                if (Array.isArray(response)) return response;
                if (response?.data?.projects && Array.isArray(response.data.projects)) return response.data.projects;
                if (response?.projects && Array.isArray(response.projects)) return response.projects;
                if (response?.data && Array.isArray(response.data)) return response.data;
                return [];
            },
            providesTags: ['Inventory'],
        }),
        getSummary: builder.query<InventorySummaryResponse, { projectId?: string } | void>({
            query: (args) => ({
                url: '/inventory/summary',
                params: args ?? {},
            }),
            transformResponse: (response: ApiEnvelope<InventorySummaryResponse> | InventorySummaryResponse) =>
                unwrap<InventorySummaryResponse>(response),
            providesTags: ['Inventory'],
        }),
        getInventoryItems: builder.query<{ data: InventoryItemResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }, InventoryQuery | void>({
            query: (args) => ({
                url: '/inventory/all',
                params: args ?? {},
            }),
            transformResponse: (response: ApiEnvelope<{ data: InventoryItemResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }> | { data: InventoryItemResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }) =>
                unwrap<{ data: InventoryItemResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(response),
            providesTags: ['Inventory'],
        }),
        getUsageHistory: builder.query<{ data: UsageLogResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }, PaginationQuery | void>({
            query: (args) => ({
                url: '/inventory/usage-history',
                params: args ?? {},
            }),
            transformResponse: (response: ApiEnvelope<{ data: UsageLogResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }> | { data: UsageLogResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }) =>
                unwrap<{ data: UsageLogResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(response),
            providesTags: ['Inventory'],
        }),
        getDamageReports: builder.query<{ data: DamageResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }, PaginationQuery | void>({
            query: (args) => ({
                url: '/inventory/damages',
                params: args ?? {},
            }),
            transformResponse: (response: ApiEnvelope<{ data: DamageResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }> | { data: DamageResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }) =>
                unwrap<{ data: DamageResponse[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(response),
            providesTags: ['Inventory'],
        }),
        getInventoryDetails: builder.query<InventoryDetailsResponse, InventoryQuery | void>({
            query: (args) => ({
                url: '/inventory/details',
                params: args ?? {},
            }),
            transformResponse: (response: ApiEnvelope<InventoryDetailsResponse> | InventoryDetailsResponse) =>
                unwrap<InventoryDetailsResponse>(response),
            providesTags: ['Inventory'],
        }),
        createItem: builder.mutation<InventoryItemResponse, CreateInventoryItemInput>({
            query: (body) => ({ url: '/inventory', method: 'POST', body }),
            transformResponse: (response: ApiEnvelope<InventoryItemResponse> | InventoryItemResponse) => unwrap<InventoryItemResponse>(response),
            invalidatesTags: ['Inventory'],
        }),
        updateItem: builder.mutation<InventoryItemResponse, { projectId: string; id: string; body: UpdateInventoryItemInput }>({
            query: ({ projectId, id, body }) => ({
                url: `/inventory/${projectId}/item/${id}`,
                method: 'PATCH',
                body,
            }),
            transformResponse: (response: ApiEnvelope<InventoryItemResponse> | InventoryItemResponse) => unwrap<InventoryItemResponse>(response),
            invalidatesTags: ['Inventory'],
        }),
        updateStock: builder.mutation<InventoryItemResponse, { projectId: string; id: string; body: UpdateStockInput }>({
            query: ({ projectId, id, body }) => ({
                url: `/inventory/${projectId}/item/${id}/stock`,
                method: 'PATCH',
                body,
            }),
            transformResponse: (response: ApiEnvelope<InventoryItemResponse> | InventoryItemResponse) => unwrap<InventoryItemResponse>(response),
            invalidatesTags: ['Inventory'],
        }),
        deleteItem: builder.mutation<{ message: string }, { projectId: string; id: string }>({
            query: ({ projectId, id }) => ({
                url: `/inventory/${projectId}/item/${id}`,
                method: 'DELETE',
            }),
            transformResponse: (response: ApiEnvelope<{ message: string }> | { message: string }) => unwrap<{ message: string }>(response),
            invalidatesTags: ['Inventory'],
        }),
        createDamage: builder.mutation<DamageResponse, CreateDamageInput>({
            query: (body) => ({ url: '/inventory/damages', method: 'POST', body }),
            transformResponse: (response: ApiEnvelope<DamageResponse> | DamageResponse) => unwrap<DamageResponse>(response),
            invalidatesTags: ['Inventory'],
        }),
        updateDamageStatus: builder.mutation<DamageResponse, { damageId: string; body: UpdateDamageStatusInput }>({
            query: ({ damageId, body }) => ({
                url: `/inventory/damages/${damageId}/status`,
                method: 'PATCH',
                body,
            }),
            transformResponse: (response: ApiEnvelope<DamageResponse> | DamageResponse) => unwrap<DamageResponse>(response),
            invalidatesTags: ['Inventory'],
        }),
    }),
});

export const {
    useGetProjectsQuery,
    useGetSummaryQuery,
    useGetInventoryItemsQuery,
    useGetUsageHistoryQuery,
    useGetDamageReportsQuery,
    useGetInventoryDetailsQuery,
    useCreateItemMutation,
    useUpdateItemMutation,
    useUpdateStockMutation,
    useDeleteItemMutation,
    useCreateDamageMutation,
    useUpdateDamageStatusMutation,
} = inventoryApi;
