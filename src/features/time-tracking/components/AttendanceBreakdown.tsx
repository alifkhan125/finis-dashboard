export function AttendanceBreakdown({ calculation: c }: { calculation?: any }) {
    if (!c) return null;
    const duration = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m`;
    const time = (value: string) => new Date(value).toLocaleString();
    return <div className="space-y-3 text-xs">
        <div className="rounded-xl bg-blue-50 p-3 text-blue-900">
            <p className="font-bold">Approved shift: {c.approvedShift ? `${c.approvedShift.startTime} – ${c.approvedShift.endTime}` : 'Not assigned'}</p>
            <p className="mt-1">{c.lateStatus.replace(/_/g, ' ')} · {c.currentState.replace(/_/g, ' ')}</p>
        </div>
        <div className="grid grid-cols-2 gap-2">
            {[
                ['Inside', duration(c.totalInsideHours * 3600)], ['Outside gaps', duration(c.totalOutsideHours * 3600)],
                ['Counted working time', duration(c.totalCountedHours * 3600)], ['Elapsed', duration(c.totalElapsedHours * 3600)],
                ['Check-in sessions', c.totalSessions], ['Check-outs', c.totalCheckOuts],
            ].map(([label, value]) => <div key={label} className="rounded-lg border border-gray-100 p-2"><span className="text-gray-500">{label}</span><p className="mt-1 font-bold">{value}</p></div>)}
        </div>
        <div className="divide-y rounded-xl border border-gray-100 px-3">
            {c.timeline.map((event: any, i: number) => <div key={`${event.sessionId}-${event.activity}`} className="py-2">
                <p className="font-semibold">{event.activity === 'check_in' ? 'Check-in' : 'Check-out'} · {time(event.time)}</p>
                <p className="text-gray-500">{event.activity === 'check_in' ? i ? 'Outside gap' : 'First arrival' : 'Inside'}{event.durationSeconds > 0 ? `: ${duration(event.durationSeconds)}` : ''}</p>
                {event.time !== event.originalTime && <p className="text-amber-700">Original: {time(event.originalTime)} · Admin-approved correction</p>}
            </div>)}
            {!c.timeline.length && <p className="py-3 text-gray-500">No check-in activity.</p>}
        </div>
    </div>;
}
