import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Plus, CheckSquare, Clock, MoreVertical, Edit, Edit2, UserPlus, Trash2, ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/authSlice';
import { buildRoute } from '@/config/routes';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Modal } from '@/shared/components/ui/Modal';
import { Label } from '@/shared/components/ui/Label';
import { Select } from '@/shared/components/ui/Select';
import { Switch } from '@/shared/components/ui/Switch';
import { Dropdown } from '@/shared/components/ui/Dropdown';
import { useTasks, useCreateTask, useAssignTask, useUpdateTask, useDeleteTask, useSubTasks, useCreateSubTask, useSubTaskDetails } from '../hooks/useTasks';
import { useProjectTeam, useProjectFloors } from '../hooks/useProjects';

export function ProjectTasks() {
    const { id: projectId } = useParams();
    const authUser = useAppSelector(selectAuthUser);
    const isSuperAdmin = authUser?.role === 'super_admin';
    const { data: tasks, isLoading } = useTasks(projectId ?? '');
    const { createTask, isCreating } = useCreateTask();
    const { assignTask, isAssigning } = useAssignTask();
    const { updateTask, isUpdating } = useUpdateTask();
    const { deleteTask, isDeleting } = useDeleteTask();
    
    // For assigning workers
    const { data: teamData } = useProjectTeam(projectId ?? '');
    const availableWorkers = teamData?.workers || [];
    const { data: floors } = useProjectFloors(projectId ?? '');

    // Modals State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isSubTaskModalOpen, setIsSubTaskModalOpen] = useState(false);
    const [selectedTaskForAssignment, setSelectedTaskForAssignment] = useState<any>(null);
    const [selectedWorkerId, setSelectedWorkerId] = useState<string>('');
    const [editTaskId, setEditTaskId] = useState<string | null>(null);
    const [deleteTaskId, setDeleteTaskId] = useState<string | null>(null);
    const [selectedTaskForSubTask, setSelectedTaskForSubTask] = useState<any>(null);

    const { createSubTask, isCreatingSubTask } = useCreateSubTask();

    // Form State for New Task Definition
    const [newTask, setNewTask] = useState<{
        title: string;
        description: string;
        estimatedHours: number;
        allowSubTaskCreation: boolean;
        floorIds: string[];
        unitIds: string[];
    }>({
        title: '',
        description: '',
        estimatedHours: 0,
        allowSubTaskCreation: false,
        floorIds: [],
        unitIds: []
    });

    const [newSubTask, setNewSubTask] = useState<{ title: string; description: string; estimatedHours: number; unitIds: string[] }>({
        title: '',
        description: '',
        estimatedHours: 0,
        unitIds: []
    });

    const selectedFloors = floors?.filter((f: any) => newTask.floorIds.includes(f.id)) || [];
    const floorUnits = selectedFloors.flatMap((f: any) => f.rooms || f.units || []);

    const allUnits = floors?.flatMap((f: any) => f.rooms || f.units || []) || [];

    const handleSaveTaskDef = async () => {
        if (!newTask.title || !projectId) return;
        try {
            const payload = {
                projectId,
                title: newTask.title,
                description: newTask.description,
                estimatedHours: newTask.estimatedHours,
                allowSubTaskCreation: newTask.allowSubTaskCreation,
                ...(newTask.floorIds.length ? { floorIds: newTask.floorIds } : {}),
                ...(newTask.unitIds.length ? { unitIds: newTask.unitIds } : {})
            };
            if (editTaskId) {
                await updateTask(editTaskId, payload);
            } else {
                await createTask(payload);
            }
            setIsAddModalOpen(false);
            setEditTaskId(null);
            setNewTask({ title: '', description: '', estimatedHours: 0, allowSubTaskCreation: false, floorIds: [], unitIds: [] });
        } catch (err) {
            console.error('Error saving task', err);
        }
    };

    const openEditModal = (task: any) => {
        setNewTask({
            title: task.title,
            description: task.description || '',
            estimatedHours: task.estimatedHours || 0,
            allowSubTaskCreation: task.allowSubTaskCreation ?? false,
            floorIds: task.taskFloors?.map((tf: any) => tf.floor?.id).filter(Boolean) || [],
            unitIds: task.taskUnits?.map((tu: any) => tu.unit?.id).filter(Boolean) || []
        });
        setEditTaskId(task.id);
        setIsAddModalOpen(true);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTaskId) return;
        try {
            await deleteTask(deleteTaskId);
            setIsDeleteModalOpen(false);
            setDeleteTaskId(null);
        } catch (err) {
            console.error('Error deleting task', err);
        }
    };

    const openAssignModal = (task: any) => {
        setSelectedTaskForAssignment(task);
        setIsAssignModalOpen(true);
    };

    const handleAssignConfirm = async (isUnassign: boolean = false) => {
        if (!selectedTaskForAssignment || (!selectedWorkerId && !isUnassign)) return;
        try {
            const payload = isUnassign ? { workerIds: [] } : { workerId: selectedWorkerId };
            await assignTask(selectedTaskForAssignment.id, payload);
            setIsAssignModalOpen(false);
            setSelectedTaskForAssignment(null);
            setSelectedWorkerId('');
        } catch (err) {
            console.error('Error assigning task', err);
        }
    };

    const handleSaveSubTask = async () => {
        if (!newSubTask.title || !selectedTaskForSubTask || newSubTask.unitIds.length === 0) return;
        try {
            await createSubTask(selectedTaskForSubTask.id, {
                title: newSubTask.title,
                description: newSubTask.description,
                estimatedHours: newSubTask.estimatedHours,
                unitIds: newSubTask.unitIds
            });
            setIsSubTaskModalOpen(false);
            setNewSubTask({ title: '', description: '', estimatedHours: 0, unitIds: [] });
            setSelectedTaskForSubTask(null);
        } catch (err) {
            console.error('Error creating subtask', err);
        }
    };

    if (isLoading) return <div className="p-8 text-center text-gray-500 font-medium">Loading tasks...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-gray-900">Project Tasks</h2>
                    <p className="text-xs text-gray-500 mt-1 uppercase tracking-tight font-bold">Manage tasks and assignments</p>
                </div>
                {!isSuperAdmin && (
                    <Button onClick={() => setIsAddModalOpen(true)} className="gap-2 h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                        <Plus className="h-4 w-4" />
                        Create Task
                    </Button>
                )}
            </div>

            {/* Task Definition Modal */}
            <Modal
                isOpen={isAddModalOpen}
                onClose={() => {
                    setIsAddModalOpen(false);
                    setEditTaskId(null);
                    setNewTask({ title: '', description: '', estimatedHours: 0, allowSubTaskCreation: false, floorIds: [], unitIds: [] });
                }}
                title={editTaskId ? "Edit Task" : "Create Task"}
                maxWidth="md"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Task Title</Label>
                            <Input
                                value={newTask.title}
                                onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                placeholder="e.g. Install Kitchen Cabinets"
                                className="font-bold"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                value={newTask.description}
                                onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                placeholder="Task details..."
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Estimated Hours</Label>
                                <Input
                                    type="number"
                                    value={newTask.estimatedHours || ''}
                                    onChange={(e) => setNewTask({ ...newTask, estimatedHours: Number(e.target.value) })}
                                    placeholder="e.g. 4"
                                />
                            </div>
                            <div className="flex items-center space-x-2 pt-8">
                                <Switch
                                    checked={newTask.allowSubTaskCreation}
                                    onCheckedChange={(checked) => setNewTask(prev => ({ ...prev, allowSubTaskCreation: checked }))}
                                />
                                <Label className="mb-0 text-sm font-medium text-gray-700 cursor-pointer">Allow Subtasks</Label>
                            </div>
                        </div>
                        <div className="space-y-4 pt-2">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label>Floors / Sections (Optional)</Label>
                                    {floors && floors.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                if (newTask.floorIds.length === floors.length) {
                                                    setNewTask(prev => ({ ...prev, floorIds: [], unitIds: [] }));
                                                } else {
                                                    const allFloorIds = floors.map((f: any) => f.id);
                                                    const validUnits = floors
                                                        .flatMap((fl: any) => fl.rooms || fl.units || [])
                                                        .map((u: any) => u.id);
                                                    setNewTask(prev => ({ ...prev, floorIds: allFloorIds, unitIds: validUnits }));
                                                }
                                            }}
                                            className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-blue-700 font-medium transition-colors"
                                        >
                                            <span>Select All</span>
                                            <input 
                                                type="checkbox" 
                                                className="w-3.5 h-3.5 cursor-pointer accent-blue-600" 
                                                checked={newTask.floorIds.length > 0 && newTask.floorIds.length === floors.length} 
                                                readOnly 
                                            />
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {floors?.map((f: any) => {
                                        const isSelected = newTask.floorIds.includes(f.id);
                                        return (
                                            <button
                                                key={f.id}
                                                type="button"
                                                onClick={() => {
                                                    setNewTask(prev => {
                                                        const newFloorIds = isSelected
                                                            ? prev.floorIds.filter(id => id !== f.id)
                                                            : [...prev.floorIds, f.id];
                                                        // Also remove unitIds that belong to the unselected floor
                                                        const validFloorIds = new Set(newFloorIds);
                                                        const validUnits = (floors || [])
                                                            .filter((fl: any) => validFloorIds.has(fl.id))
                                                            .flatMap((fl: any) => fl.rooms || fl.units || [])
                                                            .map((u: any) => u.id);
                                                        const validUnitSet = new Set(validUnits);
                                                        const newUnitIds = prev.unitIds.filter(uid => validUnitSet.has(uid));
                                                        
                                                        return { ...prev, floorIds: newFloorIds, unitIds: newUnitIds };
                                                    });
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                    isSelected 
                                                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-50/50'
                                                }`}
                                            >
                                                {f.name || 'Unnamed Floor'}
                                            </button>
                                        );
                                    })}
                                    {(!floors || floors.length === 0) && (
                                        <p className="text-xs text-gray-400">No floors available</p>
                                    )}
                                </div>
                            </div>
                            
                            {newTask.floorIds.length > 0 && floorUnits.length > 0 && (
                                <div className="space-y-2">
                                    <Label>Units / Rooms (Optional)</Label>
                                    <div className="flex flex-wrap gap-2">
                                        {floorUnits.map((u: any) => {
                                            const isSelected = newTask.unitIds.includes(u.id);
                                            return (
                                                <button
                                                    key={u.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setNewTask(prev => ({
                                                            ...prev,
                                                            unitIds: isSelected
                                                                ? prev.unitIds.filter(id => id !== u.id)
                                                                : [...prev.unitIds, u.id]
                                                        }));
                                                    }}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                        isSelected 
                                                            ? 'bg-blue-50 border-blue-200 text-blue-700' 
                                                            : 'bg-white border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-50/50'
                                                    }`}
                                                >
                                                    {u.name || 'Unnamed Unit'}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-blue-600 hover:bg-blue-700 text-white"
                            onClick={handleSaveTaskDef}
                            disabled={!newTask.title || isCreating || isUpdating}
                        >
                            {isCreating || isUpdating ? (editTaskId ? 'Saving...' : 'Creating...') : (editTaskId ? 'Save Changes' : 'Create Task')}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Assign Task Modal */}
            <Modal
                isOpen={isAssignModalOpen}
                onClose={() => setIsAssignModalOpen(false)}
                title="Assign Task"
                maxWidth="md"
            >
                <div className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Select Worker</Label>
                            <Select
                                value={selectedWorkerId}
                                onChange={(e) => setSelectedWorkerId(e.target.value)}
                                options={[
                                    { value: '', label: 'Select a worker...' },
                                    ...(availableWorkers.map((w: any) => {
                                        const uid = w.userId || w.id || w.user?.id;
                                        return {
                                            value: uid,
                                            label: w.user?.fullName || w.fullName || 'Unknown'
                                        };
                                    }))
                                ]}
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100 flex justify-between items-center gap-3">
                        <Button 
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                            onClick={() => handleAssignConfirm(true)}
                            disabled={isAssigning}
                        >
                            Remove Assignment
                        </Button>
                        <div className="flex gap-3">
                            <Button variant="outline" onClick={() => setIsAssignModalOpen(false)}>Cancel</Button>
                            <Button
                                className="bg-blue-600 hover:bg-blue-700 text-white"
                                onClick={() => handleAssignConfirm(false)}
                                disabled={!selectedWorkerId || isAssigning}
                            >
                                {isAssigning ? 'Assigning...' : 'Assign Worker'}
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>

            {/* Tasks List */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {tasks?.length === 0 ? (
                    <div className="col-span-full border-2 border-dashed border-gray-200 rounded-2xl p-12 text-center">
                        <div className="mx-auto w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3">
                            <CheckSquare className="h-6 w-6 text-gray-400" />
                        </div>
                        <h3 className="text-sm font-bold text-gray-900 mb-1">No tasks defined</h3>
                        <p className="text-xs text-gray-500 mb-4 max-w-sm mx-auto">Create tasks to track progress across floors and units.</p>
                        <Button onClick={() => setIsAddModalOpen(true)} variant="outline" className="text-xs font-bold border-gray-200">
                            Create First Task
                        </Button>
                    </div>
                ) : (
                    tasks?.map((task: any) => (
                        <ProjectTaskCard
                            key={task.id}
                            task={task}
                            isSuperAdmin={isSuperAdmin}
                            onEdit={openEditModal}
                            onAssign={openAssignModal}
                            onDelete={(t) => { setDeleteTaskId(t.id); setIsDeleteModalOpen(true); }}
                            onAddSubtask={(t) => { 
                                setSelectedTaskForSubTask(t);
                                const defaultUnitIds = t.taskUnits?.[0]?.unit?.id ? [t.taskUnits[0].unit.id] : [];
                                setNewSubTask({ title: '', description: '', estimatedHours: 0, unitIds: defaultUnitIds });
                                setIsSubTaskModalOpen(true); 
                            }}
                        />
                    ))
                )}
            </div>

            {/* Delete Confirmation Modal */}
            <Modal
                isOpen={isDeleteModalOpen}
                onClose={() => setIsDeleteModalOpen(false)}
                title="Delete Task"
                maxWidth="sm"
            >
                <div className="space-y-6">
                    <p className="text-sm text-gray-600">Are you sure you want to delete this task? This action cannot be undone.</p>
                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                        >
                            {isDeleting ? 'Deleting...' : 'Delete'}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Create Subtask Modal */}
            <Modal
                isOpen={isSubTaskModalOpen}
                onClose={() => {
                    setIsSubTaskModalOpen(false);
                    setSelectedTaskForSubTask(null);
                    setNewSubTask({ title: '', description: '', estimatedHours: 0, unitIds: [] });
                }}
                title="Create Subtask"
                maxWidth="md"
            >
                <div className="space-y-6">
                    {selectedTaskForSubTask?.taskUnits?.length === 0 && (
                        <div className="bg-yellow-50 text-yellow-800 p-3 rounded-lg text-sm mb-4">
                            <strong>Warning:</strong> This task has no units assigned. Subtasks require a unit. Please edit the task and assign units first.
                        </div>
                    )}
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Subtask Title *</Label>
                            <Input
                                placeholder="E.g., Fix the broken window hinge"
                                value={newSubTask.title}
                                onChange={(e) => setNewSubTask(prev => ({ ...prev, title: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Input
                                placeholder="Additional details..."
                                value={newSubTask.description}
                                onChange={(e) => setNewSubTask(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Est. Hours</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    value={newSubTask.estimatedHours || ''}
                                    onChange={(e) => setNewSubTask(prev => ({ ...prev, estimatedHours: parseFloat(e.target.value) || 0 }))}
                                />
                            </div>
                            <div className="space-y-2 col-span-2">
                                <div className="flex justify-between items-center">
                                    <Label>Units *</Label>
                                    {selectedTaskForSubTask?.taskUnits && selectedTaskForSubTask.taskUnits.length > 0 && (
                                        <button
                                            type="button"
                                            onClick={() => {
                                                const validUnits = selectedTaskForSubTask.taskUnits.filter((tu: any) => tu.unit).map((tu: any) => tu.unit.id);
                                                if (newSubTask.unitIds.length === validUnits.length && validUnits.length > 0) {
                                                    setNewSubTask(prev => ({ ...prev, unitIds: [] }));
                                                } else {
                                                    setNewSubTask(prev => ({ ...prev, unitIds: validUnits }));
                                                }
                                            }}
                                            className="flex items-center gap-1.5 text-xs text-gray-700 hover:text-blue-700 font-medium transition-colors"
                                        >
                                            <span>Select All</span>
                                            <input 
                                                type="checkbox" 
                                                className="w-3.5 h-3.5 cursor-pointer accent-blue-600" 
                                                checked={newSubTask.unitIds.length > 0 && newSubTask.unitIds.length === selectedTaskForSubTask.taskUnits.filter((tu: any) => tu.unit).length} 
                                                readOnly 
                                            />
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {selectedTaskForSubTask?.taskUnits?.map((tu: any) => {
                                        const u = tu.unit;
                                        if (!u) return null;
                                        const isSelected = newSubTask.unitIds.includes(u.id);
                                        return (
                                            <button
                                                key={u.id}
                                                type="button"
                                                onClick={() => {
                                                    setNewSubTask(prev => ({
                                                        ...prev,
                                                        unitIds: isSelected 
                                                            ? prev.unitIds.filter(id => id !== u.id)
                                                            : [...prev.unitIds, u.id]
                                                    }));
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                                    isSelected 
                                                        ? 'bg-purple-50 border-purple-200 text-purple-700' 
                                                        : 'bg-white border-gray-200 text-gray-600 hover:border-purple-200 hover:bg-purple-50'
                                                }`}
                                            >
                                                {u.name}
                                                {u.floor?.name && <span className="text-[10px] ml-1 opacity-70">({u.floor.name})</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                                {newSubTask.unitIds.length === 0 && (
                                    <p className="text-[10px] text-red-500 mt-1">Please select at least one unit.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="pt-4 border-t border-gray-100 flex justify-end gap-3">
                        <Button variant="outline" onClick={() => setIsSubTaskModalOpen(false)}>Cancel</Button>
                        <Button
                            className="bg-purple-600 hover:bg-purple-700 text-white"
                            onClick={handleSaveSubTask}
                            disabled={!newSubTask.title || newSubTask.unitIds.length === 0 || isCreatingSubTask}
                        >
                            {isCreatingSubTask ? 'Creating...' : 'Create Subtask'}
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

function ProjectTaskCard({ task, isSuperAdmin, onEdit, onAssign, onDelete, onAddSubtask }: { task: any, isSuperAdmin: boolean, onEdit: (t: any) => void, onAssign: (t: any) => void, onDelete: (t: any) => void, onAddSubtask: (t: any) => void }) {
    const navigate = useNavigate();
    const { data: subtasksRaw, isLoading } = useSubTasks(task.id);
    const subtasks = (subtasksRaw as any)?.data || (Array.isArray(subtasksRaw) ? subtasksRaw : []);
    const [isExpanded, setIsExpanded] = useState(false);

    return (
        <Card className="hover:border-blue-200 transition-all group overflow-hidden">
            <div className="p-5">
                <div 
                    className="cursor-pointer" 
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex justify-between items-start mb-3">
                        <h4 className="font-bold text-gray-900 text-sm">{task.title}</h4>
                        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <Badge variant="secondary" className="uppercase text-[10px] font-bold tracking-wider">{task.status}</Badge>
                            <Dropdown
                                align="right"
                                trigger={
                                    <button className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100">
                                        <MoreVertical className="h-4 w-4" />
                                    </button>
                                }
                                items={isSuperAdmin ? [
                                    { label: 'Full Details', icon: ExternalLink, onClick: () => navigate(buildRoute.taskDetail(task.projectId || task.project?.id, task.id)) },
                                ] : [
                                    { label: 'Edit Task', icon: Edit, onClick: () => onEdit(task) },
                                    { label: 'Full Details', icon: ExternalLink, onClick: () => navigate(buildRoute.taskDetail(task.projectId || task.project?.id, task.id)) },
                                    { label: 'Delete Task', icon: Trash2, variant: 'destructive', onClick: () => onDelete(task) }
                                ]}
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-500 mb-4 line-clamp-2 min-h-[32px]">{task.description || 'No description provided.'}</p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-gray-50 p-2 rounded-lg border border-gray-100">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                                <Clock className="h-3 w-3" />
                                Est. Hours
                            </div>
                            <div className="text-sm font-bold text-gray-900">{task.estimatedHours || 0} hrs</div>
                        </div>
                        <div className="bg-blue-50 p-2 rounded-lg border border-blue-100">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1">
                                <CheckSquare className="h-3 w-3" />
                                Assignments
                            </div>
                            <div className="text-sm font-bold text-blue-900">{task.assignedWorkerCount || task.assignees?.length || 0} Workers</div>
                        </div>
                    </div>
                    
                    {/* Show Locations */}
                    {(task.taskFloors?.length > 0 || task.taskUnits?.length > 0) && (
                        <div className="flex flex-wrap gap-1 mb-4">
                            {task.taskFloors?.map((tf: any) => (
                                <Badge key={`f-${tf.floor?.id}`} variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 border-purple-100">
                                    {tf.floor?.name || 'Floor'}
                                </Badge>
                            ))}
                            {task.taskUnits?.map((tu: any) => (
                                <Badge key={`u-${tu.unit?.id}`} variant="secondary" className="text-[10px] bg-orange-50 text-orange-700 border-orange-100">
                                    {tu.unit?.name || 'Unit'}
                                </Badge>
                            ))}
                        </div>
                    )}
                </div>

                {/* Subtasks Accordion Toggle */}
                {subtasks.length > 0 && (
                    <button 
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="w-full flex items-center justify-between text-xs font-bold text-gray-600 bg-gray-50 p-2 rounded-lg hover:bg-gray-100 transition-colors mb-4"
                    >
                        <span>{subtasks.length} Subtask{subtasks.length > 1 ? 's' : ''}</span>
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                )}

                {/* Subtasks List */}
                {isExpanded && subtasks.length > 0 && (
                    <div className="mb-4 space-y-2">
                        {subtasks.map((st: any) => (
                            <div 
                                key={st.id} 
                                className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-lg shadow-sm cursor-pointer hover:border-blue-200 transition-colors"
                                onClick={(e) => { 
                                    e.stopPropagation(); 
                                    navigate(buildRoute.subtaskDetail(task.projectId || task.project?.id, st.id));
                                }}
                            >
                                <div>
                                    <h5 className="text-xs font-bold text-gray-800">{st.title || (st.task && st.task.title)}</h5>
                                    <span className="text-[10px] text-gray-500 uppercase font-bold">{st.status || (st.task && st.task.status)}</span>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {(st.units || st.subTaskUnits)?.length > 0 && (
                                        <div className="flex flex-wrap gap-1 justify-end">
                                            {(st.units || st.subTaskUnits).map((stu: any) => {
                                                const unitName = stu.unit?.name || stu.name;
                                                const floorName = stu.unit?.floor?.name || stu.floor?.name;
                                                return (
                                                    <span key={stu.id || stu.unit?.id} className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-100">
                                                        {floorName} • {unitName}
                                                    </span>
                                                );
                                            })}
                                        </div>
                                    )}
                                    <div className="text-[10px] font-bold text-gray-400 bg-gray-50 px-2 py-1 rounded w-fit">
                                        {st.estimatedHours || (st.task && st.task.estimatedHours) || 0} hrs
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {!isSuperAdmin && (
                    <div className="pt-4 border-t border-gray-100 flex gap-2">
                        <Button
                            variant="outline"
                            className="flex-1 text-xs font-bold gap-2 border-gray-200 text-gray-700 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50"
                            onClick={() => onAssign(task)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Assign Worker
                        </Button>
                        <Button
                            variant="outline"
                            className="flex-1 text-xs font-bold gap-2 border-gray-200 text-gray-700 hover:text-purple-600 hover:border-purple-200 hover:bg-purple-50"
                            onClick={() => onAddSubtask(task)}
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Subtask
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}
