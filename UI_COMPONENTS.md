# UI Components — Adventii Client Portal

## Design System Overview

This application uses Adventii Media's brand identity with a professional, clean aesthetic inspired by modern SaaS dashboards.

---

## Brand Colors

```css
:root {
  /* Primary */
  --color-black: #1A1A1A;
  --color-white: #FFFFFF;
  
  /* Accent */
  --color-purple: #6B46C1;
  --color-purple-light: #805AD5;
  --color-purple-dark: #553C9A;
  
  /* Grays */
  --color-gray-50: #FAFAFA;
  --color-gray-100: #F5F5F5;
  --color-gray-200: #E5E5E5;
  --color-gray-300: #D4D4D4;
  --color-gray-400: #A3A3A3;
  --color-gray-500: #737373;
  --color-gray-600: #525252;
  --color-gray-700: #404040;
  --color-gray-800: #262626;
  --color-gray-900: #171717;
  
  /* Status Colors */
  --color-success: #10B981;
  --color-warning: #F59E0B;
  --color-error: #EF4444;
  --color-info: #3B82F6;
}
```

---

## Typography

```css
/* Headings - Audiowide */
@import url('https://fonts.googleapis.com/css2?family=Audiowide&display=swap');

/* Body - Inter */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

:root {
  --font-heading: 'Audiowide', cursive;
  --font-body: 'Inter', sans-serif;
}
```

### Tailwind Config

```typescript
// tailwind.config.ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          black: '#1A1A1A',
          white: '#FFFFFF',
          purple: {
            DEFAULT: '#6B46C1',
            light: '#805AD5',
            dark: '#553C9A',
          },
        },
      },
      fontFamily: {
        heading: ['Audiowide', 'cursive'],
        body: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
```

---

## Global Styles

### `src/app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import url('https://fonts.googleapis.com/css2?family=Audiowide&family=Inter:wght@400;500;600;700&display=swap');

@layer base {
  html {
    font-family: 'Inter', sans-serif;
  }
  
  h1, h2, h3, h4, h5, h6 {
    font-family: 'Audiowide', cursive;
  }
}

@layer components {
  .btn-primary {
    @apply bg-brand-purple text-white px-4 py-2 rounded-lg font-medium 
           hover:bg-brand-purple-light transition-colors duration-200
           focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2;
  }
  
  .btn-secondary {
    @apply bg-gray-100 text-gray-900 px-4 py-2 rounded-lg font-medium
           hover:bg-gray-200 transition-colors duration-200
           focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2;
  }
  
  .btn-outline {
    @apply border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-medium
           hover:bg-gray-50 transition-colors duration-200
           focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2;
  }
  
  .btn-danger {
    @apply bg-red-600 text-white px-4 py-2 rounded-lg font-medium
           hover:bg-red-700 transition-colors duration-200
           focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2;
  }
  
  .card {
    @apply bg-white rounded-xl shadow-sm border border-gray-200 p-6;
  }
  
  .input {
    @apply w-full px-3 py-2 border border-gray-300 rounded-lg
           focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent
           placeholder:text-gray-400;
  }
  
  .label {
    @apply block text-sm font-medium text-gray-700 mb-1;
  }
  
  .status-badge {
    @apply inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium;
  }
}
```

---

## Component Library

### Base UI Components (`src/components/ui/`)

#### Button Component

```typescript
// src/components/ui/button.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', isLoading, children, disabled, ...props }, ref) => {
    const variants = {
      primary: 'bg-brand-purple text-white hover:bg-brand-purple-light',
      secondary: 'bg-gray-100 text-gray-900 hover:bg-gray-200',
      outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
      danger: 'bg-red-600 text-white hover:bg-red-700',
      ghost: 'text-gray-700 hover:bg-gray-100',
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(
          'inline-flex items-center justify-center rounded-lg font-medium transition-colors duration-200',
          'focus:outline-none focus:ring-2 focus:ring-brand-purple focus:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      >
        {isLoading && (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4\" fill=\"none\" viewBox=\"0 0 24 24\">
            <circle className=\"opacity-25\" cx=\"12\" cy=\"12\" r=\"10\" stroke=\"currentColor\" strokeWidth=\"4\" />
            <path className=\"opacity-75\" fill=\"currentColor\" d=\"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z\" />
          </svg>
        )}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
```

#### Card Component

```typescript
// src/components/ui/card.tsx
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered';
}

export function Card({ className, variant = 'default', children, ...props }: CardProps) {
  const variants = {
    default: 'bg-white rounded-xl shadow-sm border border-gray-200',
    elevated: 'bg-white rounded-xl shadow-lg',
    bordered: 'bg-white rounded-xl border-2 border-gray-300',
  };

  return (
    <div className={cn(variants[variant], className)} {...props}>
      {children}
    </div>
  );
}

export function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-b border-gray-200', className)} {...props}>
      {children}
    </div>
  );
}

export function CardContent({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4', className)} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl', className)} {...props}>
      {children}
    </div>
  );
}
```

#### Status Badge Component

```typescript
// src/components/ui/status-badge.tsx
import { cn } from '@/lib/utils';

type Status = 'draft' | 'pending_approval' | 'approved' | 'in_progress' | 'completed' | 'invoiced' | 'paid' | 'past_due';

interface StatusBadgeProps {
  status: Status;
  className?: string;
}

const statusConfig: Record<Status, { label: string; className: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-gray-100 text-gray-700',
  },
  pending_approval: {
    label: 'Pending Approval',
    className: 'bg-yellow-100 text-yellow-800',
  },
  approved: {
    label: 'Approved',
    className: 'bg-blue-100 text-blue-800',
  },
  in_progress: {
    label: 'In Progress',
    className: 'bg-purple-100 text-purple-800',
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800',
  },
  invoiced: {
    label: 'Invoiced',
    className: 'bg-indigo-100 text-indigo-800',
  },
  paid: {
    label: 'Paid',
    className: 'bg-emerald-100 text-emerald-800',
  },
  past_due: {
    label: 'Past Due',
    className: 'bg-red-100 text-red-800',
  },
};

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const config = statusConfig[status];

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
        config.className,
        className
      )}
    >
      {config.label}
    </span>
  );
}
```

#### Input Component

```typescript
// src/components/ui/input.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, helperText, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn(
            'w-full px-3 py-2 border rounded-lg transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent',
            'placeholder:text-gray-400',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300',
            className
          )}
          {...props}
        />
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
        {helperText && !error && <p className="mt-1 text-sm text-gray-500">{helperText}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
```

#### Select Component

```typescript
// src/components/ui/select.tsx
import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, options, placeholder, id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s/g, '-');

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={cn(
            'w-full px-3 py-2 border rounded-lg transition-colors duration-200',
            'focus:outline-none focus:ring-2 focus:ring-brand-purple focus:border-transparent',
            'bg-white',
            error
              ? 'border-red-500 focus:ring-red-500'
              : 'border-gray-300',
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
```

---

## Signature Pad Component

```typescript
// src/components/signatures/signature-pad.tsx
'use client';

import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  onClear?: () => void;
}

export function SignaturePad({ onSave, onClear }: SignaturePadProps) {
  const sigPadRef = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const handleClear = () => {
    sigPadRef.current?.clear();
    setIsEmpty(true);
    onClear?.();
  };

  const handleSave = () => {
    if (sigPadRef.current && !sigPadRef.current.isEmpty()) {
      const dataUrl = sigPadRef.current.getTrimmedCanvas().toDataURL('image/png');
      onSave(dataUrl);
    }
  };

  const handleBegin = () => {
    setIsEmpty(false);
  };

  return (
    <div className="w-full">
      <div className="border-2 border-gray-300 rounded-lg bg-white overflow-hidden">
        <SignatureCanvas
          ref={sigPadRef}
          canvasProps={{
            className: 'w-full h-48',
            style: { width: '100%', height: '192px' },
          }}
          backgroundColor="white"
          penColor="#1A1A1A"
          onBegin={handleBegin}
        />
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        Sign above using your finger or stylus
      </p>
      <div className="flex gap-3 mt-4">
        <Button
          type="button"
          variant="outline"
          onClick={handleClear}
          className="flex-1"
        >
          Clear
        </Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          disabled={isEmpty}
          className="flex-1"
        >
          Confirm Signature
        </Button>
      </div>
    </div>
  );
}
```

---

## Dashboard Layout

```typescript
// src/app/(dashboard)/layout.tsx
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/sign-in');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar user={user} />
      <div className="lg:pl-64">
        <Header user={user} />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
```

### Sidebar Component

```typescript
// src/components/dashboard/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Clock,
  AlertTriangle,
  Receipt,
  Settings,
  Users,
  BarChart3,
} from 'lucide-react';

interface SidebarProps {
  user: {
    role: string;
    firstName: string;
    lastName: string;
  };
}

export function Sidebar({ user }: SidebarProps) {
  const pathname = usePathname();

  const isAdmin = user.role === 'adventii_admin';
  const isStaff = ['adventii_admin', 'adventii_staff'].includes(user.role);

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, show: true },
    { name: 'Work Orders', href: '/work-orders', icon: FileText, show: true },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare, show: true },
    { name: 'Time Logs', href: '/time-logs', icon: Clock, show: isStaff },
    { name: 'Incidents', href: '/incidents', icon: AlertTriangle, show: isStaff },
    { name: 'Invoices', href: '/invoices', icon: Receipt, show: true },
    { name: 'Reports', href: '/reports', icon: BarChart3, show: true },
    { name: 'Staff', href: '/settings/staff', icon: Users, show: isAdmin },
    { name: 'Settings', href: '/settings', icon: Settings, show: isAdmin },
  ];

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-brand-black">
      <div className="flex h-16 items-center px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-heading text-xl text-white">ADVENTII</span>
        </Link>
      </div>

      <nav className="mt-6 px-3">
        <ul className="space-y-1">
          {navigation
            .filter((item) => item.show)
            .map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-brand-purple text-white'
                        : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                    )}
                  >
                    <item.icon className="h-5 w-5" />
                    {item.name}
                  </Link>
                </li>
              );
            })}
        </ul>
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="rounded-lg bg-gray-800 p-3">
          <p className="text-sm font-medium text-white">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-gray-400 capitalize">
            {user.role.replace('_', ' ')}
          </p>
        </div>
      </div>
    </aside>
  );
}
```

### Header Component

```typescript
// src/components/dashboard/header.tsx
'use client';

import { UserButton } from '@clerk/nextjs';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  user: {
    firstName: string;
  };
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
      <div className="flex h-16 items-center justify-between px-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            Welcome back, {user.firstName}
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              3
            </span>
          </Button>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>
    </header>
  );
}
```

---

## Work Order Form

```typescript
// src/components/forms/work-order-form.tsx
'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

const workOrderSchema = z.object({
  eventName: z.string().min(1, 'Event name is required'),
  eventDate: z.string().min(1, 'Event date is required'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venue: z.string().min(1, 'Venue is required'),
  venueOther: z.string().optional(),
  eventType: z.string().min(1, 'Event type is required'),
  eventTypeOther: z.string().optional(),
  requestedById: z.string().optional(),
  requestedByName: z.string().optional(),
  authorizedApproverId: z.string().optional(),
  estimateType: z.enum(['range', 'fixed', 'not_to_exceed']),
  estimatedHoursMin: z.string().optional(),
  estimatedHoursMax: z.string().optional(),
  estimatedHoursFixed: z.string().optional(),
  estimatedHoursNTE: z.string().optional(),
  scopeServiceIds: z.array(z.string()).optional(),
  customScope: z.string().optional(),
  notes: z.string().optional(),
});

type WorkOrderFormData = z.infer<typeof workOrderSchema>;

interface WorkOrderFormProps {
  services: { id: string; name: string }[];
  staff: { id: string; firstName: string; lastName: string; title: string }[];
  approvers: { id: string; firstName: string; lastName: string; title: string }[];
  onSubmit: (data: WorkOrderFormData) => Promise<void>;
  defaultValues?: Partial<WorkOrderFormData>;
  isLoading?: boolean;
}

export function WorkOrderForm({
  services,
  staff,
  approvers,
  onSubmit,
  defaultValues,
  isLoading,
}: WorkOrderFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<WorkOrderFormData>({
    resolver: zodResolver(workOrderSchema),
    defaultValues: {
      estimateType: 'range',
      ...defaultValues,
    },
  });

  const venue = watch('venue');
  const eventType = watch('eventType');
  const estimateType = watch('estimateType');

  const venueOptions = [
    { value: 'church', label: 'Church' },
    { value: 'meaney_hall_gym', label: 'Meaney Hall Gym' },
    { value: 'library', label: 'Library' },
    { value: 'room_102_103', label: 'Room 102/103' },
    { value: 'other', label: 'Other' },
  ];

  const eventTypeOptions = [
    { value: 'funeral', label: 'Funeral' },
    { value: 'mass_additional', label: 'Mass (Additional)' },
    { value: 'concert', label: 'Concert' },
    { value: 'retreat', label: 'Retreat' },
    { value: 'christlife', label: 'ChristLife' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'emergency', label: 'Emergency' },
    { value: 'other', label: 'Other' },
  ];

  const estimateTypeOptions = [
    { value: 'range', label: 'Estimated Range (Min-Max)' },
    { value: 'fixed', label: 'Fixed Hours' },
    { value: 'not_to_exceed', label: 'Not-to-Exceed' },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardHeader>
          <h2 className="text-xl font-semibold">Event Details</h2>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Event Name */}
          <Input
            label="Event Name"
            {...register('eventName')}
            error={errors.eventName?.message}
            placeholder="e.g., Sunday Mass, Tony Melendez Concert"
          />

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="date"
              label="Event Date"
              {...register('eventDate')}
              error={errors.eventDate?.message}
            />
            <Input
              type="time"
              label="Start Time"
              {...register('startTime')}
            />
            <Input
              type="time"
              label="End Time"
              {...register('endTime')}
            />
          </div>

          {/* Venue */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Venue"
              {...register('venue')}
              options={venueOptions}
              placeholder="Select venue"
              error={errors.venue?.message}
            />
            {venue === 'other' && (
              <Input
                label="Other Venue"
                {...register('venueOther')}
                placeholder="Specify venue"
              />
            )}
          </div>

          {/* Event Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Event Type"
              {...register('eventType')}
              options={eventTypeOptions}
              placeholder="Select event type"
              error={errors.eventType?.message}
            />
            {eventType === 'other' && (
              <Input
                label="Other Event Type"
                {...register('eventTypeOther')}
                placeholder="Specify event type"
              />
            )}
          </div>

          {/* Requestor and Approver */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Select
                label="Requested By"
                {...register('requestedById')}
                options={[
                  { value: '', label: 'Select staff member' },
                  ...staff.map((s) => ({
                    value: s.id,
                    label: `${s.firstName} ${s.lastName}`,
                  })),
                  { value: 'other', label: 'Other (Enter name)' },
                ]}
              />
            </div>
            <Select
              label="Authorized Approver"
              {...register('authorizedApproverId')}
              options={[
                { value: '', label: 'Select approver' },
                ...approvers.map((a) => ({
                  value: a.id,
                  label: `${a.firstName} ${a.lastName} - ${a.title}`,
                })),
              ]}
            />
          </div>

          {/* Custom Requestor Name */}
          {watch('requestedById') === 'other' && (
            <Input
              label="Requestor Name"
              {...register('requestedByName')}
              placeholder="Enter name of requestor"
            />
          )}

          {/* Scope Services */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Scope of Work
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {services.map((service) => (
                <label
                  key={service.id}
                  className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    value={service.id}
                    {...register('scopeServiceIds')}
                    className="h-4 w-4 text-brand-purple rounded border-gray-300 focus:ring-brand-purple"
                  />
                  <span className="text-sm">{service.name}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Custom Scope */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Additional Scope Notes
            </label>
            <textarea
              {...register('customScope')}
              rows={3}
              className="input"
              placeholder="Any additional scope details..."
            />
          </div>

          {/* Estimate */}
          <div className="space-y-4">
            <Select
              label="Estimate Type"
              {...register('estimateType')}
              options={estimateTypeOptions}
            />

            {estimateType === 'range' && (
              <div className="grid grid-cols-2 gap-4">
                <Input
                  type="number"
                  step="0.5"
                  label="Minimum Hours"
                  {...register('estimatedHoursMin')}
                  placeholder="1.5"
                />
                <Input
                  type="number"
                  step="0.5"
                  label="Maximum Hours"
                  {...register('estimatedHoursMax')}
                  placeholder="2.5"
                />
              </div>
            )}

            {estimateType === 'fixed' && (
              <Input
                type="number"
                step="0.5"
                label="Fixed Hours"
                {...register('estimatedHoursFixed')}
                placeholder="1.5"
              />
            )}

            {estimateType === 'not_to_exceed' && (
              <Input
                type="number"
                step="0.5"
                label="Not-to-Exceed Hours"
                {...register('estimatedHoursNTE')}
                placeholder="3.0"
              />
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              {...register('notes')}
              rows={4}
              className="input"
              placeholder="Any additional notes..."
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end gap-3">
          <Button type="button" variant="outline">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Save Work Order
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
```

---

## Utility Functions

```typescript
// src/lib/utils.ts
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(num);
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(d);
}
```

---

## Next Steps

Proceed to **STRIPE_INTEGRATION.md** for payment flow and webhook handling.
