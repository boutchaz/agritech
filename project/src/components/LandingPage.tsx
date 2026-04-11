import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation, Trans } from 'react-i18next';
import { useHotkey } from '@tanstack/react-hotkeys';
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
  ArrowRight,
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import heroBg from '../assets/bg-360-day.webp';
import { appConfig } from '@/config/app';
import { toast } from 'sonner';

const LandingPage = () => {
  const { t } = useTranslation();
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.agritech.local';
  const [scrolled, setScrolled] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
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

  // Sticky header & Scroll Progress
  useEffect(() => {
    const getScrollParent = (node: HTMLElement | null): HTMLElement | Window => {
      let current: HTMLElement | null = node;
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
    
    const getScrollHeight = () =>
      scrollParent === window ? document.documentElement.scrollHeight - window.innerHeight : (scrollParent as HTMLElement).scrollHeight - (scrollParent as HTMLElement).clientHeight;

    const onScroll = () => {
      const top = getScrollTop();
      const height = getScrollHeight();
      setScrolled(top > 50);
      setScrollProgress((top / height) * 100);
    };
    
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

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

  useHotkey('Escape', () => setMobileMenuOpen(false), {
    enabled: mobileMenuOpen,
    meta: { name: t('landing.nav.closeMenu', 'Close menu'), description: 'Close mobile navigation menu' },
  });

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
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0% { transform: translateY(0px) rotateX(2deg); }
          50% { transform: translateY(-15px) rotateX(0deg); }
          100% { transform: translateY(0px) rotateX(2deg); }
        }
        @keyframes blob-float {
          0% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
          100% { transform: translate(0, 0) scale(1); }
        }
        @keyframes pulse-sonar {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-float { animation: float 6s ease-in-out infinite; }
        .animate-blob { animation: blob-float 20s ease-in-out infinite; }
        .sonar-effect::after {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          background: currentColor;
          animation: pulse-sonar 2s cubic-bezier(0, 0, 0.2, 1) infinite;
        }
      `}} />

      {/* SCROLL PROGRESS */}
      <div 
        className="fixed top-0 left-0 h-[3px] bg-primary z-[2000] transition-all duration-150 ease-out"
        style={{ width: `${scrollProgress}%` }}
      />

      {/* NAVBAR */}
      <header
        className={`fixed top-0 left-0 right-0 z-[1000] transition-all duration-300 ${
          scrolled
            ? 'bg-background/80 backdrop-blur-md py-4 border-b border-border/50 shadow-sm'
            : 'bg-transparent py-6'
        }`}
      >
        <div className="mx-auto flex w-full max-w-[1200px] items-center justify-between px-4 sm:px-6">
          <a href="#" className="flex items-center gap-3 no-underline" onClick={(e) => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <picture>
              <source srcSet="/assets/logo.webp" type="image/webp" />
              <img src="/assets/logo.png" alt="AGROGINA Logo" className="h-10 md:h-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-all duration-300" />
            </picture>
            <span
              className={`font-[Montserrat,sans-serif] font-extrabold text-xl md:text-2xl tracking-wider transition-all duration-300 ${
                scrolled ? 'text-foreground' : 'text-white text-shadow-[0_1px_3px_rgba(0,0,0,0.3)]'
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
                className={`bg-transparent border-none font-semibold text-[0.95rem] cursor-pointer transition-all duration-300 ${
                  scrolled ? 'text-foreground/80 hover:text-primary' : 'text-white/80 hover:text-white'
                }`}
              >
                {id === 'modules' ? t('landing.nav.features') : id === 'how-it-works' ? t('landing.nav.howItWorks') : t('landing.nav.faq')}
              </button>
            ))}
            <Link
              to="/blog"
              className={`font-semibold text-[0.95rem] transition-all duration-300 ${
                scrolled ? 'text-foreground/80 hover:text-primary' : 'text-white/80 hover:text-white'
              }`}
            >
              {t('landing.nav.blog')}
            </Link>
          </nav>

          <div className="hidden md:flex items-center gap-4">
            <LanguageSwitcher />
            <Link
              to="/login"
              className={`inline-block px-4 py-2 rounded-xl font-semibold text-[0.95rem] transition-all duration-300 ${
                scrolled
                  ? 'text-foreground hover:text-primary'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              {t('auth.login', 'Connexion')}
            </Link>
            <button
              onClick={() => scrollTo('contact')}
              className="inline-block px-5 py-2.5 rounded-xl font-bold text-[0.95rem] bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer"
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
            <span className={`block w-[25px] h-[2px] transition-all duration-300 ${scrolled ? 'bg-foreground' : 'bg-white'} ${mobileMenuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
            <span className={`block w-[25px] h-[2px] transition-all duration-300 ${scrolled ? 'bg-foreground' : 'bg-white'} ${mobileMenuOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-[25px] h-[2px] transition-all duration-300 ${scrolled ? 'bg-foreground' : 'bg-white'} ${mobileMenuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
          </button>

        </div>
      </header>

      {/* Full-screen mobile menu — fixed overlay so content below is not visible / misaligned */}
      {mobileMenuOpen ? (
        <div
          className="fixed inset-0 z-[1001] flex md:hidden flex-col bg-[#111] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
          role="dialog"
          aria-modal="true"
          aria-label={t('landing.nav.menuAria')}
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-4">
            <a
              href="#"
              className="flex min-w-0 items-center gap-2 no-underline"
              onClick={(e) => {
                e.preventDefault();
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <picture>
              <source srcSet="/assets/logo.webp" type="image/webp" />
              <img src="/assets/logo.png" alt="AGROGINA" className="h-10 shrink-0 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]" />
            </picture>
              <span className="font-[Montserrat,sans-serif] text-lg font-extrabold tracking-wider text-white">AGROGINA</span>
            </a>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-white/20 bg-white/5 text-white hover:bg-white/10"
              onClick={() => setMobileMenuOpen(false)}
              aria-label={t('landing.nav.closeMenu')}
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <nav className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
            <div className="flex flex-col gap-1">
              {(['modules', 'how-it-works', 'faq'] as const).map((id) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => scrollTo(id)}
                  className="rounded-lg px-3 py-3 text-left text-base font-medium text-[#f3f4f6] hover:bg-white/10"
                >
                  {id === 'modules' ? t('landing.nav.features') : id === 'how-it-works' ? t('landing.nav.howItWorks') : t('landing.nav.faq')}
                </button>
              ))}
              <Link
                to="/blog"
                className="rounded-lg px-3 py-3 text-base font-medium text-[#f3f4f6] hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('landing.nav.blog')}
              </Link>
            </div>
          </nav>

          <div className="shrink-0 space-y-4 border-t border-white/10 px-4 py-4">
            <div className="flex justify-center">
              <LanguageSwitcher compact elevatePopover />
            </div>
            <div className="flex flex-col gap-3">
              <Link
                to="/login"
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-white/50 bg-transparent px-4 py-3 text-center font-semibold text-white hover:border-white hover:bg-white/10"
                onClick={() => setMobileMenuOpen(false)}
              >
                {t('auth.login', 'Connexion')}
              </Link>
              <button
                type="button"
                onClick={() => scrollTo('contact')}
                className="inline-flex min-h-[44px] w-full items-center justify-center rounded-xl border-2 border-transparent bg-primary px-4 py-3 font-semibold text-primary-foreground hover:bg-primary/90"
              >
                {t('landing.hero.ctaDemo', 'Commencer')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <main>
        {/* HERO */}
        <section id="hero" className="relative min-h-screen pt-32 pb-20 flex items-center bg-gradient-to-br from-[#0a0a0a] to-[#1a1a1a] overflow-hidden">
          {/* Animated Blobs */}
          <div className="absolute top-1/4 -left-20 w-[400px] h-[400px] bg-primary/20 rounded-full blur-[100px] animate-blob z-[1] will-change-transform" />
          <div className="absolute bottom-1/4 -right-20 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px] animate-blob z-[1] will-change-transform" style={{ animationDelay: '-10s' }} />

          {/* Background image */}
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-30 z-[1]"
            style={{
              backgroundImage: `url(${heroBg})`,
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 50%, rgba(0,0,0,0) 100%)',
            }}
          />
          
          <div className="relative z-[2] w-full max-w-[1200px] mx-auto px-6 flex flex-col items-center text-center">
            <div className="reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]">
              <h1 className="font-[Montserrat,sans-serif] font-extrabold text-white text-[clamp(2.5rem,6vw,4.5rem)] mb-4 max-w-[1000px] leading-[1.1] tracking-tight">
                {t('landing.hero.title')}
              </h1>
              <h2 className="bg-gradient-to-r from-primary-400 to-blue-400 bg-clip-text text-transparent text-[clamp(1.5rem,4vw,3rem)] mb-8 font-[Montserrat,sans-serif] font-bold">
                {t('landing.hero.highlight')}
              </h2>
              <p className="text-gray-300 text-lg md:text-xl max-w-[800px] mx-auto mb-12 leading-relaxed opacity-90">
                {t('landing.hero.subtitle')}
              </p>

              <div className="flex gap-5 justify-center mb-12 flex-wrap">
                <button
                  onClick={() => scrollTo('contact')}
                  className="px-10 py-4 rounded-2xl font-bold text-lg bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-[0_10px_20px_-5px_rgba(34,197,94,0.4)] transition-all duration-300 cursor-pointer"
                >
                  {t('landing.hero.ctaDemo')}
                </button>
                <button
                  onClick={() => scrollTo('modules')}
                  className="px-10 py-4 rounded-2xl font-bold text-lg bg-white/5 text-white border border-white/20 hover:bg-white/10 backdrop-blur-sm hover:scale-105 active:scale-95 transition-all duration-300 cursor-pointer"
                >
                  {t('landing.hero.ctaDiscover')}
                </button>
              </div>

              <div className="flex gap-8 justify-center text-gray-400 text-sm font-medium flex-wrap">
                {[1, 2, 3].map((n) => (
                  <span key={n} className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/5">
                    <Check className="w-4 h-4 text-primary" />
                    {t(`landing.hero.badge${n}`)}
                  </span>
                ))}
              </div>
            </div>

            {/* Video thumbnail */}
            <div className="mt-20 w-full max-w-[1000px] reveal-on-scroll opacity-0 translate-y-[40px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] delay-300">
              <div
                onClick={openVideoModal}
                className="relative rounded-2xl overflow-hidden border border-white/10 cursor-pointer aspect-video shadow-[0_40px_80px_-15px_rgba(0,0,0,0.7)] group animate-float will-change-transform"
              >
                <picture>
                  <source srcSet="/assets/video-thumbnail.webp" type="image/webp" />
                  <img src="/assets/video-thumbnail.png" alt="Demo AGROGINA" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                </picture>
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors duration-300" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-primary rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-all duration-500 sonar-effect text-primary">
                  <Play className="w-8 h-8 text-primary-foreground ml-1" fill="currentColor" />
                </div>
                <div className="absolute bottom-8 left-0 right-0 text-center font-bold text-white tracking-[4px] text-sm uppercase opacity-80 group-hover:opacity-100 transition-opacity">
                  {t('landing.hero.demoInteractive', 'DÉMO INTERACTIVE')}
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* MODULES */}
        <section id="modules" className="py-24 bg-background relative overflow-hidden">
          <div className="max-w-[1200px] mx-auto px-6 relative z-10">
            <div className="text-center max-w-[800px] mx-auto mb-16 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]">
              <h2 className="font-[Montserrat,sans-serif] font-extrabold text-[clamp(2rem,4vw,2.75rem)] mb-6 text-foreground tracking-tight leading-tight">
                {t('landing.modules.title')}
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-[600px] mx-auto">
                {t('landing.modules.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {modules.map(({ icon: Icon, key, color, isAi }) => (
                <div
                  key={key}
                  className={`reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] bg-card p-8 rounded-2xl border border-border shadow-sm hover:-translate-y-2 hover:shadow-xl hover:border-primary/50 transition-all duration-500 flex flex-col group ${
                    isAi ? 'border-2 border-primary/40 bg-gradient-to-br from-card via-card to-primary/5 shadow-[0_0_20px_rgba(34,197,94,0.1)]' : ''
                  }`}
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-8 transition-transform duration-500 group-hover:scale-110 ${color}`}>
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="font-[Montserrat,sans-serif] font-bold text-xl mb-4 text-foreground group-hover:text-primary transition-colors">
                    {t(`landing.modules.${key}`)}
                    {isAi && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary uppercase tracking-wider">AI Powered</span>}
                  </h3>
                  <p className="text-muted-foreground text-[0.95rem] leading-relaxed mb-6 flex-1">
                    {t(`landing.modules.${key}Desc`)}
                  </p>
                  <button
                    onClick={() => scrollTo('contact')}
                    className="text-primary font-bold text-sm flex items-center gap-2 bg-transparent border-none cursor-pointer group/btn"
                  >
                    <span className="group-hover/btn:mr-1 transition-all duration-300">{t('landing.modules.learnMore')}</span>
                    <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-24 bg-secondary/30 relative overflow-hidden">
          <div className="max-w-[1200px] mx-auto px-6 relative z-10">
            <div className="text-center max-w-[800px] mx-auto mb-20 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]">
              <h2 className="font-[Montserrat,sans-serif] font-extrabold text-[clamp(2rem,4vw,2.75rem)] text-foreground tracking-tight">
                {t('landing.steps.title')}
              </h2>
            </div>

            <div className="relative mx-auto flex max-w-[1000px] flex-col items-center gap-12 md:flex-row md:items-start md:justify-between md:gap-0">
              {[1, 2, 3].map((n, idx) => (
                <React.Fragment key={n}>
                  <div
                    className={`w-full max-w-md text-center px-4 md:max-w-none md:flex-1 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${idx > 0 ? 'delay-200' : ''}`}
                  >
                    <div className="relative inline-block group mb-8">
                      <div className="w-16 h-16 bg-background border-2 border-primary text-primary rounded-2xl flex items-center justify-center font-[Montserrat,sans-serif] text-2xl font-extrabold shadow-sm group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 transform group-hover:rotate-12">
                        {n}
                      </div>
                      <div className="absolute -inset-2 bg-primary/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    </div>
                    <h3 className="font-[Montserrat,sans-serif] font-bold text-xl mb-4 text-foreground">{t(`landing.steps.step${n}Title`)}</h3>
                    <p className="text-muted-foreground text-[0.95rem] leading-relaxed max-w-[250px] mx-auto">{t(`landing.steps.step${n}Desc`)}</p>
                  </div>
                  {idx < 2 && (
                    <div className="hidden md:block flex-1 h-[2px] bg-gradient-to-r from-primary/50 to-primary/10 mt-8 mx-4" />
                  )}
                </React.Fragment>
              ))}
            </div>
          </div>
        </section>


        {/* WHY AGROGINA */}
        <section id="why-us" className="py-24 bg-background">
          <div className="max-w-[1200px] mx-auto px-6">
            <div className="text-center max-w-[800px] mx-auto mb-16 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]">
              <h2 className="font-[Montserrat,sans-serif] font-extrabold text-[clamp(2rem,4vw,2.75rem)] text-foreground tracking-tight leading-tight">
                {t('landing.why.title')}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-[1000px] mx-auto">
              {([
                { key: 'connected', icon: UserPlus, tint: 'primary' },
                { key: 'ai', icon: Brain, tint: 'blue' },
                { key: 'morocco', icon: CheckCircle, tint: 'green' },
                { key: 'simple', icon: Info, tint: 'orange' },
              ] as const).map(({ key, icon: Icon, tint }, idx) => (
                <div
                  key={key}
                  className={`flex gap-6 items-start p-8 rounded-2xl bg-secondary/20 border border-border/50 hover:bg-background hover:border-primary/30 hover:shadow-lg transition-all duration-500 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] ${idx % 2 !== 0 ? 'delay-200' : ''} group`}
                >
                  <div className={`shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6
                    ${tint === 'primary' ? 'bg-primary/10 text-primary' : ''}
                    ${tint === 'blue' ? 'bg-blue-500/10 text-blue-500' : ''}
                    ${tint === 'green' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                    ${tint === 'orange' ? 'bg-orange-500/10 text-orange-500' : ''}
                  `}>
                    <Icon className="w-8 h-8" />
                  </div>
                  <div>
                    <h3 className="font-[Montserrat,sans-serif] font-bold text-xl mb-3 text-foreground group-hover:text-primary transition-colors">
                      {t(`landing.why.${key}`)}
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {t(`landing.why.${key}Desc`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* PRICING */}
        <section id="pricing" className="py-24 bg-secondary/50 text-center relative overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[1px] bg-gradient-to-r from-transparent via-border to-transparent" />
          
          <div className="max-w-[1200px] mx-auto px-6 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]">
            <h2 className="font-[Montserrat,sans-serif] font-extrabold text-[clamp(2rem,4vw,2.75rem)] mb-6 text-foreground tracking-tight leading-tight">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-[600px] mx-auto mb-16">
              {t('landing.pricing.subtitle')}
            </p>

            <div className="bg-card p-12 rounded-3xl border border-border/50 shadow-xl max-w-[700px] mx-auto mt-12 group hover:border-primary/30 transition-all duration-500 relative">
              <div className="absolute top-0 right-10 -translate-y-1/2 bg-primary text-primary-foreground px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest">
                Populaire
              </div>
              <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-8 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-12">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="2" width="16" height="20" rx="2" ry="2" /><line x1="8" y1="6" x2="16" y2="6" /><line x1="8" y1="10" x2="16" y2="10" /><line x1="8" y1="14" x2="8.01" y2="14" /><line x1="12" y1="14" x2="12.01" y2="14" /><line x1="16" y1="14" x2="16.01" y2="14" /><line x1="8" y1="18" x2="8.01" y2="18" /><line x1="12" y1="18" x2="12.01" y2="18" /><line x1="16" y1="18" x2="16.01" y2="18" />
                </svg>
              </div>
              <p className="text-xl md:text-2xl text-foreground mb-10 leading-relaxed font-medium tracking-tight">
                {t('landing.pricing.text')}
              </p>
              <button
                onClick={() => scrollTo('contact')}
                className="px-10 py-4 rounded-2xl font-bold text-lg bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-lg transition-all duration-300 cursor-pointer"
              >
                {t('landing.pricing.cta')}
              </button>
            </div>
          </div>
        </section>

        {/* BUSINESS PLAN SIMULATOR */}
        <section id="business-plan" className="py-24 bg-primary relative overflow-hidden">
          {/* Decorative background circle */}
          <div className="absolute top-1/2 left-0 -translate-y-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-[100px]" />
          
          <div className="max-w-[1200px] mx-auto px-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_1.5fr] gap-16 items-center">
              <div className="reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]">
                <h2 className="font-[Montserrat,sans-serif] font-extrabold text-[clamp(2rem,4vw,2.75rem)] mb-6 text-primary-foreground tracking-tight leading-tight">
                  {t('landing.bp.title')}
                </h2>
                <p className="text-primary-foreground/90 text-xl mb-8 font-medium">
                  {t('landing.bp.subtitle')}
                </p>
                <p className="text-primary-foreground/80 mb-10 leading-relaxed text-lg">
                  {t('landing.bp.desc')}
                </p>
                <Link
                  to="/register"
                  className="inline-block px-10 py-4 rounded-2xl font-bold text-lg bg-background text-primary hover:bg-secondary transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl"
                >
                  {t('landing.bp.cta')}
                </Link>
              </div>
              <div className="reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] delay-300">
                <div className="bg-white/10 border border-white/20 rounded-3xl p-10 backdrop-blur-xl shadow-2xl group hover:bg-white/[0.15] transition-colors duration-500">
                  <ul className="flex flex-col gap-6">
                    {[1, 2, 3].map((n) => (
                      <li key={n} className="flex items-center gap-5 group/item">
                        <div className="shrink-0 w-12 h-12 bg-background text-primary rounded-2xl flex items-center justify-center transition-all duration-500 group-hover/item:rotate-12 shadow-sm">
                          <Check className="w-6 h-6" />
                        </div>
                        <span className="text-xl font-bold text-primary-foreground">{t(`landing.bp.feature${n}`)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* FAQ */}
        <section id="faq" className="py-24 bg-background relative">
          <div className="max-w-[800px] mx-auto px-6 reveal-on-scroll opacity-0 translate-y-[30px] transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]">
            <div className="text-center max-w-[600px] mx-auto mb-16">
              <h2 className="font-[Montserrat,sans-serif] font-extrabold text-[clamp(2rem,4vw,2.75rem)] text-foreground tracking-tight">
                {t('landing.faq.title')}
              </h2>
            </div>

            <div className="flex flex-col gap-4">
              {faqItems.map((n) => (
                <div key={n} className={`border border-border/50 rounded-2xl overflow-hidden transition-all duration-300 ${activeFaq === n ? 'bg-secondary/20 shadow-md border-primary/20' : 'bg-background hover:border-primary/20'}`}>
                  <button
                    className="w-full px-8 py-6 flex justify-between items-center bg-transparent border-none text-lg font-bold text-foreground cursor-pointer text-left transition-all duration-300"
                    onClick={() => setActiveFaq(activeFaq === n ? null : n)}
                  >
                    <span>{t(`landing.faq.q${n}`)}</span>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-500 ${activeFaq === n ? 'bg-primary text-primary-foreground rotate-45' : 'bg-secondary text-foreground'}`}>
                      <span className="text-2xl leading-none">+</span>
                    </div>
                  </button>
                  <div 
                    className={`transition-all duration-500 ease-in-out ${activeFaq === n ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-8 pb-8 text-muted-foreground leading-relaxed text-[1.05rem]">
                      {t(`landing.faq.a${n}`)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CONTACT */}
        <section id="contact" className="w-full overflow-x-hidden bg-primary py-24 text-primary-foreground">
          <div className="mx-auto max-w-[1200px] px-6">
            <div className="grid grid-cols-1 items-center gap-16 md:grid-cols-2">
              <div className="reveal-on-scroll translate-y-[30px] opacity-0 transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)]">
                <h2 className="mb-6 font-[Montserrat,sans-serif] text-[clamp(2rem,5vw,3rem)] font-extrabold leading-[1.1] tracking-tight">
                  {t('landing.contact.title')}
                </h2>
                <p className="text-lg md:text-xl opacity-90 leading-relaxed max-w-[500px]">
                  {t('landing.contact.subtitle')}
                </p>
                <div className="mt-12 space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                      <Check className="w-6 h-6" />
                    </div>
                    <span className="text-lg font-medium">Réponse en moins de 24h</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                      <Check className="w-6 h-6" />
                    </div>
                    <span className="text-lg font-medium">Accompagnement personnalisé</span>
                  </div>
                </div>
              </div>

              <div className="w-full min-w-0 rounded-3xl bg-background p-8 text-foreground shadow-2xl reveal-on-scroll translate-y-[30px] opacity-0 transition-all duration-[1000ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] delay-200 md:p-12">
                <form
                  noValidate
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const formData = new FormData(form);
                    const name = String(formData.get('name') ?? '').trim();
                    const email = String(formData.get('email') ?? '').trim();
                    const phone = String(formData.get('phone') ?? '').trim();
                    const size = String(formData.get('size') ?? '');
                    if (!name || !email || !phone || !size) {
                      toast.error(t('landing.contact.validationRequired'));
                      return;
                    }
                    const mailtoBody = `Name: ${name}%0AEmail: ${email}%0APhone: ${phone}%0AFarm Size: ${size}%0AMessage: ${formData.get('message')}`;
                    window.location.href = `mailto:contact@agrogina.com?subject=Demo Request&body=${mailtoBody}`;
                  }}
                  className="space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-foreground uppercase tracking-wider" htmlFor="landing-contact-name">
                        {t('landing.contact.formName')}
                      </label>
                      <input
                        id="landing-contact-name"
                        name="name"
                        type="text"
                        autoComplete="name"
                        className="min-h-[50px] w-full rounded-xl border border-border bg-secondary/20 px-4 py-3 text-base text-foreground transition-all duration-300 focus:bg-background focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-foreground uppercase tracking-wider" htmlFor="landing-contact-email">
                        {t('landing.contact.formEmail')}
                      </label>
                      <input
                        id="landing-contact-email"
                        name="email"
                        type="email"
                        className="min-h-[50px] w-full rounded-xl border border-border bg-secondary/20 px-4 py-3 text-base text-foreground transition-all duration-300 focus:bg-background focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label className="mb-2 block text-sm font-bold text-foreground uppercase tracking-wider" htmlFor="landing-contact-phone">
                        {t('landing.contact.formPhone')}
                      </label>
                      <input
                        id="landing-contact-phone"
                        name="phone"
                        type="tel"
                        className="min-h-[50px] w-full rounded-xl border border-border bg-secondary/20 px-4 py-3 text-base text-foreground transition-all duration-300 focus:bg-background focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold text-foreground uppercase tracking-wider" htmlFor="landing-contact-size">
                        {t('landing.contact.formSize')}
                      </label>
                      <select
                        id="landing-contact-size"
                        name="size"
                        className="min-h-[50px] w-full rounded-xl border border-border bg-secondary/20 px-4 py-3 text-base text-foreground transition-all duration-300 focus:bg-background focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10 appearance-none"
                      >
                        <option value="">{t('landing.contact.formSizePlaceholder')}</option>
                        <option value="1">{t('landing.contact.formSize1')}</option>
                        <option value="2">{t('landing.contact.formSize2')}</option>
                        <option value="3">{t('landing.contact.formSize3')}</option>
                        <option value="4">{t('landing.contact.formSize4')}</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="mb-2 block text-sm font-bold text-foreground uppercase tracking-wider" htmlFor="landing-contact-message">
                      {t('landing.contact.formMsg')}
                    </label>
                    <textarea
                      id="landing-contact-message"
                      name="message"
                      rows={3}
                      className="min-h-[120px] w-full resize-y rounded-xl border border-border bg-secondary/20 px-4 py-3 text-base text-foreground transition-all duration-300 focus:bg-background focus:border-primary focus:outline-none focus:ring-4 focus:ring-primary/10"
                    />
                  </div>
                  <button
                    type="submit"
                    className="min-h-[56px] w-full cursor-pointer rounded-2xl bg-primary text-primary-foreground py-4 text-lg font-bold shadow-lg shadow-primary/20 transition-all duration-300 hover:bg-primary/90 hover:scale-[1.02] active:scale-[0.98]"
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
      <footer className="bg-foreground text-primary-foreground pt-24 pb-12 overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-[1px] bg-white/5" />
        <div className="max-w-[1200px] mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr] gap-16 mb-20">
            <div className="max-w-sm">
              <div className="flex items-center gap-3 mb-8 group cursor-pointer">
                <picture>
                  <source srcSet="/assets/logo.webp" type="image/webp" />
                  <img src="/assets/logo.png" alt="AGROGINA Logo" className="h-12 drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] group-hover:scale-110 transition-transform duration-500" loading="lazy" />
                </picture>
                <span className="font-[Montserrat,sans-serif] font-semibold text-2xl tracking-tighter text-white uppercase italic">AGROGINA</span>
              </div>
              <p className="text-lg text-white/60 mb-10 leading-relaxed font-medium">
                {t('landing.footer.tagline')}
              </p>
              <div className="flex gap-4">
                {[
                  { icon: 'M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z', link: 'https://www.linkedin.com/in/agrogina-agrogina-6846853b5' },
                  { icon: 'M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z', link: 'https://www.instagram.com/agroginaa', isInsta: true },
                  { icon: 'M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z', link: 'https://www.facebook.com/search/top?q=agrogina' }
                ].map((social) => (
                  <a 
                    key={social.link} 
                    href={social.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 border border-white/5 transition-all duration-300 hover:scale-110"
                  >
                    {social.isInsta ? (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d={social.icon}/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                    ) : (
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d={social.icon}/></svg>
                    )}
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-8 uppercase tracking-widest">{t('landing.footer.product')}</h4>
              <ul className="space-y-4">
                {['modules', 'pricing', 'faq'].map((item) => (
                  <li key={item}>
                    <button onClick={() => scrollTo(item === 'modules' ? 'modules' : item)} className="text-white/50 hover:text-primary font-bold transition-colors bg-transparent border-none cursor-pointer">
                      {t(`landing.footer.${item === 'modules' ? 'features' : item}`)}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-8 uppercase tracking-widest">{t('landing.footer.company')}</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-white/50 hover:text-primary font-bold transition-colors">{t('landing.footer.about')}</a></li>
                <li><Link to="/blog" className="text-white/50 hover:text-primary font-bold transition-colors">{t('landing.footer.blog')}</Link></li>
                <li><button onClick={() => scrollTo('contact')} className="text-white/50 hover:text-primary font-bold transition-colors bg-transparent border-none cursor-pointer">{t('landing.footer.contact')}</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-bold text-lg mb-8 uppercase tracking-widest">{t('landing.footer.legal')}</h4>
              <ul className="space-y-4">
                <li><Link to="/terms-of-service" className="text-white/50 hover:text-primary font-bold transition-colors">{t('landing.footer.terms')}</Link></li>
                <li><Link to="/privacy-policy" className="text-white/50 hover:text-primary font-bold transition-colors">{t('landing.footer.privacy')}</Link></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center pt-10 border-t border-white/5 text-white/40 text-sm gap-6">
            <p className="font-medium">&copy; {new Date().getFullYear()} AGROGINA. {t('landing.footer.copyright')}</p>
            <p className="max-w-full px-4 py-2 text-center text-xs font-medium normal-case leading-snug tracking-normal text-white/70 sm:text-sm">
              <span className="inline-flex flex-wrap items-center justify-center gap-x-1 rounded-full border border-white/10 bg-white/5 px-4 py-1.5">
                <Trans
                  i18nKey="landing.footer.madeInCredit"
                  components={{
                    codelovers: (
                      <a
                        href="https://wearecodelovers.com/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-primary underline decoration-primary/40 underline-offset-2 transition-colors hover:text-primary hover:decoration-primary"
                      />
                    ),
                  }}
                />
              </span>
            </p>
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
