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
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useLocaleStore } from '../stores/useLocaleStore';

export function LandingPage() {
  const { t } = useLocaleStore();

  const features = [
    {
      icon: Columns3,
      title: t('landing.features.kanban.title'),
      description: t('landing.features.kanban.description'),
      color: 'text-blue-400',
      bg: 'bg-blue-600/20',
    },
    {
      icon: Video,
      title: t('landing.features.ai.title'),
      description: t('landing.features.ai.description'),
      color: 'text-purple-400',
      bg: 'bg-purple-600/20',
    },
    {
      icon: Globe,
      title: t('landing.features.googleSync.title'),
      description: t('landing.features.googleSync.description'),
      color: 'text-green-400',
      bg: 'bg-green-600/20',
    },
    {
      icon: CreditCard,
      title: t('landing.features.billing.title'),
      description: t('landing.features.billing.description'),
      color: 'text-yellow-400',
      bg: 'bg-yellow-600/20',
    },
    {
      icon: Users,
      title: t('landing.features.multiTenant.title'),
      description: t('landing.features.multiTenant.description'),
      color: 'text-cyan-400',
      bg: 'bg-cyan-600/20',
    },
    {
      icon: Shield,
      title: t('landing.features.security.title'),
      description: t('landing.features.security.description'),
      color: 'text-red-400',
      bg: 'bg-red-600/20',
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-gray-950 text-gray-900 dark:text-white transition-colors duration-200">
      {/* Navbar */}
      <nav className="border-b border-gray-200 dark:border-gray-800/50 backdrop-blur-sm bg-white/80 dark:bg-gray-950/80 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">
            Task<span className="text-blue-500">360</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 ml-2 font-normal">{t('common.appSuffix')}</span>
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {/* Desktop: link texto */}
            <Link
              to="/login"
              className="hidden sm:block text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-3 py-2"
            >
              {t('landing.nav.login')}
            </Link>
            {/* Mobile only */}
            <Link
              to="/login"
              className="sm:hidden text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {t('landing.nav.loginMobile')}
            </Link>
            {/* Desktop only */}
            <Link
              to="/register"
              className="hidden sm:inline-flex text-sm bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {t('landing.nav.register')}
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 pt-16 sm:pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-blue-600/10 border border-blue-500/20 text-blue-500 dark:text-blue-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
          <Zap size={12} />
          {t('landing.hero.badge')}
        </div>
        <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight mb-6 text-gray-900 dark:text-white">
          {t('landing.hero.title1')}
          <br />
          <span className="text-blue-500">{t('landing.hero.title2')}</span>
          <br />
          {t('landing.hero.title3')}
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-lg sm:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
          {t('landing.hero.description')}
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            to="/register"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors text-base"
          >
            {t('landing.hero.cta')}
            <ArrowRight size={18} />
          </Link>
          <a
            href="#features"
            className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors px-6 py-3 text-base"
          >
            {t('landing.hero.secondaryCta')}
          </a>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto mt-16 bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-2xl p-6 shadow-sm dark:shadow-none">
          <div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">4</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('landing.stats.roles')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-blue-500 dark:text-blue-400">5.00€</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('landing.stats.basePlan')}</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-green-500 dark:text-green-400">Sync</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">{t('landing.stats.googleTasks')}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center mb-12">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-gray-900 dark:text-white">{t('landing.features.sectionTitle')}</h3>
          <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto">
            {t('landing.features.sectionDescription')}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 hover:border-gray-300 dark:hover:border-gray-700 transition-colors group shadow-sm dark:shadow-none"
            >
              <div className={`w-10 h-10 ${f.bg} rounded-lg flex items-center justify-center mb-4`}>
                <f.icon size={20} className={f.color} />
              </div>
              <h4 className="text-gray-900 dark:text-white font-semibold mb-2 group-hover:text-blue-500 dark:group-hover:text-blue-400 transition-colors">
                {f.title}
              </h4>
              <p className="text-gray-500 dark:text-gray-500 text-sm leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing teaser */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
        <div className="bg-gradient-to-br from-blue-600/10 to-purple-600/10 border border-gray-200 dark:border-gray-800 rounded-2xl p-8 sm:p-12 text-center shadow-sm dark:shadow-none">
          <h3 className="text-2xl sm:text-3xl font-bold mb-3 text-gray-900 dark:text-white">{t('landing.pricing.title')}</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-lg mx-auto">
            {t('landing.pricing.description_prefix')} <span className="text-gray-900 dark:text-white font-semibold">{t('landing.pricing.basePriceMonthly')}</span> {t('landing.pricing.plus')}
            <span className="text-gray-900 dark:text-white font-semibold"> {t('landing.pricing.seatPrice')}</span> {t('landing.pricing.description_suffix')}
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-medium transition-colors"
          >
            {t('landing.pricing.cta')}
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 py-16 text-center">
        <div className="flex items-center justify-center gap-2 mb-4">
          <CheckCircle2 size={20} className="text-green-500 dark:text-green-400" />
          <span className="text-gray-500 dark:text-gray-400 text-sm">{t('landing.cta.noCreditCard')}</span>
        </div>
        <h3 className="text-2xl sm:text-3xl font-bold mb-8 text-gray-900 dark:text-white">
          {t('landing.cta.title')}
        </h3>
        <Link
          to="/register"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-xl font-medium text-lg transition-colors"
        >
          {t('landing.cta.button')}
          <ArrowRight size={20} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 dark:border-gray-800 py-8 mt-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs text-gray-400 dark:text-gray-600">
            {t('common.copyright', { year: new Date().getFullYear() })}
          </p>
          <p className="text-xs text-gray-400 dark:text-gray-600">
            {t('common.madeWith')}
          </p>
        </div>
      </footer>
    </div>
  );
}
