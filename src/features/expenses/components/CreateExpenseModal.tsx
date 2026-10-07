import React, { useEffect, useMemo, useState } from 'react';
import { Upload, X, Loader2, DollarSign, Calendar, Building2, AlertCircle } from 'lucide-react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Select } from '@/shared/components/ui/Select';
import { apiClient, API_ENDPOINTS } from '@/services';
import { useToast } from '@/context/ToastContext';

export interface CreateExpenseModalProps {
    isOpen: boolean;
    onClose: () => void;
    defaultProjectId?: string;
    defaultProjectName?: string;
    defaultTaskId?: string;
    defaultTaskTitle?: string;
    defaultSubTaskId?: string;
    defaultSubTaskTitle?: string;
    onSuccess?: () => void;
}

interface ProjectOption {
    id: string;
    name: string;
}

const CATEGORY_OPTIONS = [
    'Travel',
    'Meals',
    'Hotel',
    'Fuel',
    'Office Supplies',
    'Equipment',
    'Software',
    'Subscriptions',
    'Training',
    'Marketing',
    'Construction Materials',
    'Vehicle Expenses',
    'Utilities',
    'Miscellaneous',
].map(c => ({ value: c, label: c }));

const PAYMENT_METHOD_OPTIONS = [
    'Cash',
    'Personal Card',
    'Corporate Card',
    'Bank Transfer',
    'Mobile Banking',
    'Other',
].map(p => ({ value: p, label: p }));

export function CreateExpenseModal({
    isOpen,
    onClose,
    defaultProjectId,
    defaultProjectName,
    defaultTaskId,
    defaultTaskTitle,
    defaultSubTaskId,
    defaultSubTaskTitle,
    onSuccess,
}: CreateExpenseModalProps) {
    const { toast } = useToast();
    const [projects, setProjects] = useState<ProjectOption[]>([]);
    const [projectTasks, setProjectTasks] = useState<any[]>([]);
    const [isLoadingTasks, setIsLoadingTasks] = useState(false);
    const [receiptFile, setReceiptFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string>('');

    const [form, setForm] = useState({
        title: '',
        expenseDate: new Date().toISOString().split('T')[0],
        subtotal: 0,
        tax: 0,
        totalAmount: 0,
        category: 'Miscellaneous',
        paymentMethod: 'Cash',
        projectId: defaultProjectId || '',
        vendor: '',
        taskId: defaultTaskId || '',
        subTaskId: defaultSubTaskId || '',
        notes: '',
    });

    const fetchProjectTasks = async (projectId: string) => {
        if (!projectId) {
            setProjectTasks([]);
            return;
        }
        setIsLoadingTasks(true);
        try {
            const res = await apiClient.get<any>(`${API_ENDPOINTS.EXPENSES.PROJECTS}/${projectId}/tasks`);
            const list: any[] = Array.isArray(res?.data?.data)
                ? res.data.data
                : (Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : []));

            let merged = [...list];
            if (defaultSubTaskId && !merged.some(item => item.type === 'subtask' && item.id === defaultSubTaskId)) {
                merged.unshift({
                    id: defaultSubTaskId,
                    taskId: defaultTaskId || '',
                    subTaskId: defaultSubTaskId,
                    type: 'subtask',
                    title: defaultSubTaskTitle
                        ? (defaultTaskTitle ? `${defaultTaskTitle} / ${defaultSubTaskTitle}` : defaultSubTaskTitle)
                        : 'Current Subtask',
                });
            } else if (defaultTaskId && !defaultSubTaskId && !merged.some(item => item.type === 'task' && item.id === defaultTaskId)) {
                merged.unshift({
                    id: defaultTaskId,
                    taskId: defaultTaskId,
                    subTaskId: null,
                    type: 'task',
                    title: defaultTaskTitle || 'Current Task',
                });
            }
            setProjectTasks(merged);
        } catch {
            if (defaultSubTaskId) {
                setProjectTasks([{
                    id: defaultSubTaskId,
                    taskId: defaultTaskId || '',
                    subTaskId: defaultSubTaskId,
                    type: 'subtask',
                    title: defaultSubTaskTitle
                        ? (defaultTaskTitle ? `${defaultTaskTitle} / ${defaultSubTaskTitle}` : defaultSubTaskTitle)
                        : 'Current Subtask',
                }]);
            } else if (defaultTaskId) {
                setProjectTasks([{
                    id: defaultTaskId,
                    taskId: defaultTaskId,
                    subTaskId: null,
                    type: 'task',
                    title: defaultTaskTitle || 'Current Task',
                }]);
            } else {
                setProjectTasks([]);
            }
        } finally {
            setIsLoadingTasks(false);
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

    // When modal opens, initialize form state
    useEffect(() => {
        if (isOpen) {
            const initialProjectId = defaultProjectId || '';
            const initialTaskId = defaultTaskId || '';
            const initialSubTaskId = defaultSubTaskId || '';

            setForm({
                title: '',
                expenseDate: new Date().toISOString().split('T')[0],
                subtotal: 0,
                tax: 0,
                totalAmount: 0,
                category: 'Miscellaneous',
                paymentMethod: 'Cash',
                projectId: initialProjectId,
                vendor: '',
                taskId: initialTaskId,
                subTaskId: initialSubTaskId,
                notes: '',
            });
            setReceiptFile(null);
            setErrorMessage('');

            // Pre-seed default task or subtask so it shows immediately
            if (initialSubTaskId) {
                setProjectTasks([{
                    id: initialSubTaskId,
                    taskId: initialTaskId,
                    subTaskId: initialSubTaskId,
                    type: 'subtask',
                    title: defaultSubTaskTitle
                        ? (defaultTaskTitle ? `${defaultTaskTitle} / ${defaultSubTaskTitle}` : defaultSubTaskTitle)
                        : 'Current Subtask',
                }]);
            } else if (initialTaskId) {
                setProjectTasks([{
                    id: initialTaskId,
                    taskId: initialTaskId,
                    subTaskId: null,
                    type: 'task',
                    title: defaultTaskTitle || 'Current Task',
                }]);
            } else {
                setProjectTasks([]);
            }

            void fetchProjects();
            if (initialProjectId) {
                void fetchProjectTasks(initialProjectId);
            }
        }
    }, [isOpen, defaultProjectId, defaultTaskId, defaultTaskTitle, defaultSubTaskId, defaultSubTaskTitle]);

    const handleProjectChange = async (projectId: string) => {
        setForm(prev => ({ ...prev, projectId, taskId: '', subTaskId: '' }));
        await fetchProjectTasks(projectId);
    };

    const handleSubtotalChange = (val: number) => {
        const subtotal = Math.max(0, val);
        const tax = Number(form.tax) || 0;
        setForm(prev => ({
            ...prev,
            subtotal,
            totalAmount: Number((subtotal + tax).toFixed(2)),
        }));
    };

    const handleTaxChange = (val: number) => {
        const tax = Math.max(0, val);
        const subtotal = Number(form.subtotal) || 0;
        setForm(prev => ({
            ...prev,
            tax,
            totalAmount: Number((subtotal + tax).toFixed(2)),
        }));
    };

    const projectOptions = useMemo(() => {
        const optionsMap = new Map<string, string>();
        if (defaultProjectId && defaultProjectName) {
            optionsMap.set(defaultProjectId, defaultProjectName);
        }
        projects.forEach(p => {
            optionsMap.set(p.id, p.name);
        });
        const mapped = Array.from(optionsMap.entries()).map(([id, name]) => ({
            value: id,
            label: name,
        }));
        return [
            { value: '', label: 'Select Project...' },
            ...mapped,
        ];
    }, [projects, defaultProjectId, defaultProjectName]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.projectId) {
            setErrorMessage('Project is required. Please select a project.');
            return;
        }
        if (!form.title.trim()) {
            setErrorMessage('Expense title / description is required.');
            return;
        }
        if (Number(form.totalAmount) <= 0) {
            setErrorMessage('Total amount must be greater than 0.');
            return;
        }

        setIsSubmitting(true);
        setErrorMessage('');

        try {
            const payload: any = {
                title: form.title.trim(),
                expenseDate: form.expenseDate,
                subtotal: Number(form.subtotal) || 0,
                tax: Number(form.tax) || 0,
                totalAmount: Number(form.totalAmount),
                category: form.category,
                paymentMethod: form.paymentMethod,
                projectId: form.projectId,
                action: 'SUBMITTED',
            };
            if (form.vendor?.trim()) payload.vendor = form.vendor.trim();
            if (form.notes?.trim()) payload.notes = form.notes.trim();
            if (form.taskId) payload.taskId = form.taskId;
            if (form.subTaskId) payload.subTaskId = form.subTaskId;

            if (receiptFile) {
                await apiClient.uploadFile(
                    API_ENDPOINTS.EXPENSES.CREATE,
                    receiptFile,
                    payload,
                    'receipt',
                    'POST'
                );
            } else {
                await apiClient.post(API_ENDPOINTS.EXPENSES.CREATE, payload);
            }

            toast.success('Expense Created', 'The expense has been successfully submitted.');
            if (onSuccess) {
                onSuccess();
            }
            onClose();
        } catch (err: any) {
            console.error('Failed to create expense:', err);
            const msg =
                err?.response?.data?.message ||
                err?.details?.message ||
                err?.message ||
                'Failed to create expense. Please check your input and try again.';
            setErrorMessage(Array.isArray(msg) ? msg.join(', ') : msg);
            toast.error('Failed to Create Expense', Array.isArray(msg) ? msg.join(', ') : msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Create New Expense"
            maxWidth="xl"
        >
            <form onSubmit={handleSubmit} className="space-y-4">
                {errorMessage && (
                    <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl">
                        <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
                        <span>{errorMessage}</span>
                    </div>
                )}

                {/* Title */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title / Description *
                    </label>
                    <Input
                        required
                        value={form.title}
                        onChange={e => setForm({ ...form, title: e.target.value })}
                        placeholder="e.g., Construction materials purchase, Site fuel, Worker lunch"
                    />
                </div>

                {/* Date & Project Row */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Expense Date *
                        </label>
                        <Input
                            required
                            type="date"
                            value={form.expenseDate}
                            onChange={e => setForm({ ...form, expenseDate: e.target.value })}
                        />
                    </div>

                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Project *
                            </label>
                            {defaultProjectId && form.projectId === defaultProjectId && (
                                <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                    Auto-selected
                                </span>
                            )}
                        </div>
                        <Select
                            required
                            value={form.projectId}
                            onChange={e => handleProjectChange(e.target.value)}
                            options={projectOptions}
                        />
                    </div>
                </div>

                {/* Task / Subtask (Optional) */}
                {form.projectId && (
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <label className="block text-sm font-medium text-gray-700">
                                Task / Subtask (Optional)
                            </label>
                            <div className="flex items-center gap-2">
                                {((defaultSubTaskId && form.subTaskId === defaultSubTaskId) ||
                                    (!defaultSubTaskId && defaultTaskId && form.taskId === defaultTaskId)) && (
                                    <span className="text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                        Auto-selected
                                    </span>
                                )}
                                {isLoadingTasks && (
                                    <span className="text-xs text-gray-400 flex items-center gap-1">
                                        <Loader2 className="w-3 h-3 animate-spin" /> Loading tasks...
                                    </span>
                                )}
                            </div>
                        </div>
                        <Select
                            value={
                                form.subTaskId
                                    ? `subtask_${form.subTaskId}`
                                    : (form.taskId ? `task_${form.taskId}` : '')
                            }
                            onChange={e => {
                                const val = e.target.value;
                                if (!val) {
                                    setForm(prev => ({ ...prev, taskId: '', subTaskId: '' }));
                                    return;
                                }
                                const [type, id] = val.split('_');
                                const item = projectTasks.find(pt => pt.type === type && pt.id === id);
                                if (item) {
                                    setForm(prev => ({
                                        ...prev,
                                        taskId: item.taskId,
                                        subTaskId: item.subTaskId || '',
                                    }));
                                }
                            }}
                            options={[
                                { value: '', label: 'None / General Project Expense' },
                                ...projectTasks.map(pt => ({
                                    value: `${pt.type}_${pt.id}`,
                                    label: pt.type === 'subtask' ? `↳ ${pt.title}` : pt.title,
                                })),
                            ]}
                        />
                    </div>
                )}

                {/* Financials: Subtotal, Tax, Total Amount */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Subtotal
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.subtotal || ''}
                            onChange={e => handleSubtotalChange(Number(e.target.value))}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Tax
                        </label>
                        <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={form.tax || ''}
                            onChange={e => handleTaxChange(Number(e.target.value))}
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Total Amount *
                        </label>
                        <Input
                            required
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={form.totalAmount || ''}
                            onChange={e => setForm({ ...form, totalAmount: Number(e.target.value) })}
                            placeholder="0.00"
                        />
                    </div>
                </div>

                {/* Category & Payment Method */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Category
                        </label>
                        <Select
                            value={form.category}
                            onChange={e => setForm({ ...form, category: e.target.value })}
                            options={CATEGORY_OPTIONS}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Payment Method
                        </label>
                        <Select
                            value={form.paymentMethod}
                            onChange={e => setForm({ ...form, paymentMethod: e.target.value })}
                            options={PAYMENT_METHOD_OPTIONS}
                        />
                    </div>
                </div>

                {/* Vendor & Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Vendor (Optional)
                        </label>
                        <Input
                            value={form.vendor}
                            onChange={e => setForm({ ...form, vendor: e.target.value })}
                            placeholder="e.g., Home Depot, Shell, Local Supplier"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Notes (Optional)
                        </label>
                        <Input
                            value={form.notes}
                            onChange={e => setForm({ ...form, notes: e.target.value })}
                            placeholder="Additional details or justification..."
                        />
                    </div>
                </div>

                {/* Receipt Upload */}
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Receipt Attachment (Optional)
                    </label>
                    {receiptFile ? (
                        <div className="flex items-center justify-between p-3.5 bg-blue-50/60 border border-blue-200 rounded-xl">
                            <div className="flex items-center gap-3 overflow-hidden">
                                <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                    <Upload className="w-5 h-5" />
                                </div>
                                <div className="truncate">
                                    <p className="text-sm font-bold text-gray-800 truncate">
                                        {receiptFile.name}
                                    </p>
                                    <p className="text-xs text-gray-500">
                                        {(receiptFile.size / 1024).toFixed(1)} KB
                                    </p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50"
                                onClick={() => setReceiptFile(null)}
                            >
                                <X className="w-4 h-4 mr-1" /> Remove
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center w-full">
                            <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer bg-gray-50/50 hover:bg-blue-50/30 hover:border-blue-300 transition-all">
                                <div className="flex flex-col items-center justify-center pt-3 pb-3">
                                    <Upload className="w-6 h-6 mb-2 text-gray-400" />
                                    <p className="text-sm text-gray-600 font-semibold">
                                        Click to upload receipt
                                    </p>
                                    <p className="text-xs text-gray-400 mt-0.5">
                                        PNG, JPG, or PDF (max 10MB)
                                    </p>
                                </div>
                                <input
                                    type="file"
                                    className="hidden"
                                    accept="image/jpeg, image/jpg, image/png, application/pdf"
                                    onChange={e => setReceiptFile(e.target.files?.[0] || null)}
                                />
                            </label>
                        </div>
                    )}
                </div>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold min-w-[140px]"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Submitting...
                            </>
                        ) : (
                            'Create Expense'
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
