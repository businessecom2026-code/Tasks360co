import React, { useState } from 'react';
import { Layout, Video, MessageSquare, ShieldCheck, ChevronRight, Lock, BrainCircuit, Zap, CheckCircle2 } from 'lucide-react';

interface LandingPageProps {
  onLoginSuccess: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess }) => {
  const [showLogin, setShowLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === 'admin@ecom360.co' && password === 'Admin2026*') {
      onLoginSuccess();
    } else {
      setError('Credenciais inválidas. Tente novamente.');
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans selection:bg-teal-100">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-40 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-600/20">360</div>
            <span className="font-bold text-xl tracking-tight text-slate-900">Task 360.co</span>
          </div>
          <button 
            onClick={() => setShowLogin(true)}
            className="px-6 py-2.5 bg-slate-900 text-white rounded-full font-medium text-sm hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
          >
            <Lock size={16} /> Acessar Sistema
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-teal-50 rounded-full blur-3xl opacity-50 -z-10"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-50 -z-10"></div>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-100 text-teal-700 text-xs font-bold uppercase tracking-wider animate-fade-in">
            <Zap size={12} fill="currentColor" /> Novo: Módulo de IA Generativa 2.5
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            O Sistema Operacional da <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-blue-600">Alta Performance</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Task 360.co centraliza gestão de tarefas, reuniões inteligentes com transcrição em tempo real e comunicação de equipe em uma única plataforma segura.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => setShowLogin(true)}
              className="w-full sm:w-auto px-8 py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 transition-all shadow-xl shadow-teal-600/20 flex items-center justify-center gap-2"
            >
              Começar Agora <ChevronRight size={20} />
            </button>
            <button className="w-full sm:w-auto px-8 py-4 bg-white text-slate-700 border border-gray-200 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2">
              Ver Demo
            </button>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-20 bg-slate-50 border-t border-slate-100">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Tudo o que sua equipe precisa</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Elimine a fragmentação de ferramentas. O Task 360 integra os três pilares fundamentais da produtividade.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                <Layout size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Kanban Flexível</h3>
              <p className="text-slate-500 leading-relaxed">
                Gerencie projetos com colunas personalizáveis, visualização em lista ou quadro, e sincronização automática de datas com o Google Agenda.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit size={100} />
              </div>
              <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 mb-6 group-hover:scale-110 transition-transform">
                <Video size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Reuniões com IA</h3>
              <p className="text-slate-500 leading-relaxed">
                Um copiloto de IA que ouve, transcreve e gera atas de reunião automaticamente, extraindo decisões e criando tarefas no Kanban em tempo real.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">Chat Integrado</h3>
              <p className="text-slate-500 leading-relaxed">
                Comunicação segura e focada. Converse com sua equipe ou peça ajuda ao assistente de IA integrado para tirar dúvidas operacionais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-6 bg-white border-t border-gray-100">
        <div className="max-w-4xl mx-auto bg-slate-900 rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <ShieldCheck size={48} className="mx-auto text-teal-400 mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6">Segurança Enterprise-Grade</h2>
            <p className="text-slate-300 mb-8 max-w-2xl mx-auto text-lg">
                Controle de acesso baseado em funções (RBAC), criptografia de ponta a ponta e conformidade com padrões globais de proteção de dados.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-slate-400">
                <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-500" /> Criptografia AES-256</span>
                <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-500" /> GDPR Ready</span>
                <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-500" /> 99.9% Uptime</span>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-xs">360</div>
                <span className="font-bold text-slate-700">Task 360.co</span>
              </div>
              <p className="text-slate-400 text-sm">© 2024 Ecom360.co. Todos os direitos reservados.</p>
          </div>
      </footer>

      {/* Login Modal */}
      {showLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setShowLogin(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in">
            <div className="bg-slate-900 p-8 text-center">
                <div className="w-12 h-12 bg-teal-500 rounded-xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-teal-500/30">
                    <Lock size={24} />
                </div>
                <h2 className="text-2xl font-bold text-white">Acesso Restrito</h2>
                <p className="text-slate-400 text-sm mt-2">Área administrativa Ecom360.co</p>
            </div>
            
            <form onSubmit={handleLogin} className="p-8 space-y-5">
              {error && (
                <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100 flex items-center gap-2">
                    <ShieldCheck size={16} /> {error}
                </div>
              )}
              
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">E-mail Corporativo</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="admin@ecom360.co"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Senha de Acesso</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 active:scale-[0.98]"
              >
                Entrar no Sistema
              </button>

              <div className="text-center">
                  <button type="button" onClick={() => setShowLogin(false)} className="text-sm text-slate-400 hover:text-slate-600">
                      Cancelar
                  </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
