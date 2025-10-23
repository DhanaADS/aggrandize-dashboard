'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-nextauth';
import { ProfessionalHeader } from '@/components/dashboard/ProfessionalHeader';
import { ProfessionalCard, StatsCard, ListCard, CardHeader, CardTitle, CardContent } from '@/components/ui/ProfessionalCard';
import { ProfessionalButton } from '@/components/ui/ProfessionalButton';

export default function OverviewPage() {
  const { user } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  // Mock data for demonstration
  const stats = [
    {
      title: "Today's Revenue",
      value: "₹12,500",
      change: { value: 12.5, type: 'increase' as const },
      icon: (
        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
        </svg>
      )
    },
    {
      title: "New Orders",
      value: "32",
      change: { value: 8.2, type: 'increase' as const },
      icon: (
        <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    },
    {
      title: "Pending Tasks",
      value: "8",
      change: { value: 3.1, type: 'decrease' as const },
      icon: (
        <svg className="w-6 h-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
      )
    },
    {
      title: "Active Users",
      value: "1,234",
      change: { value: 5.7, type: 'increase' as const },
      icon: (
        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      )
    }
  ];

  const recentActivities = [
    {
      id: '1',
      title: 'New invoice created',
      description: 'Invoice #INV-001 for client XYZ',
      time: '2 minutes ago',
      amount: '₹5,000',
      type: 'invoice'
    },
    {
      id: '2',
      title: 'Order completed',
      description: 'Order #ORD-123 shipped successfully',
      time: '1 hour ago',
      amount: '₹8,500',
      type: 'order'
    },
    {
      id: '3',
      title: 'Payment received',
      description: 'Payment from client ABC',
      time: '3 hours ago',
      amount: '₹12,000',
      type: 'payment'
    },
    {
      id: '4',
      title: 'New user registered',
      description: 'User john@example.com joined',
      time: '5 hours ago',
      type: 'user'
    }
  ];

  const quickActions = [
    {
      id: 'create-invoice',
      title: 'Create Invoice',
      description: 'Generate a new invoice for client',
      icon: '📄',
      action: () => console.log('Create invoice')
    },
    {
      id: 'add-expense',
      title: 'Add Expense',
      description: 'Record a new business expense',
      icon: '💳',
      action: () => console.log('Add expense')
    },
    {
      id: 'create-task',
      title: 'Create Task',
      description: 'Assign a new task to team member',
      icon: '✅',
      action: () => console.log('Create task')
    },
    {
      id: 'view-reports',
      title: 'View Reports',
      description: 'Check analytics and insights',
      icon: '📊',
      action: () => console.log('View reports')
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex">
      {/* Main Content */}
      <main className="flex-1 lg:ml-0">
        <div className="p-4 lg:p-8">
          {/* Header */}
          <ProfessionalHeader
            title={`${getGreeting()}, ${user?.name || 'Guest'}!`}
            description="Here's what's happening with your business today."
            actions={
              <ProfessionalButton
                variant="primary"
                leftIcon="📊"
                onClick={() => console.log('View reports')}
              >
                View Reports
              </ProfessionalButton>
            }
          />

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {stats.map((stat, index) => (
              <StatsCard
                key={index}
                title={stat.title}
                value={stat.value}
                change={stat.change}
                icon={stat.icon}
              />
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activities */}
            <div className="lg:col-span-2">
              <ProfessionalCard>
                <CardHeader>
                  <CardTitle>Recent Activities</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {recentActivities.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700 last:border-0"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                            <span className="text-blue-600 dark:text-blue-400">
                              {activity.type === 'invoice' ? '📄' :
                               activity.type === 'order' ? '📦' :
                               activity.type === 'payment' ? '💰' : '👤'}
                            </span>
                          </div>
                          <div>
                            <p className="text-gray-900 dark:text-white font-medium">
                              {activity.title}
                            </p>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                              {activity.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-green-600 dark:text-green-400 font-medium">
                            {activity.amount}
                          </p>
                          <p className="text-gray-500 dark:text-gray-400 text-sm">
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </ProfessionalCard>
            </div>

            {/* Quick Actions */}
            <div>
              <ProfessionalCard>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    {quickActions.map((action) => (
                      <ProfessionalButton
                        key={action.id}
                        variant="outline"
                        size="sm"
                        onClick={action.action}
                        className="h-auto p-4 flex flex-col items-center justify-center space-y-2"
                      >
                        <span className="text-2xl">{action.icon}</span>
                        <span className="text-sm font-medium text-center">
                          {action.title}
                        </span>
                      </ProfessionalButton>
                    ))}
                  </div>
                </CardContent>
              </ProfessionalCard>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
