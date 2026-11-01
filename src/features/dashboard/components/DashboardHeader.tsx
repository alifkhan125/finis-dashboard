import { LayoutGrid } from 'lucide-react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { DateRangeFilter } from './DateRangeFilter';

interface DashboardHeaderProps {
    onFilterChange: (filter: string) => void;
    onCustomDateChange?: (start: Date, end: Date) => void;
}

export function DashboardHeader({ onFilterChange, onCustomDateChange }: DashboardHeaderProps) {
    return (
        <PageHeader
            title="Dashboard"
            description="Insights & Analytics Hub"
            icon={LayoutGrid}
            className="mb-6 relative text-black"
        >
            <div className="flex items-center gap-2">
                <DateRangeFilter
                    onFilterChange={onFilterChange}
                    onCustomDateChange={onCustomDateChange}
                />
            </div>
        </PageHeader>
    );
}
