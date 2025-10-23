'use client';

import React from 'react';
import { useAuth } from '@/lib/auth-nextauth';

// A reusable stat card component for the dashboard
const StatCard = ({ title, value, icon, color }: {
  title: string,
  value: string,
  icon: React.ReactNode,
  color: string
}) => (
  <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between">
      <div>
        <div className="text-gray-600 dark:text-gray-400 text-sm font-medium mb-1">{title}</div>
        <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
      </div>
      <div className={`${color} p-3 rounded-lg`}>
        {icon}
      </div>
    </div>
  </div>
);

export function WelcomeDashboard() {
  const { user } = useAuth();

  const currentUser = user || { name: 'Guest' };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getIconSvg = (iconName: string) => {
    const iconMap: Record<string, string> = {
      attach_money: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1.41 16.09V20h-2.67v-1.93c-1.71-.36-3.16-1.46-3.27-3.4h1.96c.1.93.64 1.64 2.08 1.64 1.51 0 2.09-.67 2.09-1.35 0-.85-.65-1.35-2.39-1.74-2.2-.49-3.61-1.35-3.61-3.26 0-1.66 1.22-2.88 3.14-3.21V5h2.67v1.79c1.51.32 2.77 1.29 2.94 3.02h-1.96c-.11-.76-.58-1.41-1.74-1.41-1.23 0-1.94.59-1.94 1.31 0 .77.62 1.22 2.39 1.61 2.2.49 3.61 1.35 3.61 3.35 0 1.77-1.32 3.03-3.3 3.42z',
      shopping_cart: 'M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z',
      task: 'M19 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.11 0 2-.9 2-2V5c0-1.1-.89-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'
    };

    return iconMap[iconName] || iconMap.attach_money;
  };

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Today's Revenue"
          value="₹12,500"
          icon={
            <svg className="w-8 h-8 text-green-600" viewBox="0 0 24 24" fill="currentColor">
              <path d={getIconSvg('attach_money')} />
            </svg>
          }
          color="bg-green-100 dark:bg-green-900/40"
        />
        <StatCard
          title="New Orders"
          value="32"
          icon={
            <svg className="w-8 h-8 text-blue-600" viewBox="0 0 24 24" fill="currentColor">
              <path d={getIconSvg('shopping_cart')} />
            </svg>
          }
          color="bg-blue-100 dark:bg-blue-900/40"
        />
        <StatCard
          title="Pending Tasks"
          value="8"
          icon={
            <svg className="w-8 h-8 text-yellow-600" viewBox="0 0 24 24" fill="currentColor">
              <path d={getIconSvg('task')} />
            </svg>
          }
          color="bg-yellow-100 dark:bg-yellow-900/40"
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">New invoice created</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">2 minutes ago</p>
              </div>
            </div>
            <span className="text-green-600 dark:text-green-400 text-sm font-medium">₹5,000</span>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">Payment received</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">1 hour ago</p>
              </div>
            </div>
            <span className="text-green-600 dark:text-green-400 text-sm font-medium">₹12,500</span>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-gray-900 dark:text-white font-medium">New team member added</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">3 hours ago</p>
              </div>
            </div>
            <span className="text-gray-500 dark:text-gray-400 text-sm">Saravana Kumar</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">Add Expense</span>
          </button>

          <button className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">Create Task</span>
          </button>

          <button className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">View Reports</span>
          </button>

          <button className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
            <svg className="w-8 h-8 mx-auto mb-2 text-gray-600 dark:text-gray-400" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            <span className="text-sm text-gray-700 dark:text-gray-300">Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default WelcomeDashboard;