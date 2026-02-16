import React, { useState } from 'react';
import { Layout, Video, MessageSquare, ShieldCheck, ChevronRight, Lock, BrainCircuit, Zap, CheckCircle2, UserPlus } from 'lucide-react';
import { User } from '../types';

interface LandingPageProps {
  onLoginSuccess: (user: User) => void;
  onRegister: (name: string, email: string, pass: string, company: string) => void;
  users: User[];
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess, onRegister, users }) => {
  const [showModal, setShowModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Register State
  const [regName, setRegName] = useState('');
  const [regCompany, setRegCompany] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isLoginMode) {
        // Login Logic
        const foundUser = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
        if (foundUser) {
            onLoginSuccess(foundUser);
        } else {
            setError('Credenciais inválidas. Verifique e-mail e senha.');
        }
    } else {
        // Registration Logic
        if (!regName || !email || !password || !regCompany) {
            setError('Todos os campos são obrigatórios.');
            return;
        }
        if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
            setError('Este e-mail já está cadastrado.');
            return;
        }
        onRegister(regName, email, password, regCompany);
    }
  };

  const openModal = (mode: 'LOGIN' | 'REGISTER') => {
      setIsLoginMode(mode === 'LOGIN');
      setError('');
      setShowModal(true);
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans selection:bg-teal-100">
      {/* Navbar */}
      <nav className="fixed top-0 w-full bg-white/95 backdrop-blur-md z-40 border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-teal-600/20">360</div>
            <span className="font-bold text-xl tracking-tight text-black">Task 360.co</span>
          </div>
          <div className="flex gap-3">
            <button 
                onClick={() => openModal('REGISTER')}
                className="hidden md:flex px-5 py-2.5 text-slate-700 font-bold text-sm hover:bg-slate-100 rounded-full transition-all"
            >
                Criar Conta
            </button>
            <button 
                onClick={() => openModal('LOGIN')}
                className="px-6 py-2.5 bg-black text-white rounded-full font-bold text-sm hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl flex items-center gap-2"
            >
                <Lock size={16} /> Acessar
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="pt-32 pb-20 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/3 w-[800px] h-[800px] bg-teal-50 rounded-full blur-3xl opacity-50 -z-10"></div>
        <div className="absolute bottom-0 left-0 translate-y-1/3 -translate-x-1/3 w-[600px] h-[600px] bg-blue-50 rounded-full blur-3xl opacity-50 -z-10"></div>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-bold uppercase tracking-wider animate-fade-in">
            <Zap size={12} fill="currentColor" /> Novo: Módulo de IA Generativa 2.5
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-black leading-[1.1]">
            O Sistema Operacional da <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-blue-700">Alta Performance</span>
          </h1>
          <p className="text-xl text-slate-800 max-w-2xl mx-auto leading-relaxed font-medium">
            Task 360.co centraliza gestão de tarefas, reuniões inteligentes com transcrição em tempo real e comunicação de equipe em uma única plataforma segura.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button 
              onClick={() => openModal('REGISTER')}
              className="w-full sm:w-auto px-8 py-4 bg-teal-600 text-white rounded-xl font-bold text-lg hover:bg-teal-700 transition-all shadow-xl shadow-teal-600/20 flex items-center justify-center gap-2"
            >
              Começar Agora <ChevronRight size={20} />
            </button>
            <button 
                onClick={() => openModal('LOGIN')}
                className="w-full sm:w-auto px-8 py-4 bg-white text-black border border-gray-300 rounded-xl font-bold text-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
            >
              Fazer Login
            </button>
          </div>
        </div>
      </header>

      {/* Features Grid */}
      <section className="py-20 bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-black mb-4">Tudo o que sua equipe precisa</h2>
            <p className="text-slate-700 font-medium max-w-2xl mx-auto">Elimine a fragmentação de ferramentas. O Task 360 integra os três pilares fundamentais da produtividade.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-orange-50 rounded-xl flex items-center justify-center text-orange-600 mb-6 group-hover:scale-110 transition-transform">
                <Layout size={28} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Kanban Flexível</h3>
              <p className="text-slate-700 leading-relaxed">
                Gerencie projetos com colunas personalizáveis, visualização em lista ou quadro, e sincronização automática de datas com o Google Agenda.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10">
                <BrainCircuit size={100} />
              </div>
              <div className="w-14 h-14 bg-teal-50 rounded-xl flex items-center justify-center text-teal-600 mb-6 group-hover:scale-110 transition-transform">
                <Video size={28} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Reuniões com IA</h3>
              <p className="text-slate-700 leading-relaxed">
                Um copiloto de IA que ouve, transcreve e gera atas de reunião automaticamente, extraindo decisões e criando tarefas no Kanban em tempo real.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
              <div className="w-14 h-14 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 mb-6 group-hover:scale-110 transition-transform">
                <MessageSquare size={28} />
              </div>
              <h3 className="text-xl font-bold text-black mb-3">Chat Integrado</h3>
              <p className="text-slate-700 leading-relaxed">
                Comunicação segura e focada. Converse com sua equipe ou peça ajuda ao assistente de IA integrado para tirar dúvidas operacionais.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-20 px-6 bg-white border-t border-gray-200">
        <div className="max-w-4xl mx-auto bg-black rounded-3xl p-10 md:p-16 text-center text-white relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10"></div>
            <ShieldCheck size={48} className="mx-auto text-teal-400 mb-6" />
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">Segurança Enterprise-Grade</h2>
            <p className="text-slate-200 mb-8 max-w-2xl mx-auto text-lg">
                Controle de acesso baseado em funções (RBAC), criptografia de ponta a ponta e conformidade com padrões globais de proteção de dados.
            </p>
            <div className="flex flex-wrap justify-center gap-4 text-sm font-medium text-slate-300">
                <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-400" /> Criptografia AES-256</span>
                <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-400" /> GDPR Ready</span>
                <span className="flex items-center gap-2"><CheckCircle2 size={16} className="text-teal-400" /> 99.9% Uptime</span>
            </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-50 py-12 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-6 text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-teal-600 flex items-center justify-center text-white font-bold text-xs">360</div>
                <span className="font-bold text-black">Task 360.co</span>
              </div>
              <p className="text-slate-600 text-sm">© 2024 Ecom360.co. Todos os direitos reservados.</p>
          </div>
      </footer>

      {/* Auth Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowModal(false)}></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="bg-black p-6 text-center shrink-0">
                <div className="w-12 h-12 bg-teal-500 rounded-xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-teal-500/30">
                    {isLoginMode ? <Lock size={24} /> : <UserPlus size={24} />}
                </div>
                <h2 className="text-2xl font-bold text-white">{isLoginMode ? 'Bem-vindo de volta' : 'Crie sua conta'}</h2>
                <p className="text-slate-300 text-sm mt-2">{isLoginMode ? 'Acesse seu ambiente de trabalho' : 'Comece a usar o Task 360.co hoje'}</p>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-gray-200">
                <button 
                    onClick={() => { setIsLoginMode(true); setError(''); }}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${isLoginMode ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50' : 'text-gray-600 hover:text-black hover:bg-gray-50'}`}
                >
                    Login
                </button>
                <button 
                    onClick={() => { setIsLoginMode(false); setError(''); }}
                    className={`flex-1 py-3 text-sm font-bold transition-colors ${!isLoginMode ? 'text-teal-700 border-b-2 border-teal-600 bg-teal-50' : 'text-gray-600 hover:text-black hover:bg-gray-50'}`}
                >
                    Cadastro
                </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-8 space-y-4 overflow-y-auto">
              {error && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200 flex items-center gap-2 animate-pulse font-medium">
                    <ShieldCheck size={16} /> {error}
                </div>
              )}

              {!isLoginMode && (
                <div>
                    <label className="block text-sm font-bold text-black mb-1">Nome Completo</label>
                    <input 
                    type="text" 
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                    placeholder="João Silva"
                    />
                </div>
              )}
              
              {!isLoginMode && (
                <div>
                    <label className="block text-sm font-bold text-black mb-1">Nome da Empresa</label>
                    <input 
                    type="text" 
                    value={regCompany}
                    onChange={(e) => setRegCompany(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                    placeholder="Sua Empresa Ltda"
                    />
                </div>
              )}

              <div>
                <label className="block text-sm font-bold text-black mb-1">E-mail Corporativo</label>
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                  placeholder="voce@empresa.com"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-black mb-1">Senha</label>
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-black focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-gray-400"
                  placeholder="••••••••"
                />
              </div>

              <button 
                type="submit"
                className="w-full bg-teal-600 text-white font-bold py-3.5 rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 active:scale-[0.98] mt-4"
              >
                {isLoginMode ? 'Entrar no Sistema' : 'Criar Conta Grátis'}
              </button>

              <div className="text-center pt-2">
                  <button type="button" onClick={() => setShowModal(false)} className="text-sm text-gray-500 hover:text-black font-medium">
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