import { Building2, ClipboardList, DollarSign, TrendingUp } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { Company } from '@/shared/types';
import { formatCurrency } from '@/shared/utils';
import type { CompanyStatsResponse } from '@/store/companiesApi';

interface CompanyStatsProps {
  companies?: Company[];
  stats?: CompanyStatsResponse | null;
}

export function CompanyStats({ companies = [], stats }: CompanyStatsProps) {
  // Calculate dynamic stats
  const totalCompanies = companies.length;
  const activeCompanies = companies.filter(c => c.status === 'active').length;
  const totalRevenue = companies.reduce((sum, c) => sum + (c.annualRevenue || 0), 0);
  const avgRevenue = totalCompanies > 0 ? totalRevenue / totalCompanies : 0;

  // Period comparisons are only available when supplied by the stats endpoint.
  const cards = stats ? [{
    title: 'Total Companies',
    value: stats.totalCompanies.value.toString(),
    trend: stats.totalCompanies.change,
    trendUp: !stats.totalCompanies.change.startsWith('-'),
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  }, {
    title: 'Active Companies',
    value: stats.activeCompanies.value.toString(),
    trend: stats.activeCompanies.change,
    trendUp: !stats.activeCompanies.change.startsWith('-'),
    icon: ClipboardList,
    color: 'text-orange-600',
    bg: 'bg-orange-50'
  }, {
    title: 'Total Revenue',
    value: formatCurrency(stats.totalRevenue.value),
    trend: stats.totalRevenue.change,
    trendUp: !stats.totalRevenue.change.startsWith('-'),
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50'
  }, {
    title: 'Avg Revenue',
    value: formatCurrency(stats.avgRevenue.value),
    trend: stats.avgRevenue.change,
    trendUp: !stats.avgRevenue.change.startsWith('-'),
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  }] : [{
    title: 'Total Companies',
    value: totalCompanies.toString(),
    trend: null,
    trendUp: true,
    icon: Building2,
    color: 'text-blue-600',
    bg: 'bg-blue-50'
  }, {
    title: 'Active Companies',
    value: activeCompanies.toString(),
    trend: null,
    trendUp: true,
    icon: ClipboardList,
    color: 'text-orange-600',
    bg: 'bg-orange-50'
  }, {
    title: 'Total Revenue',
    value: formatCurrency(totalRevenue),
    trend: null,
    trendUp: true,
    icon: DollarSign,
    color: 'text-green-600',
    bg: 'bg-green-50'
  }, {
    title: 'Avg Revenue',
    value: formatCurrency(avgRevenue),
    trend: null,
    trendUp: false,
    icon: TrendingUp,
    color: 'text-purple-600',
    bg: 'bg-purple-50'
  }];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map(stat => (
        <Card key={stat.title}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className={`rounded-xl p-3 ${stat.bg}`}>
                <stat.icon className={`h-6 w-6 ${stat.color}`} />
              </div>
              {stat.trend != null && <span className={`text-xs font-medium px-2 py-1 rounded-full ${stat.trendUp ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {stat.trend}
              </span>}
            </div>
            <div className="mt-4">
              <p className="text-sm font-medium text-gray-500">{stat.title}</p>
              <h3 className="text-2xl font-bold text-gray-900">{stat.value}</h3>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}