'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebouncedCallback } from '@/hooks/use-debounce';

interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
  className?: string;
}

export function SearchInput({
  placeholder = 'Search...',
  paramName = 'search',
  className,
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = React.useState(searchParams.get(paramName) || '');

  const updateSearchParams = useDebouncedCallback((term: string) => {
    const params = new URLSearchParams(searchParams.toString());

    if (term) {
      params.set(paramName, term);
    } else {
      params.delete(paramName);
    }

    // Reset to page 1 when searching
    params.delete('page');

    router.push(`${pathname}?${params.toString()}`);
  }, 300);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    updateSearchParams(newValue);
  };

  const handleClear = () => {
    setValue('');
    updateSearchParams('');
  };

  return (
    <div className={cn('relative', className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'w-full pl-10 pr-10 py-2 border border-gray-300 rounded-lg',
          'focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent',
          'placeholder:text-gray-400'
        )}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
