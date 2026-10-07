import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CheckCircle, XCircle, DollarSign, FileText, Search, ExternalLink, Loader2, Plus, Upload, RotateCcw, Edit2, AlertTriangle } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Table } from '@/shared/components/ui/Table';
import { Select } from '@/shared/components/ui/Select';
import { Modal } from '@/shared/components/ui/Modal';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';
import { apiClient, API_ENDPOINTS } from '@/services';
import { getStatusColor } from '@/shared/utils';

interface ExpenseItem {
    id: string;
    workerName: string;
    description: string;
    category: string;
    subtotal: number;
    tax: number;
    totalAmount: number;
    amount: number;
    projectId?: string;
    projectName?: string;
    taskId?: string;
    date: string;
    status: 'pending' | 'approved' | 'rejected' | 'draft' | 'paid';
    receiptUrl?: string;
    rejectionReason?: string;
}

interface ProjectOption {
    id: string;
    name: string;
}

function normalizeStatus(rawStatus?: string): 'pending' | 'approved' | 'rejected' | 'draft' | 'paid' {
    const s = (rawStatus || '').toUpperCase();
    if (s === 'APPROVED') return 'approved';
    if (s === 'REJECTED') return 'rejected';
    if (s === 'PAID') return 'paid';
    if (s === 'DRAFT') return 'draft';
    return 'pending'; // SUBMITTED or PENDING
}

export function ExpensesPage() {
    const location = useLocation();
    const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [selectedExpense, setSelectedExpense] = useState<ExpenseItem | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);
    const [showRejectConfirmModal, setShowRejectConfirmModal] = useState(false);
    const [rejectReason, setRejectReason] = useState('Not approved');

    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newExpense, setNewExpense] = useState({
        title: '',
        expenseDate: new Date().toISOString().split('T')[0],
        subtotal: 0,
        tax: 0,
        totalAmount: 0,
        category: 'Miscellaneous',
        paymentMethod: 'Cash',
        projectId: '',
        vendor: '',
        taskId: '',
        subTaskId: '',
        notes: '',
    });
    const [projectTasks, setProjectTasks] = useState<any[]>([]);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleProjectChange = async (projectId: string) => {
        setNewExpense(prev => ({ ...prev, projectId, taskId: '', subTaskId: '' }));
        if (!projectId) {
            setProjectTasks([]);
            return;
        }
        try {
            const res = await apiClient.get<any>(`${API_ENDPOINTS.EXPENSES.PROJECTS}/${projectId}/tasks`);
            const list = Array.isArray(res?.data?.data)
                ? res.data.data
                : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
            setProjectTasks(list);
        } catch {
            setProjectTasks([]);
        }
    };

    const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);

    const handleEditClick = async (expense: ExpenseItem) => {
        setEditingExpenseId(expense.id);
        setNewExpense({
            title: expense.description,
            expenseDate: expense.date.split('T')[0],
            subtotal: expense.subtotal,
            tax: expense.tax,
            totalAmount: expense.totalAmount,
            category: expense.category,
            paymentMethod: 'Cash',
            projectId: expense.projectId || '',
            vendor: '',
            taskId: expense.taskId || '',
            subTaskId: '',
            notes: expense.description,
        });

        if (expense.projectId) {
            try {
                const res = await apiClient.get<any>(`${API_ENDPOINTS.EXPENSES.PROJECTS}/${expense.projectId}/tasks`);
                const list = Array.isArray(res?.data?.data) ? res.data.data : (Array.isArray(res?.data) ? res.data : []);
                setProjectTasks(list);
            } catch {
                setProjectTasks([]);
            }
        } else {
            setProjectTasks([]);
        }

        setShowDetailModal(false);
        setShowCreateModal(true);
    };

    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsCreating(true);
        try {
            const payload: any = { ...newExpense };
            if (!payload.taskId) delete payload.taskId;
            if (!payload.subTaskId) delete payload.subTaskId;
            if (!payload.projectId) delete payload.projectId;

            if (editingExpenseId) {
                if (receiptFile) {
                    await apiClient.uploadFile(
                        API_ENDPOINTS.EXPENSES.UPDATE(editingExpenseId),
                        receiptFile,
                        payload,
                        'receipt',
                        'PATCH'
                    );
                } else {
                    await apiClient.patch(API_ENDPOINTS.EXPENSES.UPDATE(editingExpenseId), payload);
                }
                await apiClient.post(API_ENDPOINTS.EXPENSES.SUBMIT(editingExpenseId));
            } else {
                if (receiptFile) {
                    await apiClient.uploadFile(
                        API_ENDPOINTS.EXPENSES.CREATE,
                        receiptFile,
                        { ...payload, action: 'SUBMITTED' },
                        'receipt'
                    );
                } else {
                    await apiClient.post(API_ENDPOINTS.EXPENSES.CREATE, { ...payload, action: 'SUBMITTED' });
                }
            }
            setShowCreateModal(false);
            setEditingExpenseId(null);
            setNewExpense({
                title: '',
                expenseDate: new Date().toISOString().split('T')[0],
                subtotal: 0,
                tax: 0,
                totalAmount: 0,
                category: 'Miscellaneous',
                paymentMethod: 'Cash',
                projectId: '',
                vendor: '',
                taskId: '',
                subTaskId: '',
                notes: '',
            });
            setProjectTasks([]);
            setReceiptFile(null);
            fetchExpenses();
        } catch (err) {
            console.error('Failed to create expense:', err);
        } finally {
            setIsCreating(false);
        }
    };

    // Local state for modal editing
    const [editProjectId, setEditProjectId] = useState('');

    const fetchExpenses = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get<any>(API_ENDPOINTS.EXPENSES.LIST);
            const rawList = Array.isArray(res?.data?.data)
                ? res.data.data
                : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
            const mapped: ExpenseItem[] = rawList.map((item: any) => ({
                id: item.id,
                workerName: item.createdBy?.fullName || item.workerName || 'Unknown Worker',
                description: item.title || item.notes || item.description || 'Expense submission',
                category: item.category || 'General',
                subtotal: Number(item.subtotal ?? item.amount ?? 0),
                tax: Number(item.tax ?? 0),
                totalAmount: Number(item.totalAmount ?? item.amount ?? 0),
                amount: Number(item.totalAmount ?? item.amount ?? 0),
                projectId: item.projectId || item.project?.id || '',
                projectName: item.project?.name || item.projectName || '',
                taskId: item.taskId || '',
                date: item.expenseDate || item.date || item.createdAt || new Date().toISOString(),
                status: normalizeStatus(item.status),
                receiptUrl: item.receiptUrl || '',
                rejectionReason: item.rejectionNote || item.rejectionReason || '',
            }));
            setExpenses(mapped);
        } catch {
            setExpenses([]);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchProjects = async () => {
        try {
            const res = await apiClient.get<any>(API_ENDPOINTS.EXPENSES.PROJECTS);
            const list = Array.isArray(res?.data?.data)
                ? res.data.data
                : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));
            setProjects(list.map((p: any) => ({ id: p.id, name: p.name })));
        } catch {
            setProjects([]);
        }
    };

    useEffect(() => {
        void fetchExpenses();
        void fetchProjects();
        if (new URLSearchParams(location.search).get('create') === 'true') {
            setShowCreateModal(true);
        }
    }, [location.search]);

    const filteredExpenses = expenses.filter(expense => {
        const matchesSearch = expense.workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            expense.description.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleApprove = async () => {
        if (!selectedExpense) return;
        setIsActionLoading(true);
        try {
            await apiClient.post(API_ENDPOINTS.EXPENSES.APPROVE(selectedExpense.id));
            setExpenses(prev => prev.map(e => e.id === selectedExpense.id ? { ...e, status: 'approved' as const } : e));
            setShowDetailModal(false);
        } catch (err) {
            console.error('Failed to approve expense:', err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const openRejectConfirmModal = () => {
        setRejectReason('Not approved');
        setShowRejectConfirmModal(true);
    };

    const handleConfirmReject = async () => {
        if (!selectedExpense) return;

        setIsActionLoading(true);
        const reason = rejectReason.trim() || 'Not approved';
        try {
            await apiClient.post(API_ENDPOINTS.EXPENSES.REJECT(selectedExpense.id), { comment: reason });
            setExpenses(prev => prev.map(e => e.id === selectedExpense.id ? { ...e, status: 'rejected' as const, rejectionReason: reason } : e));
            setShowRejectConfirmModal(false);
            setShowDetailModal(false);
        } catch (err) {
            console.error('Failed to reject expense:', err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleRequestRevision = async (reason: string) => {
        if (!selectedExpense) return;
        setIsActionLoading(true);
        try {
            await apiClient.post(API_ENDPOINTS.EXPENSES.REQUEST_REVISION(selectedExpense.id), { comment: reason });
            setExpenses(prev => prev.map(e => e.id === selectedExpense.id ? { ...e, status: 'draft' as const, rejectionReason: reason } : e));
            setShowDetailModal(false);
        } catch (err) {
            console.error('Failed to request revision:', err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const openDetailModal = (expense: ExpenseItem) => {
        setSelectedExpense(expense);
        setEditProjectId(expense.projectId || '');
        setShowDetailModal(true);
    };

    const pendingAmount = filteredExpenses.filter(e => e.status === 'pending').reduce((sum, e) => sum + (e.totalAmount || 0), 0);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <PageHeader
                    title="Expense & Receipt Management"
                    description="Review and approve worker expense submissions"
                    icon={DollarSign}
                />
                <Button onClick={() => setShowCreateModal(true)} className="bg-blue-600 hover:bg-blue-700 text-white">
                    <Plus className="w-4 h-4 mr-2" />
                    Create Expense
                </Button>
            
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-600">Pending Approval</div>
                            <div className="text-3xl font-bold text-yellow-600 mt-2">
                                {expenses.filter(e => e.status === 'pending').length}
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <FileText className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-600">Pending Amount</div>
                            <div className="text-2xl font-bold text-gray-900 mt-2">
                                ${pendingAmount.toFixed(2)}
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                            <DollarSign className="w-6 h-6 text-orange-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-600">Approved</div>
                            <div className="text-3xl font-bold text-green-600 mt-2">
                                {expenses.filter(e => e.status === 'approved').length}
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                            <CheckCircle className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-600">Rejected</div>
                            <div className="text-3xl font-bold text-red-600 mt-2">
                                {expenses.filter(e => e.status === 'rejected').length}
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Filters */}
            <Card className="p-6">
                <div className="flex gap-4">
                    <div className="flex-1">
                        <Input
                            placeholder="Search by worker or description..."
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
                            { value: 'pending', label: 'Pending' },
                            { value: 'approved', label: 'Approved' },
                            { value: 'rejected', label: 'Rejected' }
                        ]}
                    />
                </div>
            </Card>

            {/* Expenses Table */}
            <Card>
                <div className="p-6 border-b flex items-center justify-between">
                    <h3 className="text-lg font-semibold">Expense Submissions</h3>
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
                </div>
                <Table
                    data={filteredExpenses}
                    columns={[
                        {
                            key: 'workerName',
                            header: 'Worker Profile',
                            render: (expense) => (
                                <div className="flex items-center gap-3">
                                    <Avatar className="h-9 w-9 border border-gray-100 shadow-sm">
                                        <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(expense.workerName)}&background=random`} />
                                        <AvatarFallback className="bg-orange-50 text-orange-700 font-bold">
                                            {expense.workerName.charAt(0)}
                                        </AvatarFallback>
                                    </Avatar>
                                    <span className="font-bold text-gray-900">{expense.workerName}</span>
                                </div>
                            )
                        },
                        {
                            key: 'description',
                            header: 'Description',
                            render: (expense) => <span className="text-gray-600 truncate max-w-[200px] block">{expense.description}</span>
                        },
                        {
                            key: 'category',
                            header: 'Category',
                            render: (expense) => <Badge variant="secondary">{expense.category}</Badge>
                        },
                        {
                            key: 'subtotal',
                            header: 'Subtotal',
                            render: (expense) => <span className="text-gray-600">${(expense.subtotal ?? 0).toFixed(2)}</span>
                        },
                        {
                            key: 'tax',
                            header: 'Tax',
                            render: (expense) => <span className="text-gray-600">${(expense.tax ?? 0).toFixed(2)}</span>
                        },
                        {
                            key: 'totalAmount',
                            header: 'Total Amount',
                            render: (expense) => <span className="font-semibold text-gray-900">${(expense.totalAmount ?? expense.amount ?? 0).toFixed(2)}</span>
                        },
                        {
                            key: 'projectName',
                            header: 'Project',
                            render: (expense) => <span className="text-sm text-gray-600">{expense.projectName || '-'}</span>
                        },
                        {
                            key: 'date',
                            header: 'Date',
                            render: (expense) => <span className="text-sm">{new Date(expense.date).toLocaleDateString()}</span>
                        },
                        {
                            key: 'status',
                            header: 'Status',
                            render: (expense) => (
                                <Badge className={getStatusColor(expense.status)}>
                                    {expense.status}
                                </Badge>
                            )
                        },
                        {
                            key: 'actions',
                            header: 'Actions',
                            render: (expense) => (
                                <div className="flex items-center gap-2">
                                    <Button size="sm" variant="outline" onClick={() => openDetailModal(expense)}>
                                        View Details
                                    </Button>
                                </div>
                            )
                        }
                    ]}
                />
            </Card>

            {/* Expense Detail Modal */}
            {selectedExpense && (
                <Modal
                    isOpen={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    title="Expense Details"
                >
                    <div className="space-y-6">
                        {/* Receipt Image */}
                        {selectedExpense.receiptUrl ? (
                            <div className="bg-gray-100 rounded-lg overflow-hidden border border-gray-200 relative group">
                                <img
                                    src={selectedExpense.receiptUrl}
                                    alt="Receipt"
                                    className="w-full h-64 object-contain"
                                />
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button variant="secondary" onClick={() => window.open(selectedExpense.receiptUrl, '_blank')}>
                                        <ExternalLink className="w-4 h-4 mr-2" />
                                        Open Original
                                    </Button>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center bg-gray-50 rounded-lg border border-dashed text-gray-400 text-sm">
                                No receipt attached
                            </div>
                        )}

                        {/* Details */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <div className="text-sm text-gray-600">Worker</div>
                                <div className="font-semibold">{selectedExpense.workerName}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Category</div>
                                <div className="font-semibold">{selectedExpense.category}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Subtotal</div>
                                <div className="font-semibold text-gray-800">${(selectedExpense.subtotal ?? 0).toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Tax</div>
                                <div className="font-semibold text-gray-800">${(selectedExpense.tax ?? 0).toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Total Amount</div>
                                <div className="font-semibold text-lg text-indigo-700">${(selectedExpense.totalAmount ?? selectedExpense.amount ?? 0).toFixed(2)}</div>
                            </div>
                            <div>
                                <div className="text-sm text-gray-600">Date</div>
                                <div className="font-semibold">{new Date(selectedExpense.date).toLocaleDateString()}</div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <div className="text-sm text-gray-600 mb-1">Description</div>
                            <p className="text-gray-700 bg-gray-50 p-3 rounded-md border border-gray-100">
                                {selectedExpense.description}
                            </p>
                        </div>

                        {/* Project Assignment */}
                        <div className="pt-4 border-t">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Project</label>
                            <Select
                                value={editProjectId}
                                onChange={(e) => setEditProjectId(e.target.value)}
                                options={[
                                    { value: '', label: 'Select Project...' },
                                    ...projects.map(p => ({ value: p.id, label: p.name }))
                                ]}
                                disabled={selectedExpense.status !== 'pending'}
                            />
                        </div>

                        {selectedExpense.status === 'rejected' && selectedExpense.rejectionReason && (
                            <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                                <div className="text-sm font-medium text-red-800 mb-1">Rejection Reason</div>
                                <p className="text-red-700">{selectedExpense.rejectionReason}</p>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex justify-end gap-3 pt-4 border-t">
                            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                                Close
                            </Button>
                            {selectedExpense.status === 'pending' && (
                                <>
                                    <Button
                                        variant="destructive"
                                        disabled={isActionLoading}
                                        onClick={openRejectConfirmModal}
                                    >
                                        <XCircle className="w-4 h-4 mr-2" />
                                        Reject
                                    </Button>
                                    <Button
                                        variant="outline"
                                        className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:text-orange-700"
                                        disabled={isActionLoading}
                                        onClick={() => handleRequestRevision('Revision requested by admin')}
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Request Revision
                                    </Button>
                                    <Button
                                        disabled={isActionLoading}
                                        onClick={handleApprove}
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                    >
                                        <CheckCircle className="w-4 h-4 mr-2" />
                                        Approve
                                    </Button>
                                </>
                            )}
                            {(selectedExpense.status === 'draft' || selectedExpense.status === 'rejected') && (
                                <Button
                                    className="bg-blue-600 hover:bg-blue-700 text-white"
                                    onClick={() => handleEditClick(selectedExpense)}
                                >
                                    <Edit2 className="w-4 h-4 mr-2" />
                                    Edit & Resubmit
                                </Button>
                            )}
                        </div>
                    </div>
                </Modal>
            )}

            {/* Custom Reject Expense Confirmation Modal */}
            <Modal
                isOpen={showRejectConfirmModal}
                onClose={() => {
                    if (!isActionLoading) {
                        setShowRejectConfirmModal(false);
                    }
                }}
                title="Reject Expense"
                maxWidth="md"
                zIndex={120}
            >
                <div className="space-y-5 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-base font-bold text-gray-900">
                                Permanently Reject this Expense?
                            </h4>
                            <p className="text-sm text-gray-500 leading-relaxed">
                                Are you sure you want to permanently reject this expense? Once rejected, it cannot be edited or resubmitted, and it will not count towards project spending.
                            </p>
                        </div>
                    </div>

                    {selectedExpense && (
                        <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 text-sm space-y-1 text-left">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Expense:</span>
                                <span className="font-semibold text-gray-800">{selectedExpense.description}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Amount:</span>
                                <span className="font-semibold text-gray-900">${(selectedExpense.totalAmount ?? selectedExpense.amount ?? 0).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Worker:</span>
                                <span className="font-medium text-gray-700">{selectedExpense.workerName}</span>
                            </div>
                        </div>
                    )}

                    <div className="text-left">
                        <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                            Rejection Reason
                        </label>
                        <Input
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            placeholder="e.g., Not approved, invalid receipt, policy violation"
                            disabled={isActionLoading}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-3 border-t border-gray-100">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setShowRejectConfirmModal(false)}
                            disabled={isActionLoading}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            variant="destructive"
                            disabled={isActionLoading}
                            onClick={handleConfirmReject}
                            className="bg-red-600 hover:bg-red-700 text-white font-bold"
                        >
                            {isActionLoading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Rejecting...
                                </>
                            ) : (
                                <>
                                    <XCircle className="w-4 h-4 mr-1.5" />
                                    Reject Expense
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Create Expense Modal */}
            <Modal
                isOpen={showCreateModal}
                onClose={() => {
                    setShowCreateModal(false);
                    setEditingExpenseId(null);
                }}
                title={editingExpenseId ? "Edit & Resubmit Expense" : "Create New Expense"}
            >
                <form onSubmit={handleCreateExpense} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Title / Description *</label>
                        <Input
                            required
                            value={newExpense.title}
                            onChange={e => setNewExpense({ ...newExpense, title: e.target.value })}
                            placeholder="e.g., Team Lunch"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Date *</label>
                            <Input
                                required
                                type="date"
                                value={newExpense.expenseDate}
                                onChange={e => setNewExpense({ ...newExpense, expenseDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Project *</label>
                            <Select
                                required
                                value={newExpense.projectId}
                                onChange={e => handleProjectChange(e.target.value)}
                                options={[
                                    { value: '', label: 'Select Project...' },
                                    ...projects.map(p => ({ value: p.id, label: p.name }))
                                ]}
                            />
                        </div>
                    </div>
                    {newExpense.projectId && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Task / Subtask (Optional)</label>
                            <Select
                                value={newExpense.subTaskId ? `subtask_${newExpense.subTaskId}` : (newExpense.taskId ? `task_${newExpense.taskId}` : '')}
                                onChange={e => {
                                    const val = e.target.value;
                                    if (!val) {
                                        setNewExpense(prev => ({ ...prev, taskId: '', subTaskId: '' }));
                                        return;
                                    }
                                    const [type, id] = val.split('_');
                                    const item = projectTasks.find(pt => pt.type === type && pt.id === id);
                                    if (item) {
                                        setNewExpense(prev => ({ ...prev, taskId: item.taskId, subTaskId: item.subTaskId || '' }));
                                    }
                                }}
                                options={[
                                    { value: '', label: 'None' },
                                    ...projectTasks.map(pt => ({
                                        value: `${pt.type}_${pt.id}`,
                                        label: pt.type === 'subtask' ? `↳ ${pt.title}` : pt.title
                                    }))
                                ]}
                            />
                        </div>
                    )}
                    <div className="grid grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Subtotal</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={newExpense.subtotal}
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    setNewExpense({ ...newExpense, subtotal: val, totalAmount: val + newExpense.tax });
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Tax</label>
                            <Input
                                type="number"
                                step="0.01"
                                value={newExpense.tax}
                                onChange={e => {
                                    const val = Number(e.target.value);
                                    setNewExpense({ ...newExpense, tax: val, totalAmount: newExpense.subtotal + val });
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Total Amount *</label>
                            <Input
                                required
                                type="number"
                                step="0.01"
                                value={newExpense.totalAmount}
                                onChange={e => setNewExpense({ ...newExpense, totalAmount: Number(e.target.value) })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                            <Select
                                value={newExpense.category}
                                onChange={e => setNewExpense({ ...newExpense, category: e.target.value })}
                                options={[
                                    'Travel', 'Meals', 'Hotel', 'Fuel', 'Office Supplies', 'Equipment',
                                    'Software', 'Subscriptions', 'Training', 'Marketing', 'Construction Materials',
                                    'Vehicle Expenses', 'Utilities', 'Miscellaneous'
                                ].map(c => ({ value: c, label: c }))}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                            <Select
                                value={newExpense.paymentMethod}
                                onChange={e => setNewExpense({ ...newExpense, paymentMethod: e.target.value })}
                                options={[
                                    'Cash', 'Personal Card', 'Corporate Card', 'Bank Transfer', 'Mobile Banking', 'Other'
                                ].map(c => ({ value: c, label: c }))}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Vendor (Optional)</label>
                            <Input
                                value={newExpense.vendor}
                                onChange={e => setNewExpense({ ...newExpense, vendor: e.target.value })}
                                placeholder="e.g., Home Depot"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (Optional)</label>
                            <Input
                                value={newExpense.notes}
                                onChange={e => setNewExpense({ ...newExpense, notes: e.target.value })}
                                placeholder="Additional details..."
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Receipt (Optional)</label>
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                                    <Upload className="w-8 h-8 mb-4 text-gray-500" />
                                    <p className="text-sm text-gray-500 font-semibold">
                                        {receiptFile ? receiptFile.name : 'Click to upload receipt'}
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/jpeg, image/png, application/pdf"
                                    onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                                />
                            </label>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t">
                        <Button type="button" variant="outline" onClick={() => {
                            setShowCreateModal(false);
                            setEditingExpenseId(null);
                        }}>
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isCreating} className="bg-blue-600 hover:bg-blue-700 text-white">
                            {isCreating ? (editingExpenseId ? 'Submitting...' : 'Creating...') : (editingExpenseId ? 'Save & Resubmit' : 'Create Expense')}
                        </Button>
                    </div>
                </form>
            </Modal>

        </div>
    );
}
