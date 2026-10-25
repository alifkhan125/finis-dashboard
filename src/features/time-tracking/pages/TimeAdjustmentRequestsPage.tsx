import { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Table } from '@/shared/components/ui/Table';
import { Modal } from '@/shared/components/ui/Modal';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';
import { apiClient, API_ENDPOINTS } from '@/services';
import { TimeAdjustmentRequest } from '@/shared/types';
import { getStatusColor, formatStatus, capitalize, cn } from '@/shared/utils';

function formatAMPM(dateOrStr?: string | Date | null): string {
    if (!dateOrStr) return '--:--';
    if (typeof dateOrStr === 'string' && (dateOrStr.includes('AM') || dateOrStr.includes('PM'))) {
        return dateOrStr;
    }
    const d = new Date(dateOrStr);
    if (isNaN(d.getTime())) return String(dateOrStr);
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function extractRequestedTime(reason?: string, fallback?: string | Date | null): string {
    const match = reason?.match(/\[Time:\s*([^\]]+)\]/);
    if (match) return match[1].trim();
    return formatAMPM(fallback);
}

function cleanReasonText(reason?: string): string {
    if (!reason) return 'No reason provided';
    const cleaned = reason
        .replace(/\[Scope:\s*[^\]]+\]\s*/gi, '')
        .replace(/\[Date:\s*[^\]]+\]\s*/gi, '')
        .replace(/\[Time:\s*[^\]]+\]\s*/gi, '')
        .trim();
    return cleaned || 'No reason provided';
}

export function TimeAdjustmentRequestsPage({ embedded = false }: { embedded?: boolean }) {
    const [requests, setRequests] = useState<TimeAdjustmentRequest[]>([]);
    const [selectedRequest, setSelectedRequest] = useState<TimeAdjustmentRequest | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isActionLoading, setIsActionLoading] = useState(false);

    const fetchRequests = async () => {
        setIsLoading(true);
        try {
            const res = await apiClient.get<any>(API_ENDPOINTS.TIME_TRACKING.ADJUSTMENTS);
            const raw = res?.data?.data ?? res?.data ?? res;
            const list = Array.isArray(raw) ? raw : [];
            const mapped: TimeAdjustmentRequest[] = list.map((item: any) => ({
                id: item.id,
                workerId: item.workerId,
                workerName: item.worker?.fullName || item.workerName || 'Worker',
                date: item.date ? new Date(item.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
                requestType: item.requestType || 'check_in',
                originalTime: formatAMPM(item.originalTime),
                requestedTime: extractRequestedTime(item.reason, item.adjustedTime),
                reason: cleanReasonText(item.reason),
                rawReason: item.reason || '',
                status: item.status || 'pending',
                createdAt: item.createdAt || item.submittedAt || new Date().toISOString(),
                reviewedAt: item.reviewedAt,
                reviewedBy: item.reviewedBy,
            }));
            setRequests(mapped);
        } catch (err) {
            console.error('Failed to fetch time adjustments:', err);
            setRequests([]);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        void fetchRequests();
    }, []);

    const handleApprove = async (requestId: string) => {
        setIsActionLoading(true);
        try {
            await apiClient.patch(API_ENDPOINTS.TIME_TRACKING.UPDATE_ADJUSTMENT_STATUS(requestId), { status: 'approved' });
            setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'approved' as const } : r));
            setShowDetailModal(false);
        } catch (err) {
            console.error('Failed to approve adjustment:', err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const handleDeny = async (requestId: string) => {
        setIsActionLoading(true);
        try {
            await apiClient.patch(API_ENDPOINTS.TIME_TRACKING.UPDATE_ADJUSTMENT_STATUS(requestId), { status: 'denied' });
            setRequests(prev => prev.map(r => r.id === requestId ? { ...r, status: 'denied' as const } : r));
            setShowDetailModal(false);
        } catch (err) {
            console.error('Failed to deny adjustment:', err);
        } finally {
            setIsActionLoading(false);
        }
    };

    const openDetailModal = (request: TimeAdjustmentRequest) => {
        setSelectedRequest(request);
        setShowDetailModal(true);
    };

    const pendingRequests = requests.filter(r => r.status === 'pending');
    const processedRequests = requests.filter(r => r.status !== 'pending');

    const pendingColumns = [
        {
            key: 'workerName',
            header: 'Worker Profile',
            render: (record: TimeAdjustmentRequest) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-gray-100 shadow-sm">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(record.workerName)}&background=random`} />
                        <AvatarFallback className="bg-blue-50 text-blue-700 font-bold">
                            {record.workerName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-gray-900">{record.workerName}</span>
                </div>
            )
        },
        {
            key: 'date',
            header: 'Date',
            render: (record: TimeAdjustmentRequest) => new Date(record.date).toLocaleDateString()
        },
        {
            key: 'requestType',
            header: 'Type',
            render: (record: any) => {
                const isSingleDay = record.rawReason?.includes('Scope: single_day') || record.reason?.includes('Scope: single_day');
                return (
                    <div className="flex flex-col gap-1 items-start">
                        <Badge variant="secondary">
                            {record.requestType.replace('_', '-')}
                        </Badge>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSingleDay ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isSingleDay ? '1 Day Only' : 'Regular Shift'}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'timeChange',
            header: 'Time Change',
            render: (record: TimeAdjustmentRequest) => (
                <div className="text-sm">
                    <span className="text-gray-400 line-through mr-2">{record.originalTime}</span>
                    <span className="font-semibold text-gray-900">{record.requestedTime}</span>
                </div>
            )
        },
        {
            key: 'reason',
            header: 'Reason',
            render: (record: TimeAdjustmentRequest) => (
                <span className="text-gray-600 truncate max-w-[200px] block">{record.reason}</span>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (record: TimeAdjustmentRequest) => (
                <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openDetailModal(record)}>
                        Review
                    </Button>
                    <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={isActionLoading}
                        onClick={() => handleApprove(record.id)}
                    >
                        Approve
                    </Button>
                    <Button
                        size="sm"
                        variant="destructive"
                        disabled={isActionLoading}
                        onClick={() => handleDeny(record.id)}
                    >
                        Deny
                    </Button>
                </div>
            )
        }
    ];

    const processedColumns = [
        {
            key: 'workerName',
            header: 'Worker Profile',
            render: (record: TimeAdjustmentRequest) => (
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-gray-100 shadow-sm">
                        <AvatarImage src={`https://ui-avatars.com/api/?name=${encodeURIComponent(record.workerName)}&background=random`} />
                        <AvatarFallback className="bg-blue-50 text-blue-700 font-bold">
                            {record.workerName.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="font-bold text-gray-900">{record.workerName}</span>
                </div>
            )
        },
        {
            key: 'date',
            header: 'Date',
            render: (record: TimeAdjustmentRequest) => new Date(record.date).toLocaleDateString()
        },
        {
            key: 'requestType',
            header: 'Type',
            render: (record: any) => {
                const isSingleDay = record.rawReason?.includes('Scope: single_day') || record.reason?.includes('Scope: single_day');
                return (
                    <div className="flex flex-col gap-1 items-start">
                        <Badge variant="secondary">
                            {record.requestType.replace('_', '-')}
                        </Badge>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isSingleDay ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isSingleDay ? '1 Day Only' : 'Regular Shift'}
                        </span>
                    </div>
                );
            }
        },
        {
            key: 'timeChange',
            header: 'Adjusted Time',
            render: (record: TimeAdjustmentRequest) => (
                <span className="font-semibold text-gray-900">{record.requestedTime}</span>
            )
        },
        {
            key: 'status',
            header: 'Status',
            render: (record: TimeAdjustmentRequest) => (
                <Badge className={cn(getStatusColor(record.status), 'capitalize')}>
                    {formatStatus(record.status)}
                </Badge>
            )
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (record: TimeAdjustmentRequest) => (
                <Button size="sm" variant="ghost" onClick={() => openDetailModal(record)}>
                    View Details
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {!embedded && (
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Time Adjustment Requests</h1>
                        <p className="text-gray-600 mt-1">Review and manage worker check-in/out correction requests</p>
                    </div>
                    {isLoading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
                </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-600">Pending Requests</div>
                            <div className="text-3xl font-bold text-yellow-600 mt-2">{pendingRequests.length}</div>
                        </div>
                        <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                            <Clock className="w-6 h-6 text-yellow-600" />
                        </div>
                    </div>
                </Card>

                <Card className="p-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm text-gray-600">Approved</div>
                            <div className="text-3xl font-bold text-green-600 mt-2">
                                {requests.filter(r => r.status === 'approved').length}
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
                            <div className="text-sm text-gray-600">Denied</div>
                            <div className="text-3xl font-bold text-red-600 mt-2">
                                {requests.filter(r => r.status === 'denied').length}
                            </div>
                        </div>
                        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                            <XCircle className="w-6 h-6 text-red-600" />
                        </div>
                    </div>
                </Card>
            </div>

            {/* Pending Requests Table */}
            <Card className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Pending Requests ({pendingRequests.length})</h2>
                <Table
                    data={pendingRequests}
                    columns={pendingColumns}
                />
            </Card>

            {/* Processed Requests Table */}
            <Card className="p-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Processed Requests ({processedRequests.length})</h2>
                <Table
                    data={processedRequests}
                    columns={processedColumns}
                />
            </Card>

            {/* Detail Modal */}
            {selectedRequest && (
                <Modal
                    isOpen={showDetailModal}
                    onClose={() => setShowDetailModal(false)}
                    title="Time Adjustment Request Details"
                >
                    <div className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Worker</label>
                                <p className="font-semibold text-gray-900 mt-1">{selectedRequest.workerName}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Date</label>
                                <p className="font-semibold text-gray-900 mt-1">{new Date(selectedRequest.date).toLocaleDateString()}</p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Type</label>
                                <p className="mt-1">
                                    <Badge variant="secondary" className="capitalize">{capitalize(selectedRequest.requestType)}</Badge>
                                </p>
                            </div>
                            <div>
                                <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Status</label>
                                <p className="mt-1">
                                    <Badge className={cn(getStatusColor(selectedRequest.status), 'capitalize')}>{formatStatus(selectedRequest.status)}</Badge>
                                </p>
                            </div>
                        </div>

                        <div className="p-4 bg-gray-50 rounded-xl space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Original Recorded Time:</span>
                                <span className="font-medium text-gray-700">{selectedRequest.originalTime}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">Requested Corrected Time:</span>
                                <span className="font-bold text-[#1D4F6D]">{selectedRequest.requestedTime}</span>
                            </div>
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 uppercase tracking-wider font-bold">Worker's Reason</label>
                            <p className="mt-1 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border border-gray-100">
                                {selectedRequest.reason}
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <Button variant="outline" onClick={() => setShowDetailModal(false)}>
                                Close
                            </Button>
                            {selectedRequest.status === 'pending' && (
                                <>
                                    <Button
                                        variant="destructive"
                                        disabled={isActionLoading}
                                        onClick={() => handleDeny(selectedRequest.id)}
                                    >
                                        Deny Request
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        disabled={isActionLoading}
                                        onClick={() => handleApprove(selectedRequest.id)}
                                    >
                                        Approve Adjustment
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>
                </Modal>
            )}
        </div>
    );
}
