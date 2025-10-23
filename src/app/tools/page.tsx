
import React from 'react';

const ToolsPage = () => {
  return (
    <div className="flex h-screen">
      <aside className="w-64 bg-card-light dark:bg-card-dark flex flex-col p-4 border-r border-border-light dark:border-border-dark">
        <div className="flex items-center mb-10">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-white text-2xl font-bold">A</span>
          </div>
        </div>
        <nav className="flex-1 space-y-2">
          <a className="flex items-center px-4 py-2.5 text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" href="#">
            <span className="material-icons mr-3">dashboard</span>
            Dashboard
          </a>
          <a className="flex items-center px-4 py-2.5 text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" href="#">
            <span className="material-icons mr-3">payments</span>
            Payments
          </a>
          <a className="flex items-center px-4 py-2.5 text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" href="#">
            <span className="material-icons mr-3">groups</span>
            TeamHub
          </a>
          <a className="flex items-center px-4 py-2.5 text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" href="#">
            <span className="material-icons mr-3">inventory</span>
            Inventory
          </a>
          <a className="flex items-center px-4 py-2.5 bg-primary-light text-primary dark:bg-primary/20 dark:text-primary rounded-lg font-semibold" href="#">
            <span className="material-icons mr-3">build</span>
            Tools
          </a>
          <a className="flex items-center px-4 py-2.5 text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" href="#">
            <span className="material-icons mr-3">shopping_cart</span>
            Orders
          </a>
          <a className="flex items-center px-4 py-2.5 text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" href="#">
            <span className="material-icons mr-3">sync</span>
            Processing
          </a>
          <a className="flex items-center px-4 py-2.5 text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" href="#">
            <span className="material-icons mr-3">admin_panel_settings</span>
            Admin
          </a>
        </nav>
        <div className="mt-auto">
          <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
            <div className="flex justify-between items-center">
              <span className="text-text-light dark:text-text-dark text-sm">Dark Mode</span>
              <button className="w-12 h-6 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center transition duration-300 focus:outline-none">
                <span className="w-5 h-5 bg-white rounded-full shadow-md transform translate-x-6 dark:translate-x-1 transition duration-300"></span>
              </button>
            </div>
            <div className="flex items-center mt-4">
              <div className="w-10 h-10 rounded-full bg-blue-200 flex items-center justify-center text-blue-800 font-bold mr-3">D</div>
              <div>
                <p className="font-semibold text-text-light dark:text-text-dark">Dhanapal Elango</p>
                <p className="text-xs text-text-light-secondary dark:text-text-dark-secondary">admin</p>
              </div>
            </div>
          </div>
          <a className="flex items-center px-4 py-2.5 text-text-light-secondary dark:text-text-dark-secondary rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" href="#">
            <span className="material-icons mr-3">logout</span>
            Logout
          </a>
        </div>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="bg-primary rounded-xl p-8 mb-8">
          <div className="flex items-center space-x-4">
            <div className="bg-white/20 p-3 rounded-lg">
              <span className="material-icons text-white !text-4xl">build</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Utility Tools</h1>
              <p className="text-white/80 mt-1">Comprehensive suite of tools and automation features to streamline your workflow.</p>
            </div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-blue-100 dark:bg-blue-900/50 p-3 rounded-lg mr-5">
                  <span className="material-icons text-blue-600 dark:text-blue-400">public</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Web Scraping</h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Extract data from any website with AI-powered scraping</p>
                </div>
              </div>
              <span className="bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300 text-xs font-semibold px-3 py-1 rounded-full">Available</span>
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-purple-100 dark:bg-purple-900/50 p-3 rounded-lg mr-5">
                  <span className="material-icons text-purple-600 dark:text-purple-400">email</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">MailForge</h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Email marketing, campaign management and automation</p>
                </div>
              </div>
              <span className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full">Coming Soon</span>
            </div>
          </div>
          <div className="bg-card-light dark:bg-card-dark p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-300 border border-border-light dark:border-border-dark">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="bg-indigo-100 dark:bg-indigo-900/50 p-3 rounded-lg mr-5">
                  <span className="material-icons text-indigo-600 dark:text-indigo-400">lan</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-light dark:text-text-dark">Workflow Editor</h3>
                  <p className="text-sm text-text-light-secondary dark:text-text-dark-secondary">Visual workflow automation builder</p>
                </div>
              </div>
              <span className="bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 text-xs font-semibold px-3 py-1 rounded-full">Coming Soon</span>
            </div>
          </div>
        </div>
        <div className="fixed bottom-4 right-4 flex flex-col items-end space-y-4">
          <button className="bg-card-light dark:bg-card-dark p-3 rounded-full shadow-lg border border-border-light dark:border-border-dark">
            <span className="material-icons text-text-light-secondary dark:text-text-dark-secondary">help_outline</span>
          </button>
          <button className="bg-card-light dark:bg-card-dark p-3 rounded-full shadow-lg border border-border-light dark:border-border-dark">
            <span className="material-icons text-text-light-secondary dark:text-text-dark-secondary">notifications</span>
          </button>
        </div>
      </main>
    </div>
  );
};

export default ToolsPage;
