'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth-nextauth';
import { useTheme } from '@/contexts/ThemeContext';

interface MenuItem {
  id: string;
  label: string;
  href?: string;
  icon?: string;
}

const DASHBOARD_MENU: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
  { id: 'payments', label: 'Payments', href: '/dashboard/payments', icon: 'payment' },
  { id: 'teamhub', label: 'TeamHub', href: '/dashboard/teamhub', icon: 'groups' },
  { id: 'inventory', label: 'Inventory', href: '/dashboard/inventory', icon: 'inventory' },
  { id: 'tools', label: 'Tools', href: '/dashboard/tools', icon: 'build' },
  { id: 'orders', label: 'Orders', href: '/dashboard/order', icon: 'shopping_cart' },
  { id: 'processing', label: 'Processing', href: '/dashboard/processing', icon: 'sync' },
  { id: 'admin', label: 'Admin', href: '/dashboard/admin', icon: 'admin_panel_settings' },
];

export function ProfessionalSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  if (!user) return null;

  const handleMenuClick = (href?: string) => {
    if (href) {
      router.push(href);
    }
  };

  const isActiveMenuItem = (href?: string) => {
    return href ? pathname.startsWith(href) : false;
  };

  return (
    <aside className="flex flex-col h-screen w-64 bg-gray-900 shadow-xl">
      <div className="flex items-center p-6 border-b border-gray-800">
        <span className="text-white text-2xl font-bold">AGGRANDIZE</span>
      </div>
      <nav className="flex-grow flex flex-col justify-between p-4">
        <div className="space-y-1">
          {DASHBOARD_MENU.map(item => (
            <a
              key={item.id}
              className={`flex items-center p-3 rounded-lg transition-colors cursor-pointer ${
                isActiveMenuItem(item.href)
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800'
              }`}
              onClick={() => handleMenuClick(item.href)}
            >
              <span className="material-icons mr-3">{item.icon}</span>
              {item.label}
            </a>
          ))}
        </div>
        <div className="space-y-3 mt-auto">
          <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
            <span className="text-gray-300">Dark Mode</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" value="" className="sr-only peer" onChange={toggleTheme} checked={theme === 'dark'} />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          <div className="flex items-center p-3 bg-gray-800 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-white">
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3">
              <p className="font-semibold text-white">{user.name}</p>
              <p className="text-sm text-gray-400">{user.role}</p>
            </div>
          </div>
          <button
            className="flex items-center p-3 text-gray-300 hover:bg-gray-800 rounded-lg transition-colors w-full"
            onClick={() => logout()}
          >
            <span className="material-icons mr-3">logout</span>
            Logout
          </button>
        </div>
      </nav>
    </aside>
  );
}