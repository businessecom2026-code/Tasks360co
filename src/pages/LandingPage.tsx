import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Columns3,
  Video,
  CreditCard,
  Zap,
  Shield,
  ArrowRight,
  Users,
  Globe,
} from 'lucide-react';

const features = [
  {
    icon: Columns3,
    title: 'Kanban Inteligente',
    description: 'Arraste e solte tarefas entre colunas com sincronização em tempo real e bloqueio otimista.',
    color: 'text-blue-400',
    bg: 'bg-blue-600/20',
  },
  {
    icon: Video,
    title: 'Atas com IA',
    description: 'Faça upload de gravações e receba resumos automáticos com tarefas sugeridas pelo Gemini.',
    color: 'text-purple-400',
    bg: 'bg-purple-600/20',
  },
  {
    icon: Globe,
    title: 'Google Tasks Sync',
    description: 'Sincronização bidirecional com Google Tasks. Resolução de conflitos automática.',
    color: 'text-green-400',
    bg: 'bg-green-600/20',
  },
  {
    icon: CreditCard,
    title: 'Faturação Revolut',
    description: 'Cobrança dinâmica por assento com checkout integrado via Revolut.',
    color: 'text-yellow-400',
    bg: 'bg-yellow-600/20',
  },
  {
    icon: Users,
    title: 'Multi-Tenant',
    description: 'Workspaces isolados com gestão de membros e papéis (Gestor, Colaborador, Cliente).',
    color: 'text-cyan-400',
    bg: 'bg-cyan-600/20',
  },
  {
    icon: Shield,
    title: 'Segurança',
    description: 'JWT auth, bcrypt, isolamento por tenant e controle de acesso por role.',
    color: 'text-red-400',
    bg: 'bg-red-600/20',
  },
];

export function LandingPage() {
  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Navbar */}
      <nav className="border-b border-gray-800/50 backdrop-blur-sm bg-gray-950/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            Task<span className="text-blue-500">360</span>
            <span className="text-xs text-gray-500 ml-2 font-normal">Engine</span>
          </h1>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm text-gray-400 hover:text-white transition-colors px-3 py-2"
            >
              Entrar
            </Link>
            <Link
              to="/register"
              className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              Começar Grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Zap size={12} />
          Gestão de tarefas com inteligência artificial
        </div>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6">
          Gerencie tarefas.
          <br />
          <span className="text-blue-500">Automatize reuniões.</span>
          <br />
          Escale equipas.
        </h2>
        <p className="text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          Plataforma B2B multi-tenant com Kanban, sync Google Tasks, atas com IA
          e faturação dinâmica por assento. Tudo num só lugar.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors text-base"
          >
            Começar Agora
            <ArrowRight size={18} />
          </Link>
          <a
            href="#features"
            className="text-gray-400 hover:text-white transition-colors px-6 py-3 text-base"
          >
            Ver funcionalidades
          </a>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-16 bg-gray-900/50 border border-gray-800 rounded-2xl p-6">
          <div>
            <p className="text-2xl font-bold text-white">4</p>
            <p className="text-xs text-gray-500">Roles</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-400">5.00€</p>
            <p className="text-xs text-gray-500">Plano Base</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-400">Sync</p>
            <p className="text-xs text-gray-500">Google Tasks</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3">Tudo o que precisa</h3>
          <p className="text-gray-400 max-w-lg mx-auto">
            Uma plataforma completa para gerir equipas, tarefas e reuniões com automação inteligente.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-gray-900 border border-gray-800 rounded-xl p-5 hover:border-gray-700 transition-colors group"
            >
              <div className={`w-10 h-10 ${f.bg} rounded-lg flex items-center justify-center mb-4`}>
                <f.icon size={20} className={f.color} />
              </div>
              <h4 className="text-white font-semibold mb-2 group-hover:text-blue-400 transition-colors">
                {f.title}
              </h4>
              <p className="text-gray-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-gray-800 rounded-2xl p-8 sm:p-12 text-center">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3">Preço simples e transparente</h3>
          <p className="text-gray-400 mb-6 max-w-lg mx-auto">
            Plano base de <span className="text-white font-semibold">5.00 EUR/mês</span> +
            <span className="text-white font-semibold"> 3.00 EUR</span> por membro convidado.
            O dono não paga assento.
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            Experimentar Grátis
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <CheckCircle2 size={20} className="text-green-400" />
          <span className="text-gray-400 text-sm">Sem cartão de crédito para começar</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold mb-8">
          Pronto para transformar a gestão da sua equipa?
        </h3>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-medium text-lg transition-colors"
        >
          Criar Conta Grátis
          <ArrowRight size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-600">
            Task360 Engine &copy; {new Date().getFullYear()} — Todos os direitos reservados
          </p>
          <p className="text-xs text-gray-600">
            Feito com React + TypeScript + Prisma
          </p>
        </div>
      </footer>
    </div>
  );
}
