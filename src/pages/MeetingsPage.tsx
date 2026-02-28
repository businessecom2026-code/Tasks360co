import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { MeetingList } from '../components/meetings/MeetingList';
import { MeetingUpload } from '../components/meetings/MeetingUpload';
import { api } from '../lib/api';
import type { Meeting } from '../types';

export function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: '', date: '', time: '', platform: 'Google Meet' });

  useEffect(() => {
    fetchMeetings();
  }, []);

  const fetchMeetings = async () => {
    const res = await api.get<Meeting[]>('/meetings');
    if (res.success && res.data) {
      setMeetings(res.data);
    }
    setIsLoading(false);
  };

  const handleCreateMeeting = async () => {
    if (!newMeeting.title || !newMeeting.date || !newMeeting.time) return;
    const res = await api.post<Meeting>('/meetings', {
      ...newMeeting,
      participants: [],
    });
    if (res.success && res.data) {
      setMeetings((prev) => [res.data!, ...prev]);
      setShowCreateForm(false);
      setNewMeeting({ title: '', date: '', time: '', platform: 'Google Meet' });
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/meetings/${id}`);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
  };

  return (
    <>
      <Header title="Reuniões" />
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={16} /> Nova Reunião
          </button>
          <button
            onClick={() => setShowUpload(!showUpload)}
            className="flex items-center gap-2 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Processar Gravação com IA
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-medium">Criar Reunião</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Título</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Plataforma</label>
                <select
                  value={newMeeting.platform}
                  onChange={(e) => setNewMeeting({ ...newMeeting, platform: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option>Google Meet</option>
                  <option>Zoom</option>
                  <option>Teams</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Data</label>
                <input
                  type="date"
                  value={newMeeting.date}
                  onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Hora</label>
                <input
                  type="time"
                  value={newMeeting.time}
                  onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                  className="w-full bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={handleCreateMeeting}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Criar Reunião
            </button>
          </div>
        )}

        {/* AI Upload */}
        {showUpload && (
          <MeetingUpload onProcessed={() => { setShowUpload(false); fetchMeetings(); }} />
        )}

        {/* Meeting list */}
        {isLoading ? (
          <p className="text-gray-500 text-center py-8">Carregando...</p>
        ) : (
          <MeetingList meetings={meetings} onDelete={handleDelete} />
        )}
      </div>
    </>
  );
}
