import { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import { useTaskDetails, useSubTaskDetails, useReviewTaskApproval, useReviewSubTaskApproval, useReviewSubTaskReport, useDeleteSubTask, useReviewTaskCompletion } from '../hooks/useTasks';
import { useProject } from '../hooks/useProjects';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { ArrowLeft, Clock, MapPin, User, FileText, CheckCircle, XCircle, Trash2, Flag, AlertCircle, Image, DollarSign, Package, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { ROUTES } from '@/config/routes';
import { config } from '@/config/env';
import { CreateExpenseModal } from '@/features/expenses/components/CreateExpenseModal';

function resolveMediaUrl(url?: string | null) {
    if (!url) return null;
    if (/^(https?:|data:|blob:)/i.test(url)) return url;
    return `${config.apiBaseUrl}/${url.replace(/^\/+/, '')}`;
}

function toArray<T = any>(value: T[] | T | null | undefined): T[] {
    if (Array.isArray(value)) return value;
    return value ? [value] : [];
}

function pickFirstText(...values: unknown[]) {
    return values.find((value) => typeof value === 'string' && value.trim().length > 0) as string | undefined;
}

export function TaskDetailPage() {
    const { projectId, taskId } = useParams();
    const location = useLocation();
    const navigate = useNavigate();

    const isSubtask = location.pathname.includes('/subtasks/');

    const { data: taskDetails, isLoading: isTaskLoading, refetch: refetchTask } = useTaskDetails(!isSubtask ? taskId || null : null);
    const { data: subTaskDetails, isLoading: isSubtaskLoading, refetch: refetchSubTask } = useSubTaskDetails(isSubtask ? taskId || null : null);

    const data = isSubtask ? subTaskDetails : taskDetails;
    const isLoading = isSubtask ? isSubtaskLoading : isTaskLoading;

    const resolvedProjectId = projectId || (isSubtask ? (subTaskDetails?.task?.projectId || subTaskDetails?.task?.project?.id || subTaskDetails?.projectId) : (taskDetails?.projectId || taskDetails?.project?.id));
    const { data: project } = useProject(resolvedProjectId || '');

    const [reviewNote, setReviewNote] = useState('');
    const [completionNote, setCompletionNote] = useState('');
    const [isDeleteConfirm, setIsDeleteConfirm] = useState(false);
    const [isCreateExpenseModalOpen, setIsCreateExpenseModalOpen] = useState(false);

    const { reviewTaskApproval, isReviewing: isReviewingTask } = useReviewTaskApproval();
    const { reviewSubTaskApproval, isReviewing: isReviewingSubTask } = useReviewSubTaskApproval();
    const { reviewSubTaskReport, isReviewing: isReviewingSubTaskReport } = useReviewSubTaskReport();
    const { deleteSubTask, isDeletingSubTask } = useDeleteSubTask();
    const { reviewTaskCompletion, isReviewingCompletion } = useReviewTaskCompletion();

    const isReviewing = isReviewingTask || isReviewingSubTask;

    if (isLoading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading details...</p>
                </div>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-3" />
                    <p className="text-red-500 font-medium">Task not found.</p>
                </div>
            </div>
        );
    }

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'info'> = {
            pending: 'warning',
            in_progress: 'info',
            review: 'info',
            completed: 'success',
            cancelled: 'destructive',
        };
        return <Badge variant={variants[status] || 'default'}>{status?.replace(/_/g, ' ')}</Badge>;
    };

    const getApprovalBadge = (decision: string) => {
        if (decision === 'pending') return <Badge variant="warning">Pending Approval</Badge>;
        if (decision === 'approved') return <Badge variant="success">Approved</Badge>;
        if (decision === 'rejected') return <Badge variant="destructive">Rejected</Badge>;
        return null;
    };

    const handleApprove = async () => {
        if (!taskId) return;
        try {
            if (isSubtask) {
                await reviewSubTaskApproval(taskId, { reviewDecision: 'approved', reviewDescription: reviewNote || undefined });
            } else {
                await reviewTaskApproval(taskId, { reviewDecision: 'approved', reviewDescription: reviewNote || undefined });
            }
            setReviewNote('');
        } catch (err) { console.error(err); }
    };

    const handleReject = async () => {
        if (!taskId) return;
        try {
            if (isSubtask) {
                await reviewSubTaskApproval(taskId, { reviewDecision: 'rejected', reviewDescription: reviewNote || undefined });
            } else {
                await reviewTaskApproval(taskId, { reviewDecision: 'rejected', reviewDescription: reviewNote || undefined });
            }
            setReviewNote('');
        } catch (err) { console.error(err); }
    };

    const handleDelete = async () => {
        if (!taskId || !isSubtask) return;
        try {
            await deleteSubTask(taskId);
            navigate(projectId ? `/projects/${projectId}` : ROUTES.PROJECTS);
        } catch (err) { console.error(err); }
    };

    const handleApproveCompletion = async () => {
        if (!taskId) return;
        try {
            if (isSubtask) {
                await reviewSubTaskReport(taskId, { reviewDecision: 'approved', reviewDescription: completionNote || undefined });
            } else {
                await reviewTaskCompletion(taskId, { reviewDecision: 'approved', reviewDescription: completionNote || undefined });
            }
            setCompletionNote('');
        } catch (err) { console.error(err); }
    };

    const handleRejectCompletion = async () => {
        if (!taskId) return;
        try {
            if (isSubtask) {
                await reviewSubTaskReport(taskId, { reviewDecision: 'rejected', reviewDescription: completionNote || undefined });
            } else {
                await reviewTaskCompletion(taskId, { reviewDecision: 'rejected', reviewDescription: completionNote || undefined });
            }
            setCompletionNote('');
        } catch (err) { console.error(err); }
    };

    const normalizedStatus = String(data.status ?? data.task?.status ?? '').toLowerCase().trim();
    const approvalDecision = data.approvalDecision ?? data.task?.approvalDecision;
    const normalizedApprovalDecision = String(approvalDecision ?? '').toLowerCase().trim();
    const isPendingApproval = normalizedApprovalDecision === 'pending';
    const isApproved = normalizedApprovalDecision === 'approved';
    const isAwaitingCompletionReview = normalizedStatus === 'review';
    const canReviewCompletion = isAwaitingCompletionReview;
    const isReviewDecisionPending = isReviewingCompletion || isReviewingSubTaskReport;
    const isCompleted = normalizedStatus === 'completed';

    const reports = (() => {
        const existingReports = Array.isArray(data.reports) ? data.reports : [];
        if (existingReports.length > 0) return existingReports;

        const report = data.report ?? data.latestReport;
        const photos = data.photos ?? {};
        const beforePhotoUrl = report?.beforePhotoUrl ?? photos.beforePhotoUrl ?? null;
        const afterPhotoUrl = report?.afterPhotoUrl ?? photos.afterPhotoUrl ?? null;
        const receiptUrl = report?.receiptUrl ?? photos.receiptUrl ?? null;

        if (!report && !beforePhotoUrl && !afterPhotoUrl && !receiptUrl) return [];

        return [{
            id: report?.id ?? `${data.id}-report`,
            notes: report?.notes ?? data.reportSummary ?? null,
            beforePhotoUrl,
            afterPhotoUrl,
            receiptUrl,
        }];
    })();
    const expenseItems = toArray(data.expenses ?? data.taskExpenses ?? data.expense ?? data.latestExpense).map((expense: any) => ({
        id: expense.id ?? `${expense.description ?? expense.title ?? 'expense'}-${expense.date ?? expense.createdAt ?? ''}`,
        description: pickFirstText(expense.description, expense.title, expense.notes, expense.category) ?? 'Task expense',
        category: pickFirstText(expense.category, expense.type) ?? 'General',
        amount: Number(expense.amount ?? expense.totalAmount ?? expense.subtotal ?? expense.expenseAmount ?? 0),
        status: pickFirstText(expense.status) ?? 'Recorded',
        date: expense.date ?? expense.expenseDate ?? expense.createdAt ?? expense.updatedAt ?? null,
        receiptUrl: expense.receiptUrl ?? expense.reviewAttachmentUrl ?? expense.attachmentUrl ?? null,
    }));
    const inventories = (data.inventories ?? data.inventoryUsed ?? data.taskInventories ?? []).map((item: any) => ({
        id: item.id ?? item.inventoryId ?? item.inventory?.id,
        label: item.label ?? item.name ?? item.inventory?.name ?? 'Inventory item',
        quantity: item.quantity ?? item.qtyUsed ?? item.qty ?? 0,
        unit: item.unit ?? item.inventory?.unit ?? '',
    }));
    const instructions = [
        ...toArray(data.instructions ?? data.taskInstructions ?? data.instructionSteps).map((inst: any) => (
            typeof inst === 'string'
                ? inst
                : pickFirstText(inst.text, inst.description, inst.title, inst.notes)
        )),
        pickFirstText(data.instruction, data.taskInstruction, data.reportSummary, data.report?.notes, data.latestReport?.notes),
    ].filter((inst): inst is string => Boolean(inst));
    const units = data.taskUnits || data.subTaskUnits || data.units || [];
    const assignedPeople = isSubtask
        ? [
            data.taskAssignee?.user,
            data.assignee,
            data.assignedUser,
            data.creator?.role === 'worker' ? data.creator : null,
        ]
        : [
            ...toArray(data.taskAssignees).map((assignee: any) => assignee?.user ?? assignee),
            data.assignee,
            data.assignedUser,
            data.assignedToUser,
            data.creator?.role === 'worker' ? data.creator : null,
        ];
    const assignedToLabel = Array.from(
        new Set(
            assignedPeople
                .map((person: any) => pickFirstText(person?.fullName, person?.name, person?.email))
                .filter((name): name is string => Boolean(name)),
        ),
    ).join(', ') || 'Unassigned';

    const effectiveProjectId = resolvedProjectId || projectId || (isSubtask ? (data.task?.projectId || data.task?.project?.id || data.projectId) : (data.projectId || data.project?.id));
    const finalProjectName = (isSubtask ? data.task?.project?.name : data.project?.name) || data.projectName || project?.name;

    const defaultTaskId = isSubtask ? (data.taskId || data.task?.id) : data.id;
    const defaultTaskTitle = isSubtask ? data.task?.title : data.title;
    const defaultSubTaskId = isSubtask ? data.id : undefined;
    const defaultSubTaskTitle = isSubtask ? data.title : undefined;

    return (
        <div className="max-w-5xl mx-auto pb-16 space-y-5">

            {/* Navigation */}
            <div className="flex items-center justify-between gap-4 pt-1">
                <Button variant="outline" className="flex items-center gap-2" onClick={() => navigate(projectId ? `/projects/${projectId}` : ROUTES.PROJECTS)}>
                    <ArrowLeft className="w-4 h-4" /> Back to Project
                </Button>
                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        className="gap-2 border-blue-200 text-blue-600 hover:bg-blue-50 transition-all font-bold"
                        onClick={() => setIsCreateExpenseModalOpen(true)}
                    >
                        <Plus className="w-4 h-4" /> Create Expense
                    </Button>
                    {isSubtask && (
                        !isDeleteConfirm ? (
                            <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2" onClick={() => setIsDeleteConfirm(true)}>
                                <Trash2 className="w-4 h-4" /> Delete Subtask
                            </Button>
                        ) : (
                            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                <span className="text-sm text-red-700 font-medium">Confirm delete?</span>
                                <Button className="bg-red-600 hover:bg-red-700 text-white text-xs h-7 px-3" onClick={handleDelete} disabled={isDeletingSubTask}>
                                    {isDeletingSubTask ? 'Deleting...' : 'Yes, Delete'}
                                </Button>
                                <Button variant="outline" className="text-xs h-7 px-3" onClick={() => setIsDeleteConfirm(false)}>Cancel</Button>
                            </div>
                        )
                    )}
                </div>
            </div>

            {/* Header Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-start gap-3 mb-5 flex-wrap">
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">{data.title}</h1>
                        <p className="text-gray-500 text-sm">{data.description || 'No description provided.'}</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                        {getStatusBadge(data.status)}
                        {isSubtask && <Badge variant="default" className="bg-purple-100 text-purple-700">Subtask</Badge>}
                        {getApprovalBadge(approvalDecision)}
                    </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 py-4 border-y border-gray-100">
                    <div>
                        <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><User className="w-3 h-3" /> Assigned To</div>
                        <div className="font-medium text-sm text-gray-800">
                            {assignedToLabel}
                        </div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Due Date</div>
                        <div className="font-medium text-sm text-gray-800">{data.dueDate ? format(new Date(data.dueDate), 'MMM d, yyyy') : 'No date'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><Clock className="w-3 h-3" /> Estimated</div>
                        <div className="font-medium text-sm text-gray-800">{data.estimatedHours ? `${data.estimatedHours} hrs` : data.task?.estimatedHours ? `${data.task.estimatedHours} hrs` : '-'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Priority</div>
                        <div className="font-medium text-sm text-gray-800 capitalize">{data.priority?.toLowerCase() || 'Normal'}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-400 mb-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> Location</div>
                        <div className="flex flex-wrap gap-1">
                            {units.length > 0 ? units.map((tu: any) => (
                                <Badge key={tu.id || tu.unit?.id} variant="secondary" className="bg-purple-50 text-purple-700 border-purple-100 text-[10px] px-1.5 py-0 whitespace-nowrap">
                                    {tu.unit?.floor?.name || tu.floor?.name || 'Floor'} - {tu.unit?.name || tu.name || 'Unit'}
                                </Badge>
                            )) : <span className="text-gray-400 text-sm">No location</span>}
                        </div>
                    </div>
                </div>
            </div>

            {/* Step 1: Creation Approval */}
            {isPendingApproval && !isAwaitingCompletionReview && (
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-amber-100">
                    <div className="flex items-center gap-2 mb-4"><span className="text-xl">&#x23F3;</span><h2 className="font-bold text-gray-900 text-lg">Approval Required</h2></div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                        <p className="font-semibold text-amber-800 text-sm">This {isSubtask ? 'subtask' : 'task'} is waiting for your approval</p>
                        <p className="text-sm text-amber-600 mt-0.5">Worker cannot start until you approve it.</p>
                    </div>
                    <textarea className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 text-sm mb-4 resize-none" rows={3} placeholder="Add notes (optional)..." value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
                    <div className="flex gap-3">
                        <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-semibold" onClick={handleReject} disabled={isReviewing}>
                            <XCircle className="w-4 h-4 mr-2" />{isReviewing ? 'Processing...' : 'Reject'}
                        </Button>
                        <Button className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold" onClick={handleApprove} disabled={isReviewing}>
                            <CheckCircle className="w-4 h-4 mr-2" />{isReviewing ? 'Processing...' : 'Approve - Allow to Start'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Status banners */}
            {isApproved && !isCompleted && !isAwaitingCompletionReview && (
                <div className="bg-green-50 rounded-2xl p-4 border border-green-200 flex items-center gap-3">
                    <CheckCircle className="w-6 h-6 text-green-500 shrink-0" />
                    <p className="text-green-700 font-medium text-sm">Approved - Worker can now start this {isSubtask ? 'subtask' : 'task'}.</p>
                </div>
            )}
            {approvalDecision === 'rejected' && (
                <div className="bg-red-50 rounded-2xl p-4 border border-red-200 flex items-center gap-3">
                    <XCircle className="w-6 h-6 text-red-500 shrink-0" />
                    <p className="text-red-700 font-medium text-sm">This {isSubtask ? 'subtask' : 'task'} was rejected.</p>
                </div>
            )}

            {/* Instructions - always shown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Task Instructions</h2>
                {instructions.length > 0 ? (
                    <div className="space-y-3">
                        {instructions.map((inst: any, idx: number) => (
                            <div key={idx} className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">{idx + 1}</div>
                                <p className="text-gray-700 text-sm pt-0.5">{inst}</p>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm">No specific instructions provided.</p>
                )}
            </div>

            {/* Reports & Photos - always shown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Image className="w-5 h-5 text-gray-400" /> Reports &amp; Photos
                </h2>
                {reports.length > 0 ? (
                    <div className="space-y-6">
                        {reports.map((report: any) => (
                            <div key={report.id} className="border border-gray-100 rounded-xl overflow-hidden">
                                {report.notes && (
                                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                                        <p className="text-sm font-medium text-gray-600">Report Notes</p>
                                        <p className="text-sm text-gray-500 mt-0.5">{report.notes}</p>
                                    </div>
                                )}
                                <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <p className="text-xs font-medium text-gray-400 mb-2">Before Photo</p>
                                    {report.beforePhotoUrl
                                        ? <img src={resolveMediaUrl(report.beforePhotoUrl) ?? undefined} alt="Before" className="w-full h-56 object-cover rounded-lg border border-gray-100" />
                                        : <div className="w-full h-56 bg-gray-50 rounded-lg flex items-center justify-center text-gray-300 text-sm border border-dashed border-gray-200">No photo</div>}
                                    </div>
                                    <div>
                                        <p className="text-xs font-medium text-gray-400 mb-2">After Photo</p>
                                    {report.afterPhotoUrl
                                        ? <img src={resolveMediaUrl(report.afterPhotoUrl) ?? undefined} alt="After" className="w-full h-56 object-cover rounded-lg border border-gray-100" />
                                        : <div className="w-full h-56 bg-gray-50 rounded-lg flex items-center justify-center text-gray-300 text-sm border border-dashed border-gray-200">No photo</div>}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-400 text-sm">No reports submitted yet.</p>
                    </div>
                )}
            </div>

            {/* Financials - always shown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-gray-400" /> Task Expenses
                </h2>
                {expenseItems.length > 0 ? (
                    <div className="space-y-3">
                        {expenseItems.map((expense: any) => (
                            <div key={expense.id} className="p-4 rounded-xl border border-gray-100 bg-gray-50 flex justify-between items-center gap-4">
                                <div>
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className="font-semibold text-sm text-gray-900">{expense.description}</span>
                                        <Badge variant="success" className="text-[10px] py-0">{expense.status}</Badge>
                                    </div>
                                    <div className="text-xs text-gray-400">
                                        {expense.category} - {expense.date ? format(new Date(expense.date), 'MMM d, yyyy') : 'No date'}
                                    </div>
                                    {expense.receiptUrl && (
                                        <a
                                            href={resolveMediaUrl(expense.receiptUrl) ?? undefined}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="text-xs font-medium text-blue-600 hover:underline"
                                        >
                                            View receipt
                                        </a>
                                    )}
                                </div>
                                <div className="text-lg font-bold text-blue-600 shrink-0">${Number(expense.amount || 0).toFixed(2)}</div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm">No expenses recorded for this task.</p>
                )}
            </div>

            {/* Inventory - always shown */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-gray-400" /> Inventory Used
                </h2>
                {inventories.length > 0 ? (
                    <div className="overflow-hidden border border-gray-100 rounded-xl">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 font-medium text-gray-600">Item</th>
                                    <th className="px-4 py-3 font-medium text-gray-600">Quantity</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 bg-white">
                                {inventories.map((inv: any, idx: number) => (
                                    <tr key={idx}>
                                        <td className="px-4 py-3 text-gray-800">{inv.label}</td>
                                        <td className="px-4 py-3 font-medium text-gray-800">
                                            {inv.quantity}{inv.unit ? ` ${inv.unit}` : ''}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="text-gray-400 text-sm">No inventory used for this task.</p>
                )}
            </div>

            {/* Completion Review */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-indigo-100">
                <div className="flex items-center gap-2 mb-4"><Flag className="w-5 h-5 text-indigo-500" /><h2 className="font-bold text-gray-900 text-lg">Completion Review</h2></div>
                <div className={`${canReviewCompletion ? 'bg-indigo-50 border-indigo-200' : 'bg-gray-50 border-gray-200'} border rounded-xl p-4 mb-4`}>
                    <p className={`font-semibold text-sm ${canReviewCompletion ? 'text-indigo-800' : 'text-gray-700'}`}>
                        {canReviewCompletion ? 'Worker submitted this task for completion review' : 'Completion review is not available for this status'}
                    </p>
                    <p className={`text-sm mt-0.5 ${canReviewCompletion ? 'text-indigo-600' : 'text-gray-500'}`}>
                        {canReviewCompletion ? 'Review the submitted work above and approve or request revision.' : 'Buttons stay visible here, but they unlock only when task status is review.'}
                    </p>
                </div>
                <textarea
                    className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-400 text-sm mb-4 resize-none disabled:bg-gray-50 disabled:text-gray-400"
                    rows={3}
                    placeholder="Add review notes (optional)..."
                    value={completionNote}
                    onChange={(e) => setCompletionNote(e.target.value)}
                    disabled={!canReviewCompletion || isReviewDecisionPending}
                />
                <div className="flex gap-3">
                    <Button variant="outline" className="flex-1 border-red-200 text-red-600 hover:bg-red-50 font-semibold disabled:opacity-60" onClick={handleRejectCompletion} disabled={!canReviewCompletion || isReviewDecisionPending}>
                        <XCircle className="w-4 h-4 mr-2" />{isReviewDecisionPending ? 'Processing...' : 'Revision'}
                    </Button>
                    <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-60" onClick={handleApproveCompletion} disabled={!canReviewCompletion || isReviewDecisionPending}>
                        <CheckCircle className="w-4 h-4 mr-2" />{isReviewDecisionPending ? 'Processing...' : 'Approve Completion'}
                    </Button>
                </div>
                {isCompleted && !isAwaitingCompletionReview && (
                    <div className="bg-green-50 rounded-xl p-5 border border-green-200 flex items-center gap-3 mt-4">
                        <CheckCircle className="w-8 h-8 text-green-500 shrink-0" />
                        <div>
                            <p className="font-semibold text-green-800">Task Completed</p>
                            <p className="text-sm text-green-600">This task has been approved and marked as complete.</p>
                        </div>
                    </div>
                )}
            </div>

            <CreateExpenseModal
                isOpen={isCreateExpenseModalOpen}
                onClose={() => setIsCreateExpenseModalOpen(false)}
                defaultProjectId={effectiveProjectId}
                defaultProjectName={finalProjectName}
                defaultTaskId={defaultTaskId}
                defaultTaskTitle={defaultTaskTitle}
                defaultSubTaskId={defaultSubTaskId}
                defaultSubTaskTitle={defaultSubTaskTitle}
                onSuccess={() => {
                    if (isSubtask) refetchSubTask();
                    else refetchTask();
                }}
            />

        </div>
    );
}
