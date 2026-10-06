/**
 * API Endpoints
 *
 * Centralized definition of all API endpoints.
 * Makes it easy to update endpoints without touching service code.
 */

export const API_ENDPOINTS = {
    // AUTH
    AUTH: {
        LOGIN: '/auth/login',
        LOGOUT: '/auth/logout',
        REFRESH: '/auth/refresh',
        ME: '/auth/me',
    },

    // PROJECTS (Admin)
        PROJECTS: {
        LIST: '/admin/projects',
        DETAIL: (id: string) => `/admin/projects/${id}`,
        CREATE: '/admin/projects',
        UPDATE: (id: string) => `/admin/projects/${id}`,
        DELETE: (id: string) => `/admin/projects/${id}`,
        PROFILE: (id: string) => `/admin/projects/${id}/profile`,
        FLOOR_PLAN: (id: string) => `/admin/projects/${id}/floor-plan`,
        ANALYSIS: (id: string) => `/admin/projects/${id}/analysis`,
        APPROVALS: (id: string) => `/admin/projects/${id}/approvals`,
        DOCUMENTS: (id: string) => `/admin/projects/${id}/documents`,
        DOCUMENT_DELETE: (projectId: string, documentId: string) => `/admin/projects/${projectId}/documents/${documentId}`,

        // Floors
        FLOORS: (projectId: string) => `/admin/projects/${projectId}/floors`,
        FLOOR_DETAIL: (projectId: string, floorId: string) => `/admin/projects/${projectId}/floors/${floorId}`,

        // Units
        ROOMS: (projectId: string, floorId: string) => `/admin/projects/${projectId}/floors/${floorId}/units`,
        ROOM_DETAIL: (projectId: string, roomId: string) => `/admin/projects/${projectId}/units/${roomId}`,

        // Team
        TEAM_MANAGERS: (projectId: string) => `/admin/projects/${projectId}/team/managers`,
        TEAM_WORKERS: (projectId: string) => `/admin/projects/${projectId}/team/workers`,
        TEAM_REMOVE: (projectId: string, userId: string) => `/admin/projects/${projectId}/team/${userId}`,

        // Geofences
        GEOFENCES: (projectId: string) => `/admin/projects/${projectId}/geofences`,
    },

    // COMPANIES (Admin)
    COMPANIES: {
        LIST: '/admin/companies',
        DETAIL: (id: string) => `/admin/companies/${id}`,
        CREATE: '/admin/companies',
        UPDATE: (id: string) => `/admin/companies/${id}`,
        DELETE: (id: string) => `/admin/companies/${id}`,
        CONTACTS: (id: string) => `/admin/companies/${id}/contacts`,
        DOCUMENTS: (id: string) => `/admin/companies/${id}/documents`,
        DOCUMENT_DELETE: (companyId: string, documentId: string) => `/admin/companies/${companyId}/documents/${documentId}`,
        PROJECTS: (id: string) => `/admin/companies/${id}/projects`,
        PERFORMANCE: (id: string) => `/admin/companies/${id}/performance`,
    },

    // WORKFORCE
    WORKFORCE: {
        LIST: '/workers',
        DETAIL: (id: string) => `/workers/${id}`,
        CREATE: '/workers',
        UPDATE: (id: string) => `/workers/${id}`,
        DELETE: (id: string) => `/workers/${id}`,
        SCHEDULE: (id: string) => `/workers/${id}/schedule`,
        DOCUMENTS: (id: string) => `/workers/${id}/documents`,
    },

    // TASKS
    TASKS: {
        LIST: '/admin/tasks',
        DETAIL: (id: string) => `/admin/tasks/${id}`,
        CREATE: '/admin/tasks',
        UPDATE: (id: string) => `/admin/tasks/${id}`,
        DELETE: (id: string) => `/admin/tasks/${id}`,
        ASSIGN: (id: string) => `/admin/tasks/${id}/assign`,
        AVAILABLE_WORKERS: (id: string) => `/admin/tasks/${id}/available-workers`,
        STATUS: (id: string) => `/admin/tasks/${id}/status`,
        SUBTASKS: (id: string) => `/admin/tasks/${id}/subtasks`,
        SUBTASK_DETAIL: (id: string) => `/admin/subtasks/${id}`,
        SUBTASK_DELETE: (id: string) => `/admin/subtasks/${id}`,
        SUBTASK_APPROVE: (id: string) => `/admin/subtasks/${id}/approval`,
        SUBTASK_REPORT_REVIEW: (id: string) => `/admin/subtasks/${id}/report-review`,
        REVIEW_REPORT: (taskId: string, reportId: string) => `/admin/tasks/${taskId}/reports/${reportId}/review`,
        REVIEW_APPROVAL: (taskId: string) => `/admin/tasks/${taskId}/approval`,
        REVIEW_COMPLETION: (taskId: string) => `/admin/tasks/${taskId}/completion-review`,
    },

    // ADMINS & MANAGERS
    ADMINS: {
        LIST: '/admins',
        DETAIL: (id: string) => `/admins/${id}`,
        CREATE: '/admins',
        UPDATE: (id: string) => `/admins/${id}`,
        DELETE: (id: string) => `/admins/${id}`,
        INVITE: '/admins/invite',
    },

    MANAGERS: {
        LIST: '/managers',
        DETAIL: (id: string) => `/managers/${id}`,
        CREATE: '/managers',
        UPDATE: (id: string) => `/managers/${id}`,
        DELETE: (id: string) => `/managers/${id}`,
    },

    // TEAM
    TEAM: {
        AVAILABLE_MANAGERS: '/admin/team/available-managers',
        AVAILABLE_WORKERS: '/admin/team/available-workers',
    },

    // TIME TRACKING
    TIME_TRACKING: {
        ATTENDANCE: '/time-tracking/attendance',
        ADJUSTMENTS: '/time-adjustments/pending',
        PENDING_ADJUSTMENTS: '/time-adjustments/pending',
        UPDATE_ADJUSTMENT_STATUS: (id: string) => `/time-adjustments/${id}/status`,
        APPROVE_ADJUSTMENT: (id: string) => `/time-adjustments/${id}/status`,
        REJECT_ADJUSTMENT: (id: string) => `/time-adjustments/${id}/status`,
        SCHEDULES: '/time-tracking/schedules',
    },

    // PAYROLL
    PAYROLL: {
        RECORDS: '/payroll/records',
        CALCULATE: '/payroll/calculate',
        APPROVE: (id: string) => `/payroll/records/${id}/approve`,
        CONFIG: '/payroll/config',
        UPDATE_CONFIG: '/payroll/config',
    },

    // EXPENSES
    EXPENSES: {
        LIST: '/admin/reimbursement-expenses',
        SUMMARY: '/admin/reimbursement-expenses/summary',
        OPTIONS: '/admin/reimbursement-expenses/options',
        PROJECTS: '/admin/reimbursement-expenses/projects',
        DETAIL: (id: string) => `/admin/reimbursement-expenses/${id}`,
        CREATE: '/admin/reimbursement-expenses',
        UPDATE: (id: string) => `/admin/reimbursement-expenses/${id}`,
        DELETE: (id: string) => `/admin/reimbursement-expenses/${id}`,
        APPROVE: (id: string) => `/admin/reimbursement-expenses/${id}/approve`,
        REJECT: (id: string) => `/admin/reimbursement-expenses/${id}/reject`,
        REQUEST_REVISION: (id: string) => `/admin/reimbursement-expenses/${id}/request-revision`,
        SUBMIT: (id: string) => `/admin/reimbursement-expenses/${id}/submit`,
        MARK_PAID: (id: string) => `/admin/reimbursement-expenses/${id}/mark-paid`,
    },

    // GEOFENCING
    GEOFENCING: {
        LIST: '/geofencing',
        CREATE: '/geofencing',
        UPDATE: (id: string) => `/geofencing/${id}`,
        DELETE: (id: string) => `/geofencing/${id}`,
        TOGGLE: (id: string) => `/geofencing/${id}/toggle`,
    },

    // CHAT
    CHAT: {
        CONVERSATIONS: '/chat/conversations',
        MESSAGES: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
        SEND: (conversationId: string) => `/chat/conversations/${conversationId}/messages`,
        MARK_READ: (conversationId: string) => `/chat/conversations/${conversationId}/read`,
    },

    // REPORTS
    REPORTS: {
        GENERATE: '/reports/generate',
        LIST: '/reports',
        DETAIL: (id: string) => `/reports/${id}`,
        DOWNLOAD: (id: string) => `/reports/${id}/download`,
        ADMIN: {
            GENERATE: '/admin/reports/generate',
            EXPORT: '/admin/reports/export',
        },
        SUPER_ADMIN: {
            GENERATE: '/super_admin/reports/generate',
            EXPORT: '/super_admin/reports/export',
        },
    },

    // QUOTES
    QUOTES: {
        SELECTORS: '/manager/quotes/selectors',
        LIST: '/manager/quotes',
        DETAIL: (id: string) => `/manager/quotes/${id}`,
        MEASUREMENT_TYPES: '/manager/quotes/measurement-types',
        MEASUREMENT_TYPE: (id: string) => `/manager/quotes/measurement-types/${id}`,
        WORK_CATEGORIES: '/manager/quotes/work-categories',
        WORK_CATEGORY: (id: string) => `/manager/quotes/work-categories/${id}`,
        WORK_ITEMS: '/manager/quotes/work-items',
        WORK_ITEM: (id: string) => `/manager/quotes/work-items/${id}`,
    },

    // TENANTS
    TENANTS: {
        LIST: '/tenants',
        DETAIL: (id: string) => `/tenants/${id}`,
        CREATE: '/tenants',
        UPDATE: (id: string) => `/tenants/${id}`,
        SUSPEND: (id: string) => `/tenants/${id}/suspend`,
        ACTIVATE: (id: string) => `/tenants/${id}/activate`,
        BRANDING: (id: string) => `/tenants/${id}/branding`,
    },

    // SUBSCRIPTION PLANS
    SUBSCRIPTIONS: {
        LIST: '/subscriptions/plans',
        DETAIL: (id: string) => `/subscriptions/plans/${id}`,
        CREATE: '/subscriptions/plans',
        UPDATE: (id: string) => `/subscriptions/plans/${id}`,
    },

    // SUPER ADMIN
    SUPER_ADMIN: {
        DASHBOARD: '/super-admin/dashboard',
        DASHBOARD_RECENT_ACTIVITY: '/super-admin/dashboard/recent-activity',
        DASHBOARD_WORKFORCE_STATUS: '/super-admin/dashboard/workforce-status',
        DASHBOARD_ATTENDANCE_SUMMARY: '/super-admin/dashboard/attendance-summary',
        DASHBOARD_ATTENDANCE_RECORDS: '/super-admin/dashboard/attendance-records',
        PROJECTS: {
            LIST: '/super-admin/projects',
            DETAIL: (id: string) => `/super-admin/projects/${id}`,
            PROFILE: (id: string) => `/super-admin/projects/${id}/profile`,
            FLOOR_PLAN: (id: string) => `/super-admin/projects/${id}/floor-plan`,
            ANALYSIS: (id: string) => `/super-admin/projects/${id}/analysis`,
            APPROVALS: (id: string) => `/super-admin/projects/${id}/approvals`,
            DOCUMENTS: (id: string) => `/super-admin/projects/${id}/documents`,
            DOCUMENT_DELETE: (projectId: string, documentId: string) => `/super-admin/projects/${projectId}/documents/${documentId}`,
        },
        COMPANIES: {
            LIST: '/super-admin/companies',
            DETAIL: (id: string) => `/super-admin/companies/${id}`,
            CREATE: '/super-admin/companies',
            UPDATE: (id: string) => `/super-admin/companies/${id}`,
            DELETE: (id: string) => `/super-admin/companies/${id}`,
            CONTACT: (id: string) => `/super-admin/companies/${id}/contact`,
            STATS: '/super-admin/companies/stats',
            PROJECTS: (id: string) => `/super-admin/companies/${id}/projects`,
            PERFORMANCE: (id: string) => `/super-admin/companies/${id}/performance`,
            DOCUMENTS: (id: string) => `/super-admin/companies/${id}/documents`,
            DOCUMENT_DELETE: (companyId: string, documentId: string) => `/super-admin/companies/${companyId}/documents/${documentId}`,
        },
        USERS: {
            LIST: '/super-admin/users',
        },
    },


} as const;
