import { useState, useRef, useEffect } from 'react';
import { Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { cn } from '@/shared/utils';
import { DatePicker } from '@/shared/components/ui/DatePicker';

export interface DateRangeFilterProps {
    onFilterChange: (filter: string) => void;
    onCustomDateChange?: (start: Date, end: Date) => void;
    className?: string;
    initialFilter?: string;
}

export function DateRangeFilter({ onFilterChange, onCustomDateChange, className, initialFilter = 'monthly' }: DateRangeFilterProps) {
    const [activeFilter, setActiveFilter] = useState(initialFilter);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Custom Date states
    const [isRangeMode, setIsRangeMode] = useState(true);
    const [startDate, setStartDate] = useState<Date | undefined>();
    const [endDate, setEndDate] = useState<Date | undefined>();

    const containerRef = useRef<HTMLDivElement>(null);

    const filters = [
        { id: 'today', label: 'Today' },
        { id: 'weekly', label: 'Weekly' },
        { id: 'monthly', label: 'Monthly' },
        { id: 'yearly', label: 'Yearly' },
        { id: 'custom', label: 'Custom' },
    ];

    const handleFilterClick = (filterId: string) => {
        setActiveFilter(filterId);
        onFilterChange(filterId);
        if (filterId !== 'custom') {
            setIsFilterOpen(false);
        }
    };

    const handleUpdateView = () => {
        if (startDate && onCustomDateChange) {
            if (isRangeMode && endDate) {
                if (endDate < startDate) return;
                const endOfDay = new Date(endDate);
                endOfDay.setHours(23, 59, 59, 999);
                onCustomDateChange(startDate, endOfDay);
            } else if (!isRangeMode) {
                // If single mode, send same date for start and end
                const endOfDay = new Date(startDate);
                endOfDay.setHours(23, 59, 59, 999);
                onCustomDateChange(startDate, endOfDay);
            }
            setIsFilterOpen(false);
        }
    };

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setIsFilterOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        setActiveFilter(initialFilter);
    }, [initialFilter]);

    return (
        <div className={cn("relative", className)} ref={containerRef}>
            <Button
                variant="outline"
                onClick={() => setIsFilterOpen(!isFilterOpen)}
                className="h-10 px-4 rounded-xl border-gray-100 bg-gray-50/30 hover:bg-white hover:border-[#1D4F6D]/20 transition-all font-bold gap-3 min-w-[140px] justify-between shadow-sm"
            >
                <div className="flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-[#1D4F6D]" />
                    <span className="text-[11px] uppercase tracking-wider">{filters.find(f => f.id === activeFilter)?.label}</span>
                </div>
                <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform duration-300", isFilterOpen && "rotate-180")} />
            </Button>

            {isFilterOpen && (
                <div className="absolute right-0 mt-3 w-[200px] bg-white rounded-2xl shadow-[0_20px_48px_-12px_rgba(0,0,0,0.15)] border border-gray-100 overflow-visible z-[60] animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1.5 flex flex-col gap-0.5 bg-white rounded-2xl">
                        {filters.map((f) => (
                            <button
                                key={f.id}
                                onClick={() => handleFilterClick(f.id)}
                                className={cn(
                                    "flex items-center px-4 py-2.5 text-[10px] font-black uppercase tracking-widest transition-all rounded-lg relative group overflow-hidden text-left w-full",
                                    activeFilter === f.id ? "bg-blue-50 text-[#1D4F6D]" : "text-gray-400 hover:bg-gray-50 hover:text-[#1D4F6D]"
                                )}
                            >
                                <div className={cn(
                                    "absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-[#1D4F6D] rounded-r-full transition-all",
                                    activeFilter === f.id ? "h-4" : "h-0 group-hover:h-4"
                                )} />
                                {f.label}
                            </button>
                        ))}
                    </div>

                    {activeFilter === 'custom' && (
                        <div className={cn(
                            "p-4 bg-white border border-gray-100 space-y-4 w-[320px] absolute shadow-[0_24px_64px_-16px_rgba(0,0,0,0.15)] rounded-2xl z-[70] animate-in duration-200",
                            "right-0 top-[calc(100%+12px)] sm:right-full sm:mr-3 sm:top-0 sm:mt-0 slide-in-from-top-2 sm:slide-in-from-right-2"
                        )}>
                            <div className="flex flex-col gap-4">
                                <div className="flex items-center justify-between p-1 bg-gray-50 rounded-lg">
                                    <button
                                        onClick={() => setIsRangeMode(false)}
                                        className={cn(
                                            "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                                            !isRangeMode ? "bg-white text-[#1D4F6D] shadow-sm" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        Single Date
                                    </button>
                                    <button
                                        onClick={() => setIsRangeMode(true)}
                                        className={cn(
                                            "flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded-md transition-all",
                                            isRangeMode ? "bg-white text-[#1D4F6D] shadow-sm" : "text-gray-400 hover:text-gray-600"
                                        )}
                                    >
                                        Date Range
                                    </button>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">{isRangeMode ? 'Start Date' : 'Select Date'}</label>
                                        <DatePicker
                                            date={startDate}
                                            setDate={setStartDate}
                                            placeholder="Choose Date"
                                        />
                                    </div>
                                    {isRangeMode && (
                                        <div className="space-y-1.5 animate-in fade-in duration-300">
                                            <label className="text-[8px] font-black text-gray-400 uppercase tracking-widest pl-1">End Date</label>
                                            <DatePicker
                                                date={endDate}
                                                setDate={setEndDate}
                                                placeholder="Choose Date"
                                            />
                                        </div>
                                    )}
                                </div>
                            </div>
                            <Button
                                onClick={handleUpdateView}
                                disabled={!startDate || (isRangeMode && (!endDate || endDate < startDate))}
                                className="w-full bg-[#1D4F6D] hover:bg-[#0f2331] text-white h-10 rounded-xl text-[9px] font-black uppercase tracking-[0.1em] shadow-lg shadow-blue-900/10 active:scale-95 transition-all disabled:opacity-30"
                            >
                                Set Custom View
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
