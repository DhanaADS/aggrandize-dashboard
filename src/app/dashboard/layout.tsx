import { NextAuthDashboardLayout } from '@/components/dashboard/nextauth-dashboard-layout';

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <NextAuthDashboardLayout>{children}</NextAuthDashboardLayout>;
}