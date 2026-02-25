import React, { useState, useRef, useEffect } from 'react';
import { Layout, Video, MessageSquare, ShieldCheck, ChevronRight, Lock, Zap, UserPlus, X, KeyRound, ArrowLeft, Send, MessageCircle, CheckCircle, Star, Building2, Rocket } from 'lucide-react';
import { User } from '../types';

interface LandingPageProps {
  onLoginSuccess: (user: User) => void;
  onRegister: (name: string, email: string, pass: string, company: string) => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onLoginSuccess, onRegister }) => {
  const [showModal, setShowModal] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  
  // Login State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Register State
  const [regName, setRegName] = useState('');
  const [regCompany, setRegCompany] = useState('');

  // Forgot Password State
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1); // 1: Email/OldPass, 2: PIN, 3: NewPass
  const [resetPin, setResetPin] = useState('');
  const [lastRememberedPass, setLastRememberedPass] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Support Chat State
  const [isSupportOpen, setIsSupportOpen] = useState(false);
  const [supportInput, setSupportInput] = useState('');
  const [supportMessages, setSupportMessages] = useState<{text: string, isUser: boolean}[]>([
      { text: "Olá! Bem-vindo ao Task 360.co. Como posso ajudar você hoje?", isUser: false }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [supportMessages, isSupportOpen]);

  const handleSupportSend = () => {
      if (!supportInput.trim()) return;
      
      const userMsg = supportInput;
      setSupportMessages(prev => [...prev, { text: userMsg, isUser: true }]);
      setSupportInput('');

      // Simulação de resposta automática
      setTimeout(() => {
          setSupportMessages(prev => [...prev, { 
              text: "Obrigado pelo contato! Para um atendimento mais rápido e personalizado, por favor clique no botão do WhatsApp abaixo para falar com um atendente humano.", 
              isUser: false 
          }]);
      }, 1000);
  };

  const scrollToPricing = () => {
    document.getElementById('pricing')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (isForgotMode) {
        handleForgotSubmit();
        return;
    }

    if (isLoginMode) {
        setIsLoading(true);
        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });
            
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                throw new Error("Erro de servidor (500). Tente novamente.");
            }

            if (response.ok && data.success) {
                onLoginSuccess(data.user);
            } else {
                setError(data.error || 'Credenciais inválidas.');
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || 'Erro de conexão com o servidor.');
        } finally {
            setIsLoading(false);
        }
    } else {
        if (!regName || !email || !password || !regCompany) {
            setError('Preencha todos os campos.');
            return;
        }
        
        const companyNormalized = regCompany.trim().toLowerCase();
        const emailNormalized = email.trim().toLowerCase();
        const forbiddenNames = ['ecom360', 'ecom 360', 'task360', 'task 360'];
        
        if (forbiddenNames.some(name => companyNormalized.includes(name)) || emailNormalized.endsWith('@ecom360.co')) {
            setError('Registro restrito para este domínio/empresa.');
            return;
        }

        onRegister(regName, email, password, regCompany);
    }
  };

  const handleForgotSubmit = async () => {
      setError('');
      setSuccessMsg('');
      setIsLoading(true);

      try {
        if (forgotStep === 1) {
            // Request PIN
            if (!email) {
                setError('Digite seu e-mail.');
                setIsLoading(false);
                return;
            }
            const res = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await res.json();
            if (data.success) {
                setForgotStep(2);
                setSuccessMsg('Código PIN enviado (Check Console se modo Demo).');
            } else {
                setError(data.error || 'Erro ao solicitar reset.');
            }

        } else if (forgotStep === 2) {
            if (resetPin.length < 6) {
                setError('O PIN deve ter 6 dígitos.');
                setIsLoading(false);
                return;
            }
            setForgotStep(3);

        } else if (forgotStep === 3) {
            // Confirm Reset
            if (!newPassword) {
                setError('Digite a nova senha.');
                setIsLoading(false);
                return;
            }
            const res = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, pin: resetPin, newPassword })
            });
            const data = await res.json();
            if (data.success) {
                setSuccessMsg('Senha alterada com sucesso! Faça login.');
                setTimeout(() => {
                    setIsForgotMode(false);
                    setForgotStep(1);
                    setIsLoginMode(true);
                    setPassword(''); // Clear fields
                    setResetPin('');
                    setNewPassword('');
                }, 2000);
            } else {
                setError(data.error || 'Erro ao redefinir senha.');
            }
        }
      } catch (err) {
          setError('Erro de conexão.');
      } finally {
          setIsLoading(false);
      }
  };

  const openModal = (mode: 'LOGIN' | 'REGISTER') => {
      setIsLoginMode(mode === 'LOGIN');
      setIsForgotMode(false);
      setForgotStep(1);
      setError('');
      setSuccessMsg('');
      setShowModal(true);
  };

  const renderForgotForm = () => (
    <div className="space-y-5">
        {forgotStep === 1 && (
            <div className="space-y-4 animate-fade-in">
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">E-mail Cadastrado</label>
                    <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                        placeholder="seu@email.com"
                        autoFocus
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Última Senha (que você lembra)</label>
                    <input 
                        type="password" 
                        value={lastRememberedPass}
                        onChange={(e) => setLastRememberedPass(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                        placeholder="Opcional"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Usamos isso apenas para validar sua identidade (opcional).</p>
                </div>
                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-gradient-to-r from-teal-600 to-emerald-600 text-white font-bold py-3 rounded-xl hover:shadow-lg hover:shadow-teal-500/30 transition-all flex justify-center mt-4"
                >
                    {isLoading ? 'Enviando...' : 'Enviar Código de Confirmação'}
                </button>
            </div>
        )}

        {forgotStep === 2 && (
            <div className="space-y-4 animate-fade-in">
                <div className="text-center mb-4">
                    <div className="text-sm text-slate-600">Enviamos um código para</div>
                    <div className="font-bold text-teal-700">{email}</div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Código PIN (6 dígitos)</label>
                    <input 
                        type="text" 
                        value={resetPin}
                        onChange={(e) => setResetPin(e.target.value.replace(/\D/g,'').slice(0,6))}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-bold text-center tracking-[0.5em] text-xl focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        placeholder="000000"
                        autoFocus
                    />
                </div>
                <button 
                    type="submit"
                    disabled={isLoading || resetPin.length < 6}
                    className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition-all flex justify-center mt-4 disabled:opacity-50"
                >
                    {isLoading ? 'Verificando...' : 'Validar PIN'}
                </button>
                <div className="text-center">
                    <button type="button" onClick={() => setForgotStep(1)} className="text-xs text-slate-500 hover:text-teal-600 hover:underline">Reenviar código</button>
                </div>
            </div>
        )}

        {forgotStep === 3 && (
            <div className="space-y-4 animate-fade-in">
                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Nova Senha</label>
                    <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none transition-all"
                        placeholder="Nova senha segura"
                        autoFocus
                    />
                </div>
                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-teal-600 text-white font-bold py-3 rounded-xl hover:bg-teal-700 transition-all flex justify-center mt-4"
                >
                    {isLoading ? 'Salvando...' : 'Redefinir Senha'}
                </button>
            </div>
        )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f9fafb] text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900 relative">
      {/* Navbar Colorful */}
      <nav className="fixed top-0 w-full bg-white/80 backdrop-blur-md z-40 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-teal-500/30">3</div>
            <span className="font-bold text-xl tracking-tight text-slate-800">Task 360.co</span>
          </div>
          <div className="flex gap-4 items-center">
            <button 
                onClick={scrollToPricing}
                className="hidden md:flex px-4 py-2 text-sm font-bold text-slate-600 hover:text-teal-600 transition-all cursor-pointer"
            >
                Planos
            </button>
            <button 
                onClick={() => openModal('LOGIN')}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg font-bold text-sm hover:bg-slate-800 transition-all flex items-center gap-2 shadow-md"
            >
                <Lock size={14} /> Entrar
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section Vibrant (Shortened to fit style) */}
      <header className="pt-32 pb-16 px-6 relative overflow-hidden">
        <div className="absolute top-20 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-teal-200/20 rounded-full blur-3xl -z-10"></div>
        <div className="max-w-4xl mx-auto text-center space-y-6 animate-fade-in">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-teal-100 bg-teal-50 text-xs font-bold uppercase tracking-wider text-teal-700 shadow-sm">
            <Zap size={12} fill="currentColor" /> Sistema Operacional v2.5
          </div>
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Gestão inteligente.<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-emerald-600">Performance máxima.</span>
          </h1>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button onClick={() => openModal('REGISTER')} className="w-full sm:w-auto px-8 py-3 bg-teal-600 text-white rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
              Começar Agora <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Feature Cards - Restoring Image 1 Design */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-3 gap-6">
                {/* Card 1: Kanban Flexível (Orange) */}
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-orange-50 rounded-xl flex items-center justify-center text-orange-500 mb-6 group-hover:scale-105 transition-transform">
                        <Layout size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Kanban Flexível</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Gerencie projetos com colunas personalizáveis, visualização em lista ou quadro, e sincronização automática de datas com o Google Agenda.
                    </p>
                </div>

                {/* Card 2: Reuniões com IA (Teal/Green) */}
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-teal-50 rounded-xl flex items-center justify-center text-teal-500 mb-6 group-hover:scale-105 transition-transform">
                        <Video size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Reuniões com IA</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Um copiloto de IA que ouve, transcreve e gera atas de reunião automaticamente, extraindo decisões e criando tarefas no Kanban em tempo real.
                    </p>
                </div>

                {/* Card 3: Chat Integrado (Blue) */}
                <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                    <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 mb-6 group-hover:scale-105 transition-transform">
                        <MessageSquare size={24} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-3">Chat Integrado</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        Comunicação segura e focada. Converse com sua equipe ou peça ajuda ao assistente de IA integrado para tirar dúvidas operacionais.
                    </p>
                </div>
            </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white border-t border-slate-100 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
             <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">Escolha seu Plano</h2>
             <p className="text-slate-500 max-w-2xl mx-auto">Soluções flexíveis que crescem com sua empresa.</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
              
              {/* Plan 1: Premium (Focus) */}
              <div className="bg-slate-900 p-10 rounded-3xl border border-slate-800 shadow-2xl relative flex flex-col text-white transform hover:scale-[1.01] transition-transform">
                  <div className="absolute top-0 right-0 bg-teal-500 text-white text-xs font-bold px-4 py-1.5 rounded-bl-xl rounded-tr-3xl uppercase tracking-wide">Mais Popular</div>
                  <div className="flex items-center gap-2 mb-3">
                     <Rocket size={24} className="text-teal-400" />
                     <h3 className="text-2xl font-bold text-white">Premium</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-5xl font-extrabold text-teal-400">€5,00</span>
                      <span className="text-slate-400 font-medium">/mês</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-6 pb-6 border-b border-slate-700">
                    Acesso completo para o gestor.<br/>
                    <span className="text-teal-200 font-bold">+ €3,00</span> por cada usuário adicional.
                  </p>

                  <ul className="space-y-5 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={20} className="text-teal-400 shrink-0"/> <strong>Projetos Ilimitados</strong></li>
                      <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={20} className="text-teal-400 shrink-0"/> IA Copilot de Reuniões</li>
                      <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={20} className="text-teal-400 shrink-0"/> Kanban Avançado & Automações</li>
                      <li className="flex items-center gap-3 text-slate-300"><CheckCircle size={20} className="text-teal-400 shrink-0"/> Armazenamento Seguro</li>
                  </ul>
                  <button onClick={() => openModal('REGISTER')} className="w-full py-4 bg-teal-600 text-white font-bold text-lg rounded-xl hover:bg-teal-700 transition-colors shadow-lg shadow-teal-900/50">
                      Assinar Premium
                  </button>
              </div>

              {/* Plan 2: Custom / Sob Medida */}
              <div className="bg-white p-10 rounded-3xl border border-slate-200 hover:border-teal-200 hover:shadow-xl transition-all relative flex flex-col">
                  <div className="flex items-center gap-2 mb-3">
                     <Building2 size={24} className="text-slate-700" />
                     <h3 className="text-2xl font-bold text-slate-900">Sob Medida</h3>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-3xl font-bold text-slate-900">Personalizado</span>
                  </div>
                  <p className="text-slate-500 text-sm mb-6 pb-6 border-b border-slate-100">
                    Precisa de algo único? Criamos um sistema de gestão e tarefas exatamente como você preferir.
                  </p>

                  <ul className="space-y-5 mb-8 flex-1">
                      <li className="flex items-center gap-3 text-slate-600"><CheckCircle size={20} className="text-teal-500 shrink-0"/> White-label (Sua Marca)</li>
                      <li className="flex items-center gap-3 text-slate-600"><CheckCircle size={20} className="text-teal-500 shrink-0"/> Funcionalidades Exclusivas</li>
                      <li className="flex items-center gap-3 text-slate-600"><CheckCircle size={20} className="text-teal-500 shrink-0"/> Integrações via API</li>
                      <li className="flex items-center gap-3 text-slate-600"><CheckCircle size={20} className="text-teal-500 shrink-0"/> Suporte & Consultoria Dedicada</li>
                  </ul>
                  
                  <a 
                    href="https://wa.me/5511999999999" 
                    target="_blank" 
                    rel="noreferrer"
                    className="w-full py-4 bg-slate-100 text-slate-800 font-bold text-lg rounded-xl hover:bg-slate-200 transition-colors flex items-center justify-center gap-2"
                  >
                      <MessageCircle size={20} /> Falar com Consultor
                  </a>
              </div>
          </div>
        </div>
      </section>

      {/* Security Section - Restoring Image 2 Design */}
      <section className="py-16 px-6">
          <div className="max-w-5xl mx-auto">
              <div className="bg-black rounded-3xl overflow-hidden relative text-center py-20 px-6">
                  {/* Subtle Hexagon-ish Grid Background Effect */}
                  <div className="absolute inset-0 opacity-10" style={{
                      backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
                      backgroundSize: '30px 30px'
                  }}></div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent"></div>

                  <div className="relative z-10 flex flex-col items-center max-w-2xl mx-auto space-y-6">
                      <div className="w-14 h-14 rounded-full border-2 border-teal-500/30 flex items-center justify-center text-teal-400 mb-2 shadow-[0_0_15px_rgba(45,212,191,0.3)]">
                          <ShieldCheck size={32} strokeWidth={1.5} />
                      </div>
                      
                      <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                          Segurança Enterprise-Grade
                      </h2>
                      
                      <p className="text-gray-400 text-base md:text-lg leading-relaxed font-light">
                          Controle de acesso baseado em funções (RBAC), criptografia de ponta a ponta e conformidade com padrões globais de proteção de dados.
                      </p>
                  </div>
              </div>
          </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 py-12 border-t border-slate-800 text-slate-400 mt-12">
          <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                  <div className="w-4 h-4 bg-teal-500 rounded-sm"></div>
                  Task 360.co
              </div>
              <div className="flex gap-6 text-sm font-medium">
                  <span className="hover:text-teal-400 cursor-pointer transition-colors">© 2024 Ecom360</span>
                  <span className="hover:text-teal-400 cursor-pointer transition-colors">Privacidade</span>
                  <span className="hover:text-teal-400 cursor-pointer transition-colors">Termos</span>
              </div>
          </div>
      </footer>

      {/* Support Chat Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end pointer-events-none">
           {isSupportOpen && (
             <div className="bg-white rounded-2xl shadow-2xl w-80 mb-4 overflow-hidden border border-slate-200 animate-fade-in pointer-events-auto flex flex-col h-[400px]">
                <div className="bg-teal-600 p-4 text-white flex justify-between items-center shrink-0">
                   <div className="flex items-center gap-2">
                       <MessageSquare size={18} />
                       <span className="font-bold">Suporte Task 360</span>
                   </div>
                   <button onClick={() => setIsSupportOpen(false)} className="hover:bg-teal-700 p-1 rounded transition-colors"><X size={16}/></button>
                </div>
                
                <div className="flex-1 p-4 overflow-y-auto bg-slate-50 space-y-3 custom-scrollbar">
                   {supportMessages.map((m, idx) => (
                       <div key={idx} className={`flex ${m.isUser ? 'justify-end' : 'justify-start'}`}>
                           <div className={`max-w-[85%] p-3 rounded-xl text-sm ${
                               m.isUser 
                               ? 'bg-teal-600 text-white rounded-tr-none' 
                               : 'bg-white border border-slate-200 text-slate-700 rounded-tl-none shadow-sm'
                           }`}>
                               {m.text}
                           </div>
                       </div>
                   ))}
                   <div ref={messagesEndRef} />
                   
                   {/* WhatsApp CTA Persistent */}
                   <div className="pt-2">
                       <a
                         href="https://wa.me/5511999999999" // Coloque o número real aqui
                         target="_blank"
                         rel="noreferrer"
                         className="block w-full bg-[#25D366] hover:bg-[#128C7E] text-white text-center py-2.5 rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
                       >
                         <MessageCircle size={18} /> Falar com Atendente
                       </a>
                       <p className="text-[10px] text-center text-slate-400 mt-2">Disponível em horário comercial</p>
                   </div>
                </div>

                {/* Input Area */}
                <div className="p-3 border-t border-slate-100 bg-white shrink-0">
                   <div className="flex gap-2">
                       <input 
                         value={supportInput}
                         onChange={(e) => setSupportInput(e.target.value)}
                         onKeyDown={(e) => e.key === 'Enter' && handleSupportSend()}
                         placeholder="Digite sua dúvida..." 
                         className="flex-1 bg-slate-100 border-none rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                       />
                       <button 
                         onClick={handleSupportSend}
                         className="bg-teal-600 text-white p-2 rounded-lg hover:bg-teal-700 transition-colors"
                       >
                           <Send size={16} />
                       </button>
                   </div>
                </div>
             </div>
           )}

           <button
             onClick={() => setIsSupportOpen(!isSupportOpen)}
             className="w-14 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-full shadow-lg shadow-teal-600/30 flex items-center justify-center transition-transform hover:scale-105 pointer-events-auto"
           >
             {isSupportOpen ? <X size={24} /> : <MessageSquare size={24} />}
           </button>
      </div>

      {/* Auth Modal - Colorful */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-fade-in flex flex-col max-h-[90vh] ring-1 ring-slate-200">
            
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-700 rounded-full transition-colors z-20">
                <X size={20} />
            </button>

            {/* Header com Cor */}
            <div className="bg-slate-50 pt-10 px-8 pb-6 text-center border-b border-slate-100">
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-white mb-4 shadow-lg shadow-teal-500/20 transition-all ${isForgotMode ? 'bg-orange-500' : 'bg-teal-600'}`}>
                    {isForgotMode ? <KeyRound size={28} /> : (isLoginMode ? <Lock size={28} /> : <UserPlus size={28} />)}
                </div>
                <h2 className="text-2xl font-bold text-slate-900">
                    {isForgotMode ? 'Recuperar Senha' : (isLoginMode ? 'Bem-vindo de volta' : 'Criar Conta')}
                </h2>
                <p className="text-slate-500 text-sm mt-1 font-medium">
                    {isForgotMode ? 'Siga as etapas para redefinir o acesso' : 'Acesse seu ambiente de produtividade'}
                </p>
            </div>

            {!isForgotMode ? (
                <>
                <div className="flex px-8 border-b border-slate-100">
                    <button 
                        onClick={() => { setIsLoginMode(true); setError(''); }}
                        className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${isLoginMode ? 'text-teal-700 border-teal-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                    >
                        Login
                    </button>
                    <button 
                        onClick={() => { setIsLoginMode(false); setError(''); }}
                        className={`flex-1 py-3 text-sm font-bold transition-all border-b-2 ${!isLoginMode ? 'text-teal-700 border-teal-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                    >
                        Cadastro
                    </button>
                </div>
                
                <form onSubmit={handleSubmit} className="p-8 space-y-5 overflow-y-auto">
                {error && (
                    <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2 border border-red-100">
                        <ShieldCheck size={14} /> {error}
                    </div>
                )}
                {successMsg && (
                     <div className="p-3 bg-green-50 text-green-700 text-xs font-bold rounded-lg flex items-center gap-2 border border-green-100">
                        <ShieldCheck size={14} /> {successMsg}
                    </div>
                )}

                {!isLoginMode && (
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Nome Completo</label>
                            <input 
                            type="text" 
                            value={regName}
                            onChange={(e) => setRegName(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                            placeholder="Ex: João Silva"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">Empresa</label>
                            <input 
                            type="text" 
                            value={regCompany}
                            onChange={(e) => setRegCompany(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                            placeholder="Sua Empresa"
                            />
                        </div>
                    </div>
                )}

                <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide mb-1.5">E-mail</label>
                    <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                    placeholder="nome@empresa.com"
                    />
                </div>

                <div>
                    <div className="mb-1.5">
                        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">Senha</label>
                    </div>
                    <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-all placeholder:text-slate-400"
                    placeholder="••••••••"
                    />
                    {isLoginMode && (
                        <div className="flex justify-end mt-2">
                            <button type="button" onClick={() => setIsForgotMode(true)} className="text-xs font-bold text-teal-600 hover:text-teal-800 hover:underline">
                                Esqueci a senha
                            </button>
                        </div>
                    )}
                </div>
                
                <button 
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-teal-600 text-white font-bold py-4 rounded-xl hover:bg-teal-700 transition-all shadow-lg shadow-teal-600/20 mt-2 disabled:opacity-70 flex justify-center"
                >
                    {isLoading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> : (isLoginMode ? 'Entrar no Sistema' : 'Criar Conta Gratuita')}
                </button>
                </form>
                </>
            ) : (
                <div className="p-8 relative">
                    <button onClick={() => { setIsForgotMode(false); setForgotStep(1); }} className="absolute top-[-20px] left-8 flex items-center gap-1 text-xs font-bold text-slate-400 hover:text-slate-700">
                        <ArrowLeft size={12} /> Voltar
                    </button>
                    {error && (
                        <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-lg flex items-center gap-2 border border-red-100 mb-4">
                            <ShieldCheck size={14} /> {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="p-3 bg-green-50 text-green-700 text-xs font-bold rounded-lg flex items-center gap-2 border border-green-100 mb-4">
                            <ShieldCheck size={14} /> {successMsg}
                        </div>
                    )}
                    {renderForgotForm()}
                </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;