import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Droplets,
  LayoutGrid,
  Leaf,
  Mail,
  Menu,
  Plus,
  Receipt,
  Sprout,
  Users,
  Warehouse,
  X,
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import SupportedRegionsSection from './SupportedRegionsSection';
import { WowIntro } from './WowIntro';
import { useLandingSettings } from '@/hooks/useLandingSettings';
import { useSupportInfo } from '@/hooks/useSupportInfo';
import { appConfig } from '@/config/app';
import DemoRequestForm from './landing/DemoRequestForm';

const INTRO_KEY = 'agrogina:intro-seen';

import '../styles/onboarding-tokens.css';

type T = (key: string, fallback?: string) => string;

/* ────────────────────────────────────────────────────────── shared bits */

function AgroginaWordmark({ size = 26 }: { size?: number }) {
  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10 }}>
      <picture>
        <source srcSet="/assets/logo.webp" type="image/webp" />
        <img src="/assets/logo.png" alt="Agrogina" style={{ height: size, width: 'auto', display: 'block' }} />
      </picture>
      <span
        style={{
          fontFamily: 'var(--onb-font-display)',
          fontSize: size * 0.7,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: 'var(--onb-ink-900)',
        }}
      >
        agrogina
      </span>
    </div>
  );
}

function CornerMarks({ inset = 16, color = 'rgba(15,32,26,.18)', size = 12 }: { inset?: number; color?: string; size?: number }) {
  const arm = `${size}px`;
  const base = { position: 'absolute' as const, width: arm, height: arm, borderColor: color, borderStyle: 'solid' as const, borderWidth: 0 };
  return (
    <>
      <span style={{ ...base, top: inset, left: inset, borderTopWidth: 1, borderLeftWidth: 1 }} />
      <span style={{ ...base, top: inset, right: inset, borderTopWidth: 1, borderRightWidth: 1 }} />
      <span style={{ ...base, bottom: inset, left: inset, borderBottomWidth: 1, borderLeftWidth: 1 }} />
      <span style={{ ...base, bottom: inset, right: inset, borderBottomWidth: 1, borderRightWidth: 1 }} />
    </>
  );
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
  dark,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: string;
  dark?: boolean;
}) {
  return (
    <div className="lp-section-head">
      {eyebrow && (
        <div className="onb-mono-cap" style={{ color: dark ? 'var(--onb-brand-100)' : 'var(--onb-brand-700)', marginBottom: 14 }}>
          <span
            style={{
              display: 'inline-block',
              width: 18,
              height: 1,
              background: dark ? 'var(--onb-brand-100)' : 'var(--onb-brand-600)',
              verticalAlign: 'middle',
              marginInlineEnd: 8,
            }}
          />
          {eyebrow}
        </div>
      )}
      <h2
        className="onb-h-display lp-section-title"
        style={{
          color: dark ? 'white' : 'var(--onb-ink-900)',
          textWrap: 'balance' as CSSProperties['textWrap'],
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          className="lp-section-sub"
          style={{ color: dark ? 'rgba(255,255,255,.7)' : 'var(--onb-ink-600)', textWrap: 'pretty' as CSSProperties['textWrap'] }}
        >
          {subtitle}
        </p>
      )}
    </div>
  );
}

/* ────────────────────────────────────────────────────────── field SVG */

function FieldScene() {
  return (
    <svg
      viewBox="0 0 600 800"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lp-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#e8f4d4" />
          <stop offset="100%" stopColor="#fef6e0" />
        </linearGradient>
        <radialGradient id="lp-sun" cx="0.7" cy="0.25" r="0.5">
          <stop offset="0%" stopColor="rgba(255, 220, 140, .8)" />
          <stop offset="100%" stopColor="rgba(255, 220, 140, 0)" />
        </radialGradient>
      </defs>
      <rect x="0" y="0" width="600" height="450" fill="url(#lp-sky)" />
      <rect x="0" y="0" width="600" height="500" fill="url(#lp-sun)" />
      <circle cx="430" cy="180" r="60" fill="#fce8a3" opacity="0.85" />
      <path d="M0 420 Q 150 380, 300 410 T 600 400 L 600 480 L 0 480 Z" fill="#a4c281" opacity=".5" />
      <path d="M0 450 Q 200 420, 400 445 T 600 440 L 600 500 L 0 500 Z" fill="#7fa05f" opacity=".7" />
      {Array.from({ length: 18 }).map((_, i) => {
        const yTop = 460 + (i / 17) ** 2 * 240;
        const yBot = 460 + ((i + 1) / 17) ** 2 * 240;
        const colors = ['#7fa05f', '#9bbf6c', '#88aa57', '#6f9249', '#a8cd76'];
        return (
          <path
            key={i}
            d={`M0 ${yTop} L 600 ${yTop} L 600 ${yBot} L 0 ${yBot} Z`}
            fill={colors[i % colors.length]}
          />
        );
      })}
      <path d="M150 220 q 8 -8 16 0 q 8 -8 16 0" stroke="#3f6212" strokeWidth="2" fill="none" strokeLinecap="round" />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────── nav */

const NAV_LINK_KEYS: { key: string; defaultLabel: string; href: string }[] = [
  { key: 'landing2.nav.platform', defaultLabel: 'Plateforme', href: '#platform' },
  { key: 'landing2.nav.modules', defaultLabel: 'Modules', href: '#modules' },
  { key: 'landing2.nav.pricing', defaultLabel: 'Tarifs', href: '#pricing' },
  { key: 'landing2.nav.clients', defaultLabel: 'Clients', href: '#testimonials' },
  { key: 'landing2.nav.faq', defaultLabel: 'FAQ', href: '#faq' },
];

function LandingNav({ t, onMenu, onTrial }: { t: T; onMenu: () => void; onTrial: () => void }) {
  return (
    <header className="lp-nav">
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, minWidth: 0 }}>
        <AgroginaWordmark size={26} />
        <div className="lp-nav-divider" />
        <nav className="lp-nav-links">
          {NAV_LINK_KEYS.map((l) => (
            <a key={l.href} href={l.href} className="lp-nav-link">
              {t(l.key, l.defaultLabel)}
            </a>
          ))}
        </nav>
      </div>
      <div className="lp-nav-actions">
        <div className="lp-lang-desktop">
          <LanguageSwitcher />
        </div>
        <Link to="/login" search={{ redirect: undefined }} className="lp-nav-link lp-login">
          {t('landing2.nav.login', 'Connexion')}
        </Link>
        <button type="button" onClick={onTrial} className="onb-btn onb-btn-primary lp-cta-btn">
          {t('landing2.nav.trial', 'Essai gratuit')}
          <ArrowRight size={14} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          aria-label={t('landing2.nav.menu', 'Menu')}
          onClick={onMenu}
          className="lp-nav-burger"
        >
          <Menu size={20} />
        </button>
      </div>
    </header>
  );
}

function MobileNav({
  t,
  onClose,
  onDemo,
  onTrial,
}: {
  t: T;
  onClose: () => void;
  onDemo: () => void;
  onTrial: () => void;
}) {
  return (
    <div className="lp-mobile-nav" role="dialog" aria-modal="true">
      <div className="lp-mobile-nav-head">
        <AgroginaWordmark size={24} />
        <button
          type="button"
          aria-label={t('landing2.nav.close', 'Fermer')}
          onClick={onClose}
          className="lp-icon-btn"
        >
          <X size={18} />
        </button>
      </div>
      <nav className="lp-mobile-nav-links">
        {NAV_LINK_KEYS.map((l) => (
          <a key={l.href} href={l.href} onClick={onClose}>
            {t(l.key, l.defaultLabel)}
          </a>
        ))}
        <Link
          to="/login"
          search={{ redirect: undefined }}
          onClick={onClose}
          style={{ padding: '14px 12px', borderRadius: 10, fontSize: 17, fontWeight: 500, color: 'var(--onb-ink-900)', textDecoration: 'none' }}
        >
          {t('landing2.nav.login', 'Connexion')}
        </Link>
      </nav>
      <div className="lp-mobile-nav-actions">
        <LanguageSwitcher />
        <button
          type="button"
          onClick={() => {
            onClose();
            onTrial();
          }}
          className="onb-btn onb-btn-primary"
          style={{ width: '100%' }}
        >
          {t('landing2.nav.trial', 'Essai gratuit')}
          <ArrowRight size={16} strokeWidth={1.8} />
        </button>
        <button
          type="button"
          onClick={() => {
            onClose();
            onDemo();
          }}
          className="onb-btn onb-btn-ghost"
          style={{ width: '100%' }}
        >
          {t('landing2.nav.demo', 'Réserver une démo')}
        </button>
      </div>
    </div>
  );
}

/* ────────────────────────────────────────────────────────── hero */

function HeroStat({ label, value, unit, trend }: { label: string; value: string; unit: string; trend: 'up' | 'flat' | 'down' }) {
  const arrow = trend === 'up' ? '▲' : trend === 'down' ? '▼' : '·';
  const color = trend === 'up' ? 'var(--onb-brand-600)' : trend === 'down' ? 'var(--onb-terracotta-500)' : 'var(--onb-ink-400)';
  return (
    <div>
      <div className="onb-mono" style={{ fontSize: 9, color: 'var(--onb-ink-400)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
      </div>
      <div className="onb-h-display" style={{ fontSize: 22, lineHeight: 1, marginTop: 3 }}>
        {value}
      </div>
      <div className="onb-mono" style={{ fontSize: 9, color, marginTop: 2, display: 'flex', gap: 4 }}>
        <span>{arrow}</span>
        <span>{unit}</span>
      </div>
    </div>
  );
}

function Hero({
  t,
  onDemo,
  onTrial,
  stats,
}: {
  t: T;
  onDemo: () => void;
  onTrial: () => void;
  stats: { value: string; label: string }[];
}) {
  return (
    <section className="lp-hero">
      <div className="lp-hero-copy">
        <div className="lp-hero-eyebrow-row">
          <span className="onb-mono-cap" style={{ color: 'var(--onb-brand-700)' }}>
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'var(--onb-brand-600)',
                boxShadow: '0 0 0 4px rgba(16,185,129,.15)',
                marginInlineEnd: 8,
                verticalAlign: 'middle',
              }}
            />
            {t('landing2.hero.badge', 'Plateforme agricole · Saison 25/26')}
          </span>
          <span className="onb-mono" style={{ fontSize: 10, color: 'var(--onb-ink-400)' }}>
            {t('landing2.hero.version', 'v2026.05')}
          </span>
        </div>

        <div>
          <h1 className="onb-h-display lp-hero-title">
            {t('landing2.hero.titleL1', 'Cultivez')}
            <br />
            {t('landing2.hero.titleL2', 'avec ')}
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--onb-brand-700)' }}>
              {t('landing2.hero.titleEm', 'précision.')}
            </em>
            <br />
            {t('landing2.hero.titleL3', 'Décidez avec données.')}
          </h1>
          <p className="lp-hero-sub">
            {t(
              'landing2.hero.subtitle',
              "Agrogina réunit la gestion de vos parcelles, vos équipes, vos stocks et vos capteurs dans un seul espace — de la graine à la facture.",
            )}
          </p>

          <div className="lp-hero-ctas">
            <button type="button" onClick={onTrial} className="onb-btn onb-btn-primary lp-cta-primary">
              {t('landing2.hero.ctaTrial', "Démarrer l'essai gratuit")}
              <ArrowRight size={18} strokeWidth={1.8} />
            </button>
            <button type="button" onClick={onDemo} className="onb-btn onb-btn-ghost lp-cta-ghost">
              {t('landing2.hero.ctaDemo', 'Réserver une démo')}
            </button>
            <span className="onb-mono lp-trial-note">
              {t('landing2.hero.trialNote', '14 jours · sans carte')}
            </span>
          </div>
        </div>

        <div className="lp-hero-stats">
          <div className="onb-mono-cap" style={{ marginBottom: 14, color: 'var(--onb-ink-500)' }}>
            {t('landing2.hero.statsTitle', 'Conçu pour la réalité du terrain')}
          </div>
          <div className="lp-hero-stats-grid">
            {stats.map((s, i) => (
              <div key={`${s.label}-${i}`}>
                <div className="onb-h-display" style={{ fontSize: 26, lineHeight: 1, marginBottom: 6 }}>
                  {s.value}
                </div>
                <div
                  className="onb-mono"
                  style={{ fontSize: 10, color: 'var(--onb-ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="lp-hero-visual">
        <FieldScene />

        <div className="lp-hero-station">
          <div className="onb-mono-cap" style={{ marginBottom: 10, fontSize: 9.5 }}>
            {t('landing2.hero.station', 'Station · Champ Nord-7')}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
            <HeroStat label={t('landing2.hero.soil', 'Sol')} value="58%" unit={t('landing2.hero.unitHum', 'hum')} trend="up" />
            <HeroStat label={t('landing2.hero.air', 'Air')} value="22°" unit="C" trend="flat" />
            <HeroStat label={t('landing2.hero.wind', 'Vent')} value="11" unit="km/h" trend="up" />
          </div>
          <div className="onb-tick-rule" style={{ margin: '12px 0 8px' }} />
          <div
            className="onb-mono"
            style={{ fontSize: 9.5, color: 'var(--onb-ink-400)', display: 'flex', justifyContent: 'space-between' }}
          >
            <span>{t('landing2.hero.sync', '↻ Sync · 12s')}</span>
            <span>NODE-A7Q</span>
          </div>
        </div>

        <div className="lp-hero-region">
          <div className="onb-mono-cap" style={{ color: 'rgba(255,255,255,.55)', marginBottom: 4, fontSize: 9 }}>
            {t('landing2.hero.region', 'Région · Marrakech-Safi')}
          </div>
          <div className="onb-mono" style={{ fontSize: 12 }}>
            31.6294° N &nbsp;·&nbsp; 7.9811° W
          </div>
        </div>

        <div className="lp-hero-alert">
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: '#fef3c7',
                color: '#b45309',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Droplets size={14} strokeWidth={1.8} />
            </div>
            <div>
              <div className="onb-mono-cap" style={{ fontSize: 9, color: 'var(--onb-ink-500)', marginBottom: 3 }}>
                {t('landing2.hero.alert', 'Alerte · 09h12')}
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35 }}>
                {t('landing2.hero.alertText', 'Irrigation recommandée · Parcelle 4-B')}
              </div>
            </div>
          </div>
        </div>

        <CornerMarks inset={20} color="rgba(15,32,26,.18)" size={14} />
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── logo strip */

function LogoStrip({ t, partners }: { t: T; partners: string[] }) {
  return (
    <section className="lp-logos-section">
      <div className="onb-mono-cap" style={{ textAlign: 'center', marginBottom: 22, color: 'var(--onb-ink-500)' }}>
        {t('landing2.logos.title', 'Ils nous font confiance')}
      </div>
      <div className="lp-logos">
        {partners.map((p, i) => (
          <div
            key={p}
            style={{
              textAlign: 'center',
              fontFamily: i % 3 === 0 ? 'var(--onb-font-display)' : 'var(--onb-font-body)',
              fontSize: i % 3 === 0 ? 19 : 13,
              fontWeight: i % 3 === 0 ? 500 : 600,
              color: 'var(--onb-ink-500)',
              letterSpacing: i % 3 === 0 ? '-0.01em' : '0.04em',
              textTransform: i % 3 === 0 ? 'none' : 'uppercase',
              opacity: 0.75,
            }}
          >
            {p}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── product preview */

function MapMock({ t }: { t: T }) {
  const parcels = [
    t('landing2.mock.p1', 'Nord-7 · Blé'),
    t('landing2.mock.p2', 'Est-3 · Olivier'),
    t('landing2.mock.p3', 'Sud-1 · Agrumes'),
    t('landing2.mock.p4', 'Ouest-5 · Maraîchage'),
    t('landing2.mock.p5', 'Nord-2 · Jachère'),
  ];
  const details: [string, string][] = [
    [t('landing2.mock.crop', 'Culture'), t('landing2.mock.cropV', 'Blé tendre')],
    [t('landing2.mock.area', 'Surface'), '49.2 ha'],
    [t('landing2.mock.stage', 'Stade'), t('landing2.mock.stageV', 'Tallage')],
    [t('landing2.mock.soilHum', 'Humidité sol'), '58%'],
    [t('landing2.mock.lastRain', 'Dernière pluie'), t('landing2.mock.lastRainV', 'Il y a 4j')],
  ];
  return (
    <div className="lp-mock-map">
      <aside className="lp-mock-side">
        <div className="onb-mono-cap" style={{ marginBottom: 12, fontSize: 9.5 }}>
          {t('landing2.mock.parcels', 'Parcelles · 12')}
        </div>
        {parcels.map((p, i) => (
          <div
            key={p}
            style={{
              padding: '10px 12px',
              borderRadius: 8,
              background: i === 0 ? 'var(--onb-brand-50)' : 'transparent',
              border: i === 0 ? '1px solid var(--onb-brand-100)' : '1px solid transparent',
              fontSize: 12.5,
              color: 'var(--onb-ink-800)',
              marginBottom: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{p}</span>
            <span className="onb-mono" style={{ fontSize: 10, color: 'var(--onb-ink-500)' }}>
              {(i + 1) * 7} ha
            </span>
          </div>
        ))}
      </aside>
      <div style={{ position: 'relative', background: '#a8884a', overflow: 'hidden' }}>
        <svg viewBox="0 0 800 450" preserveAspectRatio="xMidYMid slice" style={{ width: '100%', height: '100%' }}>
          <defs>
            <pattern id="lp-rA" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(20)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="rgba(0,0,0,.18)" strokeWidth=".8" />
            </pattern>
            <pattern id="lp-rB" patternUnits="userSpaceOnUse" width="8" height="8" patternTransform="rotate(-30)">
              <line x1="0" y1="0" x2="0" y2="8" stroke="rgba(0,0,0,.15)" strokeWidth=".8" />
            </pattern>
          </defs>
          <rect width="800" height="450" fill="#a8884a" />
          <path d="M0 60 L 360 50 L 380 240 L 0 250 Z" fill="#7fa05f" />
          <path d="M0 60 L 360 50 L 380 240 L 0 250 Z" fill="url(#lp-rA)" />
          <path d="M400 60 L 800 80 L 800 220 L 410 230 Z" fill="#c5a85a" />
          <path d="M400 60 L 800 80 L 800 220 L 410 230 Z" fill="url(#lp-rB)" opacity=".7" />
          <path d="M0 270 L 380 260 L 390 410 L 0 430 L 0 270 Z" fill="#9bbf6c" />
          <path d="M0 270 L 380 260 L 390 410 L 0 430 L 0 270 Z" fill="url(#lp-rA)" opacity=".5" />
          <path d="M420 250 L 800 240 L 800 360 L 430 370 Z" fill="#bfd485" />
          <path d="M420 250 L 800 240 L 800 360 L 430 370 Z" fill="url(#lp-rB)" opacity=".5" />
          <path d="M430 380 L 800 370 L 800 450 L 440 450 Z" fill="#5a7c3a" />
          <path d="M395 0 L 405 450" stroke="#e3d2b0" strokeWidth="3" />
          <path d="M0 245 L 800 240" stroke="#e3d2b0" strokeWidth="3" />
        </svg>
        {[
          { x: '32%', y: '38%' },
          { x: '64%', y: '52%' },
          { x: '48%', y: '72%' },
        ].map((p) => (
          <div
            key={p.x + p.y}
            style={{
              position: 'absolute',
              left: p.x,
              top: p.y,
              width: 12,
              height: 12,
              borderRadius: 999,
              background: 'var(--onb-brand-500)',
              boxShadow: '0 0 0 4px rgba(10,143,95,.25), 0 0 0 10px rgba(10,143,95,.12)',
            }}
          />
        ))}
      </div>
      <aside className="lp-mock-side lp-mock-side-right">
        <div className="onb-mono-cap" style={{ marginBottom: 12, fontSize: 9.5 }}>
          {t('landing2.mock.details', 'Détails · Nord-7')}
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {details.map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px dashed var(--onb-rule)',
                paddingBottom: 6,
                fontSize: 12,
              }}
            >
              <span style={{ color: 'var(--onb-ink-500)' }}>{k}</span>
              <span style={{ fontWeight: 500 }}>{v}</span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 14,
            padding: 10,
            borderRadius: 8,
            background: '#fef3c7',
            color: '#92400e',
            fontSize: 11.5,
            lineHeight: 1.4,
          }}
        >
          <strong>{t('landing2.mock.recoLabel', 'Recommandation :')}</strong>{' '}
          {t('landing2.mock.recoText', 'irrigation 18mm dans les 48h.')}
        </div>
      </aside>
    </div>
  );
}

function TasksMock({ t }: { t: T }) {
  type Status = 'done' | 'active' | 'pending';
  const tasks: { time: string; who: string; task: string; dur: string; status: Status }[] = [
    { time: '06:30', who: 'Hassan A.', task: t('landing2.tasks.t1', 'Irrigation · Parcelle 4-B'), dur: '2h', status: 'done' },
    { time: '08:00', who: t('landing2.tasks.team1', 'Équipe Récolte'), task: t('landing2.tasks.t2', 'Cueillette agrumes · Sud-1'), dur: '5h', status: 'active' },
    { time: '10:00', who: 'Karim M.', task: t('landing2.tasks.t3', 'Traitement bio · Olivier'), dur: '3h', status: 'active' },
    { time: '14:00', who: 'Saida B.', task: t('landing2.tasks.t4', 'Inspection capteurs · Nord-7'), dur: '1h', status: 'pending' },
    { time: '16:00', who: t('landing2.tasks.team2', 'Équipe Stock'), task: t('landing2.tasks.t5', 'Réception engrais · Entrepôt 2'), dur: '2h', status: 'pending' },
  ];
  return (
    <div style={{ padding: 24, height: 'calc(100% - 41px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <h3 className="onb-h-display" style={{ fontSize: 22, margin: 0 }}>
          {t('landing2.tasks.today', "Aujourd'hui · Mardi 5 mai")}
        </h3>
        <span className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-500)' }}>
          {t('landing2.tasks.summary', '5 tâches · 13h')}
        </span>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {tasks.map((task) => (
          <div
            key={task.time}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr auto auto',
              gap: 14,
              alignItems: 'center',
              padding: '12px 14px',
              borderRadius: 10,
              background: task.status === 'active' ? 'var(--onb-brand-50)' : 'var(--onb-bg-paper)',
              border: '1px solid var(--onb-rule)',
            }}
          >
            <span className="onb-mono" style={{ fontSize: 12, color: 'var(--onb-ink-700)' }}>
              {task.time}
            </span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{task.task}</div>
              <div style={{ fontSize: 11.5, color: 'var(--onb-ink-500)', marginTop: 2 }}>{task.who}</div>
            </div>
            <span className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-500)' }}>
              {task.dur}
            </span>
            <span
              className="onb-mono"
              style={{
                fontSize: 9.5,
                padding: '3px 8px',
                borderRadius: 4,
                background:
                  task.status === 'done' ? 'var(--onb-ink-100)' : task.status === 'active' ? 'var(--onb-brand-600)' : 'transparent',
                color:
                  task.status === 'done' ? 'var(--onb-ink-600)' : task.status === 'active' ? 'white' : 'var(--onb-ink-500)',
                border: task.status === 'pending' ? '1px solid var(--onb-rule)' : 0,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}
            >
              {task.status === 'done'
                ? t('landing2.tasks.done', '✓ Fait')
                : task.status === 'active'
                ? t('landing2.tasks.active', '● En cours')
                : t('landing2.tasks.pending', 'À venir')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function YieldStat({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div>
      <div className="onb-mono-cap" style={{ fontSize: 9, marginBottom: 3 }}>
        {label}
      </div>
      <div className="onb-h-display" style={{ fontSize: 18, lineHeight: 1 }}>
        {value}
        {trend && <span style={{ fontSize: 11, color: 'var(--onb-brand-600)', marginInlineStart: 4 }}>{trend}</span>}
      </div>
    </div>
  );
}

function YieldMock({ t }: { t: T }) {
  const data = [42, 48, 55, 61, 58, 67, 72, 78, 81, 76, 84, 91];
  const max = Math.max(...data);
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return (
    <div style={{ padding: 24, height: 'calc(100% - 41px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h3 className="onb-h-display" style={{ fontSize: 22, margin: 0 }}>
            {t('landing2.yield.title', 'Rendement · Saison 25/26')}
          </h3>
          <div className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-500)', marginTop: 4 }}>
            {t('landing2.yield.sub', 'Tonnes / hectare · toutes parcelles')}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <YieldStat label={t('landing2.yield.total', 'Total')} value="2 847 t" />
          <YieldStat label={t('landing2.yield.avg', 'Moy./ha')} value="6.8 t" trend="+12%" />
          <YieldStat label={t('landing2.yield.target', 'Objectif')} value="3 200 t" />
        </div>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${data.length}, 1fr)`,
          gap: 6,
          height: 'calc(100% - 80px)',
          alignItems: 'flex-end',
        }}
      >
        {data.map((v, i) => (
          <div key={months[i] + i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div
              style={{
                width: '100%',
                height: `${(v / max) * 100}%`,
                background: i >= 9 ? 'var(--onb-brand-600)' : 'var(--onb-brand-100)',
                borderRadius: '4px 4px 0 0',
                position: 'relative',
              }}
            >
              {i === data.length - 1 && (
                <span
                  className="onb-mono"
                  style={{
                    position: 'absolute',
                    top: -22,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: 11,
                    color: 'var(--onb-brand-700)',
                    fontWeight: 600,
                  }}
                >
                  {v}t
                </span>
              )}
            </div>
            <span className="onb-mono" style={{ fontSize: 10, color: 'var(--onb-ink-400)' }}>
              {months[i]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ProductPreview({ t }: { t: T }) {
  const [tab, setTab] = useState<'map' | 'tasks' | 'yield'>('map');
  const tabs = [
    { id: 'map' as const, l: t('landing2.platform.tabMap', 'Carte parcellaire') },
    { id: 'tasks' as const, l: t('landing2.platform.tabTasks', 'Tâches du jour') },
    { id: 'yield' as const, l: t('landing2.platform.tabYield', 'Rendements') },
  ];
  return (
    <section id="platform" className="lp-section">
      <SectionHead
        eyebrow={t('landing2.platform.eyebrow', '01 · Plateforme')}
        title={
          <>
            {t('landing2.platform.titlePre', 'Un poste de pilotage ')}
            <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>
              {t('landing2.platform.titleEm', 'pour toute la ferme.')}
            </em>
          </>
        }
        subtitle={t(
          'landing2.platform.subtitle',
          'Cartographie temps-réel, planification des tâches, suivi des cultures et de la météo — réunis dans une interface pensée par et pour les agriculteurs.',
        )}
      />
      <div className="lp-tabs">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            onClick={() => setTab(tb.id)}
            className={`lp-tab ${tab === tb.id ? 'lp-tab-active' : ''}`}
          >
            {tb.l}
          </button>
        ))}
      </div>
      <div className="lp-mock-frame">
        <div className="lp-mock-window">
          <div className="lp-mock-window-bar">
            <div style={{ display: 'flex', gap: 5 }}>
              {[0, 1, 2].map((i) => (
                <span key={i} style={{ width: 10, height: 10, borderRadius: 999, background: '#e8e6df' }} />
              ))}
            </div>
            <div className="onb-mono lp-mock-url">agrogina.ma/mabella · {tab}</div>
          </div>
          {tab === 'map' && <MapMock t={t} />}
          {tab === 'tasks' && <TasksMock t={t} />}
          {tab === 'yield' && <YieldMock t={t} />}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── modules */

function ModulesSection({ t }: { t: T }) {
  const mods = [
    { n: '01', icon: Sprout, title: t('landing2.mod.m1', 'Multi-Fermes & Parcellaire'), desc: t('landing2.mod.m1d', 'Cartographie de vos parcelles, cultures, rotations.') },
    { n: '02', icon: LayoutGrid, title: t('landing2.mod.m2', 'Dashboard & Live Map'), desc: t('landing2.mod.m2d', 'Suivi temps-réel — météo, capteurs, équipes.') },
    { n: '03', icon: CheckCircle2, title: t('landing2.mod.m3', 'Tâches Agronomiques'), desc: t('landing2.mod.m3d', 'Planification, suivi GPS, signature de fin.') },
    { n: '04', icon: Leaf, title: t('landing2.mod.m4', 'Récolte & Traçabilité'), desc: t('landing2.mod.m4d', 'Lots, destinations, traçabilité de la graine au client.') },
    { n: '05', icon: Users, title: t('landing2.mod.m5', 'RH & Paie Agronomique'), desc: t('landing2.mod.m5d', 'Personnel fixe et journalier, paie, contrats.') },
    { n: '06', icon: Warehouse, title: t('landing2.mod.m6', 'Stocks & Entrepôts'), desc: t('landing2.mod.m6d', 'Alertes, fournisseurs, mouvements multi-sites.') },
    { n: '07', icon: Receipt, title: t('landing2.mod.m7', 'Compta & Facturation'), desc: t('landing2.mod.m7d', 'Devis, factures, relances, exports comptables.') },
    { n: '08', icon: Brain, title: t('landing2.mod.m8', 'Assistant IA'), desc: t('landing2.mod.m8d', 'Posez des questions à vos données en langage naturel.') },
  ];
  return (
    <section id="modules" className="lp-section lp-section-paper">
      <SectionHead
        eyebrow={t('landing2.modules.eyebrow', '02 · Modules')}
        title={
          <>
            {t('landing2.modules.titlePre', 'Une plateforme. ')}
            <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>
              {t('landing2.modules.titleEm', 'Huit métiers.')}
            </em>
          </>
        }
        subtitle={t('landing2.modules.subtitle', "Activez ce dont vous avez besoin. Tout est intégré, rien n'est cloisonné.")}
      />
      <div className="lp-modules">
        {mods.map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.n} className="lp-module-tile">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div className="lp-module-icon">
                  <Icon size={20} strokeWidth={1.6} />
                </div>
                <span className="onb-mono" style={{ fontSize: 10, color: 'var(--onb-ink-400)' }}>
                  {m.n}
                </span>
              </div>
              <div>
                <h4 className="onb-h-body" style={{ fontSize: 15, margin: '0 0 6px', color: 'var(--onb-ink-900)' }}>
                  {m.title}
                </h4>
                <p style={{ fontSize: 13, color: 'var(--onb-ink-500)', lineHeight: 1.5, margin: 0 }}>{m.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── how it works */

function HowItWorks({ t }: { t: T }) {
  const steps = [
    { n: '01', title: t('landing2.steps.s1', 'Configurez en 3 minutes'), desc: t('landing2.steps.s1d', 'Onboarding guidé : profil, exploitation, modules. Pas de paperasse.') },
    { n: '02', title: t('landing2.steps.s2', 'Tracez vos parcelles'), desc: t('landing2.steps.s2d', 'Importez un fichier KML ou délimitez à la main sur la carte satellite.') },
    { n: '03', title: t('landing2.steps.s3', 'Connectez vos capteurs'), desc: t('landing2.steps.s3d', 'Stations météo, sondes, automatismes — compatibles Modbus, LoRa, GSM.') },
    { n: '04', title: t('landing2.steps.s4', 'Pilotez la saison'), desc: t('landing2.steps.s4d', 'Tâches, équipes, rendements, factures — tout dans une vue unifiée.') },
  ];
  return (
    <section className="lp-section">
      <SectionHead
        eyebrow={t('landing2.steps.eyebrow', '03 · Démarrage')}
        title={
          <>
            {t('landing2.steps.titlePre', "De l'inscription au pilotage, ")}
            <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>
              {t('landing2.steps.titleEm', 'en une matinée.')}
            </em>
          </>
        }
        subtitle={t('landing2.steps.subtitle', "Pas besoin d'équipe IT. Pas de migration sans fin. Vous vous occupez du terrain.")}
      />
      <div className="lp-steps">
        {steps.map((s, i) => (
          <div key={s.n} className="lp-step" style={{ borderInlineStart: i === 0 ? 0 : '1px solid var(--onb-rule)' }}>
            <div
              className="onb-mono"
              style={{ fontSize: 11, color: 'var(--onb-brand-700)', fontWeight: 600, marginBottom: 18, letterSpacing: '0.04em' }}
            >
              {t('landing2.steps.label', 'ÉTAPE')} {s.n}
            </div>
            <h4 className="onb-h-display" style={{ fontSize: 22, margin: '0 0 10px', lineHeight: 1.1 }}>
              {s.title}
            </h4>
            <p style={{ fontSize: 13.5, color: 'var(--onb-ink-600)', lineHeight: 1.55, margin: 0 }}>{s.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── stats band */

function StatsBand({ t }: { t: T }) {
  const stats = [
    { v: '+24%', l: t('landing2.statsBand.s1', 'Rendement moyen'), s: t('landing2.statsBand.s1d', 'Sur cultures monitorées') },
    { v: '−38%', l: t('landing2.statsBand.s2', "Consommation d'eau"), s: t('landing2.statsBand.s2d', 'Irrigation optimisée') },
    { v: '6.2h', l: t('landing2.statsBand.s3', 'Économisées / sem.'), s: t('landing2.statsBand.s3d', 'Tâches automatisées') },
    { v: '4.9/5', l: t('landing2.statsBand.s4', 'Satisfaction client'), s: t('landing2.statsBand.s4d', '847 avis vérifiés') },
  ];
  return (
    <section className="lp-stats-section">
      <svg
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.07, pointerEvents: 'none' }}
        aria-hidden="true"
      >
        <defs>
          <pattern id="lp-grid-stats" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth=".5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lp-grid-stats)" />
      </svg>
      <div style={{ maxWidth: 1240, margin: '0 auto', position: 'relative' }}>
        <div className="onb-mono-cap" style={{ color: 'var(--onb-brand-100)', marginBottom: 18 }}>
          {t('landing2.statsBand.eyebrow', '04 · Impact mesuré')}
        </div>
        <h2 className="onb-h-display lp-stats-title">
          {t('landing2.statsBand.titleL1', 'Ce que change Agrogina,')}
          <br />
          <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-100)' }}>
            {t('landing2.statsBand.titleEm', 'en chiffres.')}
          </em>
        </h2>
        <div className="lp-stats">
          {stats.map((s) => (
            <div key={s.l}>
              <div className="onb-h-display lp-stat-value">{s.v}</div>
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>{s.l}</div>
              <div
                className="onb-mono"
                style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
              >
                {s.s}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── testimonials */

function Testimonials({
  t,
  featured,
  compact,
}: {
  t: T;
  featured: { quote: string; author: string; role: string; badge?: string };
  compact: { quote: string; author: string; role: string }[];
}) {
  return (
    <section id="testimonials" className="lp-section">
      <SectionHead
        eyebrow={t('landing2.testi.eyebrow', '05 · Témoignages')}
        title={
          <>
            {t('landing2.testi.titlePre', 'Le terrain ')}
            <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>
              {t('landing2.testi.titleEm', 'en parle mieux que nous.')}
            </em>
          </>
        }
      />
      <div className="lp-testimonials">
        <article className="lp-testi-featured">
          <div>
            <div className="onb-mono-cap" style={{ marginBottom: 18, color: 'var(--onb-brand-700)' }}>
              {featured.badge ?? t('landing2.testi.featuredLabel', '★★★★★ · Étude de cas')}
            </div>
            <p
              style={{
                fontFamily: 'var(--onb-font-display)',
                fontSize: 24,
                lineHeight: 1.25,
                fontWeight: 400,
                color: 'var(--onb-ink-900)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              « {featured.quote} »
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 22 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 999,
                background:
                  'repeating-linear-gradient(45deg, var(--onb-soil-200), var(--onb-soil-200) 3px, var(--onb-soil-300) 3px, var(--onb-soil-300) 6px)',
              }}
            />
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{featured.author}</div>
              <div className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-500)' }}>
                {featured.role}
              </div>
            </div>
          </div>
        </article>

        {compact.map((c) => (
          <article key={c.author + c.role} className="lp-testi-compact">
            <div>
              <div className="onb-mono-cap" style={{ marginBottom: 16, color: 'var(--onb-brand-700)' }}>
                ★★★★★
              </div>
              <p style={{ fontSize: 15, lineHeight: 1.45, color: 'var(--onb-ink-800)', margin: 0 }}>« {c.quote} »</p>
            </div>
            <div style={{ marginTop: 22 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{c.author}</div>
              <div className="onb-mono" style={{ fontSize: 10.5, color: 'var(--onb-ink-500)' }}>
                {c.role}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── pricing — quote-only */

function Pricing({ t, onContact }: { t: T; onContact: () => void }) {
  const features = [
    t('landing2.pricing.f1', 'Parcelles illimitées'),
    t('landing2.pricing.f2', 'Tous les modules · activez ce que vous voulez'),
    t('landing2.pricing.f3', 'Multi-fermes & coopératives'),
    t('landing2.pricing.f4', 'Support prioritaire 24/7'),
    t('landing2.pricing.f5', 'Formation sur site avec un agronome'),
    t('landing2.pricing.f6', 'SSO, API & intégrations'),
  ];

  return (
    <section id="pricing" className="lp-pricing-section">
      <SectionHead
        eyebrow={t('landing2.pricing.eyebrow', '06 · Tarifs')}
        title={
          <>
            {t('landing2.pricing.titlePre', 'Un tarif pour ')}
            <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-100)' }}>
              {t('landing2.pricing.titleEm', 'chaque ferme.')}
            </em>
          </>
        }
        subtitle={t(
          'landing2.pricing.subtitle',
          'Tarification sur mesure selon vos parcelles, modules et utilisateurs. 14 jours gratuits, sans engagement.',
        )}
        dark
      />
      <div className="lp-pricing-single">
        <div className="lp-plan-single">
          <div className="lp-plan-single-head">
            <span className="onb-mono lp-plan-badge">
              {t('landing2.pricing.popular', '★ Sur mesure')}
            </span>
            <div
              className="onb-mono-cap"
              style={{ color: 'var(--onb-brand-700)', marginTop: 18, marginBottom: 12 }}
            >
              {t('landing2.pricing.singleName', 'Plan Agrogina')}
            </div>
            <div className="onb-h-display lp-plan-price-single">
              {t('landing2.pricing.quote', 'Sur devis')}
            </div>
            <p
              className="onb-mono"
              style={{ fontSize: 11, color: 'var(--onb-ink-400)', margin: '6px 0 18px' }}
            >
              {t('landing2.pricing.quoteSub', 'Tarif personnalisé selon votre exploitation')}
            </p>
            <p style={{ fontSize: 14, color: 'var(--onb-ink-600)', margin: '0 0 22px', lineHeight: 1.55 }}>
              {t(
                'landing2.pricing.singleDesc',
                'Que vous gériez 3 hectares ou 3 000, nous construisons une offre qui colle à vos parcelles, vos modules et vos utilisateurs.',
              )}
            </p>
            <button
              type="button"
              onClick={onContact}
              className="onb-btn onb-btn-primary lp-plan-cta"
            >
              {t('landing2.pricing.cta', 'Demander un devis')}
            </button>
            <p className="onb-mono lp-plan-note">
              {t('landing2.pricing.trialNote', "14 jours gratuits · sans carte · réponse sous 24h")}
            </p>
          </div>
          <div className="lp-plan-features">
            <div className="onb-mono-cap" style={{ color: 'var(--onb-ink-500)', marginBottom: 16 }}>
              {t('landing2.pricing.included', 'Inclus dans toutes les offres')}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {features.map((f, i) => (
                <li
                  key={f}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    fontSize: 14,
                    padding: '10px 0',
                    borderTop: i === 0 ? 0 : '1px dashed var(--onb-rule)',
                  }}
                >
                  <Check size={14} strokeWidth={2} style={{ color: 'var(--onb-brand-600)', flexShrink: 0 }} />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── faq */

function FAQSection({ t }: { t: T }) {
  const [open, setOpen] = useState(0);
  const faqs = [
    { q: t('landing2.faq.q1', 'Faut-il une connexion internet sur le terrain ?'), a: t('landing2.faq.a1', "Non. L'application mobile fonctionne hors-ligne et synchronise dès qu'une connexion est retrouvée. Idéal pour les zones rurales mal couvertes.") },
    { q: t('landing2.faq.q2', 'Mes données restent-elles ma propriété ?'), a: t('landing2.faq.a2', 'Absolument. Vos données vous appartiennent et sont hébergées en Europe (Frankfurt) avec chiffrement AES-256. Export complet possible à tout moment.') },
    { q: t('landing2.faq.q3', 'Quels capteurs sont compatibles ?'), a: t('landing2.faq.a3', 'Plus de 80 marques supportées : Davis, Sentek, Pessl, Adcon, Libelium… via Modbus, LoRa ou GSM. Notre équipe peut auditer votre matériel existant.') },
    { q: t('landing2.faq.q4', 'Y a-t-il un engagement ?'), a: t('landing2.faq.a4', 'Aucun. Vous pouvez résilier à tout moment depuis votre espace. Le mois entamé reste dû, le suivant est annulé.') },
    { q: t('landing2.faq.q5', 'Proposez-vous une formation ?'), a: t('landing2.faq.a5', 'Oui, incluse dans le plan Exploitation : une demi-journée sur site avec un agronome. Pour les coopératives, un programme sur-mesure est disponible.') },
  ];
  return (
    <section id="faq" className="lp-section">
      <SectionHead
        eyebrow={t('landing2.faq.eyebrow', '07 · Questions')}
        title={
          <>
            {t('landing2.faq.titlePre', 'On vous répond ')}
            <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>
              {t('landing2.faq.titleEm', 'franchement.')}
            </em>
          </>
        }
      />
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {faqs.map((f, i) => (
          <div key={f.q} style={{ borderBottom: '1px solid var(--onb-rule)' }}>
            <button
              type="button"
              onClick={() => setOpen(open === i ? -1 : i)}
              className="lp-faq-trigger"
            >
              <span style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
                <span className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-400)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="onb-h-body" style={{ fontSize: 16, color: 'var(--onb-ink-900)' }}>
                  {f.q}
                </span>
              </span>
              <span
                className="lp-faq-icon"
                style={{ transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)' }}
              >
                <Plus size={14} strokeWidth={1.8} />
              </span>
            </button>
            {open === i && (
              <div className="lp-faq-answer">
                {f.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── CTA + footer */

function CTABanner({ t, onDemo, onTrial }: { t: T; onDemo: () => void; onTrial: () => void }) {
  return (
    <section className="lp-cta-section">
      <div className="lp-cta">
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="onb-mono-cap" style={{ color: 'var(--onb-brand-700)', marginBottom: 14 }}>
            <span
              style={{
                display: 'inline-block',
                width: 18,
                height: 1,
                background: 'var(--onb-brand-600)',
                verticalAlign: 'middle',
                marginInlineEnd: 8,
              }}
            />
            {t('landing2.cta.eyebrow', 'Démarrez maintenant')}
          </div>
          <h2 className="onb-h-display lp-cta-title">
            {t('landing2.cta.titleL1', 'La saison 25/26')}
            <br />
            <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>
              {t('landing2.cta.titleEm', 'commence ici.')}
            </em>
          </h2>
          <p style={{ fontSize: 15, color: 'var(--onb-ink-600)', maxWidth: 480, margin: '0 0 28px', lineHeight: 1.5 }}>
            {t('landing2.cta.subtitle', '14 jours gratuits, sans carte bancaire. Configuration en 3 minutes, accompagnement par un agronome dédié.')}
          </p>
          <div className="lp-cta-buttons">
            <button type="button" onClick={onTrial} className="onb-btn onb-btn-primary">
              {t('landing2.cta.trial', "Démarrer l'essai gratuit")}
              <ArrowRight size={16} strokeWidth={1.8} />
            </button>
            <button type="button" onClick={onDemo} className="onb-btn onb-btn-ghost">
              {t('landing2.cta.demo', 'Réserver une démo')}
            </button>
          </div>
        </div>
        <div className="lp-cta-visual">
          <FieldScene />
          <CornerMarks inset={12} color="rgba(15,32,26,.18)" size={10} />
        </div>
      </div>
    </section>
  );
}

function Footer({
  t,
  onContact,
  supportEmail,
}: {
  t: T;
  onContact: () => void;
  supportEmail: string;
}) {
  const mailto = `mailto:${supportEmail}`;
  const cols: { title: string; links: { label: string; href: string; onClick?: () => void }[] }[] = [
    {
      title: t('landing2.footer.platform', 'Plateforme'),
      links: [
        { label: t('landing2.footer.modules', 'Modules'), href: '#modules' },
        { label: t('landing2.footer.pricing', 'Tarifs'), href: '#pricing' },
        { label: t('landing2.footer.security', 'Sécurité'), href: '/privacy-policy' },
        { label: t('landing2.footer.api', 'API & intégrations'), href: mailto + '?subject=API%20%26%20int%C3%A9grations' },
      ],
    },
    {
      title: t('landing2.footer.resources', 'Ressources'),
      links: [
        { label: t('landing2.footer.docs', 'Documentation'), href: '/blog' },
        { label: t('landing2.footer.cases', 'Études de cas'), href: '#testimonials' },
        { label: t('landing2.footer.blog', 'Blog agronomique'), href: '/blog' },
        { label: t('landing2.footer.faq', 'FAQ'), href: '#faq' },
      ],
    },
    {
      title: t('landing2.footer.company', 'Société'),
      links: [
        { label: t('landing2.footer.about', 'À propos'), href: 'https://wearecodelovers.com/' },
        { label: t('landing2.footer.careers', 'Carrières'), href: mailto + '?subject=Carri%C3%A8res' },
        { label: t('landing2.footer.press', 'Presse'), href: mailto + '?subject=Presse' },
        { label: t('landing2.footer.contact', 'Contact'), href: '#', onClick: onContact },
      ],
    },
    {
      title: t('landing2.footer.legal', 'Légal'),
      links: [
        { label: t('landing2.footer.tos', 'CGU'), href: '/terms-of-service' },
        { label: t('landing2.footer.privacy', 'Confidentialité'), href: '/privacy-policy' },
        { label: t('landing2.footer.cookies', 'Cookies'), href: '/privacy-policy' },
        { label: t('landing2.footer.mentions', 'Mentions légales'), href: '/terms-of-service' },
      ],
    },
  ];

  return (
    <footer className="lp-footer-section">
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div className="lp-footer">
          <div>
            <AgroginaWordmark size={26} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', maxWidth: 320, lineHeight: 1.55, marginTop: 18 }}>
              {t('landing2.footer.tagline', "La plateforme agricole intégrée. Pour la saison qui vient, et toutes celles d'après.")}
            </p>
            <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <span className="onb-mono-cap" style={{ color: 'rgba(255,255,255,.4)', fontSize: 9.5 }}>
                {t('landing2.footer.availableOn', 'Disponible sur')}
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>iOS · Android · Web</span>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.title}>
              <div className="onb-mono-cap" style={{ color: 'rgba(255,255,255,.4)', marginBottom: 16, fontSize: 10 }}>
                {c.title}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {c.links.map((item) => {
                  const isExternal = item.href.startsWith('http') || item.href.startsWith('mailto:');
                  const isHash = item.href.startsWith('#');
                  return (
                    <li key={item.label}>
                      <a
                        href={item.href}
                        onClick={item.onClick ? (e) => { e.preventDefault(); item.onClick?.(); } : undefined}
                        target={isExternal ? '_blank' : undefined}
                        rel={isExternal ? 'noopener noreferrer' : undefined}
                        style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}
                      >
                        {item.label}
                        {isHash ? '' : ''}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
        <div className="lp-footer-bottom">
          <span className="onb-mono">© 2026 Agrogina · 31.6294° N · 7.9811° W</span>
          <span style={{ fontSize: 11, color: 'rgba(255,255,255,.55)' }}>
            {t('landing2.footer.builtBy', 'Conçu et développé par')}{' '}
            <a
              href="https://wearecodelovers.com/"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'var(--onb-brand-300, #6ee7b7)', textDecoration: 'none', fontWeight: 600 }}
            >
              CodeLovers
            </a>
            {' · '}
            <span className="onb-mono" style={{ color: 'rgba(255,255,255,.4)' }}>
              wearecodelovers.com
            </span>
          </span>
          <span className="onb-mono">FR · MA · v2026.05</span>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────── responsive css (mobile-first) */

const RESPONSIVE_CSS = `
.onb-shell .lp-section { padding: 56px 20px; border-bottom: 1px solid var(--onb-rule); }
.onb-shell .lp-section-paper { background: var(--onb-bg-paper); }
.onb-shell .lp-section-head { max-width: 760px; margin: 0 auto 40px; text-align: center; padding: 0 4px; }
.onb-shell .lp-section-title { font-size: clamp(28px, 7vw, 54px); margin: 0 0 14px; line-height: 1.05; }
.onb-shell .lp-section-sub { font-size: 15px; line-height: 1.55; margin: 0 auto; max-width: 580px; }

/* nav */
.onb-shell .lp-nav {
  position: sticky; top: 0; z-index: 30;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 20px;
  background: rgba(244,246,240,.92);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--onb-rule);
  gap: 12px;
}
.onb-shell .lp-nav-divider { display: none; width: 1px; height: 16px; background: var(--onb-rule); }
.onb-shell .lp-nav-links { display: none; gap: 22px; }
.onb-shell .lp-nav-link { font-size: 13px; color: var(--onb-ink-700); text-decoration: none; font-weight: 500; }
.onb-shell .lp-nav-actions { display: flex; align-items: center; gap: 10px; }
.onb-shell .lp-login { display: none; }
.onb-shell .lp-cta-btn { padding: 9px 14px !important; font-size: 12px !important; background: var(--onb-brand-600) !important; }
.onb-shell .lp-nav-burger {
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px; border-radius: 8px;
  border: 1px solid var(--onb-rule); background: white; color: var(--onb-ink-700);
  cursor: pointer;
}
.onb-shell .lp-mobile-nav {
  position: fixed; inset: 0; z-index: 100;
  background: #f4f6f0;
  display: flex; flex-direction: column; padding: 16px;
  overflow-y: auto;
}
.onb-shell .lp-lang-desktop { display: none; }
@media (min-width: 1024px) {
  .onb-shell .lp-lang-desktop { display: block; }
}
.onb-shell .lp-mobile-nav-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.onb-shell .lp-mobile-nav-links { display: flex; flex-direction: column; gap: 4px; flex: 1; }
.onb-shell .lp-mobile-nav-links a {
  padding: 14px 12px; border-radius: 10px;
  font-size: 17px; font-weight: 500; color: var(--onb-ink-900); text-decoration: none;
  border: 1px solid transparent;
}
.onb-shell .lp-mobile-nav-links a:active { background: var(--onb-ink-50); border-color: var(--onb-rule); }
.onb-shell .lp-mobile-nav-actions { display: flex; flex-direction: column; gap: 8px; padding-top: 16px; border-top: 1px solid var(--onb-rule); }
.onb-shell .lp-icon-btn {
  width: 36px; height: 36px; border-radius: 999px;
  border: 1px solid var(--onb-rule); background: white;
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--onb-ink-700); cursor: pointer;
}

/* hero */
.onb-shell .lp-hero {
  display: grid; grid-template-columns: 1fr;
  border-bottom: 1px solid var(--onb-rule);
}
.onb-shell .lp-hero-copy {
  padding: 40px 20px 40px;
  display: flex; flex-direction: column; gap: 32px;
}
.onb-shell .lp-hero-eyebrow-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; }
.onb-shell .lp-hero-title {
  font-size: clamp(40px, 11vw, 92px);
  margin: 0 0 18px;
  color: var(--onb-ink-900);
  line-height: 0.96;
  text-wrap: balance;
}
.onb-shell .lp-hero-sub {
  font-size: 16px; line-height: 1.55;
  color: var(--onb-ink-600);
  max-width: 520px;
  margin: 0 0 24px;
}
.onb-shell .lp-hero-ctas { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; margin-bottom: 8px; }
.onb-shell .lp-cta-primary { padding: 14px 22px !important; font-size: 14px !important; }
.onb-shell .lp-cta-ghost { padding: 14px 18px !important; font-size: 13px !important; }
.onb-shell .lp-trial-note { font-size: 11px; color: var(--onb-ink-400); }
.onb-shell .lp-hero-stats { border-top: 1px solid var(--onb-rule); padding-top: 22px; }
.onb-shell .lp-hero-stats-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 22px; }

.onb-shell .lp-hero-visual {
  background: linear-gradient(160deg, #eef5e0 0%, #e2ecd0 60%, #d2dfba 100%);
  position: relative; overflow: hidden;
  border-top: 1px solid var(--onb-rule);
  min-height: 380px;
}
.onb-shell .lp-hero-station {
  position: absolute; top: 16px; right: 16px;
  background: rgba(255,255,255,.92); backdrop-filter: blur(10px);
  border: 1px solid var(--onb-rule); border-radius: 14px;
  padding: 12px 14px; min-width: 220px; max-width: calc(100% - 32px);
  box-shadow: var(--onb-sh-md);
}
.onb-shell .lp-hero-region {
  position: absolute; bottom: 16px; left: 16px;
  padding: 8px 12px; border-radius: 10px;
  background: rgba(15, 32, 26, .82); color: white;
  backdrop-filter: blur(10px); font-size: 11px;
}
.onb-shell .lp-hero-alert {
  position: absolute; bottom: 16px; right: 16px;
  background: white; border-radius: 12px;
  padding: 10px 12px; max-width: 220px;
  border: 1px solid var(--onb-rule); box-shadow: var(--onb-sh-md);
}

/* logo strip */
.onb-shell .lp-logos-section {
  padding: 28px 20px;
  border-bottom: 1px solid var(--onb-rule);
  background: var(--onb-bg-paper);
}
.onb-shell .lp-logos { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; align-items: center; }

/* product preview */
.onb-shell .lp-tabs {
  display: flex; gap: 4px; padding: 4px;
  background: white; border: 1px solid var(--onb-rule);
  border-radius: 999px; width: fit-content;
  margin: 0 auto 20px;
  overflow-x: auto; max-width: 100%;
}
.onb-shell .lp-tab {
  padding: 7px 14px; border-radius: 999px; border: 0;
  background: transparent; color: var(--onb-ink-600);
  font-family: inherit; font-size: 12px; font-weight: 500; cursor: pointer;
  transition: all .2s; white-space: nowrap;
}
.onb-shell .lp-tab-active { background: var(--onb-ink-900); color: white; }
.onb-shell .lp-mock-frame {
  max-width: 1240px; margin: 0 auto;
  background: var(--onb-ink-900); border-radius: 14px;
  padding: 6px;
  box-shadow: 0 24px 60px rgba(20, 40, 30, .12);
}
.onb-shell .lp-mock-window { background: white; border-radius: 10px; overflow: hidden; aspect-ratio: 4 / 3; position: relative; }
.onb-shell .lp-mock-window-bar {
  display: flex; align-items: center; gap: 8px;
  padding: 8px 12px; border-bottom: 1px solid var(--onb-rule);
  background: var(--onb-bg-paper);
}
.onb-shell .lp-mock-url {
  font-size: 10.5px; color: var(--onb-ink-500);
  margin-inline-start: 10px; padding: 3px 8px;
  background: white; border-radius: 6px; border: 1px solid var(--onb-rule);
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
}
.onb-shell .lp-mock-map { display: grid; grid-template-columns: 1fr; height: calc(100% - 38px); }
.onb-shell .lp-mock-side { padding: 12px; background: var(--onb-bg-paper); border-bottom: 1px solid var(--onb-rule); max-height: 30%; overflow-y: auto; }
.onb-shell .lp-mock-side-right { background: white; border-bottom: 0; border-top: 1px solid var(--onb-rule); }

/* modules */
.onb-shell .lp-modules {
  display: grid; grid-template-columns: 1fr; gap: 1px;
  background: var(--onb-rule); border: 1px solid var(--onb-rule);
  max-width: 1240px; margin: 0 auto;
}
.onb-shell .lp-module-tile {
  background: white; padding: 22px 18px;
  display: flex; flex-direction: column; gap: 12px;
  min-height: 160px;
}
.onb-shell .lp-module-icon {
  width: 38px; height: 38px; border-radius: 10px;
  background: var(--onb-brand-50); color: var(--onb-brand-700);
  display: flex; align-items: center; justify-content: center;
}

/* steps */
.onb-shell .lp-steps {
  max-width: 1100px; margin: 0 auto;
  display: grid; grid-template-columns: 1fr; gap: 1px;
  background: var(--onb-rule);
}
.onb-shell .lp-step { padding: 22px 18px; background: var(--onb-bg-canvas); position: relative; }

/* stats band */
.onb-shell .lp-stats-section {
  padding: 64px 20px;
  background: var(--onb-ink-900); color: white;
  border-bottom: 1px solid var(--onb-rule);
  position: relative; overflow: hidden;
}
.onb-shell .lp-stats-title {
  font-size: clamp(32px, 7vw, 56px);
  margin: 0 0 40px; max-width: 700px; line-height: 1.05;
}
.onb-shell .lp-stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: 24px; }
.onb-shell .lp-stat-value { font-size: clamp(36px, 9vw, 72px); line-height: 1; color: white; margin-bottom: 10px; }

/* testimonials */
.onb-shell .lp-testimonials { max-width: 1240px; margin: 0 auto; display: grid; grid-template-columns: 1fr; gap: 14px; }
.onb-shell .lp-testi-featured {
  padding: 24px; border-radius: var(--onb-r-lg);
  background: var(--onb-bg-paper); border: 1px solid var(--onb-rule);
  display: flex; flex-direction: column; justify-content: space-between;
  min-height: 280px;
}
.onb-shell .lp-testi-compact {
  padding: 22px; border-radius: var(--onb-r-lg);
  background: white; border: 1px solid var(--onb-rule);
  display: flex; flex-direction: column; justify-content: space-between;
  min-height: 240px;
}

/* pricing */
.onb-shell .lp-pricing-section {
  padding: 64px 20px;
  border-bottom: 1px solid var(--onb-rule);
  background: var(--onb-ink-900); color: white;
}
.onb-shell .lp-pricing-single { max-width: 920px; margin: 0 auto; }
.onb-shell .lp-plan-single {
  background: white; color: var(--onb-ink-900);
  border-radius: 24px;
  display: grid; grid-template-columns: 1fr;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(20, 40, 30, .35), 0 4px 12px rgba(20, 40, 30, .15);
  position: relative;
}
.onb-shell .lp-plan-single-head { padding: 32px 24px; position: relative; }
.onb-shell .lp-plan-features {
  padding: 28px 24px;
  background: var(--onb-bg-paper);
  border-top: 1px solid var(--onb-rule);
}
.onb-shell .lp-plan-badge {
  display: inline-block;
  padding: 4px 10px; background: var(--onb-brand-600); color: white;
  font-size: 9.5px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
  border-radius: 999px;
}
.onb-shell .lp-plan-price-single {
  font-size: clamp(40px, 8vw, 56px); line-height: 1;
  font-family: var(--onb-font-display); font-weight: 500;
  color: var(--onb-ink-900);
}
.onb-shell .lp-plan-cta {
  width: 100%; padding: 16px;
  background: var(--onb-brand-600); color: white;
  font-size: 15px;
}
.onb-shell .lp-plan-cta:hover { background: var(--onb-brand-700); }
.onb-shell .lp-plan-note {
  margin: 12px 0 0; font-size: 11px; color: var(--onb-ink-400); text-align: center;
}

/* faq */
.onb-shell .lp-faq-trigger {
  display: flex; justify-content: space-between; align-items: center;
  width: 100%; padding: 18px 0; border: 0; background: transparent;
  font-family: inherit; cursor: pointer; text-align: start; gap: 14px;
}
.onb-shell .lp-faq-icon {
  width: 28px; height: 28px; border-radius: 999px;
  border: 1px solid var(--onb-rule);
  display: inline-flex; align-items: center; justify-content: center;
  color: var(--onb-ink-700); flex-shrink: 0;
  transition: transform .25s;
}
.onb-shell .lp-faq-answer { padding-inline-start: 38px; padding-bottom: 18px; font-size: 14px; line-height: 1.6; color: var(--onb-ink-600); max-width: 640px; }

/* cta */
.onb-shell .lp-cta-section { padding: 56px 20px; background: var(--onb-bg-paper); border-bottom: 1px solid var(--onb-rule); }
.onb-shell .lp-cta {
  max-width: 1100px; margin: 0 auto;
  background: white; border: 1px solid var(--onb-rule);
  border-radius: 24px; padding: 32px 24px;
  display: grid; grid-template-columns: 1fr; gap: 24px;
  position: relative; overflow: hidden;
}
.onb-shell .lp-cta-title { font-size: clamp(28px, 6.5vw, 48px); margin: 0 0 14px; line-height: 1.05; }
.onb-shell .lp-cta-buttons { display: flex; gap: 10px; flex-wrap: wrap; }
.onb-shell .lp-cta-visual {
  aspect-ratio: 4 / 3; border-radius: var(--onb-r-lg);
  background: linear-gradient(160deg, #eef5e0 0%, #d2dfba 100%);
  position: relative; overflow: hidden; border: 1px solid var(--onb-rule);
}

/* footer */
.onb-shell .lp-footer-section { padding: 48px 20px 24px; background: var(--onb-ink-900); color: white; }
.onb-shell .lp-footer { display: grid; grid-template-columns: 1fr 1fr; gap: 28px; padding-bottom: 32px; border-bottom: 1px solid rgba(255,255,255,.1); }
.onb-shell .lp-footer-bottom {
  padding-top: 18px; display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; color: rgba(255,255,255,.4); flex-wrap: wrap; gap: 12px;
}

/* breakpoint: tablet */
@media (min-width: 720px) {
  .onb-shell .lp-section { padding: 80px 32px; }
  .onb-shell .lp-section-head { margin-bottom: 48px; }
  .onb-shell .lp-logos { grid-template-columns: repeat(4, 1fr); }
  .onb-shell .lp-modules { grid-template-columns: repeat(2, 1fr); }
  .onb-shell .lp-steps { grid-template-columns: repeat(2, 1fr); }
  .onb-shell .lp-stats { grid-template-columns: repeat(4, 1fr); }
  .onb-shell .lp-stats-section { padding: 80px 32px; }
  .onb-shell .lp-pricing-section { padding: 80px 32px; }
  .onb-shell .lp-plan-single { grid-template-columns: 1.05fr 1fr; }
  .onb-shell .lp-plan-single-head { padding: 40px 36px; }
  .onb-shell .lp-plan-features { padding: 40px 36px; border-top: 0; border-left: 1px solid var(--onb-rule); }
  .onb-shell .lp-testimonials { grid-template-columns: 1fr 1fr; }
  .onb-shell .lp-cta-section { padding: 64px 32px; }
  .onb-shell .lp-cta { grid-template-columns: 1.4fr 1fr; padding: 40px; gap: 32px; }
  .onb-shell .lp-footer { grid-template-columns: 1.6fr repeat(4, 1fr); gap: 32px; }
  .onb-shell .lp-mock-window { aspect-ratio: 16 / 9; }
  .onb-shell .lp-mock-map { grid-template-columns: 220px 1fr 240px; }
  .onb-shell .lp-mock-side { max-height: none; padding: 14px; border-bottom: 0; border-right: 1px solid var(--onb-rule); }
  .onb-shell .lp-mock-side-right { border-right: 0; border-left: 1px solid var(--onb-rule); border-top: 0; background: white; }
  .onb-shell .lp-hero-stats-grid { grid-template-columns: repeat(4, 1fr); }
  .onb-shell .lp-hero-station { min-width: 240px; }
  .onb-shell .lp-hero-alert { max-width: 240px; }
}

/* breakpoint: desktop */
@media (min-width: 1024px) {
  .onb-shell .lp-section { padding: 100px 40px; }
  .onb-shell .lp-section-head { margin-bottom: 56px; }
  .onb-shell .lp-section-sub { font-size: 17px; }
  .onb-shell .lp-nav { padding: 16px 40px; }
  .onb-shell .lp-nav-divider { display: block; }
  .onb-shell .lp-nav-links { display: flex; }
  .onb-shell .lp-login { display: inline; }
  .onb-shell .lp-cta-btn { padding: 10px 18px !important; font-size: 13px !important; }
  .onb-shell .lp-nav-burger { display: none; }
  .onb-shell .lp-hero { grid-template-columns: minmax(0,1fr) minmax(0,1.05fr); min-height: calc(100vh - 65px); }
  .onb-shell .lp-hero-copy { padding: 72px 64px 56px; gap: 48px; }
  .onb-shell .lp-hero-visual { border-top: 0; border-left: 1px solid var(--onb-rule); min-height: auto; }
  .onb-shell .lp-hero-station, .onb-shell .lp-hero-region, .onb-shell .lp-hero-alert { top: 32px; right: 32px; }
  .onb-shell .lp-hero-region { top: auto; bottom: 32px; left: 32px; right: auto; }
  .onb-shell .lp-hero-alert { top: auto; bottom: 32px; right: 32px; left: auto; }
  .onb-shell .lp-hero-sub { font-size: 19px; }
  .onb-shell .lp-cta-primary { padding: 18px 28px !important; font-size: 15px !important; }
  .onb-shell .lp-cta-ghost { padding: 18px 22px !important; font-size: 14px !important; }
  .onb-shell .lp-modules { grid-template-columns: repeat(4, 1fr); }
  .onb-shell .lp-module-tile { padding: 28px 24px; min-height: 200px; }
  .onb-shell .lp-steps { grid-template-columns: repeat(4, 1fr); gap: 0; background: transparent; }
  .onb-shell .lp-step { background: transparent; padding: 28px 24px; }
  .onb-shell .lp-pricing-section { padding: 100px 40px; }
  .onb-shell .lp-stats-section { padding: 80px 40px; }
  .onb-shell .lp-testimonials { grid-template-columns: 1.4fr 1fr 1fr; gap: 16px; }
  .onb-shell .lp-cta-section { padding: 80px 40px; }
  .onb-shell .lp-cta { padding: 56px; gap: 40px; border-radius: 28px; }
  .onb-shell .lp-footer-section { padding: 64px 40px 32px; }
  .onb-shell .lp-logos { grid-template-columns: repeat(8, 1fr); gap: 18px; }
  .onb-shell .lp-tab { padding: 8px 18px; font-size: 13px; }
}

/* RTL */
.onb-shell[dir="rtl"] .lp-mobile-nav-links a { text-align: right; }
.onb-shell[dir="rtl"] .lp-faq-trigger { text-align: right; }
`;

/* ────────────────────────────────────────────────────────── page */

const LandingPage = () => {
  const { t, i18n } = useTranslation();
  const [demoOpen, setDemoOpen] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  const [introDone, setIntroDone] = useState(() => {
    if (typeof window === 'undefined') return true;
    try {
      return window.sessionStorage.getItem(INTRO_KEY) === '1';
    } catch {
      return true;
    }
  });
  const finishIntro = () => {
    setIntroDone(true);
    try {
      window.sessionStorage.setItem(INTRO_KEY, '1');
    } catch {
      // ignore storage errors
    }
  };

  const isRTL = i18n.language?.startsWith('ar');
  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.agritech.local';

  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      applicationCategory: 'BusinessApplication',
      name: appConfig.name,
      url: `${siteOrigin}/`,
      description: t('landing2.seo.description', 'Plateforme agricole intégrée pour piloter parcelles, équipes, stocks et capteurs.'),
      image: `${siteOrigin}/assets/logo.png`,
      offers: { '@type': 'Offer', priceSpecification: { '@type': 'PriceSpecification', priceCurrency: 'EUR', price: '0' } },
    }),
    [siteOrigin, t],
  );

  useEffect(() => {
    const pageTitle = t('landing2.seo.title', `${appConfig.name} · Plateforme agricole intégrée`);
    const description = t('landing2.seo.description', 'Cultivez avec précision. Décidez avec données.');
    document.title = pageTitle;

    const ensureMeta = (nameOrProp: string, content: string, isProperty = false) => {
      const attr = isProperty ? 'property' : 'name';
      let tag = document.querySelector(`meta[${attr}="${nameOrProp}"]`) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement('meta');
        tag.setAttribute(attr, nameOrProp);
        document.head.appendChild(tag);
      }
      tag.setAttribute('content', content);
    };
    ensureMeta('description', description);
    ensureMeta('og:type', 'website', true);
    ensureMeta('og:url', siteOrigin, true);
    ensureMeta('og:title', pageTitle, true);
    ensureMeta('og:description', description, true);
    ensureMeta('og:image', `${siteOrigin}/og-image.png`, true);
    ensureMeta('twitter:card', 'summary_large_image');
    ensureMeta('twitter:title', pageTitle);
    ensureMeta('twitter:description', description);

    const existing = document.querySelector('script[data-landing-schema]');
    if (!existing) {
      const script = document.createElement('script');
      script.type = 'application/ld+json';
      script.setAttribute('data-landing-schema', 'true');
      script.textContent = JSON.stringify(structuredData);
      document.head.appendChild(script);
    }
    return () => {
      document.querySelector('script[data-landing-schema]')?.remove();
    };
  }, [t, siteOrigin, structuredData]);

  const goTrial = () => {
    window.location.href = '/register';
  };
  const openDemo = () => setDemoOpen(true);

  const tFn: T = (k, d) => t(k, { defaultValue: d ?? k });
  const landing = useLandingSettings();
  const support = useSupportInfo();
  const partnerNames = landing.partners.map((p) => p.name);

  return (
    <div className="onb-shell" dir={isRTL ? 'rtl' : 'ltr'} style={{ minHeight: '100vh' }}>
      <style>{RESPONSIVE_CSS}</style>
      {!introDone && <WowIntro onComplete={finishIntro} />}
      <LandingNav t={tFn} onMenu={() => setNavOpen(true)} onTrial={goTrial} />
      <Hero t={tFn} onDemo={openDemo} onTrial={goTrial} stats={landing.hero_stats} />
      <LogoStrip t={tFn} partners={partnerNames} />
      <ProductPreview t={tFn} />
      <ModulesSection t={tFn} />
      <HowItWorks t={tFn} />
      <StatsBand t={tFn} />
      <Testimonials t={tFn} featured={landing.testimonials.featured} compact={landing.testimonials.compact} />
      <SupportedRegionsSection />
      <Pricing t={tFn} onContact={openDemo} />
      <FAQSection t={tFn} />
      <CTABanner t={tFn} onDemo={openDemo} onTrial={goTrial} />
      <Footer t={tFn} onContact={openDemo} supportEmail={support.contact_email} />

      {navOpen && (
        <MobileNav
          t={tFn}
          onClose={() => setNavOpen(false)}
          onDemo={openDemo}
          onTrial={goTrial}
        />
      )}

      {demoOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,32,26,.55)',
            backdropFilter: 'blur(4px)',
            zIndex: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            overflowY: 'auto',
          }}
          onClick={() => setDemoOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white',
              borderRadius: 18,
              maxWidth: 720,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              border: '1px solid var(--onb-rule)',
              boxShadow: 'var(--onb-sh-md)',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setDemoOpen(false)}
              aria-label={t('landing2.modalClose', 'Fermer')}
              style={{
                position: 'absolute',
                top: 12,
                insetInlineEnd: 12,
                width: 32,
                height: 32,
                borderRadius: 999,
                border: '1px solid var(--onb-rule)',
                background: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--onb-ink-700)',
              }}
            >
              <X size={14} />
            </button>
            <div className="onb-mono-cap" style={{ color: 'var(--onb-brand-700)', marginBottom: 12 }}>
              <Mail size={11} style={{ display: 'inline', marginInlineEnd: 6, verticalAlign: 'middle' }} />
              {t('landing2.demo.eyebrow', 'Démo personnalisée')}
            </div>
            <h3 className="onb-h-display" style={{ fontSize: 'clamp(22px, 5vw, 28px)', margin: '0 0 18px' }}>
              {t('landing2.demo.title', 'Réservez votre démo.')}
            </h3>
            <DemoRequestForm />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
