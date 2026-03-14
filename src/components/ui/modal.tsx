'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  React.useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="fixed inset-0 bg-black/60"
        onClick={onClose}
      />
      <div
        className={cn(
          'relative z-50 w-full max-w-md rounded-lg border bg-[var(--card)] p-4 shadow-xl',
          className
        )}
        style={{ borderColor: 'var(--border)' }}
      >
        {title && (
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--foreground)' }}>{title}</h2>
            <button
              onClick={onClose}
              className="rounded p-1 transition-colors hover:bg-[var(--accent)]"
            >
              <X className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
            </button>
          </div>
        )}
        {children}
      </div>
    </div>
  );
}
