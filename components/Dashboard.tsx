import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { Task, UserRole, Language } from '../types';
import { translations } from '../i18n';

interface DashboardProps {
  tasks: Task[];
  role: UserRole;
  language: Language;
  isLoading?: boolean;
}

const Dashboard: React.FC<DashboardProps> = ({ tasks, role, language, isLoading = false }) => {
  const t = translations[language].dashboard;
  
  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div className="h-8 bg-gray-200 rounded w-48 mb-6 animate-pulse"></div>
        
        {/* KPI Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 relative overflow-hidden h-32 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-24 mb-4"></div>
              <div className="h-10 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>

        {/* Charts Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 h-64 md:h-80 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="h-48 bg-gray-100 rounded w-full"></div>
          </div>
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 h-64 md:h-80 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-32 mb-6"></div>
            <div className="h-48 bg-gray-100 rounded w-full"></div>
          </div>
        </div>
      </div>
    );
  }
  
  // Mock data for charts
  const productivityData = [
    { name: 'Mon', completed: 4, hours: 6 },
    { name: 'Tue', completed: 3, hours: 5 },
    { name: 'Wed', completed: 7, hours: 8 },
    { name: 'Thu', completed: 5, hours: 6 },
    { name: 'Fri', completed: 8, hours: 7 },
  ];

  const pendingCount = tasks.filter(t => t.status === 'PENDING').length;
  const inProgressCount = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const doneCount = tasks.filter(t => t.status === 'DONE').length;

  if (role === 'CLIENT') {
    return <div className="p-8 text-center text-gray-500">{t.restricted}</div>;
  }

  return (
    <div className="p-4 md:p-6 space-y-6 animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-white">{t.title}</h2>
      
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-orange-400"></div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.pending}</p>
          <h3 className="text-3xl font-bold text-gray-800 dark:text-white">{pendingCount}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-teal-500"></div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.inProgress}</p>
          <h3 className="text-3xl font-bold text-gray-800 dark:text-white">{inProgressCount}</h3>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-1 h-full bg-green-500"></div>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">{t.completed}</p>
          <h3 className="text-3xl font-bold text-gray-800 dark:text-white">{doneCount}</h3>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 h-64 md:h-80">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">{t.velocity}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <Tooltip 
                cursor={{fill: '#f8fafc'}} 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              {/* Ecom360 Teal */}
              <Bar dataKey="completed" fill="#0d9488" radius={[4, 4, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 p-4 md:p-6 rounded-xl shadow-sm border border-gray-100 dark:border-slate-700 h-64 md:h-80">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 dark:text-gray-200">{t.focus}</h3>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={productivityData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <YAxis tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} />
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
              />
              {/* Teal Light accent */}
              <Line type="monotone" dataKey="hours" stroke="#14b8a6" strokeWidth={3} dot={{r: 4, fill: '#14b8a6', strokeWidth: 0}} activeDot={{r: 6}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;