import { useEffect, useState } from 'react';
import { Plus, X, Mic } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { MeetingList } from '../components/meetings/MeetingList';
import { MeetingUpload } from '../components/meetings/MeetingUpload';
import { RecordingControls } from '../components/meetings/RecordingControls';
import { RecordingReportPanel } from '../components/meetings/RecordingReportPanel';
import { api } from '../lib/api';
import type { Meeting } from '../types';

export function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [newMeeting, setNewMeeting] = useState({
    title: '',
    date: '',
    time: '',
    platform: 'Google Meet',
    recordWithAi: false,
  });

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

      // If recordWithAi, auto-select to show recording controls
      if (newMeeting.recordWithAi) {
        setSelectedMeeting(res.data);
      }

      setNewMeeting({ title: '', date: '', time: '', platform: 'Google Meet', recordWithAi: false });
    }
  };

  const handleDelete = async (id: string) => {
    await api.delete(`/meetings/${id}`);
    setMeetings((prev) => prev.filter((m) => m.id !== id));
    if (selectedMeeting?.id === id) setSelectedMeeting(null);
  };

  const handleSelectMeeting = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
  };

  const handleRecordingProcessed = () => {
    fetchMeetings();
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
            className="flex items-center gap-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-900 dark:text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            Processar Gravação com IA
          </button>
        </div>

        {/* Create form */}
        {showCreateForm && (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 dark:text-white font-medium">Criar Reunião</h3>
              <button onClick={() => setShowCreateForm(false)} className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
                <X size={18} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Título</label>
                <input
                  type="text"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Plataforma</label>
                <select
                  value={newMeeting.platform}
                  onChange={(e) => setNewMeeting({ ...newMeeting, platform: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                >
                  <option>Google Meet</option>
                  <option>Zoom</option>
                  <option>Teams</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Data</label>
                <input
                  type="date"
                  value={newMeeting.date}
                  onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-400 mb-1">Hora</label>
                <input
                  type="time"
                  value={newMeeting.time}
                  onChange={(e) => setNewMeeting({ ...newMeeting, time: e.target.value })}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-gray-900 dark:text-white text-sm focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Record with AI toggle */}
            <div className="mt-4 flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={newMeeting.recordWithAi}
                    onChange={(e) => setNewMeeting({ ...newMeeting, recordWithAi: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-gray-600 rounded-full peer-checked:bg-red-600 transition-colors" />
                  <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform peer-checked:translate-x-4" />
                </div>
                <div className="flex items-center gap-1.5">
                  <Mic size={14} className={newMeeting.recordWithAi ? 'text-red-400' : 'text-gray-500'} />
                  <span className={`text-sm ${newMeeting.recordWithAi ? 'text-white' : 'text-gray-400'}`}>
                    Gravar com IA
                  </span>
                </div>
              </label>
              {newMeeting.recordWithAi && (
                <span className="text-xs text-gray-500">
                  Abre os controlos de gravação ao criar
                </span>
              )}
            </div>

            <button
              onClick={handleCreateMeeting}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              Criar Reunião
            </button>
          </div>
        )}

        {/* AI Upload (file-based) */}
        {showUpload && (
          <MeetingUpload onProcessed={() => { setShowUpload(false); fetchMeetings(); }} />
        )}

        {/* Selected meeting: Recording controls + Report */}
        {selectedMeeting && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-gray-900 dark:text-white font-medium text-lg">{selectedMeeting.title}</h3>
              <button
                onClick={() => setSelectedMeeting(null)}
                className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Recording controls */}
            <RecordingControls
              meetingId={selectedMeeting.id}
              onProcessed={handleRecordingProcessed}
            />

            {/* AI Report Panel */}
            <RecordingReportPanel
              meeting={selectedMeeting}
              onTasksInjected={() => fetchMeetings()}
            />
          </div>
        )}

        {/* Meeting list */}
        {isLoading ? (
          <p className="text-gray-500 text-center py-8">Carregando...</p>
        ) : (
          <MeetingList
            meetings={meetings}
            onDelete={handleDelete}
            onSelect={handleSelectMeeting}
          />
        )}
      </div>
    </>
  );
}
