import { useState } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import {
  CompanyStats,
  CompanyFilters,
  CompanyTable,
  CompanyCard,
  CompaniesHeader,
  CreateCompanyModal
} from '../components';
import { Company } from '@/shared/types';
import { useCompanies, useCreateCompany } from '../hooks/useCompanies';
import { useToggleCompanyStatusMutation } from '@/store/companiesApi';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/authSlice';
import { useDebounce } from '@/shared/hooks';
import { SEO } from '@/shared/components/seo/SEO';

export function CompaniesPage() {
  const authUser = useAppSelector(selectAuthUser);
  const isSuperAdmin = authUser?.role === 'super_admin';
  const { companies, isLoading, refetch: refetchCompanies } = useCompanies();
  const { createCompany } = useCreateCompany();
  const [toggleCompanyStatus] = useToggleCompanyStatusMutation();
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [industryFilter, setIndustryFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('monthly');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);


  const handleToggleStatus = async (companyId: string) => {
    try {
      await toggleCompanyStatus(companyId).unwrap();
      await refetchCompanies();
    } catch (err) {
      console.error('Failed to toggle company status:', err);
    }
  };

  const handleCreateCompany = async (newCompanyData: Partial<Company>) => {
    const newCompany: Company = {
      id: `c${Date.now()}`,
      name: newCompanyData.name || 'New Company',
      description: newCompanyData.description || '',
      industry: newCompanyData.industry || 'Construction',
      status: 'active',
      annualRevenue: 0,
      location: newCompanyData.location || '',
      contact: {
        name: 'Admin',
        email: newCompanyData.contact?.email || '',
        phone: newCompanyData.contact?.phone || ''
      },
      address: newCompanyData.address || '',
      projectCount: 0,
      createdAt: new Date().toISOString(),
      logo: `https://ui-avatars.com/api/?name=${encodeURIComponent(newCompanyData.name || 'NC')}&background=random`
    };

    await createCompany(newCompany);
    await refetchCompanies();
    setIsCreateModalOpen(false);
  };

  // Filter Logic
  const filteredCompanies = companies.filter(company => {
    // 1. Search (Debounced)
    const matchesSearch = debouncedSearchQuery.trim() === '' ||
      company.name.toLowerCase().includes(debouncedSearchQuery.trim().toLowerCase()) ||
      (company.location && company.location.toLowerCase().includes(debouncedSearchQuery.trim().toLowerCase()));

    // 2. Status
    const matchesStatus = statusFilter === 'all' || company.status === statusFilter;

    // 3. Industry
    const matchesIndustry = industryFilter === 'all' ||
      (company.industry && company.industry.toLowerCase() === industryFilter.toLowerCase());

    // Match companies created inside both boundaries of the selected period.
    const companyDate = new Date(company.createdAt);
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    switch (timeFilter) {
      case 'today':
      case 'daily':
        end.setDate(end.getDate() + 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - (start.getDay() + 6) % 7);
        end.setTime(start.getTime());
        end.setDate(end.getDate() + 7);
        break;
      case 'monthly':
        start.setDate(1);
        end.setTime(start.getTime());
        end.setMonth(end.getMonth() + 1);
        break;
      case 'yearly':
        start.setMonth(0, 1);
        end.setTime(start.getTime());
        end.setFullYear(end.getFullYear() + 1);
        break;
      case 'custom':
        if (customDateRange) {
          start.setTime(customDateRange.start.getTime());
          end.setTime(customDateRange.end.getTime() + 1);
        }
        break;
    }
    const matchesTime = companyDate >= start && companyDate < end;

    return matchesSearch && matchesStatus && matchesIndustry && matchesTime;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
        <p className="text-gray-500 font-medium">Loading companies...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <SEO title="Companies Management" description="Manage and monitor all construction companies and contractors on the FinisPro platform." />
      <CompaniesHeader
        onFilterChange={(filter) => {
          if (filter !== 'custom') {
            setTimeFilter(filter);
            setCustomDateRange(null);
          }
        }}
        onCustomDateChange={(start, end) => {
          setCustomDateRange({ start, end });
          setTimeFilter('custom');
        }}
        onCreateCompany={() => setIsCreateModalOpen(true)}
        canCreate={!isSuperAdmin}
        isSuperAdmin={isSuperAdmin}
      />

      <p className="text-sm text-gray-500">Showing companies created in the selected period. Summary totals follow the date, search, status and industry filters.</p>
      <CompanyStats companies={filteredCompanies} />

      <CompanyFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        industryFilter={industryFilter}
        onIndustryChange={setIndustryFilter}
      >
        <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 p-1">
          <button
            onClick={() => setView('grid')}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition-all flex items-center gap-2 ${view === 'grid' ? 'bg-white text-[#1D4F6D] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Grid</span>
          </button>
          <button
            onClick={() => setView('table')}
            className={`rounded-lg px-3 py-2 text-sm font-bold transition-all flex items-center gap-2 ${view === 'table' ? 'bg-white text-[#1D4F6D] shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
          >
            <Table2 className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </button>
        </div>
      </CompanyFilters>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredCompanies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              isSuperAdmin={isSuperAdmin}
              onToggleStatus={handleToggleStatus}
            />
          ))}
          {filteredCompanies.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400 font-bold">No companies found matching your criteria</p>
            </div>
          )}
        </div>
      ) : (
        <CompanyTable
          data={filteredCompanies.slice(0, 10)}
          isSuperAdmin={isSuperAdmin}
          onToggleStatus={handleToggleStatus}
          pagination={{
            currentPage: 1,
            totalPages: Math.ceil(filteredCompanies.length / 10),
            totalResults: filteredCompanies.length,
            onPageChange: (page) => console.log('Page change:', page)
          }}
        />
      )}

      <CreateCompanyModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateCompany={handleCreateCompany}
      />
    </div>
  );
}