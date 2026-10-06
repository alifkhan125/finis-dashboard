import { LayoutGrid, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { DateRangeFilter } from '@/features/dashboard/components/DateRangeFilter';

interface ProjectsHeaderProps {
    onFilterChange: (filter: string) => void;
    onCustomDateChange: (start: Date, end: Date) => void;
    onCreateProject: () => void;
    hideCreate?: boolean;
}

export function ProjectsHeader({ onFilterChange, onCustomDateChange, onCreateProject, hideCreate = false }: ProjectsHeaderProps) {
    return (
        <PageHeader
            title="Projects"
            description="Manage and track all construction projects"
            icon={LayoutGrid}
        >
            <div className="flex items-center gap-2">
                <Button
                    onClick={() => {
                        window.location.href = '/expenses?create=true';
                    }}
                    className="gap-2 shadow-lg shadow-blue-100 h-10 bg-white text-[#1D4F6D] border border-[#1D4F6D] hover:bg-gray-50 rounded-xl"
                >
                    <Plus className="h-4 w-4" />
                    Create Expense
                </Button>
                <DateRangeFilter
                    initialFilter="yearly"
                    onFilterChange={onFilterChange}
                    onCustomDateChange={onCustomDateChange}
                />

                {!hideCreate && (
                    <Button
                        onClick={onCreateProject}
                        className="gap-2 shadow-lg shadow-blue-100 h-10 bg-[#1D4F6D] hover:bg-[#0f2331] rounded-xl"
                    >
                        <Plus className="h-4 w-4" />
                        Create Project
                    </Button>
                )}
            </div>
        </PageHeader>
    );
}
