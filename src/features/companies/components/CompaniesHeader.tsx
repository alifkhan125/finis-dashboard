import { Building2, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { DateRangeFilter } from '@/features/dashboard/components/DateRangeFilter';

interface CompaniesHeaderProps {
    onFilterChange: (filter: string) => void;
    onCustomDateChange: (start: Date, end: Date) => void;
    onCreateCompany?: () => void;
    canCreate?: boolean;
    isSuperAdmin?: boolean;
}

export function CompaniesHeader({
    onFilterChange,
    onCustomDateChange,
    onCreateCompany,
    canCreate = true,
    isSuperAdmin = false,
}: CompaniesHeaderProps) {
    return (
        <PageHeader
            title="Companies"
            description={
                isSuperAdmin
                    ? 'Global directory of all platform companies and tenant organizations'
                    : 'Manage your companies, contractors, and site operations'
            }
            icon={Building2}
        >
            <DateRangeFilter
                onFilterChange={onFilterChange}
                onCustomDateChange={onCustomDateChange}
                initialFilter="all"
            />

            {canCreate && onCreateCompany && (
                <Button
                    onClick={onCreateCompany}
                    className="gap-2 shadow-lg shadow-blue-100 h-10 bg-[#1D4F6D] hover:bg-[#0f2331] rounded-xl"
                >
                    <Plus className="h-4 w-4" />
                    Add Company
                </Button>
            )}
        </PageHeader>
    );
}
