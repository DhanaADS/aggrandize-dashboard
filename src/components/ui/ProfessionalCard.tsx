'use client';

import { ReactNode } from 'react';

export interface ProfessionalCardProps {
  children: ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevation?: 0 | 1 | 2 | 3 | 4;
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  bordered?: boolean;
  hoverable?: boolean;
  onClick?: () => void;
}

const elevationClasses = {
  0: '',
  1: 'shadow-sm',
  2: 'shadow-md',
  3: 'shadow-lg',
  4: 'shadow-xl'
};

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6'
};

const roundedClasses = {
  none: '',
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl'
};

export function ProfessionalCard({
  children,
  className = '',
  padding = 'md',
  elevation = 1,
  rounded = 'lg',
  bordered = true,
  hoverable = false,
  onClick
}: ProfessionalCardProps) {
  const baseClasses = [
    'bg-white dark:bg-gray-800',
    'transition-all duration-200',
    paddingClasses[padding],
    roundedClasses[rounded],
    elevationClasses[elevation]
  ];

  if (bordered) {
    baseClasses.push('border border-gray-200 dark:border-gray-700');
  }

  if (hoverable && !onClick) {
    baseClasses.push('hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600');
  }

  if (onClick) {
    baseClasses.push('cursor-pointer hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transform hover:-translate-y-0.5');
  }

  const cardClasses = [...baseClasses, className].join(' ');

  const CardComponent = onClick ? 'button' : 'div';

  return (
    <CardComponent
      className={cardClasses}
      onClick={onClick}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </CardComponent>
  );
}

// Card sub-components
export interface CardHeaderProps {
  children: ReactNode;
  className?: string;
  divider?: boolean;
}

export function CardHeader({ children, className = '', divider = false }: CardHeaderProps) {
  return (
    <div className={`mb-4 ${divider ? 'pb-4 border-b border-gray-200 dark:border-gray-700' : ''} ${className}`}>
      {children}
    </div>
  );
}

export interface CardTitleProps {
  children: ReactNode;
  className?: string;
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'div';
}

export function CardTitle({ children, className = '', as: Component = 'h3' }: CardTitleProps) {
  return (
    <Component className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>
      {children}
    </Component>
  );
}

export interface CardDescriptionProps {
  children: ReactNode;
  className?: string;
}

export function CardDescription({ children, className = '' }: CardDescriptionProps) {
  return (
    <p className={`text-sm text-gray-600 dark:text-gray-400 mt-1 ${className}`}>
      {children}
    </p>
  );
}

export interface CardContentProps {
  children: ReactNode;
  className?: string;
}

export function CardContent({ children, className = '' }: CardContentProps) {
  return <div className={className}>{children}</div>;
}

export interface CardFooterProps {
  children: ReactNode;
  className?: string;
  divider?: boolean;
}

export function CardFooter({ children, className = '', divider = false }: CardFooterProps) {
  return (
    <div className={`mt-4 ${divider ? 'pt-4 border-t border-gray-200 dark:border-gray-700' : ''} ${className}`}>
      {children}
    </div>
  );
}

// Stats Card Component
export interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    type: 'increase' | 'decrease';
  };
  icon?: ReactNode;
  className?: string;
}

export function StatsCard({ title, value, change, icon, className = '' }: StatsCardProps) {
  return (
    <ProfessionalCard className={className} hoverable>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
            {title}
          </p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
            {value}
          </p>
          {change && (
            <div className={`flex items-center mt-2 text-sm font-medium ${
              change.type === 'increase' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
            }`}>
              <span className="mr-1">
                {change.type === 'increase' ? '↑' : '↓'}
              </span>
              {Math.abs(change.value)}%
            </div>
          )}
        </div>
        {icon && (
          <div className="p-3 bg-primary-light dark:bg-primary-light/10 rounded-lg">
            {icon}
          </div>
        )}
      </div>
    </ProfessionalCard>
  );
}

// List Card Component
export interface ListCardProps {
  title: string;
  items: Array<{
    id: string;
    title: string;
    description?: string;
    icon?: ReactNode;
    action?: ReactNode;
  }>;
  className?: string;
}

export function ListCard({ title, items, className = '' }: ListCardProps) {
  return (
    <ProfessionalCard className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-3">
          {items.map(item => (
            <li key={item.id} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {item.icon && (
                  <div className="flex-shrink-0">
                    {item.icon}
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {item.title}
                  </p>
                  {item.description && (
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {item.description}
                    </p>
                  )}
                </div>
              </div>
              {item.action && (
                <div className="flex-shrink-0">
                  {item.action}
                </div>
              )}
            </li>
          ))}
        </ul>
      </CardContent>
    </ProfessionalCard>
  );
}