'use client';

import React from 'react';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  return <>{children}</>;
}

export default DashboardLayout;
