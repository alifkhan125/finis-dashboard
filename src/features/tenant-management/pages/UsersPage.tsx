import { useState, useMemo } from 'react';
import {
  Users,
  Search,
  RefreshCw,
  Building2,
  Briefcase,
  HardHat,
  ShieldCheck,
  Phone,
  Mail,
  UserCheck,
  UserX,
  CreditCard,
  Sparkles,
  CheckCircle2,
  XCircle,
  MoreVertical,
  SlidersHorizontal,
  UserPlus,
} from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, Column } from '@/shared/components/ui/Table';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Modal } from '@/shared/components/ui/Modal';
import {
  useGetSuperAdminUsersQuery,
  useToggleSubscriptionExemptionMutation,
  useUpdateSuperAdminUserStatusMutation,
  useSendInviteMutation,
  type SuperAdminUser,
} from '@/store/teamManagementApi';

export function UsersPage() {
  const { data: users = [], isLoading, isFetching, isError, error, refetch } = useGetSuperAdminUsersQuery({ role: 'admin' });
  const [toggleExemption, { isLoading: isToggling }] = useToggleSubscriptionExemptionMutation();
  const [updateStatus, { isLoading: isUpdatingStatus }] = useUpdateSuperAdminUserStatusMutation();

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'suspended'>('all');
  const [selectedUser, setSelectedUser] = useState<SuperAdminUser | null>(null);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Filtered users (admins)
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q) ||
        u.subscriptionType?.toLowerCase().includes(q);

      const matchStatus = statusFilter === 'all' || u.status === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [users, searchQuery, statusFilter]);

  // Aggregate Stats
  const stats = useMemo(() => {
    const totalUsers = users.length;
    const activeUsers = users.filter((u) => u.status === 'active').length;
    const totalCompanies = users.reduce((acc, u) => acc + (u.totalCompany || 0), 0);
    const totalProjects = users.reduce((acc, u) => acc + (u.project || 0), 0);
    const totalWorkforce = users.reduce((acc, u) => acc + (u.totalManager || 0) + (u.totalWorker || 0), 0);

    return { totalUsers, activeUsers, totalCompanies, totalProjects, totalWorkforce };
  }, [users]);

  const handleToggleExemption = async (userId: string) => {
    try {
      await toggleExemption(userId).unwrap();
    } catch (err) {
      console.error('Failed to toggle subscription exemption:', err);
    }
  };

  const handleStatusChange = async (userId: string, nextStatus: string) => {
    try {
      await updateStatus({ id: userId, status: nextStatus }).unwrap();
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser((prev) => (prev ? { ...prev, status: nextStatus } : null));
      }
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const columns: Column<SuperAdminUser>[] = [
    {
      key: 'user',
      header: 'Name',
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10 border border-gray-100 shadow-sm">
            <AvatarImage src={user.avatarUrl || ''} />
            <AvatarFallback className="bg-gradient-to-br from-[#1D4F6D] to-[#2563EB] text-white font-bold text-xs">
              {user.fullName ? user.fullName.slice(0, 2).toUpperCase() : 'US'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="font-bold text-gray-900">{user.fullName || 'Unnamed User'}</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-xs uppercase tracking-wider text-gray-500 font-bold">
                Admin
              </span>
              {user.role === 'super_admin' && (
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                  Super Admin
                </span>
              )}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Email / Phone',
      render: (user) => (
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-700 font-medium">
            <Mail className="h-3.5 w-3.5 text-gray-400" />
            <span>{user.email}</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-gray-500">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            <span>{user.phone || '—'}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'companies',
      header: 'Total Company',
      render: (user) => (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center justify-center h-7 px-3 rounded-xl bg-blue-50 text-blue-700 font-bold text-xs border border-blue-100">
              <Building2 className="w-3.5 h-3.5 mr-1 text-blue-500" />
              {user.totalCompany ?? 0}
            </span>
          </div>
          {user.companies && user.companies.length > 0 && (
            <span
              className="text-[11px] text-gray-500 font-medium truncate max-w-[150px]"
              title={user.companies.map((c) => c.name).join(', ')}
            >
              {user.companies[0].name}
              {user.companies.length > 1 && ` +${user.companies.length - 1} more`}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'managers',
      header: 'Total Manager',
      render: (user) => (
        <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-xl bg-purple-50 text-purple-700 font-bold text-xs border border-purple-100">
          <UserCheck className="w-3.5 h-3.5 mr-1 text-purple-500" />
          {user.totalManager ?? 0}
        </span>
      ),
    },
    {
      key: 'workers',
      header: 'Total Worker',
      render: (user) => (
        <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-xl bg-amber-50 text-amber-700 font-bold text-xs border border-amber-100">
          <HardHat className="w-3.5 h-3.5 mr-1 text-amber-500" />
          {user.totalWorker ?? 0}
        </span>
      ),
    },
    {
      key: 'project',
      header: 'Project',
      render: (user) => (
        <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-xl bg-indigo-50 text-indigo-700 font-bold text-xs border border-indigo-100">
          <Briefcase className="w-3.5 h-3.5 mr-1 text-indigo-500" />
          {user.project ?? user.totalProject ?? 0}
        </span>
      ),
    },
    {
      key: 'subscription',
      header: 'Subscription Type',
      render: (user) => {
        const isFree = user.isExemptFromSubscription || user.subscriptionType === 'Free';
        const isNone = !user.subscriptionType || user.subscriptionType === 'No';
        const isPaid = !isFree && !isNone;
        return (
          <div className="flex items-center gap-2">
            <Badge
              className={`rounded-xl px-2.5 py-1 text-xs font-bold border shadow-sm ${
                isFree
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : isPaid
                  ? 'bg-violet-50 text-violet-800 border-violet-200'
                  : 'bg-gray-100 text-gray-600 border-gray-200'
              }`}
            >
              <CreditCard className="w-3 h-3 mr-1" />
              {isFree ? 'Free' : isPaid ? user.subscriptionType : 'No'}
            </Badge>
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => {
        const isActive = user.status === 'active';
        const isSuspended = user.status === 'suspended';
        return (
          <Badge
            className={`rounded-xl px-2.5 py-1 text-xs font-bold border ${isActive
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : isSuspended
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}
          >
            {isActive ? (
              <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-600" />
            ) : (
              <XCircle className="w-3 h-3 mr-1 text-red-600" />
            )}
            {user.status || 'active'}
          </Badge>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            variant="outline"
            className="h-8 px-2.5 text-xs font-semibold rounded-lg hover:bg-gray-50 border-gray-200"
            onClick={() => setSelectedUser(user)}
          >
            Details
          </Button>
          <Button
            size="sm"
            variant={user.isExemptFromSubscription ? 'secondary' : 'outline'}
            className={`h-8 px-2.5 text-xs font-semibold rounded-lg ${
              user.isExemptFromSubscription
                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
            disabled={isToggling}
            onClick={() => handleToggleExemption(user.id)}
            title="Toggle Free Access"
          >
            {user.isExemptFromSubscription ? 'Free' : 'Make Free'}
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="Users"
        description="Comprehensive overview of all users, their assigned companies, workforces, projects, and subscription tiers"
        icon={Users}
      >
        <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="gap-2 rounded-xl">
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="gap-2 rounded-xl bg-[#1D4F6D] hover:bg-[#163a50] text-white font-bold shadow-md h-10 px-4 transition-all hover:scale-[1.02]"
        >
          <UserPlus className="w-4 h-4" />
          Invite User
        </Button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-gray-400">Total Users</div>
              <div className="mt-2 text-3xl font-black text-gray-900">{stats.totalUsers}</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
              <Users className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500 font-medium">
            <span className="text-emerald-600 font-bold">{stats.activeUsers}</span> active users
          </div>
        </Card>

        <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-gray-400">Total Companies</div>
              <div className="mt-2 text-3xl font-black text-gray-900">{stats.totalCompanies}</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
              <Building2 className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500 font-medium">Associated across all users</div>
        </Card>

        <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-gray-400">Total Projects</div>
              <div className="mt-2 text-3xl font-black text-gray-900">{stats.totalProjects}</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
              <Briefcase className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500 font-medium">Active and completed works</div>
        </Card>

        <Card className="p-5 border-gray-100 shadow-sm rounded-2xl bg-white transition-all hover:shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-gray-400">Total Workforce</div>
              <div className="mt-2 text-3xl font-black text-gray-900">{stats.totalWorkforce}</div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
              <HardHat className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 text-xs text-gray-500 font-medium">Managers and workers</div>
        </Card>
      </div>

      {/* Filters and Search Bar */}
      <Card className="p-4 border-gray-100 shadow-sm rounded-2xl bg-white">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search by name, email, phone, or subscription..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-10 rounded-xl border-gray-200 bg-gray-50/50 focus:bg-white text-sm"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="h-10 px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1D4F6D]"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Users Table */}
      <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
        {isLoading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-[#1D4F6D] border-r-transparent mb-3" />
            <p className="font-semibold text-sm">Loading users data...</p>
          </div>
        ) : isError ? (
          <div className="p-12 text-center">
            <XCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 text-base">Failed to Load Users</h3>
            <p className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
              {(error as any)?.data?.message || (error as any)?.message || 'Unable to fetch users from server. Please check your network or try again.'}
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              className="mt-4 gap-2 rounded-xl"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Try Again
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="font-bold text-gray-800 text-base">No Users Found</h3>
            <p className="text-xs text-gray-400 mt-1">Try adjusting your search criteria or status filter.</p>
          </div>
        ) : (
          <Table
            data={filteredUsers}
            columns={columns}
            onRowClick={(user) => setSelectedUser(user)}
            className="border-none shadow-none rounded-none"
          />
        )}
      </Card>

      {/* User Details Modal */}
      {selectedUser && (
        <Modal
          isOpen={Boolean(selectedUser)}
          onClose={() => setSelectedUser(null)}
          title="User Details"
          maxWidth="lg"
        >
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-100">
              <Avatar className="h-14 w-14 border-2 border-white shadow-md">
                <AvatarImage src={selectedUser.avatarUrl || ''} />
                <AvatarFallback className="bg-[#1D4F6D] text-white font-bold text-base">
                  {selectedUser.fullName ? selectedUser.fullName.slice(0, 2).toUpperCase() : 'US'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-gray-900">{selectedUser.fullName}</h3>
                  <Badge className="capitalize font-semibold">
                    {selectedUser.role === 'super_admin' ? 'Admin (Super Admin)' : 'Admin'}
                  </Badge>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{selectedUser.email}</p>
                <p className="text-xs text-gray-500">{selectedUser.phone || 'No phone provided'}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Companies</div>
                <div className="mt-1 text-xl font-black text-gray-900">{selectedUser.totalCompany ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Managers</div>
                <div className="mt-1 text-xl font-black text-purple-700">{selectedUser.totalManager ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Workers</div>
                <div className="mt-1 text-xl font-black text-amber-700">{selectedUser.totalWorker ?? 0}</div>
              </div>
              <div className="p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="text-[11px] uppercase tracking-wider text-gray-400 font-bold">Projects</div>
                <div className="mt-1 text-xl font-black text-indigo-700">{selectedUser.project ?? selectedUser.totalProject ?? 0}</div>
              </div>
            </div>

            {/* Companies List */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-[#1D4F6D]" />
                Companies & Organizations ({selectedUser.companies?.length ?? selectedUser.totalCompany ?? 0})
              </h4>

              {selectedUser.companies && selectedUser.companies.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {selectedUser.companies.map((company) => (
                    <div
                      key={company.id}
                      className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/70 hover:bg-gray-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-9 w-9 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center font-bold text-xs uppercase flex-shrink-0">
                          {company.name.slice(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{company.name}</span>
                            <Badge
                              className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                                company.isActive !== false
                                  ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                                  : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              {company.isActive !== false ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {company.industry ? `Industry: ${company.industry}` : 'Contractor'}
                            {company.email && ` • ${company.email}`}
                            {company.phone && ` • ${company.phone}`}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-600 sm:self-center">
                        <span className="px-2 py-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {company.projectsCount} {company.projectsCount === 1 ? 'Project' : 'Projects'}
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-purple-50 text-purple-700 border border-purple-100">
                          {company.managersCount} Mgr
                        </span>
                        <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
                          {company.workersCount} Wkr
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center text-xs text-gray-400">
                  No company assigned or created yet for this user.
                </div>
              )}
            </div>

            <div className="space-y-3 p-4 rounded-xl border border-gray-100 text-sm">
              <div className="flex items-center justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Subscription Type</span>
                <span className="font-bold text-gray-900">
                  {selectedUser.isExemptFromSubscription
                    ? 'Free'
                    : selectedUser.subscriptionType || 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Status</span>
                <span className="font-bold capitalize text-emerald-600">{selectedUser.status}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-gray-100">
                <span className="text-gray-500">Created At</span>
                <span className="font-semibold text-gray-700">
                  {selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-gray-500">Last Login</span>
                <span className="font-semibold text-gray-700">
                  {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString() : 'Never'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-4 border-t border-gray-100">
              <Button
                variant={selectedUser.status === 'active' ? 'destructive' : 'default'}
                disabled={isUpdatingStatus}
                className="h-10 px-4 text-xs font-bold rounded-xl shadow-sm"
                onClick={() =>
                  handleStatusChange(
                    selectedUser.id,
                    selectedUser.status === 'active' ? 'suspended' : 'active'
                  )
                }
              >
                {selectedUser.status === 'active' ? 'Suspend User' : 'Activate User'}
              </Button>
              <Button
                variant="outline"
                disabled={isToggling}
                className="h-10 px-4 text-xs font-bold rounded-xl border-gray-200"
                onClick={() => handleToggleExemption(selectedUser.id)}
              >
                {selectedUser.isExemptFromSubscription ? 'Remove Free Access' : 'Make Free (Exempt)'}
              </Button>
              <Button
                variant="secondary"
                className="h-10 px-4 text-xs font-bold rounded-xl"
                onClick={() => setSelectedUser(null)}
              >
                Close
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Invite User Modal */}
      <InviteUserModal
        open={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </div>
  );
}

// ── Invite User Modal Component ──────────────────────────────────────────────

function InviteUserModal({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}) {
  const [inviteMethod, setInviteMethod] = useState<'email' | 'phone'>('email');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('admin');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [sendInvite, { isLoading }] = useSendInviteMutation();

  const handleInvite = async () => {
    setErrorMsg('');
    setSuccessMsg('');
    try {
      await sendInvite({
        ...(inviteMethod === 'email' ? { email: email.trim() } : { phone: phone.trim() }),
        role,
      }).unwrap();
      setSuccessMsg('Invitation sent successfully!');
      setTimeout(() => {
        setEmail('');
        setPhone('');
        setRole('admin');
        setSuccessMsg('');
        onClose();
        onSuccess?.();
      }, 1000);
    } catch (err: any) {
      console.error('Invite failed:', err);
      setErrorMsg(err?.data?.message || err?.message || 'Failed to send invitation.');
    }
  };

  const isDisabled =
    isLoading ||
    (inviteMethod === 'email' ? !email.trim() : !phone.trim());

  return (
    <Modal isOpen={open} onClose={onClose} title="Invite User" maxWidth="md">
      <div className="space-y-4">
        {errorMsg && (
          <div className="p-3 text-xs font-semibold rounded-xl bg-red-50 text-red-700 border border-red-200">
            {errorMsg}
          </div>
        )}
        {successMsg && (
          <div className="p-3 text-xs font-semibold rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            {successMsg}
          </div>
        )}

        {/* Invite Method */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">
            Invitation Method
          </label>
          <div className="flex gap-2">
            <Button
              type="button"
              variant={inviteMethod === 'email' ? 'default' : 'outline'}
              onClick={() => {
                setInviteMethod('email');
                setErrorMsg('');
              }}
              className={`flex-1 rounded-xl h-10 font-bold text-xs ${inviteMethod === 'email' ? 'bg-[#1D4F6D] text-white' : 'border-gray-200 text-gray-600'
                }`}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Address
            </Button>
            <Button
              type="button"
              variant={inviteMethod === 'phone' ? 'default' : 'outline'}
              onClick={() => {
                setInviteMethod('phone');
                setErrorMsg('');
              }}
              className={`flex-1 rounded-xl h-10 font-bold text-xs ${inviteMethod === 'phone' ? 'bg-[#1D4F6D] text-white' : 'border-gray-200 text-gray-600'
                }`}
            >
              <Phone className="w-4 h-4 mr-2" />
              Phone Number
            </Button>
          </div>
        </div>

        {/* Input */}
        {inviteMethod === 'email' ? (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Email Address
            </label>
            <Input
              type="email"
              placeholder="admin@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 rounded-xl border-gray-200 text-sm"
            />
          </div>
        ) : (
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
              Phone Number
            </label>
            <Input
              type="tel"
              placeholder="+1234567890"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="h-10 rounded-xl border-gray-200 text-sm"
            />
          </div>
        )}

        {/* Role Selection */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1.5">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm font-semibold text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#1D4F6D]"
          >
            <option value="admin">Admin (Company Owner)</option>
          </select>
          <p className="mt-1 text-[11px] text-gray-400">
            Select the role for the invited user. By default, Company Admin is selected.
          </p>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2.5 pt-4 border-t border-gray-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-xl h-10 px-4 text-xs font-bold border-gray-200"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleInvite}
            disabled={isDisabled}
            className="rounded-xl h-10 px-5 text-xs font-bold bg-[#1D4F6D] hover:bg-[#163a50] text-white shadow-sm"
          >
            {isLoading ? 'Sending...' : 'Send Invitation'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

