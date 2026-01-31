'use client';

import * as React from 'react';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { X, CheckCircle, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastVariant = 'success' | 'error' | 'warning' | 'info';

type ToastData = {
  id: string;
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastContextType = {
  toasts: ToastData[];
  addToast: (toast: Omit<ToastData, 'id'>) => void;
  removeToast: (id: string) => void;
};

const ToastContext = React.createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }

  return {
    toast: context.addToast,
    success: (title: string, description?: string) =>
      context.addToast({ title, description, variant: 'success' }),
    error: (title: string, description?: string) =>
      context.addToast({ title, description, variant: 'error' }),
    warning: (title: string, description?: string) =>
      context.addToast({ title, description, variant: 'warning' }),
    info: (title: string, description?: string) =>
      context.addToast({ title, description, variant: 'info' }),
    dismiss: context.removeToast,
  };
}

const variantStyles: Record<ToastVariant, string> = {
  success: 'border-success-500 bg-success-50',
  error: 'border-error-500 bg-error-50',
  warning: 'border-warning-500 bg-warning-50',
  info: 'border-brand-purple bg-brand-purple-50',
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  success: <CheckCircle className="h-5 w-5 text-success-600 shrink-0" />,
  error: <AlertCircle className="h-5 w-5 text-error-600 shrink-0" />,
  warning: <AlertTriangle className="h-5 w-5 text-warning-600 shrink-0" />,
  info: <Info className="h-5 w-5 text-brand-purple shrink-0" />,
};

interface ToastItemProps {
  toast: ToastData;
  onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
  const variant = toast.variant || 'info';

  return (
    <ToastPrimitive.Root
      className={cn(
        'group pointer-events-auto relative flex w-full items-start gap-3 overflow-hidden rounded-lg border-l-4 bg-white p-4 shadow-lg transition-all',
        'data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none',
        'animate-in',
        variantStyles[variant]
      )}
      duration={toast.duration ?? 5000}
      onOpenChange={(open) => {
        if (!open) onRemove(toast.id);
      }}
    >
      {variantIcons[variant]}
      <div className="flex-1 min-w-0">
        {toast.title && (
          <ToastPrimitive.Title className="text-sm font-semibold text-gray-900">
            {toast.title}
          </ToastPrimitive.Title>
        )}
        {toast.description && (
          <ToastPrimitive.Description className="text-sm text-gray-600 mt-1">
            {toast.description}
          </ToastPrimitive.Description>
        )}
      </div>
      <ToastPrimitive.Close
        className={cn(
          'rounded-md p-1 text-gray-400 transition-colors',
          'hover:text-gray-900 hover:bg-gray-100',
          'focus:outline-none focus:ring-2 focus:ring-brand-purple'
        )}
      >
        <X className="h-4 w-4" />
      </ToastPrimitive.Close>
    </ToastPrimitive.Root>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  const addToast = React.useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = React.useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      <ToastPrimitive.Provider swipeDirection="right">
        {children}
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
        <ToastPrimitive.Viewport
          className={cn(
            'fixed top-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4',
            'sm:top-auto sm:bottom-0 sm:right-0 sm:flex-col md:max-w-[420px]'
          )}
          aria-live="polite"
          aria-label="Notifications"
        />
      </ToastPrimitive.Provider>
    </ToastContext.Provider>
  );
}

// Legacy export for backwards compatibility
export const Toaster = ToastProvider;

export type { ToastVariant, ToastData };
