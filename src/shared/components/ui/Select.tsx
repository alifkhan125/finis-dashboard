import React, { useState, useRef, useEffect, forwardRef, KeyboardEvent, useMemo } from 'react';
import { cn } from '@/shared/utils';
import { ChevronDown, Search } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  options: SelectOption[];
  value?: string;
  onChange?: (e: { target: { value: string, name?: string } }) => void;
  label?: string;
  error?: string;
  startIcon?: React.ReactNode;
  placeholder?: string;
  className?: string;
  name?: string;
  disabled?: boolean;
  required?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
}

const Select = forwardRef<HTMLDivElement, SelectProps>(({
  className,
  options,
  value,
  onChange,
  label,
  error,
  startIcon,
  placeholder = 'Select an option',
  name,
  disabled,
  searchable = false,
  searchPlaceholder = 'Search...',
  ...props
}, ref) => {
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedOption = options.find(o => o.value === value);

  const filteredOptions = useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options;
    const q = searchQuery.toLowerCase().trim();
    return options.filter(o => o.label.toLowerCase().includes(q));
  }, [options, searchable, searchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset search and sync focused index when opening / closing
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      const index = filteredOptions.findIndex(o => o.value === value);
      setFocusedIndex(index !== -1 ? index : 0);
      if (searchable) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    } else {
      setFocusedIndex(-1);
      setSearchQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && searchQuery) {
      setFocusedIndex(filteredOptions.length > 0 ? 0 : -1);
    }
  }, [searchQuery, isOpen, filteredOptions.length]);

  // Scroll focused item into view
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && listboxRef.current) {
      const listItems = listboxRef.current.querySelectorAll('[role="option"]');
      const focusedItem = listItems[focusedIndex] as HTMLElement;
      if (focusedItem) {
        focusedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [focusedIndex, isOpen]);

  const handleSelect = (optionValue: string) => {
    if (onChange) {
      onChange({ target: { value: optionValue, name } });
    }
    setIsOpen(false);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    if (disabled) return;

    if (e.target instanceof HTMLInputElement) {
      if (e.key === 'Escape') {
        e.preventDefault();
        setIsOpen(false);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
          handleSelect(filteredOptions[focusedIndex].value);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
      }
      return;
    }

    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (isOpen) {
          if (focusedIndex >= 0 && filteredOptions[focusedIndex]) {
            handleSelect(filteredOptions[focusedIndex].value);
          }
        } else {
          setIsOpen(true);
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else {
          setFocusedIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (isOpen) {
          setFocusedIndex(prev => (prev > 0 ? prev - 1 : prev));
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
      case 'Tab':
        setIsOpen(false);
        break;
    }
  };

  const selectId = `select-${name || Math.random().toString(36).substr(2, 9)}`;
  const listboxId = `${selectId}-listbox`;

  return (
    <div
      className={cn("w-full relative", className)}
      ref={containerRef}
      onKeyDown={handleKeyDown}
    >
      {label && (
        <label
          htmlFor={selectId}
          className="mb-1.5 block text-[10px] font-black text-gray-400 uppercase tracking-widest pl-1"
        >
          {label}
        </label>
      )}
      <div
        id={selectId}
        role="combobox"
        aria-controls={listboxId}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-labelledby={label ? undefined : selectId}
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        ref={ref}
        {...props}
        className={cn(
          "relative group flex h-11 w-full cursor-pointer items-center justify-between rounded-xl border border-gray-100 bg-gray-50/30 px-4 transition-all hover:bg-white hover:border-[#1D4F6D]/20 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#1D4F6D]/20 focus:border-[#1D4F6D]/40",
          isOpen && "ring-2 ring-blue-50/50 bg-white border-[#1D4F6D]/40",
          error && 'border-red-500 bg-red-50/10',
          disabled && "opacity-50 cursor-not-allowed pointer-events-none"
        )}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {startIcon && (
            <div className={cn("text-gray-400 transition-colors group-hover:text-[#1D4F6D]", isOpen && "text-[#1D4F6D]")}>
              {startIcon}
            </div>
          )}
          <span className={cn("text-[12px] font-bold truncate", !selectedOption ? "text-gray-400" : "text-gray-900")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>
        <ChevronDown className={cn("h-3.5 w-3.5 text-gray-400 transition-transform duration-300", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div
          id={listboxId}
          role="listbox"
          aria-label={label || placeholder}
          ref={listboxRef}
          className="absolute top-[calc(100%+6px)] left-0 z-[100] w-full bg-white rounded-2xl shadow-[0_12px_40px_-8px_rgba(0,0,0,0.15)] border border-gray-100 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200"
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100 bg-gray-50/50" onClick={(e) => e.stopPropagation()}>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={searchPlaceholder}
                  className="w-full h-8 pl-8 pr-2.5 text-xs bg-white border border-gray-200 rounded-lg outline-none focus:border-[#1D4F6D] focus:ring-1 focus:ring-[#1D4F6D]"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          )}
          <div className="p-1 max-h-[220px] overflow-y-auto custom-scrollbar flex flex-col gap-0.5">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-center text-xs text-gray-400">
                No matching options
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={value === option.value}
                  onClick={() => handleSelect(option.value)}
                  onMouseEnter={() => setFocusedIndex(index)}
                  className={cn(
                    "w-full flex items-center px-4 py-3 text-[11px] font-black transition-all relative group text-left uppercase tracking-tight rounded-lg outline-none",
                    value === option.value ? "bg-blue-50 text-[#1D4F6D]" :
                      index === focusedIndex ? "bg-gray-50 text-[#1D4F6D]" : "text-gray-400 hover:bg-gray-50 hover:text-[#1D4F6D]"
                  )}
                >
                  {/* Brand Navy Selection Indicator */}
                  <div className={cn(
                    "absolute left-0 top-1/2 -translate-y-1/2 w-1 bg-[#1D4F6D] rounded-r-full transition-all",
                    value === option.value ? "h-4" : (index === focusedIndex ? "h-4 opacity-50" : "h-0")
                  )} />
                  {option.label}
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="mt-1 text-[9px] font-black text-red-500 pl-1 uppercase tracking-widest">{error}</p>}
    </div>
  );
});
Select.displayName = 'Select';

export { Select };