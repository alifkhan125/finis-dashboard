import { Users, UserCheck, UserX, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
interface WorkerStatsProps {
  total: number;
  activeToday: number;
  onLeave: number;
  avgAttendance: string;
}

export function WorkerStats({ total, activeToday, onLeave, avgAttendance }: WorkerStatsProps) {
  const stats = [{
    title: 'Total Workers',
    value: String(total),
    trend: 'Live',
    trendUp: true,
    icon: Users,
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  }, {
    title: 'Active Today',
    value: String(activeToday),
    trend: `${total ? Math.round((activeToday / total) * 100) : 0}%`,
    trendUp: true,
    icon: UserCheck,
    color: 'text-green-600',
    bg: 'bg-green-50'
  }, {
    title: 'On Leave',
    value: String(onLeave),
    trend: 'Tracked',
    trendUp: false,
    icon: UserX,
    color: 'text-orange-600',
    bg: 'bg-orange-50'
  }, {
    title: 'Avg Attendance',
    value: avgAttendance,
    trend: 'Current',
    trendUp: true,
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  }];
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
    {stats.map(stat => <Card key={stat.title}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className={`rounded-xl p-3 ${stat.bg}`}>
            <stat.icon className={`h-6 w-6 ${stat.color}`} />
          </div>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {stat.trend}
          </span>
        </div>
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-500">{stat.title}</p>
          <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
        </div>
      </CardContent>
    </Card>)}
  </div>;
}
