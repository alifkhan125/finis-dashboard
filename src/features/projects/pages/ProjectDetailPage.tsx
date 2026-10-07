import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, Building2, Edit, FileBarChart, DollarSign, Users, CheckSquare, Home, Layout, Layers, Box, MapPin, Phone, Mail, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Tabs } from '@/shared/components/ui/Tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { Modal } from '@/shared/components/ui/Modal';
import { ProjectTeam } from '../components/ProjectTeam';
import { ProjectDocuments } from '../components/ProjectDocuments';
import { ProjectStructure } from '../components/ProjectStructure';
import { ProjectTasks } from '../components/ProjectTasks';
import { ProjectReportView } from '../components/ProjectReportView';
import { FinancialAnalysisChart } from '../components/FinancialAnalysisChart';
import { CreateProjectModal } from '../components/CreateProjectModal';
import { StatCard } from '@/features/dashboard/components/StatCard';
import { useProject, useUpdateProject, useProjectAnalysis, useProjectFloorPlan } from '../hooks';
import { apiClient } from '@/services/api/client';
import { Link as LinkIcon } from 'lucide-react';
import { CreateExpenseModal } from '@/features/expenses/components/CreateExpenseModal';

export function ProjectDetailPage() {
  const authUser = (() => {
    try {
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) as { role?: string } : null;
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = authUser?.role === 'super_admin';
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: project, isLoading, refetch } = useProject(id ?? '');
  const { updateProject, isUpdating } = useUpdateProject();
  const { data: analysisData, isLoading: analysisLoading } = useProjectAnalysis(id ?? '');
  const { data: floorPlanData, isLoading: floorPlanLoading } = useProjectFloorPlan(id ?? '');
  const [activeTab, setActiveTab] = useState('overview');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [isCreateExpenseModalOpen, setIsCreateExpenseModalOpen] = useState(false);
  
  const handleGenerateLink = async () => {
    if (!project?.id) return;
    try {
      setIsGeneratingLink(true);
      const res = await apiClient.post(`/admin/projects/${project.id}/share`);
      const shareToken = (res.data as any)?.data?.shareToken || (res.data as any)?.shareToken || (res as any).shareToken;
      if (shareToken) {
        const dashboardUrl = import.meta.env.VITE_APP_URL || window.location.origin;
        const link = `${dashboardUrl}/public/project/${shareToken}`;
        await navigator.clipboard.writeText(link);
        alert('Public link generated and copied to clipboard: ' + link);
      } else {
        alert('Failed to generate link: shareToken missing');
      }
    } catch (err: any) {
      console.error('Error generating link:', err);
      alert('Error generating link: ' + (err.details?.message || err.message || 'Unknown error'));
    } finally {
      setIsGeneratingLink(false);
    }
  };
  const structureFloors = floorPlanData?.length ? floorPlanData : project?.floors ?? [];
  const structureSummary = useMemo(() => {
    return structureFloors.reduce(
      (acc, floor) => {
        const unitCount = floor.rooms?.length ?? 0;
        const floorSubTaskCount =
          floor.taskCounts?.total ??
          ((floor.tasks?.length ?? 0) +
            (floor.rooms?.reduce((sum: number, unit: any) => sum + (unit.taskCounts?.total ?? unit.tasks?.length ?? 0), 0) ?? 0));
        const floorCompletedCount =
          floor.taskCounts?.completed ??
          ((floor.tasks?.filter((task: any) => task.status === 'completed').length ?? 0) +
            (floor.rooms?.reduce(
              (sum: number, unit: any) => sum + (unit.taskCounts?.completed ?? unit.tasks?.filter((task: any) => task.status === 'completed').length ?? 0),
              0,
            ) ?? 0));

        acc.units += unitCount;
        acc.subTasks += floorSubTaskCount;
        acc.completedSubTasks += floorCompletedCount;
        return acc;
      },
      { units: 0, subTasks: 0, completedSubTasks: 0 },
    );
  }, [structureFloors]);

  if (isLoading || floorPlanLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <h2 className="text-2xl font-bold text-gray-900">Project not found</h2>
        <Button className="mt-4" onClick={() => navigate('/projects')}>
          Back to Projects
        </Button>
      </div>
    );
  }

  // Derive counts from real data
  const teamCount = project.counts?.teamMembers ?? project.team?.length ?? 0;
  const taskCount = structureSummary.subTasks || project.counts?.tasks || project.tasks?.length || 0;
  const floorCount = project.counts?.floors ?? project.floors?.length ?? 0;

  const tabs: { id: string, label: string, count?: number }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'scope_structure', label: 'Scope & Structure' },
    { id: 'tasks', label: 'Tasks', count: taskCount || undefined },
    { id: 'documents', label: 'Documents' }
  ];
  if (!isSuperAdmin) {
    tabs.splice(2, 0, { id: 'team', label: 'Team', count: teamCount || undefined });
  }

  // Client info from real API
  const client = project.client;

  // Analysis checklist from real API
  const checklist = analysisData?.checklist ?? [];

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <button
            onClick={() => navigate(isSuperAdmin ? '/projects' : `/companies/${project.companyId}`)}
            className="hover:text-blue-600 flex items-center gap-1 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" />
            {isSuperAdmin ? 'Back to Projects' : 'Back to Company'}
          </button>
          {isSuperAdmin ? (
            <>
              <span>/</span>
              <span onClick={() => navigate('/projects')} className="hover:text-blue-600 cursor-pointer transition-colors">Projects</span>
              <span>/</span>
            </>
          ) : (
            <>
              <span>/</span>
              <span onClick={() => navigate('/companies')} className="hover:text-blue-600 cursor-pointer transition-colors">Companies</span>
              <span>/</span>
              <span onClick={() => navigate(`/companies/${project.companyId}`)} className="hover:text-blue-600 cursor-pointer transition-colors">{project.companyName}</span>
              <span>/</span>
            </>
          )}
          <span className="text-gray-900 font-medium">{project.name}</span>
        </div>

        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {project.name}
              </h1>
              <Badge variant="default" className="px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px]">
                {project.status}
              </Badge>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-xs font-bold text-gray-700 uppercase tracking-wide border border-gray-200">
                {project.type === 'house' ? <Home className="h-3.5 w-3.5 text-purple-600" /> : <Layout className="h-3.5 w-3.5 text-blue-600" />}
                {project.type === 'house' ? 'House' : 'Apartment'}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-medium">
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#1D4F6D]" />
                {project.companyName}
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-[#1D4F6D]" />
                {project.startDate ? new Date(project.startDate).toLocaleDateString() : '—'}
                {' - '}
                {project.endDate ? new Date(project.endDate).toLocaleDateString() : 'Ongoing'}
              </div>
              {project.address && (
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-4 w-4 text-[#1D4F6D]" />
                  {project.address}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              className="gap-2 h-11 px-5 border-blue-200 text-blue-600 hover:bg-blue-50 transition-all font-bold"
              onClick={() => setIsCreateExpenseModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              Create Expense
            </Button>
            {!isSuperAdmin && (
              <Button
                variant="outline"
                className="gap-2 h-11 px-5 border-blue-200 text-blue-600 hover:bg-blue-50 transition-all font-bold"
                onClick={handleGenerateLink}
                disabled={isGeneratingLink}
              >
                <LinkIcon className="h-4 w-4" />
                {isGeneratingLink ? 'Generating...' : 'Generate Public Link'}
              </Button>
            )}
            {!isSuperAdmin && (
              <Button
                variant="outline"
                className="gap-2 h-11 px-5 border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-all font-bold"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="h-4 w-4" />
                Edit Project
              </Button>
            )}
            <Button
              className="gap-2 h-11 px-6 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200 transition-all hover:scale-[1.02] font-bold"
              onClick={() => setIsExportModalOpen(true)}
            >
              <FileBarChart className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[500px]">
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Top Stats Row */}
            <div className={`grid grid-cols-1 gap-4 ${project.hasBudget ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
              {project.hasBudget && (
                <StatCard
                  title="Budget Used"
                  value={project.spent && project.budget ? Math.round((project.spent / project.budget) * 100) : 0}
                  trend={0}
                  icon={DollarSign}
                  color="text-blue-600"
                  bgGradient="bg-gradient-to-br from-blue-50/50 to-transparent"
                />
              )}
              <StatCard
                title="Sub-Tasks"
                value={taskCount}
                isCount={true}
                trend={0}
                icon={CheckSquare}
                color="text-green-600"
                bgGradient="bg-gradient-to-br from-green-50/50 to-transparent"
              />
              <StatCard
                title="Team Members"
                value={teamCount}
                isCount={true}
                trend={0}
                icon={Users}
                color="text-primary"
                bgGradient="bg-gradient-to-br from-blue-50/50 to-transparent"
              />
            </div>

            {/* Main Content Split */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Left Column */}
              <div className="lg:col-span-2 space-y-8">
                {/* Project Analysis (from API) */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Layers className="h-5 w-5 text-gray-500" />
                    Project Analysis
                    {analysisLoading && (
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#1D4F6D] border-t-transparent ml-2" />
                    )}
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {(checklist.length > 0 ? checklist : project.floors).map((item: any) => {
                      const floorName = item.floorName || item.name;
                      const floorNumber = item.floorNumber ?? item.number;
                      const tasks = item.tasks ?? [];
                      const units = item.units ?? item.rooms ?? [];
                      const progress = item.progress ?? 0;
                      const taskCounts = item.taskCounts;

                      return (
                        <Card
                          key={item.floorId || item.id}
                          className="hover:border-blue-200 transition-all cursor-pointer group"
                          onClick={() => setActiveTab('scope_structure')}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                              <div className="h-8 w-8 rounded-lg bg-blue-50 flex items-center justify-center text-blue-700 font-bold text-sm group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                {floorNumber ?? '—'}
                              </div>
                              <Badge variant="secondary" className="bg-gray-100 text-gray-600 font-bold">
                                {taskCounts?.total ?? tasks.length} Sub-Tasks
                              </Badge>
                            </div>
                            <CardTitle className="text-base font-bold text-gray-900 mt-2">
                              {floorName}
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex items-center justify-between text-sm text-gray-500">
                              <div className="flex items-center gap-1.5">
                                <Box className="h-4 w-4" />
                                <span>{units.length || item.totalUnits || item.totalRooms || 0} Units</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-green-500 rounded-full transition-all"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                                <span className="text-xs font-bold text-green-600">{progress}%</span>
                              </div>
                            </div>
                            {taskCounts && (
                              <div className="mt-2 flex gap-3 text-xs text-gray-400">
                                <span className="text-green-600 font-semibold">✓ {taskCounts.completed}</span>
                                <span className="text-blue-500 font-semibold">↻ {taskCounts.inProgress}</span>
                                <span>○ {taskCounts.notStarted}</span>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}

                    {(checklist.length === 0 && project.floors.length === 0) && (
                      <div className="col-span-full border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
                        No structural parts defined yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Financial Analysis */}
                {project.hasBudget ? (
                  <FinancialAnalysisChart
                    budget={project.budget || 0}
                    spent={project.spent || 0}
                    remaining={project.remaining ?? Math.max((project.budget || 0) - (project.spent || 0), 0)}
                  />
                ) : (
                  <Card className="border-dashed border-2 border-gray-100 bg-gray-50/30 p-8 flex flex-col items-center justify-center text-center">
                    <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center text-gray-400 mb-4">
                      <DollarSign className="h-6 w-6" />
                    </div>
                    <h4 className="text-sm font-bold text-gray-900 mb-1">No Budget Defined</h4>
                    <p className="text-xs text-gray-500 max-w-[280px]">
                      This project is operating without a linked budget. Financial analysis and tracking are disabled.
                    </p>
                  </Card>
                )}
              </div>

              {/* Right Column: Project Details */}
              <div className="space-y-8">
                <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                  <CardHeader className="bg-gray-50/50 border-b border-gray-50">
                    <CardTitle className="text-lg font-bold text-gray-900">Project Details</CardTitle>
                  </CardHeader>
                  <CardContent className="p-6 space-y-6">
                    {project.description && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Description</h4>
                        <p className="text-sm text-gray-600 leading-relaxed">{project.description}</p>
                      </div>
                    )}

                    {/* Client Information */}
                    <div className="pt-6 border-t border-gray-100">
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Client Information</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          {client?.logoUrl ? (
                            <img src={client.logoUrl} alt={client.companyName} className="h-8 w-8 rounded-full object-cover" />
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center font-bold text-xs">
                              {(client?.companyName || project.companyName || 'C').charAt(0).toUpperCase()}
                            </div>
                          )}
                        <div>
                            <p className="text-sm font-bold text-gray-900">{client?.companyName || project.companyName}</p>
                            {client?.primaryContact && (
                              <p className="text-xs text-gray-500">
                                Primary Contact: {client.primaryContact.fullName || client.primaryContact.name || 'N/A'}
                              </p>
                            )}
                          </div>
                        </div>

                        {client?.phone && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Phone className="h-3.5 w-3.5 text-gray-400" />
                            {client.phone}
                          </div>
                        )}
                        {client?.email && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="h-3.5 w-3.5 text-gray-400" />
                            {client.email}
                          </div>
                        )}
                        {client?.address && (
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            {client.address}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Project Stats */}
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t border-gray-100">
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Floors</h4>
                        <p className="text-2xl font-extrabold text-gray-900">{floorCount}</p>
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Progress</h4>
                        <div>
                          <p className="text-2xl font-extrabold text-gray-900">{project.progress}%</p>
                          <div className="mt-1 h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                      {project.hasBudget && project.budget && (
                        <>
                          <div>
                            <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Budget</h4>
                            <p className="text-sm font-bold text-gray-900">
                              ${project.budget.toLocaleString()}
                            </p>
                          </div>
                          {project.remaining != null && (
                            <div>
                              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Remaining</h4>
                              <p className="text-sm font-bold text-green-600">
                                ${project.remaining.toLocaleString()}
                              </p>
                            </div>
                          )}
                        </>
                      )}
                      {project.priority && (
                        <div className="col-span-2">
                          <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Priority</h4>
                          <Badge
                            variant={project.priority === 'high' ? 'destructive' : 'secondary'}
                            className="font-bold capitalize"
                          >
                            {project.priority}
                          </Badge>
                        </div>
                      )}
                      <div className="col-span-2">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Units / Sub-Tasks</h4>
                        <p className="text-sm font-bold text-gray-900">
                          {structureSummary.units} Units • {structureSummary.completedSubTasks}/{structureSummary.subTasks} Completed
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'scope_structure' && (
          <ProjectStructure projectType={project.type as any} initialFloors={structureFloors as any} analysisData={analysisData} />
        )}

        {activeTab === 'tasks' && <ProjectTasks />}

        {!isSuperAdmin && activeTab === 'team' && <ProjectTeam />}
        {activeTab === 'documents' && <ProjectDocuments />}
      </div>

      {/* Modals */}
      {!isSuperAdmin && (
        <CreateProjectModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          project={project}
          onEditProject={async (updatedProject: any) => {
            await updateProject(project.id, updatedProject);
            setIsEditModalOpen(false);
          }}
        />
      )}

      <Modal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        title="Project Report Preview"
        maxWidth="5xl"
      >
        <div className="space-y-6">
          <div className="flex justify-between items-center bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <p className="text-sm text-blue-800 font-medium">
              This preview shows exactly how your data will be exported in table format.
            </p>
            <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 font-bold">
              Print to PDF
            </Button>
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            <ProjectReportView project={project} />
          </div>
        </div>
      </Modal>

      <CreateExpenseModal
        isOpen={isCreateExpenseModalOpen}
        onClose={() => setIsCreateExpenseModalOpen(false)}
        defaultProjectId={project.id}
        defaultProjectName={project.name}
        onSuccess={() => {
          refetch();
        }}
      />
    </div>
  );
}
