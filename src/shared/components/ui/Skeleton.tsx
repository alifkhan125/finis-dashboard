import { cn } from '@/shared/utils';

type SkeletonProps = React.HTMLAttributes<HTMLDivElement>

export function Skeleton({ className, ...props }: SkeletonProps) {
    return (
        <div
            className={cn('animate-pulse rounded-xl bg-gray-100/80', className)}
            {...props}
        />
    );
}