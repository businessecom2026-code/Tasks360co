import React, { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, PhoneOff, FileText, CheckCircle, Activity, Download, BrainCircuit, List, CalendarCheck } from 'lucide-react';
import * as d3 from 'd3';
import { GeminiLiveClient } from '../services/liveClient';
import { Task, TaskStatus, Language } from '../types';
import { GoogleGenAI, Type } from '@google/genai';
import { translations } from '../i18n';

interface MeetingRoomProps {
  apiKey: string;
  onClose: () => void;
  onAddTask: (task: Task) => void;
  language: Language;
}

interface MeetingReport {
  agenda: string[];
  decisions: string[];
  actionItems: { task: string; assignee: string }[];
}

const MeetingRoom: React.FC<MeetingRoomProps> = ({ apiKey, onClose, onAddTask, language }) => {
  const t = translations[language].meetings;
  const [isActive, setIsActive] = useState(false);
  const [transcripts, setTranscripts] = useState<{ text: string; isUser: boolean }[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<MeetingReport | null>(null);
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);
  
  const vizRef = useRef<SVGSVGElement>(null);
  const liveClientRef = useRef<GeminiLiveClient | null>(null);

  useEffect(() => {
    // D3 Visualization Setup (Fake Waveform Animation)
    if (!vizRef.current) return;
    
    const svg = d3.select(vizRef.current);
    const width = 60;
    const height = 40;
    
    // Clear previous
    svg.selectAll('*').remove();

    if (isActive) {
        const data = Array.from({ length: 5 }, () => Math.random() * 20 + 5);
        svg.selectAll('rect')
           .data(data)
           .enter()
           .append('rect')
           .attr('x', (d, i) => i * 12)
           .attr('y', d => (height - d) / 2)
           .attr('width', 8)
           .attr('height', d => d)
           .attr('rx', 4)
           .attr('fill', '#0d9488') // Teal-600
           .append('animate')
           .attr('attributeName', 'height')
           .attr('values', (d) => `${d};${d*0.5};${d*1.5};${d}`)
           .attr('dur', '0.5s')
           .attr('repeatCount', 'indefinite');
    }
  }, [isActive]);

  const toggleSession = async () => {
    if (isActive) {
        // Stop
        await liveClientRef.current?.disconnect();
        liveClientRef.current = null;
        setIsActive(false);
        // Automatically generate report when stopping
        if (transcripts.length > 0) {
            generateReport();
        }
    } else {
        // Start
        if (!apiKey) {
            setError("API Key missing");
            return;
        }
        setError(null);
        setReport(null);
        
        try {
            const client = new GeminiLiveClient({
                apiKey,
                language,
                onAudioData: (data) => {
                    // Audio visualization hook could go here
                },
                onTranscription: (text, isUser) => {
                    setTranscripts(prev => [...prev, { text, isUser }]);
                },
                onClose: () => {
                    setIsActive(false);
                },
                onToolCall: async (name, args) => {
                    if (name === 'update_kanban_board') {
                        const newTask: Task = {
                            id: Math.random().toString(36).substr(2, 9),
                            title: args.title,
                            status: args.column as TaskStatus || TaskStatus.PENDING,
                            description: 'Created by AI during meeting',
                            dueDate: new Date().toISOString().split('T')[0]
                        };
                        onAddTask(newTask);
                        return `${t.taskCreated}: "${args.title}"`;
                    }
                    return null;
                }
            });
            
            await client.connect();
            liveClientRef.current = client;
            setIsActive(true);
        } catch (e: any) {
            setError(e.message || "Failed to connect");
            setIsActive(false);
        }
    }
  };

  const generateReport = async () => {
      if (transcripts.length === 0) return;
      setIsGeneratingReport(true);
      
      try {
          const ai = new GoogleGenAI({ apiKey });
          const fullTranscript = transcripts.map(t => `${t.isUser ? 'User' : 'AI'}: ${t.text}`).join('\n');
          
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Analyze this meeting transcript in ${language}. Filter out small talk.
              Transcript:
              ${fullTranscript}
              
              Output a JSON with:
              - agenda: list of topics discussed
              - decisions: list of decisions made
              - actionItems: list of objects { task: string, assignee: string }`,
              config: {
                  responseMimeType: 'application/json',
                  responseSchema: {
                      type: Type.OBJECT,
                      properties: {
                          agenda: { type: Type.ARRAY, items: { type: Type.STRING } },
                          decisions: { type: Type.ARRAY, items: { type: Type.STRING } },
                          actionItems: { 
                              type: Type.ARRAY, 
                              items: { 
                                  type: Type.OBJECT, 
                                  properties: {
                                      task: { type: Type.STRING },
                                      assignee: { type: Type.STRING }
                                  }
                              } 
                          }
                      }
                  }
              }
          });
          
          if (response.text) {
              setReport(JSON.parse(response.text));
          }
      } catch (e) {
          console.error("Report generation failed", e);
      } finally {
          setIsGeneratingReport(false);
      }
  };
  
  // Auto-disconnect on unmount
  useEffect(() => {
      return () => {
          liveClientRef.current?.disconnect();
      }
  }, []);

  const downloadReportText = () => {
      if (!report) return;
      const content = `
${t.reportTitle.toUpperCase()}
Date: ${new Date().toLocaleDateString()}

${t.agenda.toUpperCase()}:
${report.agenda.map(a => `- ${a}`).join('\n')}

${t.decisions.toUpperCase()}:
${report.decisions.map(d => `- ${d}`).join('\n')}

${t.actionItems.toUpperCase()}:
${report.actionItems.map(a => `- [ ] ${a.task} (@${a.assignee})`).join('\n')}

FULL TRANSCRIPT:
${transcripts.map(t => `${t.isUser ? 'User' : 'AI'}: ${t.text}`).join('\n')}
      `;
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meeting_report.txt';
      a.click();
  };

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden flex flex-col h-[600px] w-full max-w-5xl mx-auto my-8 animate-fade-in relative">
      {/* Header */}
      <div className="bg-slate-900 p-4 flex justify-between items-center text-white">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-slate-800 rounded-lg border border-slate-700">
            {isActive ? (
                <svg width="24" height="24" viewBox="0 0 60 40" ref={vizRef}></svg>
            ) : (
                <Activity size={24} className="text-teal-500" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-lg">{t.residentTitle}</h3>
            <p className="text-xs text-gray-400">
                {isActive ? t.listening : t.ready}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
            <span className="text-xs bg-slate-800 px-3 py-1 rounded-full text-teal-300 border border-slate-700">
                Integration: Google Meet
            </span>
            <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">{t.close}</button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
          {/* Left: Transcript / Live View */}
          <div className={`flex-1 flex flex-col border-r border-gray-100 ${report ? 'w-1/2' : 'w-full'}`}>
            <div className="bg-gray-50 p-3 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide flex justify-between">
                <span>{t.transcript}</span>
                {transcripts.length > 0 && <span className="text-teal-600">{transcripts.length} {t.turns}</span>}
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-white">
                {transcripts.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400 text-center p-8">
                        <BrainCircuit size={48} className="mb-4 text-teal-100" />
                        <p>{t.waiting}</p>
                        <p className="text-xs mt-2 max-w-xs">{t.waitingDesc}</p>
                    </div>
                )}
                {transcripts.map((t, idx) => (
                <div key={idx} className={`flex ${t.isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[85%] p-3 rounded-xl text-sm ${t.isUser ? 'bg-teal-600 text-white rounded-tr-none shadow-md' : 'bg-gray-100 border border-gray-200 text-gray-800 rounded-tl-none'}`}>
                    {t.text}
                    </div>
                </div>
                ))}
            </div>
          </div>

          {/* Right: Report View (Appears when report generated) */}
          {report && (
              <div className="w-1/2 flex flex-col bg-slate-50 animate-fade-in">
                  <div className="bg-white p-3 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase tracking-wide flex justify-between items-center">
                      <span>{t.reportTitle}</span>
                      <button onClick={downloadReportText} className="text-teal-600 hover:text-teal-800 flex items-center gap-1">
                          <Download size={14} /> {t.export}
                      </button>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                      <section>
                          <h4 className="flex items-center gap-2 font-bold text-gray-800 mb-2">
                              <List size={16} className="text-teal-500" /> {t.agenda}
                          </h4>
                          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                              {report.agenda.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                      </section>
                      <section>
                          <h4 className="flex items-center gap-2 font-bold text-gray-800 mb-2">
                              <CheckCircle size={16} className="text-green-500" /> {t.decisions}
                          </h4>
                          <ul className="list-disc pl-5 text-sm text-gray-600 space-y-1">
                              {report.decisions.map((item, i) => <li key={i}>{item}</li>)}
                          </ul>
                      </section>
                      <section>
                          <h4 className="flex items-center gap-2 font-bold text-gray-800 mb-2">
                              <CalendarCheck size={16} className="text-orange-500" /> {t.actionItems}
                          </h4>
                          <div className="space-y-2">
                              {report.actionItems.map((item, i) => (
                                  <div key={i} className="bg-white p-3 rounded border border-gray-200 text-sm flex justify-between items-center shadow-sm">
                                      <span className="text-gray-700">{item.task}</span>
                                      <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-600 font-medium">
                                          @{item.assignee || t.unassigned}
                                      </span>
                                  </div>
                              ))}
                          </div>
                      </section>
                  </div>
              </div>
          )}
      </div>

      {/* Controls */}
      <div className="p-4 bg-white border-t border-gray-100 flex justify-center items-center gap-4 relative z-10">
        {error && <div className="absolute top-[-50px] bg-red-100 text-red-600 px-4 py-2 rounded text-sm shadow">{error}</div>}
        
        {isGeneratingReport ? (
             <div className="flex items-center gap-2 text-teal-600 font-medium animate-pulse">
                 <BrainCircuit size={20} /> {t.generating}
             </div>
        ) : (
            <button 
            onClick={toggleSession}
            className={`h-14 px-8 rounded-full flex items-center gap-3 font-semibold transition-all shadow-lg ${isActive ? 'bg-red-500 hover:bg-red-600 text-white' : 'bg-slate-900 hover:bg-black text-white'}`}
            >
            {isActive ? (
                <>
                    <PhoneOff size={24} /> {t.endProcess}
                </>
            ) : (
                <>
                    <Mic size={24} /> {t.startBtn}
                </>
            )}
            </button>
        )}
      </div>
    </div>
  );
};

export default MeetingRoom;