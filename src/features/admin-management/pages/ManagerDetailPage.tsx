import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
    Mail, Phone, ChevronLeft,
    Briefcase, ShieldCheck, ExternalLink, Trash2,
} from 'lucide-react';
import { useRemoveTeamMember } from '@/features/projects/hooks';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Tabs } from '@/shared/components/ui/Tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { getStatusColor, formatStatus, cn } from '@/shared/utils';
import {
    useGetAdminDetailQuery,
    useUpdateUserStatusMutation,
} from '@/store/teamManagementApi';

export function ManagerDetailPage() {
    const { id } = useParams<{ id: string }>();
    const [activeTab, setActiveTab] = useState('overview');

    const {
        data: manager,
        isLoading,
        isError,
        refetch,
    } = useGetAdminDetailQuery(id!, { skip: !id });

    const { removeMember, isRemoving } = useRemoveTeamMember();

    const [updateUserStatus, { isLoading: updatingStatus }] =
        useUpdateUserStatusMutation();

    const handleToggleStatus = async () => {
        if (!manager) return;
        const newStatus = manager.status === 'active' ? 'inactive' : 'active';
        try {
            await updateUserStatus({ id: manager.id, status: newStatus }).unwrap();
        } catch (err) {
            console.error('Status update failed:', err);
        }
    };

    const handleRemoveFromProject = async (projectId: string) => {
        if (!window.confirm('Are you sure you want to remove this manager from this project?')) return;
        try {
            await removeMember({ projectId, userId: manager!.id });
            await refetch();
        } catch (err) {
            console.error('Failed to remove manager from project:', err);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-gray-500">Loading...</div>
            </div>
        );
    }

    if (isError || !manager) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
                <h2 className="text-2xl font-bold text-gray-900">Manager not found</h2>
                <Link to="/managers">
                    <Button variant="outline">Go Back</Button>
                </Link>
            </div>
        );
    }

    const projects = (manager as any).projects ?? [];

    return (
        <div className="space-y-8 pb-8">
            {/* Breadcrumb */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm">
                    <Link
                        to="/managers"
                        className="flex items-center gap-1 text-gray-500 hover:text-[#1D4F6D] font-medium transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Manager Management
                    </Link>
                    <span className="text-gray-300">/</span>
                    <span className="text-gray-900 font-bold">{manager.fullName}</span>
                </div>
            </div>

            {/* Profile Card */}
            <Card className="border-none shadow-sm overflow-hidden bg-white">
                <div className="h-32 bg-gradient-to-r from-purple-700 to-indigo-600" />
                <CardContent className="px-8 pb-8 -mt-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                        <div className="flex flex-col md:flex-row md:items-end gap-6">
                            <div className="relative">
                                <Avatar className="h-32 w-32 rounded-3xl border-4 border-white shadow-2xl">
                                    <AvatarImage src={manager.avatarUrl ?? undefined} />
                                    <AvatarFallback className="text-3xl font-black bg-purple-50 text-purple-600">
                                        {manager.fullName.charAt(0)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white shadow-sm ${manager.status === 'active' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            </div>
                            <div className="space-y-2 mb-2">
                                <div className="flex items-center gap-3">
                                    <h1 className="text-3xl font-black text-gray-900 tracking-tight capitalize">{manager.fullName}</h1>
                                    <Badge className={cn(getStatusColor(manager.status), 'font-bold px-3 py-1 capitalize')}>
                                        {formatStatus(manager.status)}
                                    </Badge>
                                </div>
                                <div className="flex flex-wrap items-center gap-5 text-sm font-bold text-gray-500">
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-purple-50 text-purple-700 rounded-lg">
                                        <ShieldCheck className="h-4 w-4" />
                                        Project Manager
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Briefcase className="h-4 w-4 text-gray-400" />
                                        {projects.length} Active Projects
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 mb-2">
                            {manager.status !== 'suspended' && (
                                <Button
                                    variant="outline"
                                    className="font-bold rounded-xl border-gray-200"
                                    disabled={updatingStatus}
                                    onClick={handleToggleStatus}
                                >
                                    {updatingStatus
                                        ? 'Updating...'
                                        : manager.status === 'active'
                                        ? 'Disable Account'
                                        : 'Enable Account'}
                                </Button>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Tabs */}
            <div className="space-y-6">
                <Tabs
                    tabs={[
                        { id: 'overview', label: 'Overview' },
                        { id: 'projects', label: 'Assigned Projects' },
                    ]}
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                />

                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Overview Tab */}
                    {activeTab === 'overview' && (
                        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                            <div className="lg:col-span-2 space-y-6">
                                <Card className="border-gray-100 shadow-sm rounded-2xl">
                                    <CardHeader className="border-b border-gray-50">
                                        <CardTitle className="text-base font-black text-[#1D4F6D] uppercase tracking-widest">
                                            Management Overview
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-8 pt-6">
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Full Name</p>
                                            <p className="font-bold text-gray-900 text-lg">{manager.fullName}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email Address</p>
                                            <p className="font-bold text-gray-900 text-lg">{manager.email}</p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Join Date</p>
                                            <p className="font-bold text-gray-900 text-lg">
                                                {new Date(manager.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                        {manager.department && (
                                            <div className="space-y-1.5">
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Department</p>
                                                <p className="font-bold text-gray-900 text-lg">{manager.department}</p>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                <Card className="p-6 border-gray-100 shadow-sm rounded-2xl bg-purple-50/30">
                                    <div className="text-xs font-black text-purple-600 uppercase tracking-widest mb-1">Project Load</div>
                                    <div className="text-2xl font-black text-gray-900">{projects.length}</div>
                                    <div className="text-xs text-gray-500 font-medium">Assigned Projects</div>
                                </Card>
                            </div>

                            {/* Contact */}
                            <div className="space-y-6">
                                <Card className="border-gray-100 shadow-sm rounded-2xl">
                                    <CardHeader className="border-b border-gray-50">
                                        <CardTitle className="text-base font-black text-[#1D4F6D] uppercase tracking-widest">
                                            Contact Information
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4 pt-6">
                                        {manager.phone && (
                                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
                                                <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                                                    <Phone className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Mobile</p>
                                                    <p className="text-sm font-bold text-gray-900 mt-0.5">{manager.phone}</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-xl">
                                            <div className="p-2.5 bg-blue-50 rounded-lg text-blue-600">
                                                <Mail className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Email</p>
                                                <p className="text-sm font-bold text-gray-900 mt-0.5">{manager.email}</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {/* Projects Tab */}
                    {activeTab === 'projects' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {projects.length > 0 ? (
                                projects.map((item: any) => (
                                    <Card key={item.id} className="border-gray-100 shadow-sm rounded-2xl overflow-hidden hover:shadow-md transition-all">
                                        <div className="p-6">
                                            <div className="flex items-start justify-between mb-4">
                                                <div className="bg-blue-50 p-3 rounded-xl">
                                                    <Briefcase className="h-6 w-6 text-[#1D4F6D]" />
                                                </div>
                                                <Badge className={getStatusColor(item.project.status)}>
                                                    {item.project.status.toUpperCase()}
                                                </Badge>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                                {item.project.name}
                                            </h3>
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                                <div className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                                                    Progress:{' '}
                                                    <span className="text-[#1D4F6D]">
                                                        {item.project.progress ?? 0}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50 h-8 px-2"
                                                        onClick={() => handleRemoveFromProject(item.project.id)}
                                                        disabled={isRemoving}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                    <Link
                                                        to={`/projects/${item.project.id}`}
                                                        className="text-xs font-black text-blue-600 hover:text-blue-700 flex items-center gap-1 uppercase tracking-widest"
                                                    >
                                                        View Site <ExternalLink className="h-3 w-3" />
                                                    </Link>
                                                </div>
                                            </div>
                                        </div>
                                    </Card>
                                ))
                            ) : (
                                <div className="col-span-2 text-center py-12 text-gray-500">
                                    No projects assigned.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}