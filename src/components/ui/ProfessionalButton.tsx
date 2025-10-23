'use client';

import { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'xl';

export interface ProfessionalButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
  className?: string;
}

const variantClasses = {
  primary: 'bg-primary-main text-white hover:bg-primary-dark focus:ring-primary-main',
  secondary: 'bg-secondary-main text-white hover:bg-secondary-dark focus:ring-secondary-main',
  outline: 'border border-gray-300 dark:border-gray-600 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:ring-primary-main',
  ghost: 'bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:ring-primary-main',
  destructive: 'bg-error-main text-white hover:bg-error-dark focus:ring-error-main'
};

const sizeClasses = {
  sm: 'px-3 py-1.5 text-sm',
  md: 'px-4 py-2 text-sm',
  lg: 'px-6 py-2.5 text-base',
  xl: 'px-8 py-3 text-lg'
};

const iconSizeClasses = {
  sm: 'text-sm',
  md: 'text-base',
  lg: 'text-lg',
  xl: 'text-xl'
};

export function ProfessionalButton({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  disabled,
  ...props
}: ProfessionalButtonProps) {
  const baseClasses = [
    'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && 'w-full'
  ];

  const buttonClasses = [...baseClasses, className].join(' ');

  const iconClasses = iconSizeClasses[size];

  return (
    <button
      className={buttonClasses}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg
          className={`animate-spin -ml-1 mr-2 h-4 w-4 ${iconClasses}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}

      {!loading && leftIcon && (
        <span className={`mr-2 ${iconClasses}`}>
          {leftIcon}
        </span>
      )}

      <span className="truncate">{children}</span>

      {!loading && rightIcon && (
        <span className={`ml-2 ${iconClasses}`}>
          {rightIcon}
        </span>
      )}
    </button>
  );
}

// Button Group Component
export interface ButtonGroupProps {
  children: ReactNode;
  className?: string;
  orientation?: 'horizontal' | 'vertical';
}

export function ButtonGroup({
  children,
  className = '',
  orientation = 'horizontal'
}: ButtonGroupProps) {
  const groupClasses = [
    'inline-flex',
    orientation === 'horizontal'
      ? 'flex-row space-x-0 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600'
      : 'flex-col space-y-0 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600',
    className
  ];

  return (
    <div className={groupClasses.join(' ')}>
      {children}
    </div>
  );
}

// Icon Button Component
export interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: ReactNode;
  size?: ButtonSize;
  variant?: ButtonVariant;
  tooltip?: string;
  className?: string;
}

export function IconButton({
  icon,
  size = 'md',
  variant = 'ghost',
  tooltip,
  className = '',
  ...props
}: IconButtonProps) {
  const sizeMap = {
    sm: 'p-1.5',
    md: 'p-2',
    lg: 'p-2.5',
    xl: 'p-3'
  };

  const iconSizeMap = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl'
  };

  const buttonClasses = [
    'rounded-lg inline-flex items-center justify-center',
    sizeMap[size],
    variantClasses[variant],
    className
  ];

  const button = (
    <button className={buttonClasses.join(' ')} {...props}>
      <span className={iconSizeMap[size]}>{icon}</span>
    </button>
  );

  if (tooltip) {
    return (
      <div className="relative group">
        {button}
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
          {tooltip}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-gray-900"></div>
        </div>
      </div>
    );
  }

  return button;
}