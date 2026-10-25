import { useMemo, useState } from 'react';
import { Calendar, Clock, MapPin, Search, Download, ExternalLink, User, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, Column } from '@/shared/components/ui/Table';
import { Modal } from '@/shared/components/ui/Modal';
import { SuperAdminAttendanceRecord } from '@/shared/types';
import { formatStatus } from '@/shared/utils';

type Props = {
    attendance: SuperAdminAttendanceRecord[];
    loading?: boolean;
    dateLabel?: string;
    selectedDate?: string;
    onDateChange?: (date: string) => void;
};

export function AttendanceView({
    attendance,
    loading,
    dateLabel,
    selectedDate,
    onDateChange
}: Props) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMapLocation, setSelectedMapLocation] = useState<{ lat: number, lng: number, workerName: string } | null>(null);
    const [selectedRecordDetail, setSelectedRecordDetail] = useState<SuperAdminAttendanceRecord | null>(null);

    const safeAttendance = useMemo(() => (Array.isArray(attendance) ? attendance : []), [attendance]);

    // Filter by search query
    const filteredAttendance = useMemo(() => safeAttendance.filter((a) =>
        (a?.worker?.fullName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a?.worker?.projectName ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (a?.worker?.role ?? '').toLowerCase().includes(searchQuery.toLowerCase()),
    ), [safeAttendance, searchQuery]);

    // Quick date helpers
    const today = new Date();
    const todayDateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayDateStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;

    // Export CSV function
    const handleExportCSV = () => {
        if (filteredAttendance.length === 0) {
            alert('No records to export.');
            return;
        }

        const headers = ['Worker Name', 'Role', 'Project', 'Date', 'Check-In', 'Check-Out', 'Hours Worked', 'Status', 'In Lat', 'In Lng'];
        const rows = filteredAttendance.map((r) => [
            `"${r.worker.fullName.replace(/"/g, '""')}"`,
            `"${(r.worker.role || 'Worker').replace(/"/g, '""')}"`,
            `"${(r.worker.projectName || 'General').replace(/"/g, '""')}"`,
            `"${new Date(r.date).toLocaleDateString()}"`,
            `"${r.session?.checkInTime ? new Date(r.session.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}"`,
            `"${r.session?.checkOutTime ? new Date(r.session.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Ongoing'}"`,
            `"${(r.totalHours ?? 0).toFixed(2)}"`,
            `"${r.status}"`,
            `"${r.session?.inLat ?? ''}"`,
            `"${r.session?.inLng ?? ''}"`,
        ]);

        const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `attendance_records_${selectedDate || 'export'}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const columns: Column<SuperAdminAttendanceRecord>[] = [
        {
            key: 'worker',
            header: 'Worker',
            sortable: true,
            render: (record) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-blue-50 flex items-center justify-center text-[#1D4F6D] font-bold text-xs uppercase">
                        {(record.worker.fullName || 'W').charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 leading-tight">{record.worker.fullName}</div>
                        <div className="text-xs text-gray-400 mt-0.5">{record.worker.projectName || record.worker.role || 'General'}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'date',
            header: 'Date',
            render: (record) => (
                <span className="text-sm font-medium text-gray-600">
                    {new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
            )
        },
        {
            key: 'checkIn',
            header: 'Check-In',
            render: (record) => (
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${record.session?.checkInTime ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm font-bold text-gray-800">
                        {record.session?.checkInTime ? new Date(record.session.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                    </span>
                </div>
            )
        },
        {
            key: 'checkOut',
            header: 'Check-Out',
            render: (record) => (
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${record.session?.checkOutTime ? 'bg-[#1D4F6D]' : 'bg-amber-400 animate-pulse'}`} />
                    <span className="text-sm font-bold text-gray-800">
                        {record.session?.checkOutTime ? new Date(record.session.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Ongoing'}
                    </span>
                </div>
            )
        },
        {
            key: 'hoursWorked',
            header: 'Hours Worked',
            sortable: true,
            render: (record) => <span className="font-black text-[#1D4F6D]">{(record.totalHours ?? 0).toFixed(2)}h</span>
        },
        {
            key: 'status',
            header: 'Status',
            render: (record) => (
                <Badge variant={record.status === 'present' ? 'success' : record.status === 'late' ? 'warning' : 'destructive'} className="font-bold capitalize text-[10px]">
                    {formatStatus(record.status)}
                </Badge>
            )
        },
        {
            key: 'location',
            header: 'GPS Location',
            render: (record) => record.session?.inLat && record.session?.inLng ? (
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                    onClick={() => setSelectedMapLocation({
                        lat: record.session!.inLat!,
                        lng: record.session!.inLng!,
                        workerName: record.worker.fullName
                    })}
                >
                    <MapPin className="w-3.5 h-3.5 mr-1" />
                    View Pin
                </Button>
            ) : <span className="text-gray-400 text-xs font-medium">On Site</span>
        },
        {
            key: 'actions',
            header: 'Actions',
            render: (record) => (
                <Button 
                    size="sm" 
                    variant="outline" 
                    className="h-8 text-xs font-semibold rounded-lg"
                    onClick={() => setSelectedRecordDetail(record)}
                >
                    View Details
                </Button>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header with Title and Interactive Date Filters */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-gray-100 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-gray-900 tracking-tight">Attendance Records</h2>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                        Track worker check-in/out times and GPS locations for{' '}
                        <span className="font-bold text-[#1D4F6D]">
                            {selectedDate === 'all' ? 'All Recent Dates' : dateLabel || selectedDate || 'Today'}
                        </span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Date Input */}
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                        <Calendar className="w-4 h-4 text-[#1D4F6D]" />
                        <input
                            type="date"
                            value={selectedDate === 'all' ? '' : (selectedDate || todayDateStr)}
                            onChange={(e) => onDateChange?.(e.target.value)}
                            className="bg-transparent text-xs font-bold text-gray-900 outline-none cursor-pointer"
                        />
                    </div>

                    {/* Quick Filter Buttons */}
                    <Button
                        variant={selectedDate === todayDateStr ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onDateChange?.(todayDateStr)}
                        className={`text-xs font-bold rounded-xl h-9 ${selectedDate === todayDateStr ? 'bg-[#1D4F6D] text-white' : ''}`}
                    >
                        Today
                    </Button>
                    <Button
                        variant={selectedDate === yesterdayDateStr ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onDateChange?.(yesterdayDateStr)}
                        className={`text-xs font-bold rounded-xl h-9 ${selectedDate === yesterdayDateStr ? 'bg-[#1D4F6D] text-white' : ''}`}
                    >
                        Yesterday
                    </Button>
                    <Button
                        variant={selectedDate === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onDateChange?.('all')}
                        className={`text-xs font-bold rounded-xl h-9 ${selectedDate === 'all' ? 'bg-[#1D4F6D] text-white' : ''}`}
                    >
                        All Records
                    </Button>

                    <Button 
                        variant="outline" 
                        size="sm"
                        onClick={handleExportCSV}
                        className="text-xs font-bold rounded-xl h-9 gap-1.5 border-gray-200 hover:bg-gray-50 ml-auto lg:ml-0"
                    >
                        <Download className="w-3.5 h-3.5" />
                        Export CSV
                    </Button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <Card className="p-4 border-gray-100 shadow-sm rounded-2xl bg-white">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Workers</div>
                    <div className="text-2xl font-black text-gray-900 mt-1">{safeAttendance.length}</div>
                </Card>
                <Card className="p-4 border-gray-100 shadow-sm rounded-2xl bg-white">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Present</div>
                    <div className="text-2xl font-black text-green-600 mt-1">
                        {safeAttendance.filter(a => a.status === 'present' || a.status === 'late').length}
                    </div>
                </Card>
                <Card className="p-4 border-gray-100 shadow-sm rounded-2xl bg-white">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Late Arrivals</div>
                    <div className="text-2xl font-black text-amber-500 mt-1">
                        {safeAttendance.filter(a => a.status === 'late').length}
                    </div>
                </Card>
                <Card className="p-4 border-gray-100 shadow-sm rounded-2xl bg-white">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Absent</div>
                    <div className="text-2xl font-black text-red-500 mt-1">
                        {safeAttendance.filter(a => a.status === 'absent').length}
                    </div>
                </Card>
                <Card className="p-4 border-gray-100 shadow-sm rounded-2xl bg-white col-span-2 md:col-span-1">
                    <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Logged Hours</div>
                    <div className="text-2xl font-black text-[#1D4F6D] mt-1">
                        {safeAttendance.reduce((sum, a) => sum + (a.totalHours ?? 0), 0).toFixed(1)}h
                    </div>
                </Card>
            </div>

            {/* Search Bar */}
            <Card className="p-4 border-gray-100 shadow-sm rounded-2xl bg-white">
                <Input
                    placeholder="Search by worker name, role, or project..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    startIcon={<Search className="w-4 h-4 text-gray-400" />}
                    className="border-gray-100 bg-gray-50/50 focus:bg-white text-sm rounded-xl h-11"
                />
            </Card>

            {/* Attendance Table or Empty State */}
            <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden bg-white">
                {loading ? (
                    <div className="p-12 text-center text-sm font-semibold text-gray-500 flex flex-col items-center justify-center gap-3">
                        <div className="h-6 w-6 border-2 border-[#1D4F6D] border-t-transparent rounded-full animate-spin" />
                        Loading attendance records...
                    </div>
                ) : filteredAttendance.length === 0 ? (
                    <div className="p-12 text-center flex flex-col items-center justify-center">
                        <div className="h-14 w-14 rounded-2xl bg-blue-50 text-[#1D4F6D] flex items-center justify-center mb-3">
                            <Clock className="h-7 w-7" />
                        </div>
                        <h3 className="text-base font-bold text-gray-900">No Attendance Records for This Date</h3>
                        <p className="text-xs text-gray-500 max-w-sm mt-1 mb-5">
                            {selectedDate === 'all' 
                                ? 'No attendance records have been registered in the system yet.'
                                : `No workers checked in on ${selectedDate || 'this date'}. Check another date or view all recorded history.`}
                        </p>
                        <div className="flex gap-2">
                            <Button 
                                size="sm" 
                                onClick={() => onDateChange?.('all')}
                                className="bg-[#1D4F6D] text-white font-bold text-xs rounded-xl"
                            >
                                View All Recent Records
                            </Button>
                            <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => onDateChange?.(yesterdayDateStr)}
                                className="font-bold text-xs rounded-xl"
                            >
                                Check Yesterday
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Table data={filteredAttendance} columns={columns} />
                )}
            </Card>

            {/* Details Modal */}
            <Modal
                isOpen={!!selectedRecordDetail}
                onClose={() => setSelectedRecordDetail(null)}
                title="Attendance Session Details"
                maxWidth="md"
            >
                {selectedRecordDetail && (
                    <div className="space-y-4 pt-2">
                        <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                            <div className="h-11 w-11 rounded-xl bg-[#1D4F6D] text-white flex items-center justify-center font-black text-sm">
                                {selectedRecordDetail.worker.fullName.charAt(0)}
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{selectedRecordDetail.worker.fullName}</h4>
                                <p className="text-xs text-gray-500">{selectedRecordDetail.worker.role || 'Worker'} • {selectedRecordDetail.worker.projectName || 'Main Site'}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-xs">
                            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Date</span>
                                <span className="font-bold text-gray-900">{new Date(selectedRecordDetail.date).toLocaleDateString()}</span>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Status</span>
                                <Badge variant={selectedRecordDetail.status === 'present' ? 'success' : 'warning'} className="font-bold capitalize text-[9px]">
                                    {formatStatus(selectedRecordDetail.status)}
                                </Badge>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Check-In Time</span>
                                <span className="font-bold text-gray-900">
                                    {selectedRecordDetail.session?.checkInTime 
                                        ? new Date(selectedRecordDetail.session.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) 
                                        : 'N/A'}
                                </span>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl space-y-1">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Check-Out Time</span>
                                <span className="font-bold text-gray-900">
                                    {selectedRecordDetail.session?.checkOutTime 
                                        ? new Date(selectedRecordDetail.session.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) 
                                        : 'Still Checked In'}
                                </span>
                            </div>
                            <div className="p-3 bg-gray-50 rounded-xl space-y-1 col-span-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest block">Hours Logged</span>
                                <span className="text-base font-black text-[#1D4F6D]">
                                    {(selectedRecordDetail.totalHours ?? 0).toFixed(2)} hours
                                </span>
                            </div>
                        </div>

                        {selectedRecordDetail.session?.inLat && selectedRecordDetail.session?.inLng && (
                            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-2 text-xs text-gray-700">
                                    <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                                    <span>
                                        GPS: {selectedRecordDetail.session.inLat.toFixed(4)}, {selectedRecordDetail.session.inLng.toFixed(4)}
                                    </span>
                                </div>
                                <a
                                    href={`https://www.google.com/maps?q=${selectedRecordDetail.session.inLat},${selectedRecordDetail.session.inLng}`}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    Open Maps <ExternalLink className="h-3 w-3" />
                                </a>
                            </div>
                        )}

                        <div className="flex justify-end pt-2">
                            <Button variant="outline" size="sm" onClick={() => setSelectedRecordDetail(null)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Map Pin Modal */}
            <Modal
                isOpen={!!selectedMapLocation}
                onClose={() => setSelectedMapLocation(null)}
                title={`GPS Location: ${selectedMapLocation?.workerName}`}
                maxWidth="2xl"
            >
                <div className="relative h-[360px] bg-slate-100 rounded-xl overflow-hidden border border-gray-200">
                    <div
                        className="absolute inset-0 opacity-20 pointer-events-none"
                        style={{
                            backgroundImage: 'linear-gradient(#94a3b8 1px, transparent 1px), linear-gradient(90deg, #94a3b8 1px, transparent 1px)',
                            backgroundSize: '36px 36px'
                        }}
                    />

                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center animate-bounce">
                        <MapPin className="w-10 h-10 text-red-600 drop-shadow-lg" />
                        <div className="bg-white px-2.5 py-1 rounded-lg shadow text-xs font-bold mt-1">
                            {selectedMapLocation?.lat.toFixed(4)}, {selectedMapLocation?.lng.toFixed(4)}
                        </div>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur p-3 rounded-xl border border-gray-200 text-xs text-gray-600 flex items-center justify-between">
                        <span>Pinned Check-In Location for <b>{selectedMapLocation?.workerName}</b></span>
                        <a
                            href={`https://www.google.com/maps?q=${selectedMapLocation?.lat},${selectedMapLocation?.lng}`}
                            target="_blank"
                            rel="noreferrer"
                            className="font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                        >
                            Google Maps <ExternalLink className="h-3 w-3" />
                        </a>
                    </div>
                </div>
                <div className="mt-4 flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setSelectedMapLocation(null)}>Close</Button>
                </div>
            </Modal>
        </div>
    );
}
