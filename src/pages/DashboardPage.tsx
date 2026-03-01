import { useEffect, useState } from 'react';
import {
  CheckSquare,
  Clock,
  AlertCircle,
  CheckCircle2,
  Video,
  Users,
  TrendingUp,
} from 'lucide-react';
import { Header } from '../components/layout/Header';
import { useTaskStore } from '../stores/useTaskStore';
import { useWorkspaceStore } from '../stores/useWorkspaceStore';
import { api } from '../lib/api';
import type { Meeting, Subscription } from '../types';

export function DashboardPage() {
  const { tasks, fetchTasks } = useTaskStore();
  const { currentWorkspace } = useWorkspaceStore();
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);

  useEffect(() => {
    fetchTasks();
    api.get<Meeting[]>('/meetings').then((res) => {
      if (res.success && res.data) setMeetings(res.data);
    });
    api.get<Subscription>('/billing/subscription').then((res) => {
      if (res.success && res.data) setSubscription(res.data);
    });
  }, [fetchTasks, currentWorkspace?.id]);

  const pending = tasks.filter((t) => t.status === 'PENDING').length;
  const inProgress = tasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const review = tasks.filter((t) => t.status === 'REVIEW').length;
  const done = tasks.filter((t) => t.status === 'DONE').length;

  const stats = [
    { label: 'Pendentes', value: pending, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-600/20' },
    { label: 'Em Progresso', value: inProgress, icon: AlertCircle, color: 'text-blue-400', bg: 'bg-blue-600/20' },
    { label: 'Em Revisão', value: review, icon: CheckSquare, color: 'text-purple-400', bg: 'bg-purple-600/20' },
    { label: 'Concluídas', value: done, icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-600/20' },
  ];

  return (
    <>
      <Header title="Dashboard" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Task stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="bg-gray-900 border border-gray-800 rounded-xl p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <stat.icon size={20} className={stat.color} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-white">{stat.value}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upcoming meetings */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <Video size={18} className="text-blue-400" />
              <h3 className="text-white font-semibold">Próximas Reuniões</h3>
            </div>
            {meetings.length === 0 ? (
              <p className="text-gray-500 text-sm py-4 text-center">Sem reuniões agendadas</p>
            ) : (
              <div className="space-y-2">
                {meetings.slice(0, 5).map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between bg-gray-800 rounded-lg p-3"
                  >
                    <div>
                      <p className="text-sm text-white">{m.title}</p>
                      <p className="text-xs text-gray-500">{m.date} às {m.time}</p>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Users size={12} />
                      <span className="text-xs">{m.participants.length}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Subscription info */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-green-400" />
              <h3 className="text-white font-semibold">Assinatura</h3>
            </div>
            {subscription ? (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Plano Base</span>
                  <span className="text-white text-sm">{subscription.basePrice.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Assentos Ativos</span>
                  <span className="text-white text-sm">{subscription.seatCount}</span>
                </div>
                <div className="flex justify-between border-t border-gray-800 pt-2">
                  <span className="text-gray-300 text-sm font-medium">Total Mensal</span>
                  <span className="text-white text-sm font-bold">{subscription.totalMonthlyValue.toFixed(2)} EUR</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Auto-renovação</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${subscription.autoRenew ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                    {subscription.autoRenew ? 'Ativa' : 'Desativada'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400 text-sm">Status</span>
                  <span className="text-xs bg-blue-900/40 text-blue-400 px-2 py-0.5 rounded">
                    {subscription.status}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 text-sm py-4 text-center">Sem assinatura ativa</p>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
