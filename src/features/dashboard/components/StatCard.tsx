import type React from 'react';
import { Card, CardContent } from '@/shared/components/ui/Card';
import { CircularProgress } from '@/shared/components/ui/Progress';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '@/shared/utils';

interface StatCardProps {
  title: string;
  value: number | string;
  trend?: number;
  icon: React.ElementType;
  color: string;
  bgGradient?: string;
  isCurrency?: boolean;
  isCount?: boolean;
}

export function StatCard({
  title,
  value,
  trend,
  icon: Icon,
  color,
  bgGradient,
  isCurrency = false,
  isCount = false
}: StatCardProps) {
  const hasTrend = typeof trend === 'number' && Number.isFinite(trend);
  const isPositive = hasTrend && trend >= 0;

  const formatValue = () => {
    if (isCurrency) return `$${Number(value).toLocaleString()}`;
    if (isCount) return value.toString();
    return `${value}%`;
  };

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md group">
      {bgGradient && (
        <div className={cn('absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500', bgGradient)} />
      )}
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="flex p-2 rounded-lg bg-gray-50 text-gray-400">
              <Icon className="h-4 w-4" />
            </div>
            <span className="font-semibold text-gray-900">{title}</span>
          </div>
          <ArrowUpRight className="h-4 w-4 text-gray-400" />
        </div>

        <div className="flex items-center justify-between">
          <div>
            <div className="text-2xl sm:text-3xl font-bold text-gray-900 truncate" title={formatValue()}>
              {formatValue()}
            </div>
            {hasTrend && <div className={cn('flex items-center gap-1 mt-1 text-xs font-medium', isPositive ? 'text-green-600' : 'text-red-600')}>
              {isPositive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
              {Math.abs(trend)}%
            </div>}
          </div>

          <div className="h-16 w-16">
            <CircularProgress
              value={isCount || isCurrency ? 100 : Number(value)}
              size={64}
              strokeWidth={6}
              color={color}
              trackColor="text-gray-100"
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
