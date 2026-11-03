import { useState } from 'react';
import { Clock, TrendingUp, Users } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { Card } from '@/shared/components/ui/Card';
import { Tabs } from '@/shared/components/ui/Tabs';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { useGetAttendanceRecordsQuery, useGetAttendanceSummaryQuery } from '@/store/dashboardApi';

// Sub-components
import { AttendanceView } from '../components/AttendanceView';
import { TimeAdjustmentRequestsPage } from './TimeAdjustmentRequestsPage';

export function TimeTrackingPage() {
    const [searchParams, setSearchParams] = useSearchParams();
    // Default to 'overview' or read from URL 'tab' param
    const activeTab = searchParams.get('tab') || 'overview';
    const today = new Date();
    const todayDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const [selectedDate, setSelectedDate] = useState<string>(todayDate);

    const { data: summary, isLoading: summaryLoading } = useGetAttendanceSummaryQuery(
        { date: selectedDate, page: 1, limit: 20 },
        { pollingInterval: 15000 },
    );
    const { data: records, isLoading: recordsLoading } = useGetAttendanceRecordsQuery(
        { date: selectedDate, page: 1, limit: 100 },
        { pollingInterval: 15000 },
    );

    const handleTabChange = (tabId: string) => {
        setSearchParams({ tab: tabId });
    };

    const attendanceList = Array.isArray(records)
        ? records
        : (Array.isArray(records?.data) ? records.data : []);

    const stats = summary?.stats ?? records?.stats ?? {
        total: attendanceList.length,
        present: attendanceList.filter(r => r.status === 'present' || r.status === 'late').length,
        late: attendanceList.filter(r => r.status === 'late').length,
        absent: attendanceList.filter(r => r.status === 'absent').length,
        activeCheckIns: attendanceList.filter(r => Boolean(r.session && !r.session.checkOutTime)).length,
        attendanceRate: attendanceList.length > 0 ? Math.round((attendanceList.filter(r => r.status === 'present').length / attendanceList.length) * 100) : 0,
    };

    return (
        <div className="space-y-6">
            <PageHeader
                title="Time Tracking & Attendance"
                description="Monitor worker attendance and location tracking"
                icon={Clock}
            />

            {/* Content Tabs */}
            <Tabs
                tabs={[
                    { id: 'overview', label: 'Overview' },
                    { id: 'attendance', label: 'Attendance' },
                    { id: 'adjustments', label: 'Shift Adjustments' },
                ]}
                activeTab={activeTab}
                onTabChange={handleTabChange}
            />

            {/* Overview Tab Content */}
            {activeTab === 'overview' && (
                <div className="space-y-6">
                    {/* Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-gray-600">Present Today</div>
                                    <div className="text-3xl font-bold text-green-600 mt-2">{summaryLoading ? '...' : stats.present}</div>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <Users className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-gray-600">Late Arrivals</div>
                                    <div className="text-3xl font-bold text-orange-600 mt-2">{summaryLoading ? '...' : stats.late}</div>
                                </div>
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                                    <Clock className="w-6 h-6 text-orange-600" />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-gray-600">Absent Today</div>
                                    <div className="text-3xl font-bold text-red-600 mt-2">{summaryLoading ? '...' : stats.absent}</div>
                                </div>
                                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                    <Users className="w-6 h-6 text-red-600" />
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm text-gray-600">Live Location</div>
                                    <div className="text-3xl font-bold text-blue-600 mt-2">{summaryLoading ? '...' : stats.activeCheckIns}</div>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <TrendingUp className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Today's Highlights</h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Attendance Rate</div>
                                        <div className="text-sm text-gray-600">Present workers in selected period</div>
                                    </div>
                                    <div className="text-2xl font-bold text-green-600">{summaryLoading ? '...' : `${stats.attendanceRate}%`}</div>
                                </div>
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                                    <div>
                                        <div className="font-medium">Total Records</div>
                                        <div className="text-sm text-gray-600">Attendance entries available</div>
                                    </div>
                                    <div className="text-2xl font-bold text-blue-600">{summaryLoading ? '...' : stats.total}</div>
                                </div>
                            </div>
                        </Card>

                        <Card className="p-6">
                            <h3 className="text-lg font-semibold mb-4">Recent Check-Ins</h3>
                            <div className="space-y-3">
                                {attendanceList.filter(entry => entry.session?.checkInTime).slice(0, 3).map((entry, index) => (
                                    <div key={index} className="flex items-center justify-between py-2 border-b">
                                        <div>
                                            <div className="font-medium">{entry.worker.fullName}</div>
                                            <div className="text-sm text-gray-500">
                                                {entry.session?.checkInTime ? new Date(entry.session.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                            </div>
                                        </div>
                                        <span className={`text-sm font-medium ${entry.status === 'present' ? 'text-green-600' : 'text-orange-600'}`}>
                                            {entry.status}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </Card>
                    </div>
                </div>
            )}

            {/* Other Tabs */}
            {activeTab === 'attendance' && (
                <AttendanceView
                    attendance={attendanceList}
                    loading={recordsLoading}
                    dateLabel={selectedDate === 'all' ? 'All Dates' : selectedDate}
                    selectedDate={selectedDate}
                    onDateChange={setSelectedDate}
                />
            )}

            {activeTab === 'adjustments' && (
                <TimeAdjustmentRequestsPage embedded />
            )}
        </div>
    );
}
