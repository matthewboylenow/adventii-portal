'use client';

import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, type = 'text', ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText && !error ? `${inputId}-helper` : undefined;
    const describedBy = errorId || helperId || undefined;

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-gray-700 mb-1"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          type={type}
          id={inputId}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={describedBy}
          className={cn(
            'w-full px-3 py-2 border rounded-lg transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent',
            'placeholder:text-gray-400',
            error ? 'border-error-500 focus:ring-error-500' : 'border-gray-300',
            className
          )}
          {...props}
        />
        {error && <p id={errorId} className="mt-1 text-sm text-error-600" role="alert">{error}</p>}
        {helperText && !error && (
          <p id={helperId} className="mt-1 text-sm text-gray-500">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
