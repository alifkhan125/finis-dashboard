import { config } from '@/config/env';

const BASE = `${config.apiBaseUrl}/super-admin/subscriptions`;

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const response = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await response.json();
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || 'Request failed');
  }
  return data;
}

export type SubscriptionPlanApi = {
  id: string;
  name: string;
  visibility: 'public' | 'private';
  priceMonthly: number;
  priceYearly?: number | null;
  stripeProductId?: string | null;
  stripePriceMonthlyId?: string | null;
  stripePriceYearlyId?: string | null;
  maxCompanies?: number | null;
  maxProjects?: number | null;
  maxUsers?: number | null;
  hasGeofencing?: boolean;
  hasAdvancedReporting?: boolean;
  hasCustomReporting?: boolean;
  hasWhiteLabel?: boolean;
  supportLevel?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

export type TenantApi = {
  id: string;
  name: string;
  domain?: string | null;
  status: 'active' | 'suspended' | 'cancelled' | 'trial';
  billingEmail?: string | null;
  trialEndsAt?: string | null;
  plan?: {
    id: string;
    name: string;
    priceMonthly: number;
    priceYearly?: number | null;
    hasGeofencing?: boolean;
  };
  subscription?: {
    status: 'active' | 'past_due' | 'cancelled' | 'trial' | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    planInterval?: 'monthly' | 'yearly' | null;
    stripeSubscriptionId?: string | null;
    billedAmount?: number | null;
  };
  userCount?: number;
  companyCount?: number;
  createdAt?: string;
};

export type SubscriptionPurchaseApi = {
  tenant: {
    id: string;
    name: string;
    domain?: string | null;
    billingEmail?: string | null;
    status: 'active' | 'suspended' | 'cancelled' | 'trial';
  };
  adminUsers: Array<{
    id: string;
    fullName: string;
    email: string;
    status: string;
    createdAt: string;
  }>;
  plan: SubscriptionPlanApi;
  subscription: {
    subscriptionStatus: 'active' | 'pending' | 'past_due' | 'cancelled' | 'trial' | null;
    stripeSubscriptionId?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    planInterval?: 'monthly' | 'yearly' | null;
    billedAmount?: number | null;
    durationDays?: number;
  };
};

export async function getPlans(token?: string) {
  return request<{ data: { plans: SubscriptionPlanApi[] }; meta: { total: number } }>('/plans', {}, token);
}

export async function getPublicPlans() {
  const response = await fetch(`${config.apiBaseUrl}/public/plans`, {
    headers: {
      'Content-Type': 'application/json',
    },
  });

  const data = await response.json();
  if (!response.ok || data?.success === false) {
    throw new Error(data?.message || 'Request failed');
  }

  return data as { data: { plans: SubscriptionPlanApi[] }; meta: { total: number } };
}

export async function createPlan(body: Record<string, unknown>, token?: string) {
  return request('/plans', { method: 'POST', body: JSON.stringify(body) }, token);
}

export async function updatePlan(id: string, body: Record<string, unknown>, token?: string) {
  return request(`/plans/${id}`, { method: 'PUT', body: JSON.stringify(body) }, token);
}

export async function deletePlan(id: string, token?: string) {
  return request(`/plans/${id}`, { method: 'DELETE' }, token);
}

export async function getTenants(token?: string, params?: { page?: number; limit?: number; search?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  return request<{ data: TenantApi[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
    `/tenants${query.toString() ? `?${query}` : ''}`,
    {},
    token,
  );
}

export async function getTenantById(id: string, token?: string) {
  return request<{
    data: TenantApi & {
      subscription?: TenantApi['subscription'];
      usage?: {
        companies: { used: number; max: number | string | null };
        projects: { used: number; max: number | string | null };
        users: { used: number; max: number | string | null };
      };
      companies?: Array<{
        id: string;
        name: string;
        logoUrl?: string | null;
        isActive: boolean;
        _count?: { projects: number };
      }>;
      users?: Array<{
        id: string;
        fullName: string;
        email: string;
        phone?: string | null;
        avatarUrl?: string | null;
        status: string;
        createdAt: string;
      }>;
    };
  }>(`/tenants/${id}`, {}, token);
}

export async function getSubscriptionPurchases(token?: string, params?: { page?: number; limit?: number; search?: string }) {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.limit) query.set('limit', String(params.limit));
  if (params?.search) query.set('search', params.search);
  return request<{ data: SubscriptionPurchaseApi[]; meta: { total: number; page: number; limit: number; totalPages: number } }>(
    `/purchases${query.toString() ? `?${query}` : ''}`,
    {},
    token,
  );
}

export type AdminSubscriptionStatusApi = {
  tenantId: string | null;
  tenantName: string | null;
  plan: {
    id: string;
    name: string;
    priceMonthly: number;
    priceYearly?: number | null;
  } | null;
  subscriptionStatus: 'active' | 'pending' | 'past_due' | 'cancelled' | 'trial' | null;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  planInterval: 'monthly' | 'yearly' | null;
  isExpired: boolean;
};

export type TenantManagementOverviewApi = {
  cards: {
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
  };
  revenueByPlan: Array<{
    planId: string;
    planName: string;
    salesCount: number;
    revenue: number;
    monthlyCount: number;
    yearlyCount: number;
  }>;
  recentTenants?: Array<{
    id: string;
    name: string;
    status: string;
    planInterval?: string | null;
    subscriptionStatus?: string | null;
    currentPeriodStart?: string | null;
    currentPeriodEnd?: string | null;
    plan?: {
      id: string;
      name: string;
      priceMonthly: number;
      priceYearly?: number | null;
    } | null;
  }>;
  recentActiveUsers?: number;
  period?: {
    monthStart?: string;
    yearStart?: string;
  };
};

export type SubscriptionSalesTrendApi = {
  period: 'weekly' | 'monthly' | 'yearly';
  start: string;
  end: string;
  data: Array<{
    label: string;
    revenue: number;
    salesCount: number;
  }>;
  summary: {
    totalSales: number;
    totalRevenue: number;
  };
};

export async function getAdminSubscriptionStatus(token?: string) {
  return request<{ data: AdminSubscriptionStatusApi }>('/admin/subscription/status', {}, token);
}

export async function getMySubscription(token?: string) {
  return request<{ data: AdminSubscriptionStatusApi & { usage?: unknown } }>('/me', {}, token);
}

export async function getTenantManagementOverview(token?: string) {
  return request<{ data: TenantManagementOverviewApi }>('/tenant-management-overview', {}, token);
}

export async function getSubscriptionSalesTrend(token?: string, period: 'weekly' | 'monthly' | 'yearly' = 'weekly') {
  return request<{ data: SubscriptionSalesTrendApi }>(`/sales-trend?period=${period}`, {}, token);
}

export async function createTenant(body: Record<string, unknown>, token?: string) {
  return request('/tenants', { method: 'POST', body: JSON.stringify(body) }, token);
}

export async function updateTenantPlan(id: string, body: { planId: string }, token?: string) {
  return request(`/tenants/${id}/plan`, { method: 'PATCH', body: JSON.stringify(body) }, token);
}

export async function assignPlanToUser(id: string, body: { planId: string }, token?: string) {
  return request(`/../users/${id}/subscription`, { method: 'PATCH', body: JSON.stringify(body) }, token);
}

export async function updateTenantStatus(id: string, body: { status: string }, token?: string) {
  return request(`/tenants/${id}/status`, { method: 'PATCH', body: JSON.stringify(body) }, token);
}

export async function deleteTenant(id: string, token?: string) {
  return request(`/tenants/${id}`, { method: 'DELETE' }, token);
}
