import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Mail, Phone, Calendar, Activity, Building2 } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { getStatusColor, formatRole, formatStatus, cn } from '@/shared/utils';
import {
    useGetAdminDetailQuery,
    useUpdateUserStatusMutation,
    teamManagementApi,
} from '@/store/teamManagementApi';

export function AdminDetailPage() {
    const { id } = useParams<{ id: string }>();

    const {
        data: admin,
        isLoading,
        isError,
    } = useGetAdminDetailQuery(id!, { skip: !id });

    const [updateUserStatus, { isLoading: updatingStatus }] =
        useUpdateUserStatusMutation();
        
    const [toggleExemption, { isLoading: togglingExemption }] = 
        teamManagementApi.useToggleSubscriptionExemptionMutation();

    const handleToggleStatus = async () => {
        if (!admin) return;
        const newStatus = admin.status === 'active' ? 'inactive' : 'active';
        try {
            await updateUserStatus({ id: admin.id, status: newStatus }).unwrap();
        } catch (err) {
            console.error('Status update failed:', err);
        }
    };

    const handleToggleExemption = async () => {
        if (!admin) return;
        try {
            await toggleExemption(admin.id).unwrap();
        } catch (err) {
            console.error('Toggle exemption failed:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (isError || !admin) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
                <div className="text-gray-500">Admin not found or failed to load.</div>
                <Link to="/admins">
                    <Button variant="outline" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </Link>
            </div>
        );
    }

    const initials = admin.fullName
        .split(' ')
        .map((n) => n[0])
        .join('');

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to="/admins">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Go Back
                    </Button>
                </Link>
            </div>

            {/* Profile Card */}
            <Card className="p-8">
                <div className="flex items-start gap-6">
                    {admin.avatarUrl ? (
                        <img
                            src={admin.avatarUrl}
                            alt={admin.fullName}
                            className="w-24 h-24 rounded-full object-cover"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                            <span className="text-blue-600 font-semibold text-2xl">
                                {initials}
                            </span>
                        </div>
                    )}

                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-3xl font-bold text-gray-900 capitalize">{admin.fullName}</h1>
                            <Badge className={cn(getStatusColor(admin.status), 'capitalize')}>{formatStatus(admin.status)}</Badge>
                            <Badge variant={admin.role === 'super_admin' ? 'default' : 'secondary'} className="capitalize">
                                {formatRole(admin.role)}
                            </Badge>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="w-4 h-4 shrink-0" />
                                <span className="truncate">{admin.email}</span>
                            </div>
                            {admin.phone && (
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Phone className="w-4 h-4 shrink-0" />
                                    {admin.phone}
                                </div>
                            )}
                            <div className="flex items-center gap-2 text-gray-600">
                                <Calendar className="w-4 h-4 shrink-0" />
                                Joined {new Date(admin.createdAt).toLocaleDateString()}
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                                <Activity className="w-4 h-4 shrink-0" />
                                Last login:{' '}
                                {admin.lastLoginAt
                                    ? new Date(admin.lastLoginAt).toLocaleString()
                                    : 'Never'}
                            </div>
                        </div>
                    </div>

                    {admin.status !== 'suspended' && (
                        <div className="shrink-0 flex gap-3">
                            <Button
                                variant={admin.isExemptFromSubscription ? 'default' : 'outline'}
                                className={admin.isExemptFromSubscription ? 'bg-amber-600 hover:bg-amber-700' : 'border-amber-200 text-amber-700 hover:bg-amber-50'}
                                disabled={togglingExemption}
                                onClick={handleToggleExemption}
                            >
                                {togglingExemption
                                    ? 'Updating...'
                                    : admin.isExemptFromSubscription
                                    ? 'Revoke Free Access'
                                    : 'Grant Free Access'}
                            </Button>
                            <Button
                                variant="outline"
                                disabled={updatingStatus}
                                onClick={handleToggleStatus}
                            >
                                {updatingStatus
                                    ? 'Updating...'
                                    : admin.status === 'active'
                                    ? 'Disable Account'
                                    : 'Enable Account'}
                            </Button>
                        </div>
                    )}
                </div>
            </Card>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Account Information */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                    <div className="space-y-3">
                        <div>
                            <div className="text-sm text-gray-500">Account Status</div>
                            <div className="font-medium capitalize">{formatStatus(admin.status)}</div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Role</div>
                            <div className="font-medium capitalize">
                                {formatRole(admin.role)}
                            </div>
                        </div>
                        {admin.department && (
                            <div>
                                <div className="text-sm text-gray-500">Department</div>
                                <div className="font-medium">{admin.department}</div>
                            </div>
                        )}
                        {admin.employeeId && (
                            <div>
                                <div className="text-sm text-gray-500">Employee ID</div>
                                <div className="font-medium">{admin.employeeId}</div>
                            </div>
                        )}
                        <div>
                            <div className="text-sm text-gray-500">Created Date</div>
                            <div className="font-medium">
                                {new Date(admin.createdAt).toLocaleDateString()}
                            </div>
                        </div>
                        <div>
                            <div className="text-sm text-gray-500">Last Updated</div>
                            <div className="font-medium">
                                {new Date(admin.updatedAt).toLocaleDateString()}
                            </div>
                        </div>
                        {admin.bio && (
                            <div>
                                <div className="text-sm text-gray-500">Bio</div>
                                <div className="font-medium text-gray-700">{admin.bio}</div>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Assigned Companies */}
                <Card className="p-6">
                    <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-gray-500" />
                        Assigned Companies
                    </h3>
                    {(admin.companies ?? []).length > 0 ? (
                        <div className="space-y-3">
                            {admin.companies.map((item) => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                                >
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {item.company.name}
                                        </div>
                                        <div className="text-sm text-gray-500">
                                            {item.company.industry ?? 'No industry'}
                                        </div>
                                    </div>
                                    <Badge
                                        variant={item.company.isActive ? 'default' : 'secondary'}
                                    >
                                        {item.company.isActive ? 'Active' : 'Inactive'}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-gray-500">No companies assigned.</p>
                    )}
                </Card>
            </div>
        </div>
    );
}