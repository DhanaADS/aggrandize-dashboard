import { SupabaseDashboardLayout } from '@/components/dashboard/supabase-dashboard-layout';

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <SupabaseDashboardLayout>{children}</SupabaseDashboardLayout>;
}