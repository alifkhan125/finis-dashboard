import { useNavigate } from 'react-router-dom';
import { Eye, Edit, UserCheck, UserX, Star, ShieldCheck } from 'lucide-react';
import { Table, Column } from '@/shared/components/ui/Table';
import { Badge } from '@/shared/components/ui/Badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/shared/components/ui/Avatar';

import { formatCurrency, formatRole, formatStatus } from '@/shared/utils';

interface WorkerTableProps {
  data: any[];
}

export function WorkerTable({ data }: WorkerTableProps) {
  const navigate = useNavigate();

  const getStatusMeta = (status?: string, isInsideZone?: boolean) => {
    const normalized = (status || '').toLowerCase();
    if (normalized === 'pending') {
      return { label: 'Pending', variant: 'secondary' as const, dot: 'bg-amber-500', badgeClass: 'bg-amber-100 text-amber-800 border-amber-200' };
    }
    if (normalized === 'inside' || isInsideZone) {
      return { label: 'Inside', variant: 'success' as const, dot: 'bg-green-500', badgeClass: '' };
    }
    return { label: 'Outside', variant: 'destructive' as const, dot: 'bg-red-500', badgeClass: '' };
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Worker Profile',
      render: (row) => (
        <div className="flex items-center gap-4">
          <div className="relative group cursor-pointer">
            <Avatar className="h-11 w-11 rounded-xl border-2 border-white shadow-sm group-hover:shadow-md transition-all">
              <AvatarImage src={row.avatarUrl ?? row.avatar} />
              <AvatarFallback className="bg-blue-50 text-[#1D4F6D] font-black">{(row.fullName || row.name || 'W').charAt(0)}</AvatarFallback>
            </Avatar>
            <div className={`absolute -bottom-1 -right-1 h-4 w-4 rounded-full border-2 border-white shadow-sm ${getStatusMeta(row.status, row.isInsideZone).dot}`} />
          </div>
          <div className="space-y-0.5">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-gray-900 leading-tight hover:text-[#1D4F6D] transition-colors capitalize">{row.fullName || row.name}</p>
              {Number(row.hourlyRate ?? 0) > 40 && <Star className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 capitalize tracking-tight">
              <ShieldCheck className="h-3 w-3 text-[#1D4F6D]" />
              {formatRole(row.role)}
            </div>
          </div>
        </div>
      )
    },
    {
      key: 'assignedProject',
      header: 'Current Assignment',
      render: (row) => (row.assignedProject || row.projectName) ? (
        <div className="flex flex-col">
          <Badge variant="secondary" className="bg-blue-50/50 text-[#1D4F6D] border border-blue-100/50 font-bold w-fit">
            {row.assignedProject || row.projectName}
          </Badge>
          <span className="text-[10px] text-gray-400 mt-1 font-medium px-2">Site B-12</span>
        </div>
      ) : (
        <span className="text-gray-400 text-sm font-medium italic">Unassigned</span>
      )
    },
      {
        key: 'status',
        header: 'Operational Status',
        render: (row) => {
        const meta = getStatusMeta(row.status, row.isInsideZone);
        return (
          <Badge variant={meta.variant} className={`font-black text-[10px] capitalize tracking-wide px-2.5 py-0.5 ${meta.badgeClass}`}>
            {formatStatus(meta.label)}
          </Badge>
        );
      }
    },
    {
      key: 'hourlyRate',
      header: 'Billing Rate',
      render: (row) => (
        <div className="flex flex-col">
          <span className="font-black text-gray-900">{formatCurrency(Number(row.hourlyRate ?? 0))}</span>
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-tighter">Per Hour</span>
        </div>
      )
    },

  ];

  return (
    <Table
      columns={columns}
      data={data}
      onRowClick={(row) => navigate(`/workforce/${row.id}`)}
      className="border-none"
    />
  );
}
