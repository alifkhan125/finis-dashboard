import { useState } from 'react';
import { LayoutGrid, Table2 } from 'lucide-react';
import {
  ProjectStats,
  ProjectFilters,
  ProjectCard,
  ProjectTable,
  ProjectsHeader,
  CreateProjectModal
} from '../components';
import type { Project } from '@/shared/types';
import { useProjects, useCreateProject } from '../hooks';
import { useCompanies } from '@/features/companies/hooks/useCompanies';
import { useDebounce } from '@/shared/hooks';
import { SEO } from '@/shared/components/seo/SEO';

export function ProjectsPage() {
  const authUser = (() => {
    try {
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) as { role?: string } : null;
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = authUser?.role === 'super_admin';
  const { data: projects = [], isLoading } = useProjects();
  const { companies = [] } = useCompanies();
  const { createProject } = useCreateProject();
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('yearly');
  const [customDateRange, setCustomDateRange] = useState<{ start: Date; end: Date } | null>(null);

  const filteredProjects = projects.filter(project => {
    const matchesSearch = debouncedSearchQuery === '' ||
      project.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      project.companyName.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
      project.address.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && (project.status === 'planning' || project.status === 'active')) ||
      (statusFilter === 'completed' && project.status === 'completed') ||
      (statusFilter === 'delayed' && project.status === 'delayed');

    let matchesTime = true;
    const now = new Date();
    let filterStart: Date | null = null;
    let filterEnd: Date | null = null;
    const today = new Date(now.setHours(0, 0, 0, 0));

    switch (timeFilter) {
      case 'daily':
        filterStart = today;
        filterEnd = new Date(today);
        filterEnd.setHours(23, 59, 59, 999);
        break;
      case 'weekly':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        filterStart = startOfWeek;
        const endOfWeek = new Date(today);
        endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
        endOfWeek.setHours(23, 59, 59, 999);
        filterEnd = endOfWeek;
        break;
      case 'monthly':
        filterStart = new Date(today.getFullYear(), today.getMonth(), 1);
        filterEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
        break;
      case 'yearly':
        filterStart = new Date(today.getFullYear(), 0, 1);
        filterEnd = new Date(today.getFullYear(), 11, 31, 23, 59, 59, 999);
        break;
      case 'custom':
        if (customDateRange) {
          filterStart = customDateRange.start;
          filterEnd = customDateRange.end;
          filterEnd.setHours(23, 59, 59, 999);
        }
        break;
    }

    if (filterStart && filterEnd) {
      const pStart = project.startDate ? new Date(project.startDate) : null;
      const pEnd = project.endDate ? new Date(project.endDate) : null;

      const hasValidStart = pStart && !Number.isNaN(pStart.getTime());
      const hasValidEnd = pEnd && !Number.isNaN(pEnd.getTime());

      if (!hasValidStart && !hasValidEnd) {
        matchesTime = true;
      } else {
        const effectiveStart = hasValidStart ? pStart! : hasValidEnd ? pEnd! : null;
        const effectiveEnd = hasValidEnd ? pEnd! : effectiveStart;
        matchesTime = !!effectiveStart && effectiveStart <= filterEnd && (effectiveEnd ? effectiveEnd >= filterStart : true);
      }
    }

    return matchesSearch && matchesStatus && matchesTime;
  });

  const handleCreateProject = async (newProjectData: Partial<Project>) => {
    try {
      await createProject(newProjectData);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error('Failed to create project:', error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
        <p className="text-gray-500 font-medium">Loading projects...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      <SEO title="Projects Management" description="Track progress, timelines, and budgets for all active construction projects." />
      <ProjectsHeader
        onFilterChange={(filter) => {
          setTimeFilter(filter);
          if (filter !== 'custom') setCustomDateRange(null);
        }}
        onCustomDateChange={(start, end) => {
          setCustomDateRange({ start, end });
          setTimeFilter('custom');
        }}
        onCreateProject={() => {
          setIsCreateModalOpen(true);
        }}
        hideCreate={isSuperAdmin}
      />

      <ProjectStats projects={filteredProjects} />

      <ProjectFilters
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
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
      </ProjectFilters>

      {view === 'grid' ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
          {filteredProjects.length === 0 && (
            <div className="col-span-full text-center py-12">
              <p className="text-gray-400 font-bold">No projects found matching your criteria</p>
            </div>
          )}
        </div>
      ) : (
        <ProjectTable
          data={filteredProjects.slice(0, 10)}
          pagination={{
            currentPage: 1,
            totalPages: Math.ceil(filteredProjects.length / 10),
            totalResults: filteredProjects.length,
            onPageChange: (page) => console.log('Page change:', page)
          }}
        />
      )}

      <CreateProjectModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreateProject={handleCreateProject}
        companies={companies}
      />
    </div>
  );
}
