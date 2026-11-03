import { Card, CardContent } from '@/shared/components/ui/Card';
import { Button } from '@/shared/components/ui/Button';
import { Calendar as CalendarIcon, Clock, MapPin, ChevronLeft, ChevronRight, Plus, RotateCcw, Edit } from 'lucide-react';
import { Badge } from '@/shared/components/ui/Badge';
import { useState, useMemo } from 'react';
import { AssignShiftModal } from './AssignShiftModal';
import { EditShiftModal } from './EditShiftModal';

const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getShiftCardLabel(rawName?: string) {
    if (!rawName) return 'Regular Shift';
    const cleaned = rawName.replace(/ \(Adjusted\)/gi, '').trim();
    if (/^\d{1,2}(:\d{2})?\s*(AM|PM)?\s*-\s*\d{1,2}(:\d{2})?\s*(AM|PM)?$/i.test(cleaned)) {
        return 'Regular Shift';
    }
    return rawName;
}

export function formatTimeAMPM(timeStr?: string): string {
    if (!timeStr) return '--:--';
    const trimmed = timeStr.trim();
    // Check if format like "4:41 AM" or "04:41 AM"
    const ampmMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*(AM|PM)$/i);
    if (ampmMatch) {
        const hrs = parseInt(ampmMatch[1], 10).toString().padStart(2, '0');
        const mins = ampmMatch[2];
        const ampm = ampmMatch[3].toUpperCase();
        return `${hrs}:${mins} ${ampm}`;
    }
    // Check if 24hr format like "08:00" or "17:00" or "17:00:00"
    const match24 = trimmed.match(/^(\d{1,2}):(\d{2})/);
    if (match24) {
        let hrs = parseInt(match24[1], 10);
        const mins = match24[2];
        if (!isNaN(hrs)) {
            const ampm = hrs >= 12 ? 'PM' : 'AM';
            hrs = hrs % 12 || 12;
            return `${hrs.toString().padStart(2, '0')}:${mins} ${ampm}`;
        }
    }
    // Check if ISO or date string
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return trimmed;
}

export function WorkerSchedule({ worker }: { worker?: any }) {
    const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
    const [selectedShiftForEdit, setSelectedShiftForEdit] = useState<any>(null);
    const [weekOffset, setWeekOffset] = useState(0);

    // Calculate dates for current navigated week
    const currentWeekDays = useMemo(() => {
        const today = new Date();
        const dayOfWeek = today.getDay(); // 0 is Sun, 1 is Mon...
        const diffToMonday = (dayOfWeek + 6) % 7;
        const monday = new Date(today);
        monday.setDate(today.getDate() - diffToMonday + (weekOffset * 7));

        return weekDays.map((dayName, idx) => {
            const date = new Date(monday);
            date.setDate(monday.getDate() + idx);
            const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            return {
                dayName,
                dayNumber: date.getDate(),
                date,
                dateKey,
            };
        });
    }, [weekOffset]);

    const dateRangeLabel = useMemo(() => {
        if (currentWeekDays.length === 0) return '';
        const start = currentWeekDays[0].date;
        const end = currentWeekDays[6].date;
        const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        return `${startStr} - ${endStr}`;
    }, [currentWeekDays]);

    const shifts = worker?.workScheduleAssignments?.flatMap((assignment: any) => {
        return assignment.schedule?.days?.map((d: string) => {
            const norm = d.slice(0, 3).toLowerCase();
            const dayMap: Record<string, string> = {
                mon: 'Mon',
                tue: 'Tue',
                wed: 'Wed',
                thu: 'Thu',
                fri: 'Fri',
                sat: 'Sat',
                sun: 'Sun',
            };
            const isAdjusted = assignment.schedule?.name?.toLowerCase().includes('adjusted');
            return {
                assignmentId: assignment.id,
                scheduleId: assignment.schedule?.id,
                days: assignment.schedule?.days,
                day: dayMap[norm] || (d.charAt(0).toUpperCase() + d.slice(1, 3)),
                start: assignment.schedule.startTime,
                end: assignment.schedule.endTime,
                graceMinutes: assignment.schedule.graceMinutes ?? 15,
                project: assignment.schedule.name,
                role: worker.role || 'Worker',
                status: isAdjusted ? 'adjusted' : 'upcoming'
            };
        }) || [];
    }) || [];

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-gray-400 hover:text-gray-900"
                            onClick={() => setWeekOffset(prev => prev - 1)}
                            title="Previous Week"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <div className="flex items-center gap-2 px-2">
                            <CalendarIcon className="h-4 w-4 text-[#1D4F6D]" />
                            <span className="font-bold text-gray-900">{dateRangeLabel}</span>
                        </div>
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-9 w-9 text-gray-400 hover:text-gray-900"
                            onClick={() => setWeekOffset(prev => prev + 1)}
                            title="Next Week"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>

                    {weekOffset !== 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setWeekOffset(0)}
                            className="h-9 gap-1.5 text-xs font-semibold text-[#1D4F6D] border-gray-200 hover:bg-gray-50"
                        >
                            <RotateCcw className="h-3.5 w-3.5" />
                            This Week
                        </Button>
                    )}
                </div>

                <Button 
                    onClick={() => setIsAssignModalOpen(true)}
                    className="gap-2 bg-[#1D4F6D] hover:bg-[#163a50] text-white shadow-md font-bold px-6 h-11"
                >
                    <Plus className="h-4 w-4" />
                    Assign New Shift
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
                {currentWeekDays.map(({ dayName, dayNumber, dateKey }) => {
                    const dayShifts = shifts.filter((s: any) => s.day === dayName);

                    // Check if this specific date has an approved single-day adjustment
                    const singleDayAdj = (worker?.timeAdjustments || []).find((adj: any) => {
                        if (adj.status !== 'approved') return false;
                        const isSingleDay = adj.kind === 'shift_change' && adj.scope === 'single_day';
                        if (!isSingleDay) return false;
                        const adjDateStr = new Date(adj.date).toISOString().split('T')[0];
                        return adjDateStr === dateKey;
                    });

                    let overrideStart: string | null = null;
                    let overrideEnd: string | null = null;
                    let isSingleDayAdjusted = false;

                    if (singleDayAdj) {
                        isSingleDayAdjusted = true;
                        overrideStart = singleDayAdj.startTime || null;
                        overrideEnd = singleDayAdj.endTime || null;
                        const match = singleDayAdj.reason?.match(/\[Time:\s*([^\]]+)\]/);
                        const timeStr = match ? match[1] : new Date(singleDayAdj.adjustedTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                        if (!overrideStart && singleDayAdj.requestType === 'check_in') {
                            overrideStart = timeStr;
                        } else if (!overrideEnd) {
                            overrideEnd = timeStr;
                        }
                    }

                    return (
                        <div key={dayName} className="space-y-3">
                            <div className="text-center py-2 bg-gray-50 rounded-lg border border-gray-100">
                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">{dayName}</p>
                                <p className="text-lg font-bold text-[#1D4F6D]">{dayNumber}</p>
                            </div>

                            {dayShifts.map((shift: any, idx: number) => {
                                const displayStart = overrideStart || shift.start;
                                const displayEnd = overrideEnd || shift.end;
                                const badgeStatus = isSingleDayAdjusted ? '1-day adjusted' : shift.status;

                                return (
                                    <Card 
                                        key={idx} 
                                        onClick={() => setSelectedShiftForEdit(shift)}
                                        className={`border-l-4 ${isSingleDayAdjusted ? 'border-l-purple-500' : shift.status === 'adjusted' ? 'border-l-purple-500' : 'border-l-blue-500'} shadow-sm overflow-hidden group hover:shadow-md transition-all cursor-pointer hover:border-gray-200`}
                                    >
                                        <CardContent className="p-3 space-y-3">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500">
                                                    <Clock className="h-3 w-3" />
                                                    {formatTimeAMPM(displayStart)} - {formatTimeAMPM(displayEnd)}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedShiftForEdit(shift);
                                                    }}
                                                    className="p-1 rounded-md text-gray-400 hover:text-[#1D4F6D] hover:bg-gray-100 transition-colors"
                                                    title="Edit Shift"
                                                >
                                                    <Edit className="h-3 w-3" />
                                                </button>
                                            </div>

                                            <div>
                                                <p className="text-sm font-black text-gray-900 group-hover:text-[#1D4F6D] transition-colors line-clamp-1">{getShiftCardLabel(shift.project)}</p>
                                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mt-0.5">{shift.role}</p>
                                            </div>

                                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-500">
                                                <MapPin className="h-3 w-3" />
                                                Main Site
                                            </div>

                                            <Badge variant={badgeStatus.includes('adjusted') ? 'default' : 'secondary'} className={`w-full justify-center text-[10px] py-0.5 ${isSingleDayAdjusted ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}>
                                                {badgeStatus}
                                            </Badge>
                                        </CardContent>
                                    </Card>
                                );
                            })}

                            {dayShifts.length === 0 && (
                                <div className="h-32 rounded-xl border border-dashed border-gray-200 flex flex-col items-center justify-center gap-2 bg-gray-50/50">
                                    <p className="text-[10px] font-bold text-gray-300 uppercase tracking-tighter">Off Day</p>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <AssignShiftModal 
                isOpen={isAssignModalOpen} 
                onClose={() => setIsAssignModalOpen(false)} 
                worker={worker} 
            />

            <EditShiftModal
                isOpen={!!selectedShiftForEdit}
                onClose={() => setSelectedShiftForEdit(null)}
                shift={selectedShiftForEdit}
                worker={worker}
            />
        </div>
    );
}
