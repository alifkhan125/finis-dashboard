import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, Briefcase, ExternalLink, Mail, Phone, Clock } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Card } from '@/shared/components/ui/Card';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import {
  WorkerStats,
  WorkerFilters,
  WorkerTable,
  AddWorkerModal
} from '../components';
import { Badge } from '@/shared/components/ui/Badge';
import { SEO } from '@/shared/components/seo/SEO';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';
import { DateRangeFilter } from '@/features/dashboard/components/DateRangeFilter';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/authSlice';
import { useGetCompaniesQuery, useLazyGetCompanyProjectsQuery } from '@/store/companiesApi';
import { useGetAdminProjectsQuery, useGetProjectManagersQuery, useGetProjectWorkersQuery, ProjectTeamMember } from '@/store/projectApi';
import {
  useGetPendingInvitationsQuery,
  useResendInvitationMutation,
  useCancelInvitationMutation,
  PendingInvitation,
} from '@/store/teamManagementApi';
import { setManagers, setSelectedProjectId, setWorkers } from '../store/workforceSlice';
import { startWorkforceSocket, stopWorkforceSocket } from '../services/socket';
import { store } from '@/store/store';

const EMPTY_ARRAY: never[] = [];

export function WorkforcePage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('yearly');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const { data: pendingInvitations = [], isLoading: invitationsLoading } =
    useGetPendingInvitationsQuery({ role: 'worker' });
  const [resendInvitation, { isLoading: resending }] = useResendInvitationMutation();
  const [cancelInvitation, { isLoading: cancelling }] = useCancelInvitationMutation();

  const handleResend = async (id: string) => {
    try {
      await resendInvitation(id).unwrap();
    } catch (err) {
      console.error('Resend failed:', err);
    }
  };

  const handleCancel = async (id: string) => {
    try {
      await cancelInvitation(id).unwrap();
    } catch (err) {
      console.error('Cancel failed:', err);
    }
  };
  const selectedProjectId = useAppSelector((state) => state.workforce.selectedProjectId);
  const authUser = useAppSelector(selectAuthUser);
  const managers = useAppSelector((state) => state.workforce.managers);
  const workers = useAppSelector((state) => state.workforce.workers);
  const liveWorkers = useAppSelector((state) => state.workforce.liveWorkers);
  const isSuperAdmin = authUser?.role === 'super_admin';
  const { data: adminProjectsData } = useGetAdminProjectsQuery(undefined, { skip: isSuperAdmin });
  const { data: companiesData } = useGetCompaniesQuery(undefined, { skip: !isSuperAdmin });
  const [triggerCompanyProjects] = useLazyGetCompanyProjectsQuery();
  const [superAdminProjects, setSuperAdminProjects] = useState<any[]>([]);
  const [superAdminProjectsLoading, setSuperAdminProjectsLoading] = useState(false);
  const { data: apiManagersData } = useGetProjectManagersQuery(selectedProjectId ?? '', { skip: !selectedProjectId });
  const { data: apiWorkersData } = useGetProjectWorkersQuery(selectedProjectId ?? '', { skip: !selectedProjectId });

  const adminProjects = adminProjectsData ?? EMPTY_ARRAY;
  const companies = companiesData ?? EMPTY_ARRAY;
  const apiManagers = apiManagersData ?? EMPTY_ARRAY;
  const apiWorkers = apiWorkersData ?? EMPTY_ARRAY;

  useEffect(() => {
    if (!isSuperAdmin) {
      setSuperAdminProjects([]);
      setSuperAdminProjectsLoading(false);
      return;
    }

    let cancelled = false;
    const loadAllProjects = async () => {
      setSuperAdminProjectsLoading(true);
      try {
        const responses = await Promise.all(
          companies.map(async (company: any) => {
            const result = await triggerCompanyProjects(company.id).unwrap();
            return Array.isArray(result) ? result : [];
          }),
        );
        if (!cancelled) setSuperAdminProjects(responses.flat());
      } catch {
        if (!cancelled) setSuperAdminProjects([]);
      } finally {
        if (!cancelled) setSuperAdminProjectsLoading(false);
      }
    };

    if (companies.length > 0) void loadAllProjects();
    else setSuperAdminProjects([]);

    return () => {
      cancelled = true;
    };
  }, [companies, isSuperAdmin, triggerCompanyProjects]);

  const projects = (isSuperAdmin ? superAdminProjects : adminProjects) ?? EMPTY_ARRAY;

  useEffect(() => {
    if (!projects.length) return;
    const savedProjectId = localStorage.getItem('workforce_selected_project_id');
    const nextProjectId = savedProjectId && projects.some((project: any) => project.id === savedProjectId)
      ? savedProjectId
      : projects[0]?.id ?? null;
    if (nextProjectId && nextProjectId !== selectedProjectId) {
      dispatch(setSelectedProjectId(nextProjectId));
      localStorage.setItem('workforce_selected_project_id', nextProjectId);
    }
  }, [projects, selectedProjectId, dispatch, superAdminProjectsLoading]);

  useEffect(() => {
    if (!selectedProjectId) return;
    if (!apiManagersData && !apiWorkersData) return;
    dispatch(setManagers(apiManagers));
    dispatch(setWorkers(apiWorkers));
  }, [apiManagers, apiWorkers, apiManagersData, apiWorkersData, selectedProjectId, dispatch]);

  useEffect(() => {
    if (!selectedProjectId) return;
    startWorkforceSocket(store, selectedProjectId);
    return () => {
      stopWorkforceSocket();
    };
  }, [selectedProjectId]);

  const combinedWorkers = useMemo(() => {
    const currentProject = projects.find((p: any) => p.id === selectedProjectId);
    const projectName = currentProject?.name;

    const pendingWorkerItems: any[] = pendingInvitations.map((inv: PendingInvitation) => ({
      memberId: inv.id,
      id: inv.id,
      fullName: inv.email ? inv.email.split('@')[0] : (inv.phone || 'Invited Worker'),
      email: inv.email || '',
      phone: inv.phone || null,
      avatarUrl: null,
      role: 'worker',
      status: 'pending',
      department: null,
      managerId: null,
      projectName,
    }));

    const existingEmails = new Set(workers.map((w: ProjectTeamMember) => (w.email || '').toLowerCase()));
    const newPending = pendingWorkerItems.filter((p) => !p.email || !existingEmails.has(p.email.toLowerCase()));

    const workersWithProject = workers.map(w => ({ ...w, projectName }));

    return [...workersWithProject, ...newPending];
  }, [workers, pendingInvitations, projects, selectedProjectId]);

  const filteredWorkers = useMemo(() => {
    return combinedWorkers.filter(worker => {
      const workerName = worker.fullName || '';
      const workerEmail = worker.email || '';
      const workerRole = worker.role || '';
      const workerStatus = worker.status || 'active';
      const matchesSearch =
        workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workerEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
        workerRole.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole = roleFilter === 'all' || workerRole.toLowerCase() === roleFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || workerStatus.toLowerCase() === statusFilter.toLowerCase();
      const matchesProject = true;

      const matchesTime = true;

      return matchesSearch && matchesRole && matchesStatus && matchesProject && matchesTime;
    });
  }, [combinedWorkers, searchQuery, roleFilter, statusFilter, projectFilter, timeFilter, customDateRange]);

  const liveInsideWorkers = Object.values(liveWorkers).filter((worker) => worker.isInsideZone);
  const livePausedWorkers = Object.values(liveWorkers).filter((worker) => !worker.isInsideZone && worker.status !== 'offline');

  const handleClearFilters = () => {
    setSearchQuery('');
    setRoleFilter('all');
    setStatusFilter('all');
    setProjectFilter('all');
  };

  return (
    <div className="space-y-8 pb-8">
      <SEO title="Workers Management" description="Monitor and manage your construction team, roles, and project assignments." />
      {/* Header */}
      <PageHeader
        title="Workers"
        description="Manage your team of professionals, their roles and assignments"
        icon={Users}
      >
        <DateRangeFilter
          onFilterChange={setTimeFilter}
          onCustomDateChange={(start, end) => setCustomDateRange({ start, end })}
        />
        <Button
          onClick={() => setIsAddModalOpen(true)}
          className="gap-2 h-10 px-4 bg-[#1D4F6D] hover:bg-[#163a50] text-white shadow-lg transition-all hover:scale-[1.02] font-bold rounded-xl"
        >
          <Plus className="h-5 w-5" />
          Invite Worker
        </Button>
      </PageHeader>

      {/* Stats */}
      <WorkerStats
        total={workers.length + pendingInvitations.length}
        activeToday={liveInsideWorkers.length}
        onLeave={Math.max(workers.length - Object.values(liveWorkers).length, 0)}
        avgAttendance={workers.length ? `${Math.round((liveInsideWorkers.length / workers.length) * 100)}%` : '0%'}
      />

      {/* Pending Invitations */}
      {!invitationsLoading && pendingInvitations.length > 0 && (
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">Pending Worker Invitations</h3>
            </div>
            <Badge variant="secondary" className="font-bold">
              {pendingInvitations.length} Pending
            </Badge>
          </div>
          <div className="space-y-3">
            {pendingInvitations.map((invitation: PendingInvitation) => (
              <div
                key={invitation.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  {invitation.email ? (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{invitation.email}</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{invitation.phone}</span>
                    </div>
                  )}
                  <Badge variant="secondary">{invitation.role}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={resending}
                    onClick={() => handleResend(invitation.id)}
                  >
                    Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={cancelling}
                    onClick={() => handleCancel(invitation.id)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filters */}
      <WorkerFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        roleFilter={roleFilter}
        onRoleChange={setRoleFilter}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        projectFilter={projectFilter}
        onProjectChange={setProjectFilter}
        projectOptions={projects.map((project: any) => ({ label: project.name, value: project.id }))}
        onClear={handleClearFilters}
      />

      {/* Results Header */}
      <div className="flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-bold text-gray-900">Team Hierarchy</h2>
          <Badge variant="secondary" className="font-bold">
            {managers.length} Managers
          </Badge>
        </div>
      </div>

      {/* Grouped Content */}
      <div className="space-y-6">
        {(managers.length ? managers : apiManagers).map(manager => {
          const managerWorkers = filteredWorkers
            .filter((worker: any) => worker.managerId === manager.id)
            .map((worker: any) => ({
              ...worker,
              ...liveWorkers[worker.id],
            }));
          return (
            <Card key={manager.id} className="overflow-hidden border-gray-100 shadow-sm group hover:border-blue-200 transition-all duration-300">
              <div
                className="bg-gray-50/50 px-6 py-4 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-white transition-colors"
                onClick={() => navigate(`/managers/${manager.id}`)}
              >
                <div className="flex items-center gap-4">
                  <Avatar className="h-10 w-10 border-2 border-white shadow-sm group-hover:shadow-md transition-all">
                    <AvatarImage src={manager.avatarUrl ?? undefined} />
                    <AvatarFallback className="bg-purple-100 text-purple-600 font-bold">
                      {(manager.fullName || 'M').charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-bold text-gray-900 group-hover:text-[#1D4F6D] transition-colors flex items-center gap-2">
                      {manager.fullName}
                      <ExternalLink className="h-3 w-3 opacity-0 group-hover:opacity-40" />
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                      <Briefcase className="h-3 w-3" />
                      Project Manager
                      <span className="mx-1">•</span>
                      {managerWorkers.length} workers managed
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="bg-white font-bold text-[#1D4F6D] border-blue-100">
                    Manager
                  </Badge>
                </div>
              </div>
              <div className="p-0 overflow-x-auto">
                {managerWorkers.length > 0 ? (
                  <WorkerTable data={managerWorkers} />
                ) : (
                  <div className="px-6 py-8 text-center text-gray-400 text-sm italic">
                    No workers currently assigned to this manager's projects.
                  </div>
                )}
              </div>
            </Card>
          );
        })}

        {/* Workers without specific managers in the mock data (if any) */}
        {(() => {
          const unassignedWorkers = filteredWorkers.filter((worker: any) => !worker.managerId).map((worker: any) => ({
            ...worker,
            ...liveWorkers[worker.id],
          }));

          if (unassignedWorkers.length === 0) return null;

          return (
            <Card className="overflow-hidden border-gray-100 shadow-sm opacity-80">
              <div className="bg-gray-50/50 px-6 py-4 border-b border-gray-100">
                <h3 className="font-bold text-gray-500 uppercase tracking-wider text-xs px-2">Workers without Manager</h3>
              </div>
              <div className="p-0 overflow-x-auto">
                <WorkerTable data={unassignedWorkers} />
              </div>
            </Card>
          );
        })()}
      </div>

      {/* Modals */}
      <AddWorkerModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} />
    </div>
  );
}
