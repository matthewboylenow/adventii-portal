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
  Wrench,
  X,
} from 'lucide-react';

interface MobileSidebarProps {
  user: {
    role: string;
    firstName: string;
  };
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ user, open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  const isAdmin = user.role === 'adventii_admin';
  const isStaff = ['adventii_admin', 'adventii_staff'].includes(user.role);
  const isClientAdmin = user.role === 'client_admin';

  const navigation = [
    { name: 'Dashboard', href: '/', icon: LayoutDashboard, show: true },
    { name: 'Work Orders', href: '/work-orders', icon: FileText, show: true },
    { name: 'Approvals', href: '/approvals', icon: CheckSquare, show: true },
    { name: 'Time Logs', href: '/time-logs', icon: Clock, show: isStaff },
    { name: 'Incidents', href: '/incidents', icon: AlertTriangle, show: isStaff },
    { name: 'Invoices', href: '/invoices', icon: Receipt, show: true },
    { name: 'Reports', href: '/reports', icon: BarChart3, show: true },
    { name: 'Staff', href: '/settings/staff', icon: Users, show: isAdmin || isClientAdmin },
    { name: 'Services', href: '/settings/services', icon: Wrench, show: isAdmin },
    { name: 'Settings', href: '/settings', icon: Settings, show: isAdmin },
  ];

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Sidebar */}
      <div className="fixed inset-y-0 left-0 w-64 bg-brand-black">
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-800">
          <span className="font-[Audiowide] text-xl text-white tracking-wider">
            ADVENTII
          </span>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-6 px-3">
          <ul className="space-y-1">
            {navigation
              .filter((item) => item.show)
              .map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <li key={item.name}>
                    <Link
                      href={item.href}
                      onClick={onClose}
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
      </div>
    </div>
  );
}
