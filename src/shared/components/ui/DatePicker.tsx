import { cn } from '@/shared/utils';

interface DatePickerProps {
  date?: Date;
  setDate?: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
}

export function DatePicker({
  date,
  setDate,
  placeholder = 'Pick a date',
  className
}: DatePickerProps) {
  const dateValue = date
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : '';

  return (
    <input
      type="date"
      value={dateValue}
      aria-label={placeholder}
      onChange={(event) => {
        const value = event.target.value;
        setDate?.(value ? new Date(`${value}T00:00:00`) : undefined);
      }}
      className={cn(
        'h-10 w-full rounded-xl border border-gray-100 bg-gray-50/30 px-4 text-sm font-semibold text-gray-700 shadow-sm outline-none transition-all focus:border-[#1D4F6D]/40 focus:bg-white focus:ring-2 focus:ring-[#1D4F6D]/10',
        !date && 'text-gray-400',
        className,
      )}
    />
  );
}
