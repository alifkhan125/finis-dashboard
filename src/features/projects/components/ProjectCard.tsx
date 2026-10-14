import { useNavigate } from 'react-router-dom';
import { Calendar, MoreHorizontal, Building2, Home, Layout, Power, PowerOff } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/shared/components/ui/Card';
import { Badge } from '@/shared/components/ui/Badge';
import { Progress } from '@/shared/components/ui/Progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';
import { Button } from '@/shared/components/ui/Button';
import { Dropdown } from '@/shared/components/ui/Dropdown';
import type { Project } from '@/shared/types';
import { useSuspendProject } from '../hooks/useProjects';

interface ProjectCardProps {
  project: Project;
}
export function ProjectCard({
  project
}: ProjectCardProps) {
  const navigate = useNavigate();
  const { suspendProject, isSuspending } = useSuspendProject();
  const authUser = (() => {
    try {
      const raw = localStorage.getItem('auth_user');
      return raw ? JSON.parse(raw) as { role?: string } : null;
    } catch {
      return null;
    }
  })();
  const isSuperAdmin = authUser?.role === 'super_admin';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'active':
        return 'default';
      case 'planning':
        return 'info';
      case 'on_hold':
      case 'delayed':
        return 'warning';
      default:
        return 'secondary';
    }
  };

  const getProjectIcon = () => {
    if (project.type === 'house') return <Home className="h-4 w-4 text-purple-600" />;
    return <Layout className="h-4 w-4 text-blue-600" />;
  };

  const getConfigSummary = () => {
    if (project.type === 'apartment_building') {
      const floors = project.floors || [];
      const unitCount = floors.reduce((acc, floor) => acc + (floor.rooms?.length || (floor as any).units?.length || 0), 0);
      return `${floors.length} Floors • ${unitCount} Units`;
    }
    if (project.type === 'house') {
      if (project.projectConfig?.houseType === 'sections') {
        return `Sections: ${project.projectConfig.sections?.slice(0, 2).join(', ')}${(project.projectConfig.sections?.length || 0) > 2 ? '...' : ''}`;
      }
      return 'Whole House';
    }
    return '';
  };

  return <Card className="group cursor-pointer transition-all hover:shadow-md hover:border-blue-200" onClick={() => navigate(`/projects/${project.id}`)}>
    <CardHeader className="flex flex-row items-start justify-between pb-4">
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={getStatusColor(project.status)}>
            {project.status === 'active'
              ? 'In Progress'
              : project.status.charAt(0).toUpperCase() + project.status.slice(1).replace('_', ' ')}
          </Badge>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-[10px] font-bold text-gray-600 uppercase tracking-wide border border-gray-200">
            {getProjectIcon()}
            {project.type === 'house' ? 'House' : 'Apartment'}
          </div>
        </div>

        <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors text-lg">
          {project.name}
        </h3>

        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 className="h-3 w-3" />
            {project.companyName}
          </div>
          {getConfigSummary() && (
            <div className="text-xs font-semibold text-gray-400">
              {getConfigSummary()}
            </div>
          )}
        </div>
      </div>
      <div onClick={(e) => e.stopPropagation()}>
        {isSuperAdmin ? (
          <Dropdown
            trigger={
              <Button variant="ghost" size="icon" className="-mr-2 -mt-2 text-gray-400">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            }
            items={[
              {
                label: 'View Project',
                onClick: () => navigate(`/projects/${project.id}`),
              },
              {
                label: project.status === 'suspended' ? 'Reactivate Project' : 'Suspend Project',
                icon: project.status === 'suspended' ? Power : PowerOff,
                variant: project.status === 'suspended' ? 'default' : 'destructive',
                onClick: () => {
                  if (window.confirm(`Are you sure you want to ${project.status === 'suspended' ? 'reactivate' : 'suspend'} this project?`)) {
                    suspendProject(project.id).catch(console.error);
                  }
                },
              }
            ]}
          />
        ) : (
          <Button variant="ghost" size="icon" className="-mr-2 -mt-2 text-gray-400">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        )}
      </div>
    </CardHeader>

    <CardContent>
      <div className="space-y-4">
        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Progress</span>
            <span className="font-medium text-gray-900">
              {project.progress}%
            </span>
          </div>
          <Progress value={project.progress} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 py-2">
          <div>
            <p className="text-xs text-gray-500">Budget</p>
            <p className="font-semibold text-gray-900">{project.budget}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Deadline</p>
            <p className="font-semibold text-gray-900">{project.endDate ? project.endDate.split('T')[0] : 'N/A'}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-gray-100 pt-4">
          <div className="flex -space-x-2">
            {(project.team || []).slice(0, 3).map((member, i) => <Avatar key={i} className="h-8 w-8 border-2 border-white">
              <AvatarImage src={member.image} />
              <AvatarFallback>{member.name[0]}</AvatarFallback>
            </Avatar>)}
            {(project.team || []).length > 3 && <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-medium text-gray-600">
              +{(project.team || []).length - 3}
            </div>}
          </div>
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Calendar className="h-3 w-3" />
            <span>{project.startDate ? project.startDate.split('T')[0] : 'N/A'}</span>
          </div>
        </div>
      </div>
    </CardContent>
  </Card>;
}