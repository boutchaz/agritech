import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  MapPin,
  Monitor,
  Users,
  DollarSign,
  BookOpen,
  Activity,
  ShoppingCart,
  Brain,
  UserPlus,
  Info,
  CheckCircle,
  Check,
  Play,
  X,
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import heroBg from '../assets/bg-360-day.png';
import { appConfig } from '@/config/app';

const LandingPage: React.FC = () => {
  const { t } = useTranslation();
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.agritech.local';
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // SEO
  const structuredData = useMemo(() => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    applicationCategory: 'BusinessApplication',
    name: appConfig.name,
    url: `${siteOrigin}/`,
    description: t('landing.seo.description'),
    image: `${siteOrigin}/og-image.png`,
    offers: { '@type': 'Offer', price: '25', priceCurrency: 'USD' },
  }), [siteOrigin, t]);

  useEffect(() => {
    const pageTitle = t('landing.seo.title', { defaultValue: `${appConfig.name} - La Suite de Gestion Agricole Tout-en-Un | Maroc` });
    const description = t('landing.seo.description', { defaultValue: `${appConfig.name} révolutionne l'agriculture au Maroc.` });
    document.title = pageTitle;

    const ensureMeta = (nameOrProp: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${nameOrProp}"]`) as HTMLMetaElement | null;
      if (!tag) { tag = document.createElement('meta'); tag.setAttribute(attr, nameOrProp); document.head.appendChild(tag); }
      tag.setAttribute('content', content);
    };
    ensureMeta('description', description);
    ensureMeta('keywords', t('landing.seo.keywords', { defaultValue: '' }));
    ensureMeta('og:type', 'website', true);
    ensureMeta('og:url', siteOrigin, true);
    ensureMeta('og:title', pageTitle, true);
    ensureMeta('og:description', description, true);
    ensureMeta('og:image', `${siteOrigin}/og-image.png`, true);
    ensureMeta('twitter:card', 'summary_large_image');
    ensureMeta('twitter:title', pageTitle);
    ensureMeta('twitter:description', description);

    const existingScript = document.querySelector('script[data-landing-schema]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-landing-schema', 'true');
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
    return () => { document.querySelector('script[data-landing-schema]')?.remove(); };
  }, [t, siteOrigin, structuredData]);

  // Sticky header
  useEffect(() => {
    const getScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
      let current: HTMLElement | null = node;
      // Walk up until we find an element that can actually scroll vertically.
      while (current) {
        const style = window.getComputedStyle(current);
        const overflowY = style.overflowY;
        const canScrollY = (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay');
        if (canScrollY && current.scrollHeight > current.clientHeight) return current;
        current = current.parentElement;
      }
      return window;
    };

    const scrollParent = getScrollParent(containerRef.current);
    const getScrollTop = () =>
      scrollParent === window ? window.scrollY : (scrollParent as HTMLElement).scrollTop;

    const onScroll = () => setScrolled(getScrollTop() > 50);
    onScroll(); // sync initial state

    if (scrollParent === window) {
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    scrollParent.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollParent.removeEventListener('scroll', onScroll);
  }, []);

  // Scroll reveal
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const target = e.target as HTMLElement;
          target.classList.add('opacity-100', 'translate-y-0');
          observer.unobserve(e.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
    );
    const timer = setTimeout(() => {
      document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        observer.observe(el);
      });
    }, 100);
    return () => { clearTimeout(timer); observer.disconnect(); };
  }, []);

  const openVideoModal = useCallback(() => {
    setVideoModalOpen(true);
    setTimeout(() => videoRef.current?.play().catch(() => {}), 100);
  }, []);

  const closeVideoModal = useCallback(() => {
    setVideoModalOpen(false);
    if (videoRef.current) { videoRef.current.pause(); videoRef.current.currentTime = 0; }
  }, []);

  const scrollTo = useCallback((id: string) => {
    setMobileMenuOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  const modules = [
    { icon: MapPin, key: 'parcels', color: 'bg-primary/10 text-primary' },
    { icon: Monitor, key: 'stocks', color: 'bg-primary/10 text-primary' },
    { icon: Users, key: 'hr', color: 'bg-primary/10 text-primary' },
    { icon: DollarSign, key: 'finance', color: 'bg-primary/10 text-primary' },
    { icon: BookOpen, key: 'accounting', color: 'bg-primary/10 text-primary' },
    { icon: Activity, key: 'analytics', color: 'bg-primary/10 text-primary' },
    { icon: ShoppingCart, key: 'marketplace', color: 'bg-primary/10 text-primary' },
    { icon: Brain, key: 'ai', color: 'bg-[rgba(30,136,229,0.15)] text-[#1E88E5]', isAi: true },
  ];

  const faqItems = [1, 2, 3, 4, 5, 6];

  return (
    <div
      ref={containerRef}
      className="min-h-screen bg-background text-foreground font-[Inter,sans-serif]"
      style={{ scrollBehavior: 'smooth' }}
    >
      {/* NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${
          scrolled
            ? 'bg-[rgba(30,30,30,0.95)] backdrop-blur-[10px] py-4 shadow-[0_4px_20px_rgba(0,0,0,0.1)]'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="w-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
          <a href="#" className="flex items-center gap-3 no-underline" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <img src="/assets/logo.png" alt="AGROGINA Logo" className="h-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
            <span
              className={`font-[Montserrat,sans-serif] font-extrabold text-2xl tracking-wider transition-all duration-300 ${
                scrolled ? 'text-white' : 'text-white text-shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
              }`}
            >
              AGROGINA
            </span>
          </a>

          <nav className="hidden md:flex gap-8">
            {(['modules', 'how-it-works', 'faq'] as const).map((id) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`bg-transparent border-none font-medium text-[0.95rem] cursor-pointer transition-all duration-300 ${
                  scrolled ? 'text-gray-200 hover:text-white' : 'text-[#f3f4f6] opacity-80 hover:opacity-100 hover:text-white'
                }`}
              >
                {id === 'modules' ? t('landing.nav.features') : id === 'how-it-works' ? t('landing.nav.howItWorks') : t('landing.nav.faq')}
              </button>
            ))}
            <Link
              to="/blog"
              className={`font-medium text-[0.95rem] transition-all duration-300 ${
                scrolled ? 'text-gray-200 hover:text-white' : 'text-[#f3f4f6] opacity-80 hover:opacity-100 hover:text-white'
              }`}
            >
              {t('landing.nav.blog')}
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              to="/login"
              className={`inline-block px-4 py-2 rounded-xl font-semibold text-[0.95rem] border-2 transition-all duration-300 ${
                scrolled
                  ? 'bg-primary border-primary text-primary-foreground hover:bg-primary/90'
                  : 'border-[rgba(255,255,255,0.3)] text-white hover:border-white hover:bg-[rgba(255,255,255,0.1)]'
              }`}
            >
              {t('auth.login', 'Connexion')}
            </Link>
            <button
              onClick={() => scrollTo('contact')}
              className="inline-block px-4 py-2 rounded-xl font-semibold text-[0.95rem] bg-primary text-primary-foreground border-2 border-transparent hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 cursor-pointer"
            >
              {t('landing.hero.ctaDemo', 'Commencer')}
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="md:hidden flex flex-col gap-[5px] bg-transparent border-none cursor-pointer p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <span className={`block w-[25px] h-[2px] bg-white transition-all duration-300 ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-[25px] h-[2px] bg-white transition-all duration-300 ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-[25px] h-[2px] bg-white transition-all duration-300 ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-[#111] px-6 py-6 flex flex-col gap-4">
            <button onClick={() => scrollTo('modules')} className="text-[#f3f4f6] text-left font-medium bg-transparent border-none cursor-pointer">{t('landing.nav.features')}</button>
            <button onClick={() => scrollTo('how-it-works')} className="text-[#f3f4f6] text-left font-medium bg-transparent border-none cursor-pointer">{t('landing.nav.howItWorks')}</button>
            <button onClick={() => scrollTo('faq')} className="text-[#f3f4f6] text-left font-medium bg-transparent border-none cursor-pointer">{t('landing.nav.faq')}</button>
            <Link to="/blog" className="text-[#f3f4f6] font-medium" onClick={() => setMobileMenuOpen(false)}>{t('landing.nav.blog')}</Link>
            <div className="flex gap-3 pt-2">
              <Link to="/login" className="px-4 py-2 rounded-xl font-semibold text-white border-2 border-[rgba(255,255,255,0.3)]" onClick={() => setMobileMenuOpen(false)}>{t('auth.login', 'Connexion')}</Link>
              <button
                onClick={() => scrollTo('contact')}
                className="px-4 py-2 rounded-xl font-semibold bg-primary text-primary-foreground border-2 border-transparent cursor-pointer"
              >
                {t('landing.hero.ctaDemo', 'Commencer')}
              </button>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* HERO */}
        <section id="hero" className="relative min-h-screen pt-32 flex items-center bg-gradient-to-br from-[#111] to-[#1E1E1E] overflow-hidden">
          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-45 z-[1]"
            style={{
              backgroundImage: `url(${heroBg})`,
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 30%, rgba(0,0,0,0) 100%)',
            }}
          />
          {/* Radial gradients */}
          <div
            className="absolute inset-0 z-[1] mix-blend-multiply"
            style={{
              backgroundImage: 'radial-gradient(circle at 20% 40%, rgba(30,136,229,0.4) 0%, transparent 50%), radial-gradient(circle at 80% 60%, rgba(45,90,61,0.4) 0%, transparent 50%)',
            }}
          />

          <div className="relative z-[2] w-full max-w-[1200px] mx-auto px-6 flex flex-col items-center text-center">
            <div className="reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)]">
              <h1 className="font-[Montserrat,sans-serif] font-bold text-white text-[clamp(2.5rem,5vw,4rem)] mb-2 max-w-[900px] leading-tight" style={{ textShadow: '0 4px 12px rgba(0,0,0,0.6)' }}>
                {t('landing.hero.title')}
              </h1>
              <h2 className="text-primary-400 text-[clamp(1.5rem,3vw,2.5rem)] mb-6 font-[Montserrat,sans-serif] font-bold" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
                {t('landing.hero.highlight')}
              </h2>
              <p className="text-[#e2e8f0] text-lg max-w-[800px] mx-auto mb-10 leading-relaxed" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.4)' }}>
                {t('landing.hero.subtitle')}
              </p>

              <div className="flex gap-4 justify-center mb-8 flex-wrap">
                <button
                  onClick={() => scrollTo('contact')}
                  className="px-8 py-4 rounded-xl font-semibold text-lg bg-primary text-primary-foreground border-2 border-transparent hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-300 cursor-pointer"
                >
                  {t('landing.hero.ctaDemo')}
                </button>
                <button
                  onClick={() => scrollTo('modules')}
                  className="px-8 py-4 rounded-xl font-semibold text-lg bg-transparent text-white border-2 border-white/30 hover:border-white hover:bg-white/10 transition-all duration-300 cursor-pointer"
                >
                  {t('landing.hero.ctaDiscover')}
                </button>
              </div>

              <div className="flex gap-6 justify-center text-slate-300 text-sm flex-wrap">
                {[1, 2, 3].map((n) => (
                  <span key={n} className="flex items-center gap-2">
                    <Check className="w-4 h-4" />
                    {t(`landing.hero.badge${n}`)}
                  </span>
                ))}
              </div>
            </div>

            {/* Video thumbnail */}
            <div className="mt-16 w-full max-w-[1000px] reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)] delay-200">
              <div
                onClick={openVideoModal}
                className="relative rounded-xl overflow-hidden border border-white/20 cursor-pointer aspect-video shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] group"
                style={{ transform: 'perspective(1000px) rotateX(2deg)', transition: 'transform 0.5s ease' }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = 'perspective(1000px) rotateX(0deg)'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = 'perspective(1000px) rotateX(2deg)'; }}
              >
                <img src="/assets/video-thumbnail.png" alt="Demo AGROGINA" className="w-full h-full object-cover opacity-80 brightness-90" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[72px] h-[72px] bg-blue-500/90 rounded-full flex items-center justify-center backdrop-blur shadow-[0_10px_25px_rgba(0,0,0,0.5)] group-hover:scale-110 transition-transform duration-300">
                  <Play className="w-7 h-7 text-white ml-1" fill="white" />
                </div>
                <div className="absolute bottom-6 left-0 right-0 text-center font-semibold text-white tracking-[2px] text-sm" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.8)' }}>
                  {t('landing.hero.demoInteractive', 'DÉMO INTERACTIVE')}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* MODULES */}
        <section id="modules" className="py-20 bg-background">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-[600px] mx-auto mb-12 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)]">
              <h2 className="font-[Montserrat,sans-serif] font-bold text-[2.25rem] mb-4 text-foreground">{t('landing.modules.title')}</h2>
              <p className="text-lg text-muted-foreground">{t('landing.modules.subtitle')}</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {modules.map(({ icon: Icon, key, color, isAi }) => (
                <div
                  key={key}
                  className={`reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)] bg-card p-8 rounded-xl border hover:-translate-y-1 hover:shadow-md hover:border-primary/30 ${
                    isAi ? 'border-2 border-blue-400/45 bg-gradient-to-br from-card to-blue-50/40 dark:to-blue-950/20' : 'border-border'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-6 ${color}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <h3 className="font-[Montserrat,sans-serif] font-bold text-xl mb-3 text-foreground">{t(`landing.modules.${key}`)}</h3>
                  <p className="text-muted-foreground text-[0.95rem] leading-relaxed">{t(`landing.modules.${key}Desc`)}</p>
                  <button
                    onClick={() => scrollTo('contact')}
                    className="mt-4 text-primary font-semibold flex items-center gap-2 bg-transparent border-none cursor-pointer hover:text-primary/90 hover:gap-3 transition-all duration-300"
                  >
                    {t('landing.modules.learnMore')} →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-20 bg-secondary">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-[600px] mx-auto mb-12 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)]">
              <h2 className="font-[Montserrat,sans-serif] font-bold text-[2.25rem] text-foreground">{t('landing.steps.title')}</h2>
            </div>

            <div className="flex flex-col md:flex-row justify-between items-start max-w-[900px] mx-auto relative">
              {[1, 2, 3].map((n, idx) => (
                <React.Fragment key={n}>
                  <div className={`flex-1 text-center px-4 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)] ${idx > 0 ? 'delay-200' : ''}`}>
                    <div className="w-[60px] h-[60px] bg-background border-2 border-primary text-primary rounded-full flex items-center justify-center font-[Montserrat,sans-serif] text-2xl font-bold mx-auto mb-6 shadow-sm">
                      {n}
                    </div>
                    <h3 className="font-[Montserrat,sans-serif] font-bold mb-3 text-foreground">{t(`landing.steps.step${n}Title`)}</h3>
                    <p className="text-muted-foreground text-[0.95rem]">{t(`landing.steps.step${n}Desc`)}</p>
                  </div>
                  {idx < 2 && (
                    <div className="hidden md:block flex-1 h-[2px] bg-border mt-[30px]" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>

        {/* WHY AGROGINA */}
        <section id="why-us" className="py-20 bg-background">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-[600px] mx-auto mb-12 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)]">
              <h2 className="font-[Montserrat,sans-serif] font-bold text-[2.25rem] text-foreground">{t('landing.why.title')}</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[900px] mx-auto">
              {([
                { key: 'connected', icon: UserPlus, tint: false },
                { key: 'ai', icon: Brain, tint: true },
                { key: 'morocco', icon: CheckCircle, tint: false },
                { key: 'simple', icon: Info, tint: false },
              ] as const).map(({ key, icon: Icon, tint }, idx) => (
                <div
                  key={key}
                  className={`flex gap-6 items-start reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)] ${idx % 2 !== 0 ? 'delay-200' : ''}`}
                >
                  <div className={`shrink-0 w-14 h-14 rounded-full flex items-center justify-center text-white ${tint ? 'bg-[#1E88E5]' : 'bg-primary'}`}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-[Montserrat,sans-serif] font-bold mb-2 text-foreground">{t(`landing.why.${key}`)}</h3>
                    <p className="text-muted-foreground">{t(`landing.why.${key}Desc`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="py-20 bg-secondary text-center">
          <div className="max-w-[1200px] mx-auto px-6 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)]">
            <h2 className="font-[Montserrat,sans-serif] font-bold text-[2.25rem] mb-4 text-foreground">{t('landing.pricing.title')}</h2>
            <p className="text-lg text-muted-foreground mb-8">{t('landing.pricing.subtitle')}</p>

            <div className="bg-card p-12 rounded-xl border border-border shadow-md max-w-[600px] mx-auto mt-12">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto mb-6 text-primary">
                <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="8.01" y2="14" /><line x1="12" y1="14" x2="12.01" y2="14" /><line x1="16" y1="14" x2="16.01" y2="14" /><line x1="8" y1="18" x2="8.01" y2="18" /><line x1="12" y1="18" x2="12.01" y2="18" /><line x1="16" y1="18" x2="16.01" y2="18" />
              </svg>
              <p className="text-lg text-foreground mb-8">{t('landing.pricing.text')}</p>
              <button
                onClick={() => scrollTo('contact')}
                className="px-6 py-3 rounded-xl font-semibold bg-primary text-primary-foreground border-2 border-transparent hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-md transition-all duration-300 cursor-pointer"
              >
                {t('landing.pricing.cta')}
              </button>
            </div>
          </div>
        </section>

        {/* BUSINESS PLAN SIMULATOR */}
        <section id="business-plan" className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-16 items-center">
              <div className="reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)]">
                <h2 className="font-[Montserrat,sans-serif] font-bold text-[2.25rem] mb-4">{t('landing.bp.title')}</h2>
                <p className="text-[rgba(255,255,255,0.9)] text-lg mb-8">{t('landing.bp.subtitle')}</p>
                <p className="text-[rgba(255,255,255,0.7)] mb-8">{t('landing.bp.desc')}</p>
                <Link
                  to="/register"
                  className="inline-block px-8 py-4 rounded-xl font-semibold text-lg bg-background text-primary hover:bg-secondary transition-all duration-300"
                >
                  {t('landing.bp.cta')}
                </Link>
              </div>
              <div className="reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)] delay-200">
                <div className="bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.2)] rounded-xl p-10 backdrop-blur-[10px]">
                  <ul className="flex flex-col gap-6">
                    {[1, 2, 3].map((n) => (
                      <li key={n} className="flex items-center gap-4">
                        <div className="shrink-0 w-10 h-10 bg-background text-primary rounded-full flex items-center justify-center">
                          <Check className="w-5 h-5" />
                        </div>
                        <span className="text-lg font-medium">{t(`landing.bp.feature${n}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="py-20 bg-background">
          <div className="max-w-[800px] mx-auto px-6 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)]">
            <div className="text-center max-w-[600px] mx-auto mb-12">
              <h2 className="font-[Montserrat,sans-serif] font-bold text-[2.25rem] text-foreground">{t('landing.faq.title')}</h2>
            </div>

            <div className="flex flex-col gap-4">
              {faqItems.map((n) => (
                <div key={n} className="border border-border rounded-lg overflow-hidden">
                  <button
                    className="w-full px-6 py-5 flex justify-between items-center bg-background border-none text-[1.05rem] font-semibold text-foreground cursor-pointer text-left hover:bg-secondary transition-all duration-300"
                    onClick={() => setActiveFaq(activeFaq === n ? null : n)}
                  >
                    <span>{t(`landing.faq.q${n}`)}</span>
                    <span className={`text-xl transition-transform duration-300 ${activeFaq === n ? 'rotate-45' : ''}`}>+</span>
                  </button>
                  <div className={`overflow-hidden transition-all duration-300 ${activeFaq === n ? 'max-h-[200px]' : 'max-h-0'}`}>
                    <p className="px-6 pb-5 text-muted-foreground">{t(`landing.faq.a${n}`)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="py-20 bg-primary text-primary-foreground">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
              <div className="reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)]">
                <h2 className="font-[Montserrat,sans-serif] font-bold text-[2.5rem] mb-4">{t('landing.contact.title')}</h2>
                <p className="text-lg opacity-90">{t('landing.contact.subtitle')}</p>
              </div>

              <div className="bg-background p-10 rounded-xl text-foreground reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[800ms] ease-[cubic-bezier(0.5,0,0,1)] delay-200">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    const mailtoBody = `Name: ${formData.get('name')}%0AEmail: ${formData.get('email')}%0APhone: ${formData.get('phone')}%0AFarm Size: ${formData.get('size')}%0AMessage: ${formData.get('message')}`;
                    window.location.href = `mailto:contact@agrogina.com?subject=Demo Request&body=${mailtoBody}`;
                  }}
                >
                  <div className="mb-6">
                    <label className="block font-medium text-sm mb-2 text-foreground">{t('landing.contact.formName')}</label>
                    <input name="name" type="text" required className="w-full px-4 py-3 border border-border rounded-md text-base focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-all duration-300" />
                  </div>
                  <div className="mb-6">
                    <label className="block font-medium text-sm mb-2 text-foreground">{t('landing.contact.formEmail')}</label>
                    <input name="email" type="email" required className="w-full px-4 py-3 border border-border rounded-md text-base focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-all duration-300" />
                  </div>
                  <div className="mb-6">
                    <label className="block font-medium text-sm mb-2 text-foreground">{t('landing.contact.formPhone')}</label>
                    <input name="phone" type="tel" required className="w-full px-4 py-3 border border-border rounded-md text-base focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-all duration-300" />
                  </div>
                  <div className="mb-6">
                    <label className="block font-medium text-sm mb-2 text-foreground">{t('landing.contact.formSize')}</label>
                    <select name="size" required className="w-full px-4 py-3 border border-border rounded-md text-base bg-background focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-all duration-300">
                      <option value="1">{t('landing.contact.formSize1')}</option>
                      <option value="2">{t('landing.contact.formSize2')}</option>
                      <option value="3">{t('landing.contact.formSize3')}</option>
                      <option value="4">{t('landing.contact.formSize4')}</option>
                    </select>
                  </div>
                  <div className="mb-6">
                    <label className="block font-medium text-sm mb-2 text-foreground">{t('landing.contact.formMsg')}</label>
                    <textarea name="message" rows={3} className="w-full px-4 py-3 border border-border rounded-md text-base resize-y focus:outline-none focus:border-primary focus:ring-[3px] focus:ring-primary/10 transition-all duration-300" />
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 rounded-xl font-semibold bg-background text-primary border-2 border-primary hover:bg-secondary transition-all duration-300 cursor-pointer text-base"
                  >
                    {t('landing.contact.submit')}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-foreground text-primary-foreground pt-20 pb-8">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-12 mb-16">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <img src="/assets/logo.png" alt="AGROGINA Logo" className="h-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
                <span className="font-[Montserrat,sans-serif] font-extrabold text-2xl tracking-wider text-white">AGROGINA</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4 leading-relaxed">{t('landing.footer.tagline')}</p>
              <div className="flex gap-4 mt-6">
                <a href="https://www.linkedin.com/in/agrogina-agrogina-6846853b5" target="_blank" rel="noopener noreferrer" className="text-white opacity-70 hover:opacity-100 transition-opacity">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
                </a>
                <a href="https://www.instagram.com/agroginaa" target="_blank" rel="noopener noreferrer" className="text-white opacity-70 hover:opacity-100 transition-opacity">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="https://www.facebook.com/search/top?q=agrogina" target="_blank" rel="noopener noreferrer" className="text-white opacity-70 hover:opacity-100 transition-opacity">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                </a>
              </div>
            </div>

            <div>
              <h4 className="text-primary-foreground font-semibold text-lg mb-6">{t('landing.footer.product')}</h4>
              <div className="flex flex-col gap-3">
                <button onClick={() => scrollTo('modules')} className="text-muted-foreground text-[0.95rem] text-left bg-transparent border-none cursor-pointer hover:text-primary-foreground transition-colors">{t('landing.footer.features')}</button>
                <button onClick={() => scrollTo('pricing')} className="text-muted-foreground text-[0.95rem] text-left bg-transparent border-none cursor-pointer hover:text-primary-foreground transition-colors">{t('landing.footer.pricing')}</button>
                <button onClick={() => scrollTo('faq')} className="text-muted-foreground text-[0.95rem] text-left bg-transparent border-none cursor-pointer hover:text-primary-foreground transition-colors">{t('landing.footer.faq')}</button>
              </div>
            </div>

            <div>
              <h4 className="text-primary-foreground font-semibold text-lg mb-6">{t('landing.footer.company')}</h4>
              <div className="flex flex-col gap-3">
                <a href="#" className="text-muted-foreground text-[0.95rem] hover:text-primary-foreground transition-colors">{t('landing.footer.about')}</a>
                <Link to="/blog" className="text-muted-foreground text-[0.95rem] hover:text-primary-foreground transition-colors">{t('landing.footer.blog')}</Link>
                <button onClick={() => scrollTo('contact')} className="text-muted-foreground text-[0.95rem] text-left bg-transparent border-none cursor-pointer hover:text-primary-foreground transition-colors">{t('landing.footer.contact')}</button>
              </div>
            </div>

            <div>
              <h4 className="text-primary-foreground font-semibold text-lg mb-6">{t('landing.footer.legal')}</h4>
              <div className="flex flex-col gap-3">
                <a href="#" className="text-muted-foreground text-[0.95rem] hover:text-primary-foreground transition-colors">{t('landing.footer.terms')}</a>
                <a href="#" className="text-muted-foreground text-[0.95rem] hover:text-primary-foreground transition-colors">{t('landing.footer.privacy')}</a>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-8 border-t border-[rgba(255,255,255,0.1)] text-muted-foreground text-sm gap-4">
            <p>&copy; {new Date().getFullYear()} AGROGINA. {t('landing.footer.copyright')}</p>
            <p>{t('landing.footer.madeIn')}</p>
          </div>
        </div>
      </footer>

      {/* VIDEO MODAL */}
      {videoModalOpen && (
        <div
          className="fixed inset-0 z-[9999] bg-[rgba(0,0,0,0.85)] flex items-center justify-center"
          onClick={(e) => { if (e.target === e.currentTarget) closeVideoModal(); }}
        >
          <div className="relative w-[90%] max-w-[900px] aspect-video bg-black rounded-lg overflow-visible shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)]">
            <button
              onClick={closeVideoModal}
              className="absolute -top-10 -right-2.5 bg-transparent border-none text-white text-4xl cursor-pointer hover:text-primary transition-colors"
            >
              <X className="w-8 h-8" />
            </button>
            <video
              ref={videoRef}
              controls
              className="w-full h-full object-contain outline-none rounded-lg bg-black"
            >
              <source src="/assets/demo.mp4" type="video/mp4" />
            </video>
          </div>
        </div>
      )}

      {/* Structured data */}
      <div aria-hidden="true" className="sr-only">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
        />
      </div>
    </div>
  );
};

export default LandingPage;
