'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { useTheme } from '@/contexts/ThemeContext';
import { ProfileIconDisplay } from '@/components/profile/profile-icon-selector';
import { format } from 'date-fns';

interface ProfessionalHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function ProfessionalHeader({
  title,
  description,
  actions,
  breadcrumbs = []
}: ProfessionalHeaderProps) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update time every minute
  useState(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  });

  return (
    <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="inline-flex items-center space-x-1 md:space-x-3">
              {breadcrumbs.map((crumb, index) => (
                <li key={index} className="inline-flex items-center">
                  {index > 0 && (
                    <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-primary-main dark:hover:text-primary-light"
                    >
                      {crumb.label}
                    </a>
                  ) : (
                    <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}

        <div className="flex items-center justify-between">
          {/* Left Section */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {title}
            </h1>
            {description && (
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-4 ml-6">
            {/* Time Display */}
            <div className="hidden sm:block text-right">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {format(currentTime, 'h:mm a')}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {format(currentTime, 'EEEE, MMMM d, yyyy')}
              </p>
            </div>

            {/* User Info */}
            <div className="flex items-center space-x-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.name}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.role === 'admin' ? 'Administrator' :
                   user?.role === 'marketing' ? 'Marketing' :
                   user?.role === 'processing' ? 'Processing' : 'Member'}
                </p>
              </div>
              <ProfileIconDisplay
                icon={user?.image ? 'avatar' : 'smile'}
                size="small"
                avatarUrl={user?.image}
              />
            </div>

            {/* Actions */}
            {actions && (
              <div className="hidden md:block">
                {actions}
              </div>
            )}
          </div>
        </div>

        {/* Mobile Actions */}
        {actions && (
          <div className="mt-4 md:hidden">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
}