import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Briefcase, Mail, Phone, MoreVertical } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, Column } from '@/shared/components/ui/Table';
import { Select } from '@/shared/components/ui/Select';
import { Modal } from '@/shared/components/ui/Modal';
import { getStatusColor, formatStatus, cn } from '@/shared/utils';
import {
    useGetManagerStatsQuery,
    useGetManagerListQuery,
    useGetPendingInvitationsQuery,
    useSendInviteMutation,
    useResendInvitationMutation,
    useCancelInvitationMutation,
    useUpdateUserStatusMutation,
    ManagerUser,
    PendingInvitation,
} from '@/store/teamManagementApi';

export function ManagersPage() {
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    // ── API Queries ──────────────────────────────────────────────────────
    const { data: stats, isLoading: statsLoading } = useGetManagerStatsQuery();

    const { data: pendingInvitations = [], isLoading: invitationsLoading } =
        useGetPendingInvitationsQuery({ role: 'manager' });

    const { data: managers = [], isLoading: managersLoading } = useGetManagerListQuery({
        search: searchQuery || undefined,
        status: statusFilter !== 'all' ? statusFilter : undefined,
    });

    // ── Mutations ────────────────────────────────────────────────────────
    const [resendInvitation, { isLoading: resending }] = useResendInvitationMutation();
    const [cancelInvitation, { isLoading: cancelling }] = useCancelInvitationMutation();
    const [updateUserStatus] = useUpdateUserStatusMutation();

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

    const handleDisable = async (userId: string, currentStatus: string) => {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        try {
            await updateUserStatus({ id: userId, status: newStatus }).unwrap();
        } catch (err) {
            console.error('Status update failed:', err);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <PageHeader
                title="Manager Management"
                description="Manage managers and their assignments"
                icon={Briefcase}
            >
                <Button onClick={() => setShowInviteModal(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Manager
                </Button>
            </PageHeader>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <div className="text-sm text-gray-600">Total Managers</div>
                    <div className="text-3xl font-bold text-gray-900 mt-2">
                        {statsLoading ? '—' : stats?.totalManagers ?? 0}
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="text-sm text-gray-600">Active</div>
                    <div className="text-3xl font-bold text-green-600 mt-2">
                        {statsLoading ? '—' : stats?.active ?? 0}
                    </div>
                </Card>
                <Card className="p-6">
                    <div className="text-sm text-gray-600">Total Projects Managed</div>
                    <div className="text-3xl font-bold text-blue-600 mt-2">
                        {statsLoading ? '—' : stats?.totalProjectsManaged ?? 0}
                    </div>
                </Card>
            </div>

            {/* Pending Invitations */}
            {!invitationsLoading && pendingInvitations.length > 0 && (
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Pending Invitations</h3>
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
                                            <span className="font-medium">{invitation.email}</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <Phone className="w-4 h-4 text-gray-400" />
                                            <span className="font-medium">{invitation.phone}</span>
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
            <Card className="p-6">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by name or email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            startIcon={<Search className="w-4 h-4" />}
                        />
                    </div>
                    <Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-48"
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'active', label: 'Active' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'inactive', label: 'Inactive' },
                            { value: 'suspended', label: 'Suspended' },
                        ]}
                    />
                </div>
            </Card>

            {/* Managers Table */}
            <Card>
                {managersLoading ? (
                    <div className="p-8 text-center text-gray-500">Loading...</div>
                ) : (
                    <ManagerTable data={managers} onDisable={handleDisable} />
                )}
            </Card>

            {/* Invite Modal */}
            <InviteManagerModal
                open={showInviteModal}
                onClose={() => setShowInviteModal(false)}
            />
        </div>
    );
}

// ── Manager Table ─────────────────────────────────────────────────────────────

function ManagerTable({
    data,
    onDisable,
}: {
    data: ManagerUser[];
    onDisable: (id: string, currentStatus: string) => void;
}) {
    const navigate = useNavigate();

    const columns: Column<ManagerUser>[] = [
        {
            key: 'fullName',
            header: 'Manager',
            render: (row) => (
                <div className="flex items-center gap-3">
                    {row.avatarUrl ? (
                        <img
                            src={row.avatarUrl}
                            alt={row.fullName}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                            <span className="text-purple-600 font-semibold text-sm">
                                {row.fullName.split(' ').map((n) => n[0]).join('')}
                            </span>
                        </div>
                    )}
                    <div>
                        <div className="font-medium text-gray-900 capitalize">{row.fullName}</div>
                        <div className="text-sm text-gray-500">{row.email}</div>
                    </div>
                </div>
            ),
        },
        {
            key: 'contact',
            header: 'Contact',
            render: (row) => (
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-3 h-3 text-gray-400" />
                        {row.email}
                    </div>
                    {row.phone && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="w-3 h-3 text-gray-400" />
                            {row.phone}
                        </div>
                    )}
                </div>
            ),
        },
        {
            key: 'assignedProjects',
            header: 'Assigned Projects',
            render: (row) => (
                <div className="flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{row.projectMemberships.length}</span>
                    <span className="text-gray-500">projects</span>
                </div>
            ),
        },
        {
            key: 'status',
            header: 'Status',
            render: (row) => (
                <Badge className={cn(getStatusColor(row.status), 'capitalize')}>{formatStatus(row.status)}</Badge>
            ),
        },
        {
            key: 'lastLoginAt',
            header: 'Last Login',
            render: (row) => (
                <span className="text-sm text-gray-600">
                    {row.lastLoginAt
                        ? new Date(row.lastLoginAt).toLocaleString()
                        : 'Never'}
                </span>
            ),
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (row) => (
                <div
                    className="flex items-center gap-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    {row.status !== 'suspended' && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onDisable(row.id, row.status)}
                        >
                            {row.status === 'active' ? 'Disable' : 'Enable'}
                        </Button>
                    )}
                </div>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            data={data}
            onRowClick={(row) => navigate(`/managers/${row.id}`)}
        />
    );
}

// ── Invite Modal ──────────────────────────────────────────────────────────────

function InviteManagerModal({
    open,
    onClose,
}: {
    open: boolean;
    onClose: () => void;
}) {
    const [inviteMethod, setInviteMethod] = useState<'email' | 'phone'>('email');
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');

    const [sendInvite, { isLoading }] = useSendInviteMutation();

    const handleInvite = async () => {
        try {
            await sendInvite({
                ...(inviteMethod === 'email' ? { email } : { phone }),
                role: 'manager',
            }).unwrap();
            setEmail('');
            setPhone('');
            onClose();
        } catch (err) {
            console.error('Invite failed:', err);
        }
    };

    const isDisabled =
        isLoading || (inviteMethod === 'email' ? !email.trim() : !phone.trim());

    return (
        <Modal isOpen={open} onClose={onClose} title="Invite Manager">
            <div className="space-y-4">
                {/* Invite Method */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Invitation Method
                    </label>
                    <div className="flex gap-4">
                        <Button
                            variant={inviteMethod === 'email' ? 'default' : 'outline'}
                            onClick={() => setInviteMethod('email')}
                            className="flex-1"
                        >
                            <Mail className="w-4 h-4 mr-2" />
                            Email
                        </Button>
                        <Button
                            variant={inviteMethod === 'phone' ? 'default' : 'outline'}
                            onClick={() => setInviteMethod('phone')}
                            className="flex-1"
                        >
                            <Phone className="w-4 h-4 mr-2" />
                            Phone
                        </Button>
                    </div>
                </div>

                {/* Email or Phone */}
                {inviteMethod === 'email' ? (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <Input
                            type="email"
                            placeholder="manager@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                ) : (
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Phone Number
                        </label>
                        <Input
                            type="tel"
                            placeholder="+1-XXX-XXX-XXXX"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>
                )}

                {/* Actions */}
                <div className="flex justify-end gap-3 mt-6">
                    <Button variant="outline" onClick={onClose} disabled={isLoading}>
                        Cancel
                    </Button>
                    <Button onClick={handleInvite} disabled={isDisabled}>
                        {isLoading ? 'Sending...' : 'Send Invitation'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}