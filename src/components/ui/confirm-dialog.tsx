'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
  onConfirm: () => void;
  isLoading?: boolean;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  isLoading = false,
}: ConfirmDialogProps) {
  const handleConfirm = () => {
    onConfirm();
  };

  const variantStyles = {
    danger: {
      icon: 'bg-error-50 text-error-600',
      button: 'danger' as const,
    },
    warning: {
      icon: 'bg-warning-50 text-warning-600',
      button: 'primary' as const,
    },
    default: {
      icon: 'bg-brand-purple-50 text-brand-purple',
      button: 'primary' as const,
    },
  };

  const styles = variantStyles[variant];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className={cn(
            'fixed inset-0 z-50 bg-black/50 backdrop-blur-sm',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0'
          )}
        />
        <DialogPrimitive.Content
          className={cn(
            'fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%]',
            'bg-white rounded-xl shadow-xl p-6',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]'
          )}
        >
          <div className="flex items-start gap-4">
            <div className={cn('p-3 rounded-full', styles.icon)}>
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div className="flex-1">
              <DialogPrimitive.Title className="text-lg font-semibold text-gray-900">
                {title}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-2 text-sm text-gray-600">
                {description}
              </DialogPrimitive.Description>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              {cancelLabel}
            </Button>
            <Button
              variant={styles.button}
              onClick={handleConfirm}
              isLoading={isLoading}
            >
              {confirmLabel}
            </Button>
          </div>

          <DialogPrimitive.Close
            className={cn(
              'absolute right-4 top-4 rounded-sm p-1 text-gray-400 transition-colors',
              'hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-brand-purple'
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

// Hook for easier confirm dialog management
interface UseConfirmDialogOptions {
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'default';
}

interface UseConfirmDialogReturn {
  confirm: () => Promise<boolean>;
  ConfirmDialogComponent: React.FC;
}

export function useConfirmDialog(options: UseConfirmDialogOptions): UseConfirmDialogReturn {
  const [isOpen, setIsOpen] = React.useState(false);
  const resolveRef = React.useRef<((value: boolean) => void) | null>(null);

  const confirm = React.useCallback(() => {
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  const handleConfirm = React.useCallback(() => {
    resolveRef.current?.(true);
    setIsOpen(false);
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    if (!open) {
      resolveRef.current?.(false);
    }
    setIsOpen(open);
  }, []);

  const ConfirmDialogComponent = React.useCallback(() => (
    <ConfirmDialog
      open={isOpen}
      onOpenChange={handleOpenChange}
      title={options.title}
      description={options.description}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      variant={options.variant}
      onConfirm={handleConfirm}
    />
  ), [isOpen, handleOpenChange, handleConfirm, options]);

  return { confirm, ConfirmDialogComponent };
}
