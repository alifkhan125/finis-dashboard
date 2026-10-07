import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { cn } from '@/shared/utils';
import { Button } from './Button';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '5xl' | '6xl';
  zIndex?: number;
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  className,
  maxWidth = 'md',
  zIndex
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // Body scroll lock
  useEffect(() => {
    if (!isOpen) return;
    const originalStyle = window.getComputedStyle(document.body).overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalStyle;
    };
  }, [isOpen]);

  // Initial Focus - Only when opening
  useEffect(() => {
    if (isOpen) {
      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements && focusableElements.length > 0) {
        // Find the first non-close-button element if possible, or just the first one
        const firstElement = Array.from(focusableElements).find(el => el.getAttribute('aria-label') !== 'Close') || focusableElements[0];
        (firstElement as HTMLElement).focus();
      }
    }
  }, [isOpen]);

  // Event Listeners & Focus Trap
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && modalRef.current) {
        const elements = Array.from(modalRef.current.querySelectorAll(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )) as HTMLElement[];

        if (elements.length === 0) return;

        const first = elements[0];
        const last = elements[elements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            last.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === last) {
            first.focus();
            e.preventDefault();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl'
  };

  return (
    <div
      style={zIndex ? { zIndex } : undefined}
      className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center bg-[#020617]/70 backdrop-blur-sm p-4 overflow-y-auto animate-in fade-in duration-300"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className={cn(
          'relative w-full my-auto sm:my-0 rounded-[24px] bg-white shadow-[0_32px_96px_-16px_rgba(0,0,0,0.3)] border border-gray-100 transition-all overflow-hidden animate-in zoom-in-95 duration-200',
          maxWidthClasses[maxWidth],
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4 bg-white shrink-0">
          <h3 id="modal-title" className="text-lg font-black text-gray-900 uppercase tracking-tight">{title}</h3>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full text-gray-400 hover:text-[#1D4F6D] hover:bg-blue-50/50 transition-all"
          >
            <X className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] sm:max-h-[80vh] overflow-y-auto custom-scrollbar">
          <div className="p-6 md:p-8">{children}</div>
        </div>
      </div>
    </div>
  );
}
