import React, { useState } from 'react';
import { Modal } from '@/shared/components/ui/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { Label } from '@/shared/components/ui/Label';
import { Save, Loader2, CalendarPlus } from 'lucide-react';
import { apiClient } from '@/services';

interface AssignShiftModalProps {
    isOpen: boolean;
    onClose: () => void;
    worker: any;
}

export function AssignShiftModal({ isOpen, onClose, worker }: AssignShiftModalProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [projectId, setProjectId] = useState('');
    const [startTime, setStartTime] = useState('08:00');
    const [endTime, setEndTime] = useState('17:00');
    const [graceMinutes, setGraceMinutes] = useState(15);
    const [effectiveFrom, setEffectiveFrom] = useState(new Date().toLocaleDateString('en-CA'));
    const [selectedDays, setSelectedDays] = useState<string[]>(['mon', 'tue', 'wed', 'thu', 'fri']);

    const toggleDay = (d: string) => {
        setSelectedDays(prev => 
            prev.includes(d) 
                ? (prev.length > 1 ? prev.filter(x => x !== d) : prev) 
                : [...prev, d]
        );
    };

    // Extract unique projects from worker's assignments or past projects
    const projects = worker?.projects || [];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!projectId) {
            alert('Please select a project first.');
            return;
        }

        setIsLoading(true);
        try {
            const workerId = worker.userId || worker.id;
            await apiClient.post(`/admin/projects/${projectId}/schedule/assign`, {
                userIds: [workerId],
                startTime,
                endTime,
                graceMinutes,
                effectiveFrom,
                days: selectedDays
            });
            window.location.reload(); // Reload to fetch fresh data
        } catch (error) {
            console.error('Failed to assign shift', error);
            alert('Failed to assign shift. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title="Assign New Shift"
            maxWidth="lg"
            className="p-0 overflow-hidden"
        >
            <div className="bg-[#1D4F6D] p-8 text-white -mt-6 -mx-6 mb-6">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-sm">
                        <CalendarPlus className="h-6 w-6 text-white" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold">Assign Shift</h2>
                        <p className="text-blue-100/70">Schedule a new shift for {worker.name}</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="project" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Select Project</Label>
                        <select 
                            id="project"
                            value={projectId}
                            onChange={(e) => setProjectId(e.target.value)}
                            className="w-full h-12 border border-gray-100 bg-gray-50 focus:bg-white transition-all rounded-xl font-medium px-4 outline-none"
                            required
                        >
                            <option value="" disabled>Select a project...</option>
                            {projects.map((p: any) => (
                                <option key={p.project?.id || p.id} value={p.project?.id || p.id}>
                                    {p.project?.name || p.name}
                                </option>
                            ))}
                        </select>
                        {projects.length === 0 && (
                            <p className="text-xs text-red-500 mt-1">Worker is not assigned to any projects.</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="startTime" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Time</Label>
                            <Input
                                id="startTime"
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="h-12 border-gray-100 bg-gray-50 focus:bg-white transition-all rounded-xl font-medium"
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="endTime" className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Time</Label>
                            <Input
                                id="endTime"
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="h-12 border-gray-100 bg-gray-50 focus:bg-white transition-all rounded-xl font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="graceMinutes">Late grace period (minutes)</Label>
                        <Label htmlFor="shiftEffectiveFrom">Effective from</Label>
                        <Input id="shiftEffectiveFrom" type="date" required value={effectiveFrom} onChange={e => setEffectiveFrom(e.target.value)} />
                        <Input id="graceMinutes" type="number" min={0} max={180} step={1} required value={graceMinutes} onChange={e => setGraceMinutes(Number(e.target.value))} />
                        <p className="text-xs text-gray-500">Check-in after shift start plus this grace period counts as late.</p>
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

                <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                    <Button type="button" variant="outline" onClick={onClose} className="h-12 px-6 rounded-xl font-bold">
                        Cancel
                    </Button>
                    <Button type="submit" className="h-12 px-8 rounded-xl bg-[#1D4F6D] hover:bg-[#1D4F6D]/90 text-white font-bold gap-2" disabled={isLoading || projects.length === 0}>
                        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Assign Shift
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
