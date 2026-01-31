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
} from 'lucide-react';

interface SidebarProps {
  user: {
    role: string;
    firstName: string;
    lastName: string;
    title?: string | null;
  };
}

export function Sidebar({ user }: SidebarProps) {
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

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      adventii_admin: 'Adventii Admin',
      adventii_staff: 'Adventii Staff',
      client_admin: 'Client Admin',
      client_approver: 'Approver',
      client_viewer: 'Viewer',
    };
    return labels[role] || role;
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 w-64 bg-brand-black hidden lg:block">
      <div className="flex h-16 items-center px-6 border-b border-gray-800">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-[Audiowide] text-xl text-white tracking-wider">
            ADVENTII MEDIA
          </span>
        </Link>
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

      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-800">
        <div className="rounded-lg bg-gray-800 p-3">
          <p className="text-sm font-medium text-white truncate">
            {user.firstName} {user.lastName}
          </p>
          <p className="text-xs text-gray-400">
            {getRoleLabel(user.role)}
          </p>
          {user.title && (
            <p className="text-xs text-gray-500 truncate mt-0.5">
              {user.title}
            </p>
          )}
        </div>
      </div>
    </aside>
  );
}
