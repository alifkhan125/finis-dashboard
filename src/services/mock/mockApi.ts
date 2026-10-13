/**
 * Mock API Service
 * 
 * Simulates real backend API respnonsense with mock data.
 * Backend developers can replace this with real API calls.
 * 
 * IMPORTANT: This service matches the interface that real API will use.
 * When switching to real backend, implement the same methods in realApi.ts
 */

import type { ApiResponse, PaginatedResponse, Project, Company, Worker, Admin, Manager, Attendance, TimeAdjustmentRequest, PayrollRecord, PayrollConfig, Expense, ChatConversation, Tenant, SubscriptionPlan, DashboardStatsResponse } from '@/shared/types';
import {
    mockProjects,
    mockCompanies,
    mockWorkers,
    mockAdmins,
    mockManagers,
    mockAttendance,
    mockTimeAdjustments,
    mockPayrollRecords,
    mockPayrollConfig,
    mockExpenses,
    mockConversations,
    mockTenants,
    mockSubscriptionPlans,
} from './mockData';

// Simulate network delay
const delay = (ms = 500) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Mock API Service Class
 * 
 * All methods return Promise<ApiResponse<T>> to match real API structure
 */
export class MockApiService {
    // ========================================
    // PROJECTS
    // ========================================

    static async getProjects(params?: { page?: number; limit?: number; search?: string }): Promise<PaginatedResponse<Project>> {
        await delay();

        let filtered = [...mockProjects];

        // 1. Server-side Search
        if (params?.search) {
            const query = params.search.toLowerCase();
            filtered = filtered.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.companyName.toLowerCase().includes(query) ||
                p.address.toLowerCase().includes(query)
            );
        }

        // 2. Server-side Pagination
        const page = params?.page || 1;
        const limit = params?.limit || 10;
        const total = filtered.length;
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedData = filtered.slice(start, end);

        return {
            data: paginatedData,
            status: 200,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit)
            }
        };
    }

    static async getProject(id: string): Promise<ApiResponse<Project>> {
        await delay(300);
        const project = mockProjects.find(p => p.id === id);

        if (!project) {
            throw {
                code: 'NOT_FOUND',
                message: 'Project not found',
                statusCode: 404,
            };
        }

        return {
            data: project,
            status: 200,
        };
    }

    static async createProject(data: Partial<Project>): Promise<ApiResponse<Project>> {
        await delay(800);

        const newProject: Project = {
            id: `proj-${Date.now()}`,
            name: data.name || '',
            companyId: data.companyId || '',
            companyName: data.companyName || '',
            type: (data.type as 'apartment_building' | 'house') || 'apartment_building',
            description: data.description || '',
            status: 'planning',
            startDate: data.startDate || new Date().toISOString(),
            endDate: data.endDate,
            budget: data.budget || 0,
            hasBudget: (data.budget || 0) > 0,
            address: data.address || '',
            floors: [],
            progress: 0,
            createdAt: new Date().toISOString(),
        };

        mockProjects.unshift(newProject);

        return {
            data: newProject,
            status: 201,
            message: 'Project created successfully',
        };
    }

    static async updateProject(id: string, data: Partial<Project>): Promise<ApiResponse<Project>> {
        await delay(600);

        const index = mockProjects.findIndex(p => p.id === id);
        if (index === -1) {
            throw {
                code: 'NOT_FOUND',
                message: 'Project not found',
                statusCode: 404,
            };
        }

        mockProjects[index] = { ...mockProjects[index], ...data };

        return {
            data: mockProjects[index],
            status: 200,
            message: 'Project updated successfully',
        };
    }

    static async deleteProject(id: string): Promise<ApiResponse<void>> {
        await delay(400);

        const index = mockProjects.findIndex(p => p.id === id);
        if (index === -1) {
            throw {
                code: 'NOT_FOUND',
                message: 'Project not found',
                statusCode: 404,
            };
        }

        mockProjects.splice(index, 1);

        return {
            data: undefined as never,
            status: 204,
            message: 'Project deleted successfully',
        };
    }

    // ========================================
    // COMPANIES
    // ========================================

    static async getCompanies(): Promise<ApiResponse<Company[]>> {
        await delay();
        return {
            data: mockCompanies,
            status: 200,
        };
    }

    static async getCompany(id: string): Promise<ApiResponse<Company>> {
        await delay(300);
        const company = mockCompanies.find(c => c.id === id);

        if (!company) {
            throw {
                code: 'NOT_FOUND',
                message: 'Company not found',
                statusCode: 404,
            };
        }

        return {
            data: company,
            status: 200,
        };
    }

    static async createCompany(data: Partial<Company>): Promise<ApiResponse<Company>> {
        await delay(800);

        const newCompany: Company = {
            id: `comp-${Date.now()}`,
            name: data.name || '',
            description: data.description || '',
            status: 'active',
            contact: data.contact || { name: '', email: '', phone: '' },
            address: data.address || '',
            projectCount: 0,
            createdAt: new Date().toISOString(),
        };

        mockCompanies.unshift(newCompany);

        return {
            data: newCompany,
            status: 201,
            message: 'Company created successfully',
        };
    }

    // ========================================
    // WORKFORCE
    // ========================================

    static async getWorkers(): Promise<ApiResponse<Worker[]>> {
        await delay();
        return {
            data: mockWorkers,
            status: 200,
        };
    }

    static async getWorker(id: string): Promise<ApiResponse<Worker>> {
        await delay(300);
        const worker = mockWorkers.find(w => w.id === id);

        if (!worker) {
            throw {
                code: 'NOT_FOUND',
                message: 'Worker not found',
                statusCode: 404,
            };
        }

        return {
            data: worker,
            status: 200,
        };
    }

    // ========================================
    // ADMINS & MANAGERS
    // ========================================

    static async getAdmins(): Promise<ApiResponse<Admin[]>> {
        await delay();
        return {
            data: mockAdmins,
            status: 200,
        };
    }

    static async getAdmin(id: string): Promise<ApiResponse<Admin>> {
        await delay(300);
        const admin = mockAdmins.find(a => a.id === id);

        if (!admin) {
            throw {
                code: 'NOT_FOUND',
                message: 'Admin not found',
                statusCode: 404,
            };
        }

        return {
            data: admin,
            status: 200,
        };
    }

    static async getManagers(): Promise<ApiResponse<Manager[]>> {
        await delay();
        return {
            data: mockManagers,
            status: 200,
        };
    }

    // ========================================
    // TIME TRACKING
    // ========================================

    static async getAttendance(): Promise<ApiResponse<Attendance[]>> {
        await delay();
        return {
            data: mockAttendance,
            status: 200,
        };
    }

    static async getTimeAdjustments(): Promise<ApiResponse<TimeAdjustmentRequest[]>> {
        await delay();
        return {
            data: mockTimeAdjustments,
            status: 200,
        };
    }

    static async approveTimeAdjustment(id: string): Promise<ApiResponse<TimeAdjustmentRequest>> {
        await delay(600);
        const adjustment = mockTimeAdjustments.find(a => a.id === id);

        if (!adjustment) {
            throw {
                code: 'NOT_FOUND',
                message: 'Time adjustment not found',
                statusCode: 404,
            };
        }

        adjustment.status = 'approved';
        adjustment.reviewedAt = new Date().toISOString();

        return {
            data: adjustment,
            status: 200,
            message: 'Time adjustment approved',
        };
    }

    static async rejectTimeAdjustment(id: string, _reason: string): Promise<ApiResponse<TimeAdjustmentRequest>> {
        await delay(600);
        const adjustment = mockTimeAdjustments.find(a => a.id === id);

        if (!adjustment) {
            throw {
                code: 'NOT_FOUND',
                message: 'Time adjustment not found',
                statusCode: 404,
            };
        }

        adjustment.status = 'denied';
        adjustment.reviewedAt = new Date().toISOString();

        return {
            data: adjustment,
            status: 200,
            message: 'Time adjustment rejected',
        };
    }

    // ========================================
    // PAYROLL
    // ========================================

    static async getPayrollRecords(): Promise<ApiResponse<PayrollRecord[]>> {
        await delay();
        return {
            data: mockPayrollRecords,
            status: 200,
        };
    }

    static async getPayrollConfig(): Promise<ApiResponse<PayrollConfig>> {
        await delay();
        return {
            data: mockPayrollConfig,
            status: 200,
        };
    }

    static async updatePayrollConfig(data: Partial<PayrollConfig>): Promise<ApiResponse<PayrollConfig>> {
        await delay(600);

        const updated = { ...mockPayrollConfig, ...data };

        return {
            data: updated,
            status: 200,
            message: 'Payroll configuration updated',
        };
    }

    // ========================================
    // EXPENSES
    // ========================================

    static async getExpenses(): Promise<ApiResponse<Expense[]>> {
        await delay();
        return {
            data: mockExpenses,
            status: 200,
        };
    }

    static async approveExpense(id: string): Promise<ApiResponse<Expense>> {
        await delay(600);
        const expense = mockExpenses.find(e => e.id === id);

        if (!expense) {
            throw {
                code: 'NOT_FOUND',
                message: 'Expense not found',
                statusCode: 404,
            };
        }

        expense.status = 'approved';
        expense.reviewedAt = new Date().toISOString();

        return {
            data: expense,
            status: 200,
            message: 'Expense approved',
        };
    }

    static async rejectExpense(id: string, reason: string): Promise<ApiResponse<Expense>> {
        await delay(600);
        const expense = mockExpenses.find(e => e.id === id);

        if (!expense) {
            throw {
                code: 'NOT_FOUND',
                message: 'Expense not found',
                statusCode: 404,
            };
        }

        expense.status = 'rejected';
        expense.rejectionReason = reason;
        expense.reviewedAt = new Date().toISOString();

        return {
            data: expense,
            status: 200,
            message: 'Expense rejected',
        };
    }

    // ========================================
    // CHAT
    // ========================================

    static async getConversations(): Promise<ApiResponse<ChatConversation[]>> {
        await delay();
        return {
            data: mockConversations,
            status: 200,
        };
    }

    // ========================================
    // TENANTS & SUBSCRIPTIONS
    // ========================================

    static async getTenants(): Promise<ApiResponse<Tenant[]>> {
        await delay();
        return {
            data: mockTenants,
            status: 200,
        };
    }

    static async getSubscriptionPlans(): Promise<ApiResponse<SubscriptionPlan[]>> {
        await delay();
        return {
            data: mockSubscriptionPlans,
            status: 200,
        };
    }

    // ========================================
    // DASHBOARD
    // ========================================

    static async getDashboardStats(filter: string): Promise<ApiResponse<DashboardStatsResponse>> {
        await delay(400);

        // Dynamic values based on filter (logic moved from DashboardPage)
        const normalizedFilter = filter === 'daily' ? 'today' : filter;
        const periodType = (normalizedFilter === 'today' || normalizedFilter === 'weekly' || normalizedFilter === 'monthly' || normalizedFilter === 'yearly' || normalizedFilter === 'custom')
            ? normalizedFilter
            : 'monthly';

        const now = new Date();
        const start = new Date(now);
        const end = new Date(now);

        if (periodType === 'weekly') {
            start.setDate(now.getDate() - 7);
        } else if (periodType === 'monthly') {
            start.setMonth(now.getMonth() - 1);
        } else if (periodType === 'yearly') {
            start.setFullYear(now.getFullYear() - 1);
        }

        const statsByFilter: Record<'today' | 'weekly' | 'monthly' | 'yearly', DashboardStatsResponse> = {
            today: {
                period: {
                    type: 'today',
                    start: start.toISOString(),
                    end: end.toISOString(),
                },
                stats: {
                    activeCompanies: { value: 12, change: 0.5 },
                    activeProjects: { value: 48, change: 1.2 },
                    totalWorkforce: { value: 324, change: -0.4 },
                    payrollCost: { value: 42000, change: 2.1 },
                },
                indicators: {
                    attendanceRate: { value: 99.1, presentCount: 321, totalCount: 324 },
                    geofenceAlerts: { value: 2, unresolvedCount: 2, totalCount: 2 },
                },
                projectCompletionForecast: {
                    overallCompletion: 67,
                    avgCompletion: 63,
                    bestMonth: { month: 5, value: 74 },
                    data: [],
                },
                taskIndicators: {
                    totalTasks: 118,
                    activeTasks: { value: 42, change: 3 },
                    pendingApprovals: { value: 8, change: -1 },
                    completed: { value: 68, change: 5 },
                    efficiency: 87,
                    teamSize: 19,
                    onTimePct: 96,
                    atRisk: 4,
                },
            },
            weekly: {
                period: {
                    type: 'weekly',
                    start: start.toISOString(),
                    end: end.toISOString(),
                },
                stats: {
                    activeCompanies: { value: 12, change: 2.1 },
                    activeProjects: { value: 48, change: 4.5 },
                    totalWorkforce: { value: 324, change: -1.2 },
                    payrollCost: { value: 280000, change: 3.8 },
                },
                indicators: {
                    attendanceRate: { value: 98.5, presentCount: 319, totalCount: 324 },
                    geofenceAlerts: { value: 8, unresolvedCount: 6, totalCount: 8 },
                },
                projectCompletionForecast: {
                    overallCompletion: 69,
                    avgCompletion: 64,
                    bestMonth: { month: 6, value: 76 },
                    data: [],
                },
                taskIndicators: {
                    totalTasks: 142,
                    activeTasks: { value: 55, change: 6 },
                    pendingApprovals: { value: 11, change: 2 },
                    completed: { value: 76, change: 8 },
                    efficiency: 89,
                    teamSize: 21,
                    onTimePct: 95,
                    atRisk: 6,
                },
            },
            monthly: {
                period: {
                    type: 'monthly',
                    start: start.toISOString(),
                    end: end.toISOString(),
                },
                stats: {
                    activeCompanies: { value: 12, change: 8.2 },
                    activeProjects: { value: 48, change: 12.5 },
                    totalWorkforce: { value: 324, change: -2.4 },
                    payrollCost: { value: 1200000, change: 5.1 },
                },
                indicators: {
                    attendanceRate: { value: 98.2, presentCount: 318, totalCount: 324 },
                    geofenceAlerts: { value: 12, unresolvedCount: 9, totalCount: 12 },
                },
                projectCompletionForecast: {
                    overallCompletion: 71,
                    avgCompletion: 66,
                    bestMonth: { month: 7, value: 79 },
                    data: [],
                },
                taskIndicators: {
                    totalTasks: 164,
                    activeTasks: { value: 61, change: 8 },
                    pendingApprovals: { value: 14, change: 3 },
                    completed: { value: 89, change: 11 },
                    efficiency: 90,
                    teamSize: 24,
                    onTimePct: 94,
                    atRisk: 7,
                },
            },
            yearly: {
                period: {
                    type: 'yearly',
                    start: start.toISOString(),
                    end: end.toISOString(),
                },
                stats: {
                    activeCompanies: { value: 142, change: 15.2 },
                    activeProjects: { value: 584, change: 18.5 },
                    totalWorkforce: { value: 1240, change: 12.4 },
                    payrollCost: { value: 14200000, change: 11.1 },
                },
                indicators: {
                    attendanceRate: { value: 96.8, presentCount: 1200, totalCount: 1240 },
                    geofenceAlerts: { value: 142, unresolvedCount: 38, totalCount: 142 },
                },
                projectCompletionForecast: {
                    overallCompletion: 78,
                    avgCompletion: 72,
                    bestMonth: { month: 11, value: 84 },
                    data: [],
                },
                taskIndicators: {
                    totalTasks: 620,
                    activeTasks: { value: 144, change: 18 },
                    pendingApprovals: { value: 24, change: 6 },
                    completed: { value: 452, change: 34 },
                    efficiency: 92,
                    teamSize: 76,
                    onTimePct: 93,
                    atRisk: 19,
                },
            },
        };

        const stats = statsByFilter[periodType === 'custom' ? 'monthly' : periodType];

        return {
            data: stats,
            status: 200,
        };
    }
}
