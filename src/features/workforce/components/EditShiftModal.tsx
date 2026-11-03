import React, { useState, useEffect } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Save, Loader2, Calendar, Trash2 } from 'lucide-react';
import { apiClient } from '@/services';

interface EditShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    shift: any;
    worker: any;
}

export function EditShiftModal({ isOpen, onClose, shift, worker }: EditShiftModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('17:00');
    const [graceMinutes, setGraceMinutes] = useState(15);
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toLocaleDateString('en-CA'));
    const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);

    useEffect(() => {
        if (shift) {
            setStartTime(shift.start || '08:00');
            setEndTime(shift.end || '17:00');
            setGraceMinutes(shift.graceMinutes ?? 15);
            if (shift.days && Array.isArray(shift.days) && shift.days.length > 0) {
                setSelectedDays(shift.days.map((d: string) => d.slice(0, 3).toLowerCase()));
            }
        }
    }, [shift]);

    const toggleDay = (d: string) => {
        setSelectedDays(prev => 
            prev.includes(d) 
                ? (prev.length > 1 ? prev.filter(x => x !== d) : prev) 
                : [...prev, d]
        );
    };

    // Find default project ID from worker
    const projectId = shift?.projectId || worker?.projects?.[0]?.project?.id || worker?.projects?.[0]?.id || '';

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shift?.scheduleId) {
            alert('Schedule ID not found.');
            return;
        }

        setIsLoading(true);
        try {
            await apiClient.patch(`/admin/projects/${projectId || 'default'}/schedule/${shift.scheduleId}`, {
                startTime,
                endTime,
                graceMinutes,
                effectiveFrom,
                userId: worker.userId || worker.id,
                days: selectedDays
            });
            window.location.reload();
        } catch (error) {
            console.error('Failed to update shift', error);
            alert('Failed to update shift. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!shift?.assignmentId) {
            alert('Assignment ID not found.');
            return;
        }

        const confirmDelete = window.confirm('Are you sure you want to remove this shift assignment?');
        if (!confirmDelete) return;

        setIsDeleting(true);
        try {
            await apiClient.delete(`/admin/projects/${projectId || 'default'}/schedule/assignments/${shift.assignmentId}`);
            window.location.reload();
        } catch (error) {
            console.error('Failed to remove shift assignment', error);
            alert('Failed to remove shift. Please try again.');
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Edit Work Schedule"
            maxWidth="lg"
            className="p-0 overflow-hidden"
        >
            <div className="bg-[#1D4F6D] p-8 text-white -mt-6 -mx-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <Calendar className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Edit Shift</h2>
                        <p className="text-blue-100/70">Modify shift timing or working days for {worker?.name}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleUpdate} className="space-y-6">
                <div className="space-y-4">
                    <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                        <div>
                            <p className="text-xs text-gray-500 uppercase font-bold tracking-wider">Project / Shift</p>
                            <p className="text-sm font-bold text-gray-900 mt-0.5">{shift?.project || 'Work Schedule'}</p>
                        </div>
                        <span className="text-xs px-2.5 py-1 bg-blue-100 text-[#1D4F6D] font-bold rounded-lg uppercase">
                            {shift?.status || 'Active'}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="editStartTime" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Time</Label>
                            <Input
                                id="editStartTime"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="h-12 border-gray-100 bg-gray-50 focus:bg-white transition-all rounded-xl font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="editEndTime" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Time</Label>
                            <Input
                                id="editEndTime"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="h-12 border-gray-100 bg-gray-50 focus:bg-white transition-all rounded-xl font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="editGraceMinutes">Late grace period (minutes)</Label>
                        <Label htmlFor="editEffectiveFrom">Effective from (saved attendance will be recalculated)</Label>
                        <Input id="editEffectiveFrom" type="date" required value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
                        <Input id="editGraceMinutes" type="number" min={0} max={180} step={1} required value={graceMinutes} onChange={e => setGraceMinutes(Number(e.target.value))} />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Working Days</Label>
                        <div className="flex flex-wrap gap-2">
                            {[
                                { id: 'mon', label: 'Mon' },
                                { id: 'tue', label: 'Tue' },
                                { id: 'wed', label: 'Wed' },
                                { id: 'thu', label: 'Thu' },
                                { id: 'fri', label: 'Fri' },
                                { id: 'sat', label: 'Sat' },
                                { id: 'sun', label: 'Sun' },
                            ].map((day) => {
                                const isSelected = selectedDays.includes(day.id);
                                return (
                                    <button
                                        key={day.id}
                                        type="button"
                                        onClick={() => toggleDay(day.id)}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                                            isSelected 
                                                ? 'bg-[#1D4F6D] text-white shadow-sm' 
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                        }`}
                                    >
                                        {day.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-gray-100">
                    <Button 
                        type="button" 
                        variant="destructive" 
                        onClick={handleDelete}
                        disabled={isDeleting || isLoading || !shift?.assignmentId}
                        className="h-12 px-5 rounded-xl font-bold gap-2 text-xs"
                    >
                        {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                        Remove Shift
                    </Button>

                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" onClick={onClose} className="h-12 px-6 rounded-xl font-bold">
                            Cancel
                        </Button>
                        <Button type="submit" className="h-12 px-8 rounded-xl bg-[#1D4F6D] hover:bg-[#1D4F6D]/90 text-white font-bold gap-2" disabled={isLoading || isDeleting}>
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </form>
        </Modal>
    );
}
