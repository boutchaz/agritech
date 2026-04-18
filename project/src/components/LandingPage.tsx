import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import heroBg from '../assets/bg-360-day.webp';
import { appConfig } from '@/config/app';
import { toast } from 'sonner';
import SupportedRegionsSection from './SupportedRegionsSection';

const LandingPage = () => {
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

    const onScroll = () => {
      const top = getScrollTop();
      setScrolled(top > 50);
    };
    
    onScroll(); // sync initial state

    if (scrollParent === window) {
      window.addEventListener('scroll', onScroll, { passive: true });
      return () => window.removeEventListener('scroll', onScroll);
    }

    scrollParent.addEventListener('scroll', onScroll, { passive: true });
    return () => scrollParent.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const target = e.target as HTMLElement;
          target.classList.add('opacity-100', 'translate-y-0');
          io.unobserve(e.target);
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -50px 0px' },
    );

    const observeAll = () => {
      document.querySelectorAll('.reveal-on-scroll').forEach((el) => {
        if (!el.classList.contains('opacity-100')) {
          io.observe(el);
        }
      });
    };

    const timer = setTimeout(observeAll, 100);

    const mo = new MutationObserver(() => { observeAll(); });
    mo.observe(document.body, { childList: true, subtree: true });

    return () => { clearTimeout(timer); io.disconnect(); mo.disconnect(); };
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
        .hero-underline {
          background-image: linear-gradient(transparent 60%, hsl(var(--primary) / 0.35) 60%);
          background-repeat: no-repeat;
          background-size: 100% 100%;
          padding: 0 0.15em;
        }
      `}} />

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


          <nav className="hidden lg:flex gap-6 xl:gap-8">
            {(['modules', 'how-it-works', 'faq'] as const).map((id) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className={`bg-transparent border-none font-semibold text-[0.9rem] xl:text-[0.95rem] cursor-pointer transition-all duration-300 whitespace-nowrap ${
                  scrolled ? 'text-foreground/80 hover:text-primary' : 'text-white/80 hover:text-white'
                }`}
              >
                {id === 'modules' ? t('landing.nav.features') : id === 'how-it-works' ? t('landing.nav.howItWorks') : t('landing.nav.faq')}
              </button>
            ))}
            <Link
              to="/blog"
              className={`font-semibold text-[0.9rem] xl:text-[0.95rem] transition-all duration-300 whitespace-nowrap ${
                scrolled ? 'text-foreground/80 hover:text-primary' : 'text-white/80 hover:text-white'
              }`}
            >
              {t('landing.nav.blog')}
            </Link>
          </nav>

          <div className="hidden lg:flex items-center gap-3 xl:gap-4">
            <LanguageSwitcher />
            <Link
              to="/login"
              className={`inline-block px-3 xl:px-4 py-2 rounded-xl font-semibold text-[0.9rem] xl:text-[0.95rem] transition-all duration-300 whitespace-nowrap ${
                scrolled
                  ? 'text-foreground hover:text-primary'
                  : 'text-white/90 hover:text-white'
              }`}
            >
              {t('auth.login', 'Connexion')}
            </Link>
            <button
              onClick={() => scrollTo('contact')}
              className="inline-block px-4 xl:px-5 py-2.5 rounded-xl font-bold text-[0.9rem] xl:text-[0.95rem] bg-primary text-primary-foreground hover:bg-primary/90 hover:scale-105 active:scale-95 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer whitespace-nowrap"
            >
              {t('landing.hero.ctaDemo', 'Commencer')}
            </button>
          </div>

          {/* Mobile menu button */}
          <button
            className="lg:hidden flex flex-col gap-[5px] bg-transparent border-none cursor-pointer p-2"
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
          className="fixed inset-0 z-[1001] flex lg:hidden flex-col bg-[#111] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
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
        <section id="hero" className="relative min-h-screen pt-32 pb-16 flex items-center bg-[#0f0f10] overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-20 z-[1]"
            style={{
              backgroundImage: `url(${heroBg})`,
              maskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
              WebkitMaskImage: 'linear-gradient(to bottom, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)',
            }}
          />

          <div className="relative z-[2] w-full max-w-[1200px] mx-auto px-6 grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-16 items-center">
            <div className="reveal-on-scroll opacity-0 translate-y-[16px] transition-all duration-700 ease-out">
              <h1 className="font-[Montserrat,sans-serif] font-extrabold text-white text-[clamp(2.25rem,5vw,4rem)] leading-[1.05] tracking-tight">
                {t('landing.hero.title')}
              </h1>
              <h2 className="mt-3 text-white/90 text-[clamp(1.25rem,2.4vw,1.75rem)] font-[Montserrat,sans-serif] font-semibold">
                <span className="hero-underline">{t('landing.hero.highlight')}</span>
              </h2>
              <p className="mt-6 text-gray-300/90 text-base md:text-lg max-w-[48ch] leading-relaxed">
                {t('landing.hero.subtitle')}
              </p>

              <div className="mt-8 flex gap-3 flex-wrap">
                <button
                  onClick={() => scrollTo('contact')}
                  className="px-6 py-3 rounded-lg font-semibold text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 cursor-pointer"
                >
                  {t('landing.hero.ctaDemo')}
                </button>
                <button
                  onClick={() => scrollTo('modules')}
                  className="px-6 py-3 rounded-lg font-semibold text-base text-white/85 hover:text-white border border-white/15 hover:border-white/40 transition-colors duration-200 cursor-pointer"
                >
                  {t('landing.hero.ctaDiscover')}
                </button>
              </div>
            </div>

            <div className="reveal-on-scroll opacity-0 translate-y-[16px] transition-all duration-700 ease-out delay-100">
              <div
                onClick={openVideoModal}
                className="relative rounded-lg overflow-hidden border border-white/10 cursor-pointer aspect-video group"
              >
                <picture>
                  <source srcSet="/assets/video-thumbnail.webp" type="image/webp" />
                  <img src="/assets/video-thumbnail.png" alt="Demo AGROGINA" className="w-full h-full object-cover" loading="lazy" />
                </picture>
                <div className="absolute inset-0 bg-black/30 group-hover:bg-black/15 transition-colors duration-200" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white/95 rounded-full flex items-center justify-center">
                  <Play className="w-6 h-6 text-[#0f0f10] ml-0.5" fill="currentColor" />
                </div>
              </div>
            </div>
          </div>
        </section>


        {/* MODULES */}
        <section id="modules" className="py-20 bg-background">
          <div className="max-w-[1100px] mx-auto px-6">
            <div className="max-w-[600px] mb-14 reveal-on-scroll opacity-0 translate-y-[16px] transition-all duration-500 ease-out">
              <h2 className="font-[Montserrat,sans-serif] font-extrabold text-[clamp(1.75rem,3.5vw,2.5rem)] text-foreground tracking-tight leading-[1.15]">
                {t('landing.modules.title')}
              </h2>
              <p className="mt-4 text-base md:text-lg text-muted-foreground">
                {t('landing.modules.subtitle')}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
              {modules.map(({ icon: Icon, key, color }) => (
                <div
                  key={key}
                  className="reveal-on-scroll opacity-0 translate-y-[12px] transition-all duration-500 ease-out flex gap-4"
                >
                  <div className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-[Montserrat,sans-serif] font-semibold text-[1.05rem] text-foreground">
                      {t(`landing.modules.${key}`)}
                    </h3>
                    <p className="mt-1.5 text-muted-foreground text-[0.95rem] leading-relaxed">
                      {t(`landing.modules.${key}Desc`)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* HOW IT WORKS */}
        <section id="how-it-works" className="py-20 bg-secondary/30 border-y border-border/50">
          <div className="max-w-[900px] mx-auto px-6">
            <h2 className="mb-12 font-[Montserrat,sans-serif] font-extrabold text-[clamp(1.75rem,3.5vw,2.5rem)] text-foreground tracking-tight">
              {t('landing.steps.title')}
            </h2>

            <ol className="space-y-10">
              {[1, 2, 3].map((n) => (
                <li
                  key={n}
                  className="reveal-on-scroll opacity-0 translate-y-[12px] transition-all duration-500 ease-out flex gap-5 md:gap-7"
                >
                  <span className="shrink-0 font-[Montserrat,sans-serif] text-4xl md:text-5xl font-extrabold text-primary/80 leading-none tabular-nums w-10 md:w-14">
                    {String(n).padStart(2, '0')}
                  </span>
                  <div className="pt-1.5">
                    <h3 className="font-[Montserrat,sans-serif] font-semibold text-lg md:text-xl text-foreground">
                      {t(`landing.steps.step${n}Title`)}
                    </h3>
                    <p className="mt-2 text-muted-foreground leading-relaxed max-w-[55ch]">
                      {t(`landing.steps.step${n}Desc`)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
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
              ] as const).map(({ key, icon: Icon, tint }) => (
                <div
                  key={key}
                  className="flex gap-5 items-start p-7 rounded-xl bg-secondary/20 border border-border/50 hover:border-primary/30 transition-colors duration-300 reveal-on-scroll opacity-0 translate-y-[16px] transition-all duration-500 ease-out"
                >
                  <div className={`shrink-0 w-12 h-12 rounded-xl flex items-center justify-center
                    ${tint === 'primary' ? 'bg-primary/10 text-primary' : ''}
                    ${tint === 'blue' ? 'bg-blue-500/10 text-blue-500' : ''}
                    ${tint === 'green' ? 'bg-emerald-500/10 text-emerald-500' : ''}
                    ${tint === 'orange' ? 'bg-orange-500/10 text-orange-500' : ''}
                  `}>
                    <Icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-[Montserrat,sans-serif] font-bold text-lg mb-2 text-foreground">
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


        {/* SUPPORTED REGIONS */}
        <SupportedRegionsSection />

        {/* PRICING */}
        <section id="pricing" className="py-20 bg-secondary/40 border-t border-border/50">
          <div className="max-w-[720px] mx-auto px-6 reveal-on-scroll opacity-0 translate-y-[12px] transition-all duration-500 ease-out">
            <h2 className="font-[Montserrat,sans-serif] font-extrabold text-[clamp(1.75rem,3.5vw,2.5rem)] text-foreground tracking-tight">
              {t('landing.pricing.title')}
            </h2>
            <p className="mt-4 text-base md:text-lg text-muted-foreground">
              {t('landing.pricing.subtitle')}
            </p>
            <p className="mt-8 text-foreground leading-relaxed">
              {t('landing.pricing.text')}
            </p>
            <button
              onClick={() => scrollTo('contact')}
              className="mt-8 px-6 py-3 rounded-lg font-semibold text-base bg-primary text-primary-foreground hover:bg-primary/90 transition-colors duration-200 cursor-pointer"
            >
              {t('landing.pricing.cta')}
            </button>
          </div>
        </section>

        {/* BUSINESS PLAN SIMULATOR */}
        <section id="business-plan" className="py-24 bg-primary relative overflow-hidden">
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
                <div className="bg-white/10 border border-white/20 rounded-2xl p-8">
                  <ul className="flex flex-col gap-5">
                    {[1, 2, 3].map((n) => (
                      <li key={n} className="flex items-center gap-4">
                        <div className="shrink-0 w-10 h-10 bg-background text-primary rounded-lg flex items-center justify-center">
                          <Check className="w-5 h-5" />
                        </div>
                        <span className="text-lg font-semibold text-primary-foreground">{t(`landing.bp.feature${n}`)}</span>
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
                <div key={n} className={`border border-border/60 rounded-xl overflow-hidden transition-colors duration-200 ${activeFaq === n ? 'border-primary/30' : 'hover:border-primary/20'}`}>
                  <button
                    className="w-full px-6 py-5 flex justify-between items-center gap-4 bg-transparent border-none text-base md:text-lg font-semibold text-foreground cursor-pointer text-left"
                    onClick={() => setActiveFaq(activeFaq === n ? null : n)}
                  >
                    <span>{t(`landing.faq.q${n}`)}</span>
                    <span className={`shrink-0 text-xl leading-none transition-transform duration-200 ${activeFaq === n ? 'rotate-45 text-primary' : 'text-muted-foreground'}`}>+</span>
                  </button>
                  <div
                    className={`transition-all duration-300 ease-out ${activeFaq === n ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'}`}
                    style={{ overflow: 'hidden' }}
                  >
                    <div className="px-6 pb-6 text-muted-foreground leading-relaxed">
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
              <div className="reveal-on-scroll translate-y-[12px] opacity-0 transition-all duration-500 ease-out">
                <h2 className="mb-5 font-[Montserrat,sans-serif] text-[clamp(1.75rem,4vw,2.5rem)] font-extrabold leading-[1.1] tracking-tight">
                  {t('landing.contact.title')}
                </h2>
                <p className="text-base md:text-lg opacity-90 leading-relaxed max-w-[50ch]">
                  {t('landing.contact.subtitle')}
                </p>
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
                      <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="landing-contact-name">
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
                      <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="landing-contact-email">
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
                      <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="landing-contact-phone">
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
                      <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="landing-contact-size">
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
                    <label className="mb-2 block text-sm font-medium text-foreground" htmlFor="landing-contact-message">
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
                    className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 border border-white/5 transition-colors duration-200"
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
              <h4 className="text-white font-semibold text-sm mb-6">{t('landing.footer.product')}</h4>
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
              <h4 className="text-white font-semibold text-sm mb-6">{t('landing.footer.company')}</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-white/50 hover:text-primary font-bold transition-colors">{t('landing.footer.about')}</a></li>
                <li><Link to="/blog" className="text-white/50 hover:text-primary font-bold transition-colors">{t('landing.footer.blog')}</Link></li>
                <li><button onClick={() => scrollTo('contact')} className="text-white/50 hover:text-primary font-bold transition-colors bg-transparent border-none cursor-pointer">{t('landing.footer.contact')}</button></li>
              </ul>
            </div>

            <div>
              <h4 className="text-white font-semibold text-sm mb-6">{t('landing.footer.legal')}</h4>
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
