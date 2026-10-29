/**
 * Application Route Paths
 * 
 * Centralized route configuration to avoid hardcoded paths throughout the app.
 * Makes route refactoring easier and provides autocomplete for route paths.
 */

export const ROUTES = {
    // Main
    HOME: '/',
    LOGIN: '/login',
    NOT_FOUND: '*',

    // Dashboard
    DASHBOARD: '/',

    // Admin Management
    ADMINS: '/admins',
    ADMIN_DETAIL: '/admins/:id',
    MANAGERS: '/managers',
    MANAGER_DETAIL: '/managers/:id',

    // Projects
    PROJECTS: '/projects',
    PROJECT_DETAIL: '/projects/:id',
    TASK_DETAIL: '/projects/:projectId/tasks/:taskId',
    SUBTASK_DETAIL: '/projects/:projectId/subtasks/:taskId',

    // Companies
    COMPANIES: '/companies',
    COMPANY_DETAIL: '/companies/:id',

    // Workforce
    WORKFORCE: '/workforce',
    WORKER_DETAIL: '/workforce/:id',

    // Time Tracking
    TIME_TRACKING: '/time-tracking',
    ATTENDANCE: '/time-tracking/attendance',
    TIME_ADJUSTMENTS: '/time-tracking/adjustments',

    // Geofencing
    GEOFENCING: '/geofencing',

    // Reports
    REPORTS: '/reports',

    // Quotes
    QUOTES: '/quotes',
    QUOTES_V2: '/quotes-v2',

    // Communication
    CHAT: '/chat',

    // Tenant & User Management
    USERS: '/users',
    TENANTS: '/tenants',
    TENANT_DETAIL: '/tenants/:id',
    SUBSCRIPTION_PLANS: '/subscription-plans',
    PUBLIC_PLANS: '/plans',

    // Settings
    SETTINGS: '/settings',
    NOTIFICATIONS: '/notifications',

    // Expenses
    EXPENSES: '/expenses',

    // Inventory
    INVENTORY: '/inventory',

    // Library
} as const;

/**
 * Helper function to build dynamic routes
 */
export const buildRoute = {
    adminDetail: (id: string) => `/admins/${id}`,
    projectDetail: (id: string) => `/projects/${id}`,
    companyDetail: (id: string) => `/companies/${id}`,
    workerDetail: (id: string) => `/workforce/${id}`,
    managerDetail: (id: string) => `/managers/${id}`,
    tenantDetail: (id: string) => `/tenants/${id}`,
    taskDetail: (projectId: string, taskId: string) => `/projects/${projectId}/tasks/${taskId}`,
    subtaskDetail: (projectId: string, taskId: string) => `/projects/${projectId}/subtasks/${taskId}`,
};

/**
 * Route metadata for navigation
 */
export interface RouteMetadata {
    path: string;
    title: string;
    description: string;
    requiresAuth?: boolean;
    requiredPermissions?: string[];
}

export const ROUTE_METADATA: Record<string, RouteMetadata> = {
    [ROUTES.DASHBOARD]: {
        path: ROUTES.DASHBOARD,
        title: 'Dashboard',
        description: 'Overview of all activities and metrics',
        requiresAuth: true,
    },
    [ROUTES.PROJECTS]: {
        path: ROUTES.PROJECTS,
        title: 'Projects',
        description: 'Manage construction projects',
        requiresAuth: true,
        requiredPermissions: ['projects.view'],
    },
    [ROUTES.COMPANIES]: {
        path: ROUTES.COMPANIES,
        title: 'Companies',
        description: 'Manage construction companies',
        requiresAuth: true,
        requiredPermissions: ['companies.view'],
    },
    [ROUTES.WORKFORCE]: {
        path: ROUTES.WORKFORCE,
        title: 'Workforce',
        description: 'Manage workers and assignments',
        requiresAuth: true,
        requiredPermissions: ['workforce.view'],
    },
    [ROUTES.QUOTES]: {
        path: ROUTES.QUOTES,
        title: 'Quotes',
        description: 'Manage quotation work categories and work items',
        requiresAuth: true,
        requiredPermissions: ['quotes.manage'],
    },
    // Add more as needed
};
