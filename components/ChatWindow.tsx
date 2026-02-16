import React, { useState, useEffect } from 'react';
import { Send, Bot } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import { Language } from '../types';
import { translations } from '../i18n';

interface ChatWindowProps {
    apiKey: string;
    language: Language;
}

const ChatWindow: React.FC<ChatWindowProps> = ({ apiKey, language }) => {
  const t = translations[language].chat;
  const [messages, setMessages] = useState<{sender: 'user'|'bot', text: string}[]>([
      { sender: 'bot', text: t.welcome }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  // Reset chat welcome message when language changes
  useEffect(() => {
    setMessages([{ sender: 'bot', text: t.welcome }]);
  }, [language]);

  const sendMessage = async () => {
      if(!input.trim()) return;
      const userMsg = input;
      setMessages(prev => [...prev, { sender: 'user', text: userMsg }]);
      setInput('');
      setLoading(true);

      try {
          if (!apiKey) throw new Error("API Key required");
          const ai = new GoogleGenAI({ apiKey });
          const response = await ai.models.generateContent({
              model: 'gemini-3-flash-preview',
              contents: `Context: Task 360.co support. Language: ${language}. User asks: ${userMsg}`,
          });
          setMessages(prev => [...prev, { sender: 'bot', text: response.text || "Sorry, I couldn't process that." }]);
      } catch (error) {
          setMessages(prev => [...prev, { sender: 'bot', text: t.error }]);
      } finally {
          setLoading(false);
      }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow border border-gray-200 overflow-hidden">
      <div className="bg-teal-600 p-4 text-white font-bold flex items-center gap-2 shadow-md">
        <Bot size={20} />
        {t.header}
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.map((m, i) => (
            <div key={i} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[70%] p-3 rounded-lg text-sm font-medium ${m.sender === 'user' ? 'bg-teal-600 text-white shadow-md' : 'bg-white border border-gray-200 text-gray-900 shadow-sm'}`}>
                    {m.text}
                </div>
            </div>
        ))}
        {loading && <div className="text-xs text-gray-500 text-center font-medium">{t.typing}</div>}
      </div>

      <div className="p-4 border-t border-gray-200 flex gap-2 bg-white">
        <input 
            type="text" 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && sendMessage()}
            className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm text-black focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all placeholder:text-gray-400"
            placeholder={t.placeholder}
        />
        <button onClick={sendMessage} className="bg-teal-600 hover:bg-teal-700 text-white p-2 rounded-lg transition-colors">
            <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatWindow;