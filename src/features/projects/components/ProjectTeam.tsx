import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Modal } from '@/shared/components/ui/Modal';
import { Mail, Phone, MoreHorizontal, Shield, HardHat, UserPlus, Trash2, Users } from 'lucide-react';
import { useProjectTeam, useRemoveTeamMember, useAvailableManagers, useAvailableWorkers, useAddTeamManager, useAddTeamWorker } from '../hooks';
import { useToast } from '@/context/ToastContext';

function getRoleIcon(role: string) {
    if (role === 'manager') return Shield;
    return HardHat;
}

function getRoleColor(role: string) {
    if (role === 'manager') return 'bg-blue-50 text-blue-600';
    return 'bg-orange-50 text-orange-600';
}

function getStatusColor(status?: string) {
    if (status === 'active') return 'bg-green-500';
    if (status === 'in_field') return 'bg-blue-500';
    return 'bg-gray-400';
}

interface AddMemberModalProps {
    isOpen: boolean;
    onClose: () => void;
    projectId: string;
    type: 'manager' | 'worker';
    managers?: any[];
    existingMemberIds?: string[];
}

function AddMemberModal({ isOpen, onClose, projectId, type, managers = [], existingMemberIds = [] }: AddMemberModalProps) {
    const { toast } = useToast();
    const { data: availableManagers = [], isLoading: loadingManagers } = useAvailableManagers();
    const { data: availableWorkers = [], isLoading: loadingWorkers } = useAvailableWorkers();
    const { addManager, isAdding: addingManager } = useAddTeamManager();
    const { addWorker, isAdding: addingWorker } = useAddTeamWorker();
    const [selectedUserId, setSelectedUserId] = useState('');
    const [selectedManagerId, setSelectedManagerId] = useState('');

    const isLoading = type === 'manager' ? loadingManagers : loadingWorkers;
    const isAdding = type === 'manager' ? addingManager : addingWorker;
    const list = (type === 'manager' ? availableManagers : availableWorkers).filter((user: any) => {
        const status = (user.status || '').toString().toLowerCase();
        const isActive = status === 'active' || status === '';
        const isAlreadyMember = existingMemberIds.includes(user.id);
        return isActive && !isAlreadyMember;
    });
    const activeManagers = managers.filter((manager: any) => {
        const status = (manager?.user?.status || manager?.status || '').toString().toLowerCase();
        return status === 'active' || status === '';
    });

    const handleAdd = async () => {
        if (!selectedUserId) {
            toast.warning('Selection Required', `Please select a ${type} to add.`);
            return;
        }
        try {
            if (type === 'manager') {
                await addManager({ projectId, userId: selectedUserId });
                toast.success('Manager Added', 'Project manager added successfully.');
            } else {
                const managerId = selectedManagerId || (activeManagers.length > 0 ? (activeManagers[0]?.userId || activeManagers[0]?.id) : undefined);
                
                if (!managerId) {
                    toast.warning('Manager Required', 'Please select a manager to assign this worker to.');
                    return;
                }

                // Check if the selected manager is already in the project
                const isManagerInProject = activeManagers.some((m: any) => (m.userId || m.id) === managerId);
                
                // If not in project, add them to the project first
                if (!isManagerInProject) {
                    await addManager({ projectId, userId: managerId });
                }

                await addWorker({ projectId, userId: selectedUserId, managerId });
                toast.success('Worker Added', 'Worker added to project successfully.');
            }
            onClose();
            setSelectedUserId('');
            setSelectedManagerId('');
        } catch (err: any) {
            console.error('Failed to add member:', err);
            const errorMsg = err?.message || err?.details?.message || 'Failed to add team member.';
            toast.error('Unable to Add Member', errorMsg);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Add ${type === 'manager' ? 'Manager' : 'Worker'}`}
            maxWidth="md"
        >
            <div className="space-y-4">
                {isLoading ? (
                    <div className="flex justify-center py-8">
                        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
                    </div>
                ) : (
                    <>
                        <div>
                            <label className="text-sm font-bold text-gray-700 block mb-1">
                                Select {type === 'manager' ? 'Manager' : 'Worker'}
                            </label>
                            <select
                                value={selectedUserId}
                                onChange={(e) => setSelectedUserId(e.target.value)}
                                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4F6D]"
                            >
                                <option value="">-- Select --</option>
                                {list.map((user: any) => (
                                    <option key={user.id} value={user.id}>
                                        {user.fullName || user.name || user.email}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {type === 'worker' && (
                            <div>
                                <label className="text-sm font-bold text-gray-700 block mb-1">
                                    Assign to Manager
                                </label>
                                <select
                                    value={selectedManagerId}
                                    onChange={(e) => setSelectedManagerId(e.target.value)}
                                    className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#1D4F6D]"
                                >
                                    <option value="">{activeManagers.length > 0 ? '-- Auto select first manager --' : '-- Select a new manager --'}</option>
                                    {activeManagers.length > 0 ? (
                                        activeManagers.map((m: any) => (
                                            <option key={m.userId || m.id} value={m.userId || m.id}>
                                                {m.user?.fullName || m.fullName || m.name}
                                            </option>
                                        ))
                                    ) : availableManagers.length > 0 ? (
                                        availableManagers.map((m: any) => (
                                            <option key={m.id} value={m.id}>
                                                {m.fullName || m.name || m.email} (Available)
                                            </option>
                                        ))
                                    ) : (
                                        <option value="" disabled>No managers available</option>
                                    )}
                                </select>
                            </div>
                        )}

                        {list.length === 0 && (
                            <p className="text-sm text-gray-500 text-center py-4">
                                No available {type === 'manager' ? 'managers' : 'workers'} found.
                            </p>
                        )}
                    </>
                )}

                <div className="flex justify-end gap-2 pt-2">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button
                        onClick={handleAdd}
                        disabled={!selectedUserId || isAdding}
                        className="bg-[#1D4F6D] hover:bg-[#163d56] text-white"
                    >
                        {isAdding ? 'Adding...' : `Add ${type === 'manager' ? 'Manager' : 'Worker'}`}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}

export function ProjectTeam() {
    const { toast } = useToast();
    const { id: projectId } = useParams<{ id: string }>();
    const { data, isLoading, error } = useProjectTeam(projectId ?? '');
    const { removeMember, isRemoving } = useRemoveTeamMember();
    const [addModalType, setAddModalType] = useState<'manager' | 'worker' | null>(null);

    const managers = (data?.managers ?? []).filter((manager: any) => {
        const status = (manager?.status || manager?.user?.status || '').toString().toLowerCase();
        return status === 'active' || status === '';
    });
    const workers = data?.workers ?? [];
    const allMembers = [
        ...managers.map((m: any) => ({ ...m, role: 'manager' })),
        ...workers.map((w: any) => ({ ...w, role: 'worker' })),
    ];

    const handleRemove = async (userId: string) => {
        if (!projectId) return;
        if (!window.confirm('Are you sure you want to remove this member from the project?')) return;
        try {
            await removeMember({ projectId, userId });
            toast.success('Member Removed', 'Team member has been removed from the project.');
        } catch (err: any) {
            console.error('Failed to remove member:', err);
            const errorMsg = err?.message || err?.details?.message || 'Failed to remove member';
            toast.error('Unable to Remove Member', errorMsg);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center py-16">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-12 text-red-500">
                Failed to load team members.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header Actions */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-gray-500" />
                    <span className="text-sm font-bold text-gray-600">
                        {allMembers.length} Team Member{allMembers.length !== 1 ? 's' : ''}
                    </span>
                    <span className="text-xs text-gray-400">
                        ({managers.length} managers, {workers.length} workers)
                    </span>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 border-gray-200"
                        onClick={() => setAddModalType('worker')}
                    >
                        <UserPlus className="h-4 w-4" />
                        Add Worker
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2 bg-[#1D4F6D] hover:bg-[#163d56] text-white"
                        onClick={() => setAddModalType('manager')}
                    >
                        <Shield className="h-4 w-4" />
                        Add Manager
                    </Button>
                </div>
            </div>

            {/* Team Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {allMembers.map((member: any) => {
                    const userId = member.userId || member.id;
                    const user = member.user || member;
                    const fullName = user.fullName || user.name || 'Team Member';
                    const avatarUrl = user.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;
                    const RoleIcon = getRoleIcon(member.role);
                    const roleColor = getRoleColor(member.role);

                    return (
                        <Card key={member.id || userId} className="overflow-hidden group hover:shadow-lg transition-all duration-300">
                            <CardContent className="p-0">
                                <div className="p-6">
                                    <div className="flex items-start justify-between">
                                        <div className="relative">
                                            <img
                                                src={avatarUrl}
                                                alt={fullName}
                                                className="h-16 w-16 rounded-2xl object-cover ring-4 ring-gray-50"
                                                onError={(e) => {
                                                    (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=random`;
                                                }}
                                            />
                                            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white ${getStatusColor(user.status)}`} />
                                        </div>
                                        <button
                                            type="button"
                                            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 border border-red-200/60 rounded-lg transition-all shadow-sm active:scale-95"
                                            onClick={() => handleRemove(userId)}
                                            disabled={isRemoving}
                                            title={`Remove ${fullName} from project`}
                                        >
                                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                            <span>Remove</span>
                                        </button>
                                    </div>

                                    <div className="mt-4">
                                        <div className="flex items-center gap-2">
                                            <h4 className="text-lg font-bold text-gray-900 truncate">{fullName}</h4>
                                        </div>
                                        <p className="text-sm text-gray-500 mt-0.5 capitalize">{member.role}</p>
                                    </div>

                                    <div className="mt-4 flex items-center gap-2">
                                        <div className={`p-1.5 rounded-lg ${roleColor}`}>
                                            <RoleIcon className="h-4 w-4" />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-700 capitalize">
                                            {member.role === 'manager' ? 'Project Manager' : 'Field Worker'}
                                        </span>
                                    </div>

                                    {user.email && (
                                        <p className="mt-2 text-xs text-gray-400 truncate">{user.email}</p>
                                    )}
                                </div>

                                <div className="border-t border-gray-100 p-4 bg-gray-50/50 flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 bg-white border-gray-100 hover:bg-gray-50 text-gray-600"
                                        onClick={() => user.email && window.open(`mailto:${user.email}`)}
                                        disabled={!user.email}
                                    >
                                        <Mail className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="flex-1 bg-white border-gray-100 hover:bg-gray-50 text-gray-600"
                                        onClick={() => user.phone && window.open(`tel:${user.phone}`)}
                                        disabled={!user.phone}
                                    >
                                        <Phone className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {/* Add Member Placeholder */}
                <button
                    className="h-full min-h-[250px] rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 hover:bg-gray-50 hover:border-blue-400 transition-all group"
                    onClick={() => setAddModalType('worker')}
                >
                    <div className="p-3 rounded-full bg-gray-50 group-hover:bg-blue-50 transition-colors">
                        <UserPlus className="h-6 w-6 text-gray-400 group-hover:text-blue-500" />
                    </div>
                    <p className="text-sm font-bold text-gray-500 group-hover:text-blue-600">Add Team Member</p>
                </button>
            </div>

            {allMembers.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                    <Users className="h-12 w-12 mx-auto mb-3 text-gray-200" />
                    <p className="font-bold">No team members yet</p>
                    <p className="text-sm mt-1">Add managers and workers to this project</p>
                </div>
            )}

            {/* Add Member Modal */}
            {addModalType && (
                <AddMemberModal
                    isOpen={!!addModalType}
                    onClose={() => setAddModalType(null)}
                    projectId={projectId ?? ''}
                    type={addModalType}
                    managers={managers}
                    existingMemberIds={allMembers.map((m: any) => m.userId || m.id)}
                />
            )}
        </div>
    );
}
