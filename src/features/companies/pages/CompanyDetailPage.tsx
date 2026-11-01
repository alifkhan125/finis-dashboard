import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCompanyProfile, useCompanyProjects, useCompanyPerformance, useCompanyDocuments, useUpdateCompany } from '../hooks';
import { Building2, Globe, Mail, Phone, MapPin, Edit, ChevronLeft, CreditCard, User, ShieldAlert, Lock } from 'lucide-react';
import { Button } from '@/shared/components/ui/Button';
import { Badge } from '@/shared/components/ui/Badge';
import { Tabs } from '@/shared/components/ui/Tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';
import { getFullUrl, cn } from '@/shared/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/Card';
import { ProjectTable, CreateProjectModal } from '@/features/projects/components';
import {
  CompanyContacts,
  CompanyDocuments,
  ContactCompanyModal,
  EditCompanyProfileModal
} from '../components';
import { CompanyPerformance } from '../components/CompanyPerformance';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { formatCurrency } from '@/shared/utils';
import { mapBackendCompanyProjectToView, mapBackendProfileToCompany } from '@/store/companiesApi';
import { useCreateProject } from '@/features/projects/hooks';
import { apiClient } from '@/services/api/client';
import { Link as LinkIcon } from 'lucide-react';
import { useAppSelector } from '@/store/hooks';
import { selectAuthUser } from '@/store/authSlice';

const getLinkHostname = (url?: string) => {
  if (!url) return 'N/A';

  try {
    const normalizedUrl = url.startsWith('http://') || url.startsWith('https://')
      ? url
      : `https://${url}`;

    return new URL(normalizedUrl).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '');
  }
};

export function CompanyDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const authUser = useAppSelector(selectAuthUser);
  const isSuperAdmin = authUser?.role === 'super_admin';
  const canEdit = !isSuperAdmin;
  const { profile, isLoading: isProfileLoading, error: profileError } = useCompanyProfile(id ?? '');
  const { projects: companyProjectRows, isLoading: isProjectsLoading } = useCompanyProjects(id ?? '');
  const { performance, isLoading: isPerformanceLoading } = useCompanyPerformance(id ?? '');
  const { documents, isLoading: isDocumentsLoading } = useCompanyDocuments(id ?? '');
  const { updateCompany, isUpdating: isUpdatingCompany } = useUpdateCompany();
  const { createProject } = useCreateProject();
  const [activeTab, setActiveTab] = useState('overview');
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isCreateProjectModalOpen, setIsCreateProjectModalOpen] = useState(false);
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  
  const handleGenerateLink = async () => {
    if (!company?.id) return;
    try {
      setIsGeneratingLink(true);
      const res = await apiClient.post(`/admin/companies/${company.id}/share`);
      // Note: Backend might return nested data depending on interceptor
      const shareToken = (res.data as any)?.data?.shareToken || (res.data as any)?.shareToken || (res as any).shareToken;
      if (shareToken) {
        const dashboardUrl = (typeof window !== 'undefined' && window.location.origin) ? window.location.origin : (import.meta.env.VITE_APP_URL || '');
        const link = `${dashboardUrl}/public/company/${shareToken}`;
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

  const company = profile ? mapBackendProfileToCompany(profile) : undefined;
  const companyStats = profile?.stats;
  const directContact = profile?.directContact;
  const overviewPerformanceData = profile?.performanceData ?? [];
  const companyContacts = profile?.contacts ?? [];
  const companyProjects = useMemo(() => {
    if (!profile) return [];
    return companyProjectRows.map((project) => mapBackendCompanyProjectToView(profile.id, profile.name, project));
  }, [companyProjectRows, profile]);

  const handleUpdateCompany = async (data: {
    name: string;
    industry: string;
    description: string;
    phone: string;
    email: string;
    website: string;
    address: string;
    annualRevenue?: number;
    logoFile?: File | null;
  }) => {
    if (!company) return;

    const normalizedIndustry = data.industry.trim().toLowerCase();
    const normalizedWebsite = data.website.trim()
      ? /^https?:\/\//i.test(data.website.trim())
        ? data.website.trim()
        : `https://${data.website.trim()}`
      : '';

    const payload = new FormData();
    payload.append('name', data.name);
    payload.append('industry', normalizedIndustry);
    payload.append('description', data.description);
    if (data.phone.trim()) payload.append('phone', data.phone.trim());
    if (data.email.trim()) payload.append('email', data.email.trim());
    if (normalizedWebsite) payload.append('website', normalizedWebsite);
    if (data.address.trim()) payload.append('address', data.address.trim());
    if (typeof data.annualRevenue === 'number') payload.append('revenue', String(data.annualRevenue));
    if (company.contact.name.trim() || data.name.trim()) payload.append('primaryContact', company.contact.name.trim() || data.name.trim());
    if (data.email.trim()) payload.append('contactEmail', data.email.trim());
    if (data.phone.trim()) payload.append('contactPhone', data.phone.trim());
    if (data.logoFile) payload.append('logo', data.logoFile);

    await updateCompany({
      id: company.id,
      data: payload,
    }).unwrap();

    setIsEditModalOpen(false);
  };

  const isSuspended = !isSuperAdmin && (
    (profileError as any)?.status === 403 ||
    (profileError as any)?.data?.statusCode === 403 ||
    profile?.isActive === false ||
    company?.status === 'inactive'
  );

  const isLoading = isProfileLoading || isProjectsLoading || isPerformanceLoading || isDocumentsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-[#1D4F6D] border-t-transparent" />
        <p className="text-gray-500 font-medium">Loading company details...</p>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[450px] max-w-lg mx-auto text-center p-8 bg-white rounded-3xl border border-red-100 shadow-sm space-y-5 my-12">
        <div className="h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center border border-red-100 shadow-inner">
          <ShieldAlert className="h-8 w-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-gray-900">Company Suspended</h2>
          <p className="text-sm text-gray-600 leading-relaxed">
            This company has been suspended by the platform Super Administrator. Access to company details, projects, workforce, and documents is temporarily restricted.
          </p>
        </div>
        <div className="pt-2">
          <Button onClick={() => navigate('/companies')} className="bg-[#1D4F6D] hover:bg-[#153a50] text-white rounded-xl px-6">
            Back to Companies
          </Button>
        </div>
      </div>
    );
  }

  if (!company) return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">  
      <h2 className="text-2xl font-bold text-gray-900">Company not found</h2>
      <Button className="mt-4" onClick={() => navigate('/companies')}>
        Back to Companies
      </Button>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <button onClick={() => navigate(-1)} className="hover:text-[#1D4F6D] flex items-center gap-1 transition-colors">
          <ChevronLeft className="h-4 w-4" />
          Go Back
        </button>
        <span>/</span>
        <span className="text-gray-900 font-medium">{company.name}</span>
      </div>

      {/* Header */}
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <Avatar className="h-28 w-28 rounded-2xl border-4 border-white shadow-xl">
            <AvatarImage src={getFullUrl(company.logo)} />
            <AvatarFallback className="rounded-2xl text-3xl font-bold bg-blue-50 text-blue-600">
              {company.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-3 text-center sm:text-left">
            <div className="flex flex-col sm:flex-row items-center gap-3 flex-wrap">
              <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                {company.name}
              </h1>
              <Badge variant="success" className="px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px]">
                {company.status || 'Active'} Partner
              </Badge>
              {company.subscription && (
                <span
                  className={cn(
                    'px-3 py-1 rounded-full font-bold uppercase tracking-wider text-[10px] border flex items-center gap-1.5',
                    company.subscription.hasSubscription
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : 'bg-amber-50 text-amber-700 border-amber-200'
                  )}
                >
                  <CreditCard className="h-3 w-3" />
                  {company.subscription.planName} • {company.subscription.status === 'active' ? 'Active' : company.subscription.status}
                </span>
              )}
            </div>
            <div className="flex flex-wrap justify-center sm:justify-start items-center gap-4 text-sm text-gray-500 font-medium">
              {company.owner && (
                <div className="flex items-center gap-1.5 bg-blue-50/80 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#1D4F6D]">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span>Owner: {company.owner.fullName || company.contact.name || 'Admin'}</span>
                  {company.owner.email && <span className="text-gray-400 font-normal">({company.owner.email})</span>}
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#1D4F6D]" />
                {company.industry || 'Construction'}
              </div>
              <div className="flex items-center gap-1.5">
                <MapPin className="h-4 w-4 text-[#1D4F6D]" />
                {company.location || 'N/A'}
              </div>
              {company.publicLink?.enabled && (
                <div className="flex items-center gap-1.5">
                  <Globe className="h-4 w-4 text-[#1D4F6D]" />
                  {getLinkHostname(company.publicLink.url)}
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button
            variant="outline"
            className="gap-2 h-12 px-6 border-blue-200 text-[#1D4F6D] hover:bg-blue-50 font-bold"
            onClick={handleGenerateLink}
            disabled={isGeneratingLink}
          >
            <LinkIcon className="h-4 w-4" />
            {isGeneratingLink ? 'Generating...' : 'Generate & Copy Link'}
          </Button>
          <Button
            variant="outline"
            className="gap-2 h-12 px-6 border-gray-200 text-gray-600 hover:bg-blue-50 hover:text-[#1D4F6D] hover:border-blue-200 transition-all font-bold"
            onClick={() => setIsContactModalOpen(true)}
          >
            <Mail className="h-4 w-4" />
            Contact Company
          </Button>
          {canEdit && (
            <Button
              className="gap-2 h-12 px-8 bg-[#1D4F6D] hover:bg-[#163a50] text-white shadow-lg shadow-blue-900/10 transition-all hover:scale-[1.02] font-bold"
              onClick={() => setIsEditModalOpen(true)}
            >
              <Edit className="h-4 w-4" />
              Edit Profile
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'projects', label: 'Projects', count: companyProjects.length },
          { id: 'contacts', label: 'Contacts' },
          { id: 'performance', label: 'Performance' },
          { id: 'documents', label: 'Documents' }
        ]}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Content */}
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
              <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-50">
                  <CardTitle className="text-lg font-bold text-gray-900">About Company</CardTitle>
                </CardHeader>
                <CardContent className="p-8">
                  <p className="text-gray-600 text-lg leading-relaxed">
                    {company.description}
                  </p>
                  <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[
                      { label: 'Annual Revenue', value: companyStats?.annualRevenue != null ? formatCurrency(companyStats.annualRevenue) : (company.annualRevenue ? formatCurrency(company.annualRevenue) : 'N/A'), color: 'text-gray-900' },
                      { label: 'Total Employees', value: companyStats?.totalEmployees || `${companyProjects.length}+`, color: 'text-gray-900' },
                      { label: 'Projects Completed', value: companyStats?.projectsCompleted != null ? String(companyStats.projectsCompleted) : String(companyProjects.length), color: 'text-gray-900' },
                      { label: 'Safety Rating', value: companyStats?.safetyRating || 'N/A', color: 'text-green-600' }
                    ].map((stat, i) => (
                      <div key={i} className="p-5 bg-gray-50/80 rounded-2xl border border-gray-100 hover:bg-white hover:shadow-md transition-all group">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">{stat.label}</p>
                        <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-50 flex flex-row items-center justify-between">
                  <CardTitle className="text-lg font-bold text-gray-900">Project Performance</CardTitle>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#1D4F6D]" />
                      <span className="text-xs font-bold text-gray-500 uppercase">Completion %</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full bg-[#FF6B35]" />
                      <span className="text-xs font-bold text-gray-500 uppercase">Budget Adherence</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-8 h-[350px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overviewPerformanceData}>
                      <defs>
                        <linearGradient id="colorComp" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#1D4F6D" stopOpacity={0.1} />
                          <stop offset="95%" stopColor="#1D4F6D" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
                      <XAxis
                        dataKey="project"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }}
                        dy={10}
                      />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                      />
                      <Tooltip
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                      />
                      <Area
                        type="monotone"
                        dataKey="completionPct"
                        stroke="#1D4F6D"
                        strokeWidth={4}
                        fillOpacity={1}
                        fill="url(#colorComp)"
                      />
                      <Area
                        type="monotone"
                        dataKey="budgetAdherence"
                        stroke="#FF6B35"
                        strokeWidth={4}
                        fillOpacity={0}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Right Column */}
            <div className="space-y-8">
              <Card className="border-gray-100 shadow-sm rounded-2xl overflow-hidden">
                <CardHeader className="bg-gray-50/50 border-b border-gray-50">
                  <CardTitle className="text-lg font-bold text-gray-900">Direct Contact</CardTitle>
                </CardHeader>
                <CardContent className="p-8 space-y-6">
                  {[
                    { icon: Phone, label: 'Phone', value: directContact?.phone || company.contact.phone || 'N/A' },
                    { icon: Mail, label: 'Email', value: directContact?.email || company.contact.email || 'N/A' },
                    { icon: Globe, label: 'Website', value: (directContact?.website || company.publicLink?.url || 'N/A').replace(/^https?:\/\//, '') },
                    { icon: MapPin, label: 'Address', value: directContact?.address || company.address || 'N/A' }
                  ].map((item, i) => (
                    <div key={i} className="flex items-start gap-4 group">
                      <div className="p-3 bg-gray-50 rounded-xl text-[#1D4F6D] group-hover:bg-[#1D4F6D] group-hover:text-white transition-all">
                        <item.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{item.label}</p>
                        <p className="text-sm font-bold text-gray-900 mt-0.5">{item.value}</p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

            </div>
          </div>
        )}

        {activeTab === 'projects' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Assigned Projects</h2>
              <div className="flex items-center gap-3">
                <Badge variant="secondary" className="px-3 py-1 font-bold">{companyProjects.length} Projects</Badge>
                {!isSuperAdmin && (
                  <Button onClick={() => setIsCreateProjectModalOpen(true)} className="bg-[#1D4F6D] hover:bg-[#163a50] text-white">Create Project</Button>
                )}
              </div>
            </div>
            <ProjectTable data={companyProjects} />
          </div>
        )}

        {activeTab === 'contacts' && <CompanyContacts contacts={companyContacts} companyEmail={directContact?.email || company.contact.email} />}
        {activeTab === 'performance' && <CompanyPerformance performance={performance} />}
        {activeTab === 'documents' && <CompanyDocuments documents={documents} companyId={company.id} />}
      </div>

      {/* Modals */}
      <CreateProjectModal
        isOpen={isCreateProjectModalOpen}
        onClose={() => setIsCreateProjectModalOpen(false)}
        onCreateProject={async (project) => {
          await createProject({
            ...project,
            companyId: company.id,
            companyName: company.name,
          });
          setIsCreateProjectModalOpen(false);
        }}
        preselectedCompanyId={company.id}
        preselectedCompanyName={company.name}
      />
      <ContactCompanyModal
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
        companyId={company.id}
        companyName={company.name}
        contactEmail={directContact?.email || company.contact.email}
      />
      {canEdit && (
        <EditCompanyProfileModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          company={company}
          onSave={handleUpdateCompany}
          isSubmitting={isUpdatingCompany}
        />
      )}
    </div>
  );
}
