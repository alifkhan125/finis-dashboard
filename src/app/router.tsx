import { SharedCompanyPage } from '@/pages/public/SharedCompanyPage';
import { SharedProjectPage } from '@/pages/public/SharedProjectPage';
import { lazy, Suspense } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ROUTES } from '@/config/routes';
import { DashboardLayout } from '@/shared/components/layout/DashboardLayout';
import { NotFoundPage } from '@/features/dashboard/pages/NotFoundPage';
import { useAppSelector } from '@/store/hooks';
import { selectAuthToken } from '@/store/authSlice';

const DashboardPage = lazy(() => import('@/features/dashboard/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const ProjectsPage = lazy(() => import('@/features/projects/pages/ProjectsPage').then((m) => ({ default: m.ProjectsPage })));
const ProjectDetailPage = lazy(() => import('@/features/projects/pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })));
const TaskDetailPage = lazy(() => import('@/features/projects/pages/TaskDetailPage').then((m) => ({ default: m.TaskDetailPage })));
const CompaniesPage = lazy(() => import('@/features/companies/pages/CompaniesPage').then((m) => ({ default: m.CompaniesPage })));
const CompanyDetailPage = lazy(() => import('@/features/companies/pages/CompanyDetailPage').then((m) => ({ default: m.CompanyDetailPage })));
const WorkforcePage = lazy(() => import('@/features/workforce/pages/WorkforcePage').then((m) => ({ default: m.WorkforcePage })));
const WorkerDetailPage = lazy(() => import('@/features/workforce/pages/WorkerDetailPage').then((m) => ({ default: m.WorkerDetailPage })));
const TimeTrackingPage = lazy(() => import('@/features/time-tracking/pages/TimeTrackingPage').then((m) => ({ default: m.TimeTrackingPage })));
const AttendancePage = lazy(() => import('@/features/time-tracking/pages/AttendancePage').then((m) => ({ default: m.AttendancePage })));
const TimeAdjustmentRequestsPage = lazy(() => import('@/features/time-tracking/pages/TimeAdjustmentRequestsPage').then((m) => ({ default: m.TimeAdjustmentRequestsPage })));
const GeofencingPage = lazy(() => import('@/features/geofencing/pages/GeofencingPage').then((m) => ({ default: m.GeofencingPage })));
const ReportsPage = lazy(() => import('@/features/reports/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })));
const QuoteLibraryV2Page = lazy(() => import('@/features/quotes/pages/QuoteLibraryV2Page').then((m) => ({ default: m.QuoteLibraryV2Page })));
const ChatPage = lazy(() => import('@/features/chat/pages/ChatPage').then((m) => ({ default: m.ChatPage })));
const InventoryPage = lazy(() => import('@/features/inventory/pages/InventoryPage').then((m) => ({ default: m.InventoryPage })));
const AdminsPage = lazy(() => import('@/features/admin-management/pages/AdminsPage').then((m) => ({ default: m.AdminsPage })));
const AdminDetailPage = lazy(() => import('@/features/admin-management/pages/AdminDetailPage').then((m) => ({ default: m.AdminDetailPage })));
const ManagersPage = lazy(() => import('@/features/admin-management/pages/ManagersPage').then((m) => ({ default: m.ManagersPage })));
const ManagerDetailPage = lazy(() => import('@/features/admin-management/pages/ManagerDetailPage').then((m) => ({ default: m.ManagerDetailPage })));
const UsersPage = lazy(() => import('@/features/tenant-management/pages/UsersPage').then((m) => ({ default: m.UsersPage })));
const TenantsPage = lazy(() => import('@/features/tenant-management/pages/TenantsPage').then((m) => ({ default: m.TenantsPage })));
const TenantDetailPage = lazy(() => import('@/features/tenant-management/pages/TenantDetailPage').then((m) => ({ default: m.TenantDetailPage })));
const SubscriptionPlansPage = lazy(() => import('@/features/tenant-management/pages/SubscriptionPlansPage').then((m) => ({ default: m.SubscriptionPlansPage })));
const PublicSubscriptionPlansPage = lazy(() => import('@/features/tenant-management/pages/PublicSubscriptionPlansPage').then((m) => ({ default: m.PublicSubscriptionPlansPage })));
const SubscriptionSuccessPage = lazy(() => import('@/features/tenant-management/pages/SubscriptionSuccessPage').then((m) => ({ default: m.SubscriptionSuccessPage })));
const SubscriptionCancelPage = lazy(() => import('@/features/tenant-management/pages/SubscriptionCancelPage').then((m) => ({ default: m.SubscriptionCancelPage })));
const SettingsPage = lazy(() => import('@/features/dashboard/pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const PayrollPage = lazy(() => import('@/features/payroll/pages/PayrollPage').then((m) => ({ default: m.PayrollPage })));
const PublicContentEditorPage = lazy(() => import('@/features/public-content/pages/PublicContentEditorPage').then((m) => ({ default: m.PublicContentEditorPage })));
const NotificationsPage = lazy(() => import('@/features/dashboard/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })));
const LoginPage = lazy(() => import('@/features/auth/pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const ExpensesPage = lazy(() => import('@/features/expenses/pages/ExpensesPage').then((m) => ({ default: m.ExpensesPage })));

function LoadingFallback() {
    return (
        <div className="flex min-h-[60vh] items-center justify-center rounded-3xl border border-dashed border-gray-200 bg-white/70">
            <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
                <p className="mt-4 text-gray-600">Loading...</p>
            </div>
        </div>
    );
}

function ProtectedLayout() {
    const token = useAppSelector(selectAuthToken);
    const isAuthenticated = Boolean(token);

    if (!isAuthenticated) {
        return <Navigate to={ROUTES.LOGIN} replace />;
    }

    return (
        <DashboardLayout>
            <Suspense fallback={<LoadingFallback />}>
                <Outlet />
            </Suspense>
        </DashboardLayout>
    );
}

export function AppRouter() {
    const token = useAppSelector(selectAuthToken);
    const isAuthenticated = Boolean(token);

    return (
        <Suspense fallback={<LoadingFallback />}>
            <Routes>
                                <Route path="/public/company/:token" element={<SharedCompanyPage />} />
                <Route path="/public/project/:token" element={<SharedProjectPage />} />
                <Route path={ROUTES.PUBLIC_PLANS} element={<PublicSubscriptionPlansPage />} />
                <Route path="/subscription/success" element={<SubscriptionSuccessPage />} />
                <Route path="/subscription/cancel" element={<SubscriptionCancelPage />} />
                <Route path={ROUTES.LOGIN} element={isAuthenticated ? <Navigate to={ROUTES.DASHBOARD} replace /> : <LoginPage />} />

                <Route element={<ProtectedLayout />}>
                    <Route index element={<DashboardPage />} />
                    <Route path="/global-dashboard" element={<DashboardPage />} />
                    <Route path={ROUTES.ADMINS} element={<AdminsPage />} />
                    <Route path={ROUTES.ADMIN_DETAIL} element={<AdminDetailPage />} />
                    <Route path={ROUTES.MANAGERS} element={<ManagersPage />} />
                    <Route path={ROUTES.MANAGER_DETAIL} element={<ManagerDetailPage />} />
                    <Route path={ROUTES.PROJECTS} element={<ProjectsPage />} />
                    <Route path={ROUTES.PROJECT_DETAIL} element={<ProjectDetailPage />} />
                    <Route path={ROUTES.TASK_DETAIL} element={<TaskDetailPage />} />
                    <Route path={ROUTES.SUBTASK_DETAIL} element={<TaskDetailPage />} />
                    <Route path={ROUTES.COMPANIES} element={<CompaniesPage />} />
                    <Route path={ROUTES.COMPANY_DETAIL} element={<CompanyDetailPage />} />
                    <Route path={ROUTES.WORKFORCE} element={<WorkforcePage />} />
                    <Route path={ROUTES.WORKER_DETAIL} element={<WorkerDetailPage />} />
                    <Route path={ROUTES.TIME_TRACKING} element={<TimeTrackingPage />} />
                    <Route path={ROUTES.ATTENDANCE} element={<AttendancePage />} />
                    <Route path={ROUTES.TIME_ADJUSTMENTS} element={<TimeAdjustmentRequestsPage />} />
                    <Route path={ROUTES.GEOFENCING} element={<GeofencingPage />} />
                    <Route path={ROUTES.REPORTS} element={<ReportsPage />} />
                    <Route path={ROUTES.EXPENSES} element={<ExpensesPage />} />
                    <Route path={ROUTES.QUOTES} element={<Navigate to={ROUTES.QUOTES_V2} replace />} />
                    <Route path={ROUTES.QUOTES_V2} element={<QuoteLibraryV2Page />} />
                    <Route path={ROUTES.CHAT} element={<ChatPage />} />
                    <Route path={ROUTES.INVENTORY} element={<InventoryPage />} />
                    <Route path={ROUTES.USERS} element={<UsersPage />} />
                    <Route path={ROUTES.TENANTS} element={<TenantsPage />} />
                    <Route path={ROUTES.TENANT_DETAIL} element={<TenantDetailPage />} />
                    <Route path={ROUTES.SUBSCRIPTION_PLANS} element={<SubscriptionPlansPage />} />
                    <Route path={ROUTES.SETTINGS} element={<SettingsPage />} />
                            <Route path="/payroll" element={<PayrollPage />} />
                    <Route path="/settings/content/:slug" element={<PublicContentEditorPage />} />
                    <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
                </Route>

                <Route path={ROUTES.NOT_FOUND} element={<NotFoundPage />} />
            </Routes>
        </Suspense>
    );
}
