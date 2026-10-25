import { useState, useMemo } from 'react';
import { Clock, MapPin, Search, CheckCircle2, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { Card } from '@/shared/components/ui/Card';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Input } from '@/shared/components/ui/Input';
import { Badge } from '@/shared/components/ui/Badge';
import { Table, Column } from '@/shared/components/ui/Table';
import { Select } from '@/shared/components/ui/Select';
import { Button } from '@/shared/components/ui/Button';
import { useGetAttendanceRecordsQuery, useGetAttendanceSummaryQuery } from '@/store/dashboardApi';
import type { SuperAdminAttendanceRecord } from '@/shared/types';
import { formatStatus } from '@/shared/utils';

export function AttendancePage() {
    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    const yesterdayDate = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
    const [selectedDate, setSelectedDate] = useState(todayDate);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');

    const { data: summaryData } = useGetAttendanceSummaryQuery({ date: selectedDate });
    const { data: recordsData, isLoading: isRecordsLoading } = useGetAttendanceRecordsQuery({ date: selectedDate, limit: 200 });

    const records: SuperAdminAttendanceRecord[] = Array.isArray(recordsData)
        ? recordsData
        : (Array.isArray(recordsData?.data) ? recordsData.data : []);

    const statsData = summaryData?.stats ?? recordsData?.stats ?? {
        total: records.length,
        present: records.filter(r => r.status === 'present' || r.status === 'late').length,
        late: records.filter(r => r.status === 'late').length,
        absent: records.filter(r => r.status === 'absent').length,
        activeCheckIns: records.filter(r => Boolean(r.session && !r.session.checkOutTime)).length,
        attendanceRate: records.length > 0 ? Math.round((records.filter(r => r.status === 'present').length / records.length) * 100) : 0,
    };

    const filteredRecords = useMemo(() => {
        return records.filter((r: SuperAdminAttendanceRecord) => {
            const workerName = r.worker?.fullName || '';
            const matchesSearch = workerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (r.worker?.projectName || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [records, searchQuery, statusFilter]);

    const stats = [
        { label: 'Total Present', value: String(statsData.present), icon: CheckCircle2, color: 'text-green-600', bg: 'bg-green-50' },
        { label: 'Late Arrivals', value: String(statsData.late), icon: AlertTriangle, color: 'text-yellow-600', bg: 'bg-yellow-50' },
        { label: 'Absent', value: String(statsData.absent), icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
        { label: 'Active Check-Ins', value: String(statsData.activeCheckIns), icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
    ];

    const columns: Column<SuperAdminAttendanceRecord>[] = [
        {
            key: 'worker',
            header: 'Worker Registry',
            render: (record: SuperAdminAttendanceRecord) => (
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-gray-100 flex items-center justify-center text-[#1D4F6D] font-black text-xs">
                        {(record.worker?.fullName || 'W').charAt(0)}
                    </div>
                    <div>
                        <div className="font-bold text-gray-900 leading-tight">{record.worker?.fullName || 'Worker'}</div>
                        <div className="text-xs text-gray-400">{record.worker?.role || 'Worker'}</div>
                    </div>
                </div>
            )
        },
        {
            key: 'project',
            header: 'Assigned Project',
            render: (record: SuperAdminAttendanceRecord) => (
                <span className="text-sm font-semibold text-gray-700">
                    {record.worker?.projectName || 'General / Unassigned'}
                </span>
            )
        },
        {
            key: 'date',
            header: 'Date',
            render: (record: SuperAdminAttendanceRecord) => (
                <span className="text-sm font-medium text-gray-600">
                    {record.date}
                </span>
            )
        },
        {
            key: 'checkIn',
            header: 'Check-In',
            render: (record: SuperAdminAttendanceRecord) => (
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${record.session?.checkInTime ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="text-sm font-bold text-gray-700">
                        {record.session?.checkInTime ? new Date(record.session.checkInTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                    </span>
                </div>
            )
        },
        {
            key: 'checkOut',
            header: 'Check-Out',
            render: (record: SuperAdminAttendanceRecord) => (
                <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${record.session?.checkOutTime ? 'bg-[#1D4F6D]' : 'bg-gray-300 animate-pulse'}`} />
                    <span className="text-sm font-bold text-gray-700">
                        {record.session?.checkOutTime ? new Date(record.session.checkOutTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'In Progress'}
                    </span>
                </div>
            )
        },
        {
            key: 'duration',
            header: 'Duration',
            render: (record: SuperAdminAttendanceRecord) => (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg bg-blue-50 text-blue-700 text-xs font-black">
                    {(record.totalHours ?? 0).toFixed(1)} hrs
                </span>
            )
        },
        {
            key: 'status',
            header: 'Status',
            render: (record: SuperAdminAttendanceRecord) => {
                const variants: Record<string, any> = {
                    present: 'success',
                    late: 'warning',
                    absent: 'destructive',
                    half_day: 'secondary'
                };
                return (
                    <Badge variant={variants[record.status] || 'secondary'} className="font-bold text-[10px] capitalize tracking-wide px-2 py-0.5">
                        {formatStatus(record.status)}
                    </Badge>
                );
            }
        },
        {
            key: 'location',
            header: 'Location',
            render: (record: SuperAdminAttendanceRecord) => (
                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                    <MapPin className="w-3.5 h-3.5 text-[#1D4F6D]" />
                    <span className="truncate max-w-[150px]">
                        {record.session?.inLat ? `${record.session.inLat.toFixed(4)}, ${record.session.inLng?.toFixed(4)}` : (record.worker?.projectName || 'On Site')}
                    </span>
                </div>
            )
        }
    ];

    return (
        <div className="space-y-6">
            <PageHeader
                title="Live Attendance Records"
                description="Live workforce attendance, geo-checkins, and status tracking"
                icon={Clock}
            >
                <div className="flex flex-wrap items-center gap-2">
                    <Input
                        type="date"
                        value={selectedDate === 'all' ? '' : selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="w-40 text-xs font-bold"
                    />
                    <Button
                        variant={selectedDate === todayDate ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDate(todayDate)}
                        className={`text-xs font-bold rounded-xl h-9 ${selectedDate === todayDate ? 'bg-[#1D4F6D] text-white' : ''}`}
                    >
                        Today
                    </Button>
                    <Button
                        variant={selectedDate === yesterdayDate ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDate(yesterdayDate)}
                        className={`text-xs font-bold rounded-xl h-9 ${selectedDate === yesterdayDate ? 'bg-[#1D4F6D] text-white' : ''}`}
                    >
                        Yesterday
                    </Button>
                    <Button
                        variant={selectedDate === 'all' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setSelectedDate('all')}
                        className={`text-xs font-bold rounded-xl h-9 ${selectedDate === 'all' ? 'bg-[#1D4F6D] text-white' : ''}`}
                    >
                        All Records
                    </Button>
                </div>
            </PageHeader>

            {/* Quick Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, idx) => (
                    <Card key={idx} className="border-gray-100 shadow-sm p-4 rounded-2xl bg-white">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-wider block">{stat.label}</span>
                                <span className="text-2xl font-black text-gray-900 mt-1 block tracking-tight">{stat.value}</span>
                            </div>
                            <div className={`h-11 w-11 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center shadow-inner`}>
                                <stat.icon className="h-5 w-5" />
                            </div>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Attendance Table */}
            <Card className="border-gray-100 shadow-sm rounded-3xl overflow-hidden bg-white">
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gray-50/20">
                    <div className="flex items-center gap-3">
                        <div className="relative flex-1 md:w-80">
                            <Input
                                placeholder="Filter workers, projects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                startIcon={<Search className="h-4 w-4" />}
                                className="bg-white rounded-xl text-sm"
                            />
                        </div>
                        <Select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            options={[
                                { value: 'all', label: 'All Statuses' },
                                { value: 'present', label: 'Present' },
                                { value: 'late', label: 'Late' },
                                { value: 'absent', label: 'Absent' },
                                { value: 'half_day', label: 'Half Day' }
                            ]}
                            className="w-40 bg-white rounded-xl text-sm"
                        />
                    </div>
                    {isRecordsLoading && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
                </div>

                <div className="p-0">
                    <Table
                        data={filteredRecords}
                        columns={columns}
                    />
                </div>
            </Card>
        </div>
    );
}
