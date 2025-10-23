import GlobalMUILayout from '@/components/dashboard/global-mui-layout';

export default function DashboardLayoutWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return <GlobalMUILayout>{children}</GlobalMUILayout>;
}