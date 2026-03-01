'use client';

import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

const maxWidthMap = {
  sm: 'max-w-95',
  md: 'max-w-105',
  lg: 'max-w-128',
  xl: 'max-w-3xl',
} as const;

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  maxWidth?: keyof typeof maxWidthMap;
}

export function Modal({ open, onClose, children, maxWidth = 'md' }: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      requestAnimationFrame(() => setAnimateIn(true));
    } else {
      setAnimateIn(false);
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const handleClose = useCallback(() => {
    setAnimateIn(false);
    setTimeout(() => onClose(), 150);
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-100 flex items-center justify-center">
      {/* Backdrop */}
      <div
        onClick={handleClose}
        className={cn(
          'absolute inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-200',
          animateIn ? 'opacity-100' : 'opacity-0',
        )}
      />

      {/* Dialog */}
      <div
        className={cn(
          'relative z-10 w-full mx-4 rounded-2xl glass-heavy glass-noise shadow-2xl max-h-[90vh] overflow-y-auto',
          'transition-all duration-200 ease-out',
          maxWidthMap[maxWidth],
          animateIn
            ? 'opacity-100 scale-100 translate-y-0'
            : 'opacity-0 scale-95 translate-y-2',
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
