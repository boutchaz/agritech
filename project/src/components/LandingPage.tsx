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
  Plus,
  Receipt,
  Sprout,
  Users,
  Warehouse,
} from 'lucide-react';
import LanguageSwitcher from './LanguageSwitcher';
import { appConfig } from '@/config/app';
import DemoRequestForm from './landing/DemoRequestForm';

import '../styles/onboarding-tokens.css';

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
    <div style={{ maxWidth: 760, margin: '0 auto 56px', textAlign: 'center' }}>
      {eyebrow && (
        <div className="onb-mono-cap" style={{ color: dark ? 'var(--onb-brand-100)' : 'var(--onb-brand-700)', marginBottom: 14 }}>
          <span
            style={{
              display: 'inline-block',
              width: 18,
              height: 1,
              background: dark ? 'var(--onb-brand-100)' : 'var(--onb-brand-600)',
              verticalAlign: 'middle',
              marginRight: 8,
            }}
          />
          {eyebrow}
        </div>
      )}
      <h2
        className="onb-h-display"
        style={{
          fontSize: 'clamp(34px, 4vw, 54px)',
          margin: '0 0 18px',
          color: dark ? 'white' : 'var(--onb-ink-900)',
          lineHeight: 1.05,
          textWrap: 'balance' as CSSProperties['textWrap'],
        }}
      >
        {title}
      </h2>
      {subtitle && (
        <p
          style={{
            fontSize: 17,
            lineHeight: 1.55,
            color: dark ? 'rgba(255,255,255,.7)' : 'var(--onb-ink-600)',
            margin: '0 auto',
            maxWidth: 580,
            textWrap: 'pretty' as CSSProperties['textWrap'],
          }}
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
      <path
        d="M150 220 q 8 -8 16 0 q 8 -8 16 0"
        stroke="#3f6212"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ────────────────────────────────────────────────────────── nav */

function LandingNav({ onDemo }: { onDemo: () => void }) {
  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 30,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 40px',
        background: 'rgba(244,246,240,.85)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--onb-rule)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
        <AgroginaWordmark size={26} />
        <div style={{ width: 1, height: 16, background: 'var(--onb-rule)' }} />
        <nav className="lp-nav-links" style={{ display: 'flex', gap: 22 }}>
          {[
            { label: 'Plateforme', href: '#platform' },
            { label: 'Modules', href: '#modules' },
            { label: 'Tarifs', href: '#pricing' },
            { label: 'Clients', href: '#testimonials' },
            { label: 'FAQ', href: '#faq' },
          ].map((l) => (
            <a
              key={l.href}
              href={l.href}
              style={{ fontSize: 13, color: 'var(--onb-ink-700)', textDecoration: 'none', fontWeight: 500 }}
            >
              {l.label}
            </a>
          ))}
        </nav>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <LanguageSwitcher />
        <Link
          to="/login"
          search={{ redirect: undefined }}
          style={{ fontSize: 13, color: 'var(--onb-ink-700)', textDecoration: 'none', fontWeight: 500 }}
        >
          Connexion
        </Link>
        <button
          type="button"
          onClick={onDemo}
          className="onb-btn onb-btn-primary"
          style={{ padding: '10px 18px', fontSize: 13, background: 'var(--onb-brand-600)' }}
        >
          Essai gratuit
          <ArrowRight size={14} strokeWidth={1.8} />
        </button>
      </div>
    </header>
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

function Hero({ onDemo, onTrial }: { onDemo: () => void; onTrial: () => void }) {
  const stats = [
    { n: '12.4k', t: 'Exploitations actives' },
    { n: '847k ha', t: 'Surface monitorée' },
    { n: '14', t: 'Pays · MENA + EU' },
    { n: '99.94%', t: 'Disponibilité réseau' },
  ];
  return (
    <section
      className="lp-hero"
      style={{
        display: 'grid',
        minHeight: 'calc(100vh - 65px)',
        borderBottom: '1px solid var(--onb-rule)',
      }}
    >
      <div
        style={{
          padding: '72px 64px 56px',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: 48,
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="onb-mono-cap" style={{ color: 'var(--onb-brand-700)' }}>
            <span
              style={{
                display: 'inline-block',
                width: 6,
                height: 6,
                borderRadius: 999,
                background: 'var(--onb-brand-600)',
                boxShadow: '0 0 0 4px rgba(16,185,129,.15)',
                marginRight: 8,
                verticalAlign: 'middle',
              }}
            />
            Plateforme agricole · Saison 25/26
          </span>
          <span className="onb-mono" style={{ fontSize: 10, color: 'var(--onb-ink-400)' }}>
            v2026.05
          </span>
        </div>

        <div>
          <h1
            className="onb-h-display"
            style={{
              fontSize: 'clamp(48px, 6vw, 92px)',
              margin: '0 0 24px',
              color: 'var(--onb-ink-900)',
              lineHeight: 0.96,
              textWrap: 'balance' as CSSProperties['textWrap'],
              maxWidth: 640,
            }}
          >
            Cultivez
            <br />
            avec{' '}
            <em style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--onb-brand-700)' }}>précision.</em>
            <br />
            Décidez avec données.
          </h1>
          <p
            style={{
              fontSize: 19,
              lineHeight: 1.5,
              color: 'var(--onb-ink-600)',
              maxWidth: 480,
              margin: '0 0 32px',
              textWrap: 'pretty' as CSSProperties['textWrap'],
            }}
          >
            Agrogina réunit la gestion de vos parcelles, vos équipes, vos stocks et vos capteurs dans un seul espace —
            de la graine à la facture.
          </p>

          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 24 }}>
            <button
              type="button"
              onClick={onTrial}
              className="onb-btn onb-btn-primary"
              style={{ padding: '18px 28px', fontSize: 15 }}
            >
              Démarrer l'essai gratuit
              <ArrowRight size={18} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={onDemo}
              className="onb-btn onb-btn-ghost"
              style={{ padding: '18px 22px', fontSize: 14 }}
            >
              Réserver une démo
            </button>
            <span className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-400)', marginLeft: 4 }}>
              14 jours · sans carte
            </span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--onb-rule)', paddingTop: 22 }}>
          <div className="onb-mono-cap" style={{ marginBottom: 14, color: 'var(--onb-ink-500)' }}>
            Conçu pour la réalité du terrain
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 22 }}>
            {stats.map((s) => (
              <div key={s.t}>
                <div className="onb-h-display" style={{ fontSize: 26, lineHeight: 1, marginBottom: 6 }}>
                  {s.n}
                </div>
                <div
                  className="onb-mono"
                  style={{ fontSize: 10, color: 'var(--onb-ink-500)', textTransform: 'uppercase', letterSpacing: '0.06em' }}
                >
                  {s.t}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div
        className="lp-hero-visual"
        style={{
          background: 'linear-gradient(160deg, #eef5e0 0%, #e2ecd0 60%, #d2dfba 100%)',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '1px solid var(--onb-rule)',
        }}
      >
        <FieldScene />

        <div
          style={{
            position: 'absolute',
            top: 32,
            right: 32,
            background: 'rgba(255,255,255,.92)',
            backdropFilter: 'blur(10px)',
            border: '1px solid var(--onb-rule)',
            borderRadius: 14,
            padding: '14px 16px',
            minWidth: 240,
            boxShadow: 'var(--onb-sh-md)',
          }}
        >
          <div className="onb-mono-cap" style={{ marginBottom: 10, fontSize: 9.5 }}>
            Station · Champ Nord-7
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14 }}>
            <HeroStat label="Sol" value="58%" unit="hum" trend="up" />
            <HeroStat label="Air" value="22°" unit="C" trend="flat" />
            <HeroStat label="Vent" value="11" unit="km/h" trend="up" />
          </div>
          <div className="onb-tick-rule" style={{ margin: '12px 0 8px' }} />
          <div
            className="onb-mono"
            style={{ fontSize: 9.5, color: 'var(--onb-ink-400)', display: 'flex', justifyContent: 'space-between' }}
          >
            <span>↻ Sync · 12s</span>
            <span>NODE-A7Q</span>
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 32,
            left: 32,
            padding: '10px 14px',
            borderRadius: 10,
            background: 'rgba(15, 32, 26, .82)',
            color: 'white',
            backdropFilter: 'blur(10px)',
            fontSize: 11,
          }}
        >
          <div className="onb-mono-cap" style={{ color: 'rgba(255,255,255,.55)', marginBottom: 4, fontSize: 9 }}>
            Région · Marrakech-Safi
          </div>
          <div className="onb-mono" style={{ fontSize: 12 }}>
            31.6294° N &nbsp;·&nbsp; 7.9811° W
          </div>
        </div>

        <div
          style={{
            position: 'absolute',
            bottom: 32,
            right: 32,
            background: 'white',
            borderRadius: 12,
            padding: '12px 14px',
            maxWidth: 240,
            border: '1px solid var(--onb-rule)',
            boxShadow: 'var(--onb-sh-md)',
          }}
        >
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
                Alerte · 09h12
              </div>
              <div style={{ fontSize: 12.5, fontWeight: 500, lineHeight: 1.35 }}>
                Irrigation recommandée · Parcelle 4-B
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

function LogoStrip() {
  const partners = [
    'Coopérative Atlas',
    'OCP Agri',
    'GlobalGAP',
    'BIO Maroc',
    'AgriBank',
    'Crédit Agricole',
    'INRA',
    'Domaine Royal',
  ];
  return (
    <section
      style={{
        padding: '36px 40px',
        borderBottom: '1px solid var(--onb-rule)',
        background: 'var(--onb-bg-paper)',
      }}
    >
      <div className="onb-mono-cap" style={{ textAlign: 'center', marginBottom: 22, color: 'var(--onb-ink-500)' }}>
        Ils nous font confiance
      </div>
      <div
        className="lp-logos"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(8, 1fr)',
          gap: 18,
          alignItems: 'center',
        }}
      >
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

function MapMock() {
  const parcels = ['Nord-7 · Blé', 'Est-3 · Olivier', 'Sud-1 · Agrumes', 'Ouest-5 · Maraîchage', 'Nord-2 · Jachère'];
  return (
    <div className="lp-mock-map" style={{ display: 'grid', gridTemplateColumns: '260px 1fr 280px', height: 'calc(100% - 41px)' }}>
      <aside style={{ borderRight: '1px solid var(--onb-rule)', padding: 16, background: 'var(--onb-bg-paper)' }}>
        <div className="onb-mono-cap" style={{ marginBottom: 12, fontSize: 9.5 }}>
          Parcelles · 12
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
      <aside style={{ borderLeft: '1px solid var(--onb-rule)', padding: 16, fontSize: 12 }}>
        <div className="onb-mono-cap" style={{ marginBottom: 12, fontSize: 9.5 }}>
          Détails · Nord-7
        </div>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            ['Culture', 'Blé tendre'],
            ['Surface', '49.2 ha'],
            ['Stade', 'Tallage'],
            ['Humidité sol', '58%'],
            ['Dernière pluie', 'Il y a 4j'],
          ].map(([k, v]) => (
            <div
              key={k}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                borderBottom: '1px dashed var(--onb-rule)',
                paddingBottom: 6,
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
          <strong>Recommandation :</strong> irrigation 18mm dans les 48h.
        </div>
      </aside>
    </div>
  );
}

function TasksMock() {
  type Status = 'done' | 'active' | 'pending';
  const tasks: { time: string; who: string; task: string; dur: string; status: Status }[] = [
    { time: '06:30', who: 'Hassan A.', task: 'Irrigation · Parcelle 4-B', dur: '2h', status: 'done' },
    { time: '08:00', who: 'Équipe Récolte', task: 'Cueillette agrumes · Sud-1', dur: '5h', status: 'active' },
    { time: '10:00', who: 'Karim M.', task: 'Traitement bio · Olivier', dur: '3h', status: 'active' },
    { time: '14:00', who: 'Saida B.', task: 'Inspection capteurs · Nord-7', dur: '1h', status: 'pending' },
    { time: '16:00', who: 'Équipe Stock', task: 'Réception engrais · Entrepôt 2', dur: '2h', status: 'pending' },
  ];
  return (
    <div style={{ padding: 24, height: 'calc(100% - 41px)', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <h3 className="onb-h-display" style={{ fontSize: 22, margin: 0 }}>
          Aujourd'hui · Mardi 5 mai
        </h3>
        <span className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-500)' }}>
          5 tâches · 13h
        </span>
      </div>
      <div style={{ display: 'grid', gap: 6 }}>
        {tasks.map((t) => (
          <div
            key={t.time}
            style={{
              display: 'grid',
              gridTemplateColumns: '60px 1fr auto auto',
              gap: 14,
              alignItems: 'center',
              padding: '12px 14px',
              borderRadius: 10,
              background: t.status === 'active' ? 'var(--onb-brand-50)' : 'var(--onb-bg-paper)',
              border: '1px solid var(--onb-rule)',
            }}
          >
            <span className="onb-mono" style={{ fontSize: 12, color: 'var(--onb-ink-700)' }}>
              {t.time}
            </span>
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 500 }}>{t.task}</div>
              <div style={{ fontSize: 11.5, color: 'var(--onb-ink-500)', marginTop: 2 }}>{t.who}</div>
            </div>
            <span className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-500)' }}>
              {t.dur}
            </span>
            <span
              className="onb-mono"
              style={{
                fontSize: 9.5,
                padding: '3px 8px',
                borderRadius: 4,
                background:
                  t.status === 'done' ? 'var(--onb-ink-100)' : t.status === 'active' ? 'var(--onb-brand-600)' : 'transparent',
                color:
                  t.status === 'done' ? 'var(--onb-ink-600)' : t.status === 'active' ? 'white' : 'var(--onb-ink-500)',
                border: t.status === 'pending' ? '1px solid var(--onb-rule)' : 0,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                fontWeight: 600,
              }}
            >
              {t.status === 'done' ? '✓ Fait' : t.status === 'active' ? '● En cours' : 'À venir'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function YieldMock() {
  const data = [42, 48, 55, 61, 58, 67, 72, 78, 81, 76, 84, 91];
  const max = Math.max(...data);
  const months = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return (
    <div style={{ padding: 24, height: 'calc(100% - 41px)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 18 }}>
        <div>
          <h3 className="onb-h-display" style={{ fontSize: 22, margin: 0 }}>
            Rendement · Saison 25/26
          </h3>
          <div className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-500)', marginTop: 4 }}>
            Tonnes / hectare · toutes parcelles
          </div>
        </div>
        <div style={{ display: 'flex', gap: 18 }}>
          <YieldStat label="Total" value="2 847 t" />
          <YieldStat label="Moy./ha" value="6.8 t" trend="+12%" />
          <YieldStat label="Objectif" value="3 200 t" />
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
          <div key={months[i]} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
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

function YieldStat({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <div>
      <div className="onb-mono-cap" style={{ fontSize: 9, marginBottom: 3 }}>
        {label}
      </div>
      <div className="onb-h-display" style={{ fontSize: 18, lineHeight: 1 }}>
        {value}
        {trend && (
          <span style={{ fontSize: 11, color: 'var(--onb-brand-600)', marginLeft: 4 }}>{trend}</span>
        )}
      </div>
    </div>
  );
}

function ProductPreview() {
  const [tab, setTab] = useState<'map' | 'tasks' | 'yield'>('map');
  const tabs = [
    { id: 'map' as const, l: 'Carte parcellaire' },
    { id: 'tasks' as const, l: 'Tâches du jour' },
    { id: 'yield' as const, l: 'Rendements' },
  ];
  return (
    <section id="platform" style={{ padding: '100px 40px', borderBottom: '1px solid var(--onb-rule)' }}>
      <SectionHead
        eyebrow="01 · Plateforme"
        title={
          <>
            Un poste de pilotage{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>pour toute la ferme.</em>
          </>
        }
        subtitle="Cartographie temps-réel, planification des tâches, suivi des cultures et de la météo — réunis dans une interface pensée par et pour les agriculteurs."
      />
      <div
        style={{
          display: 'flex',
          gap: 4,
          padding: 4,
          background: 'white',
          border: '1px solid var(--onb-rule)',
          borderRadius: 999,
          width: 'fit-content',
          margin: '0 auto 28px',
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            style={{
              padding: '8px 18px',
              borderRadius: 999,
              border: 0,
              background: tab === t.id ? 'var(--onb-ink-900)' : 'transparent',
              color: tab === t.id ? 'white' : 'var(--onb-ink-600)',
              fontFamily: 'inherit',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all .2s',
            }}
          >
            {t.l}
          </button>
        ))}
      </div>
      <div
        style={{
          maxWidth: 1240,
          margin: '0 auto',
          background: 'var(--onb-ink-900)',
          borderRadius: 18,
          padding: 8,
          boxShadow: '0 24px 60px rgba(20, 40, 30, .12), 0 4px 12px rgba(20, 40, 30, .06)',
        }}
      >
        <div
          style={{
            background: 'white',
            borderRadius: 12,
            overflow: 'hidden',
            aspectRatio: '16 / 9',
            position: 'relative',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              padding: '10px 14px',
              borderBottom: '1px solid var(--onb-rule)',
              background: 'var(--onb-bg-paper)',
            }}
          >
            <div style={{ display: 'flex', gap: 5 }}>
              {['#e8e6df', '#e8e6df', '#e8e6df'].map((c, i) => (
                <span key={i} style={{ width: 10, height: 10, borderRadius: 999, background: c }} />
              ))}
            </div>
            <div
              className="onb-mono"
              style={{
                fontSize: 11,
                color: 'var(--onb-ink-500)',
                marginLeft: 14,
                padding: '4px 10px',
                background: 'white',
                borderRadius: 6,
                border: '1px solid var(--onb-rule)',
              }}
            >
              agrogina.ma/mabella · {tab}
            </div>
          </div>
          {tab === 'map' && <MapMock />}
          {tab === 'tasks' && <TasksMock />}
          {tab === 'yield' && <YieldMock />}
        </div>
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── modules */

function ModulesSection() {
  const mods = [
    { n: '01', icon: Sprout, title: 'Multi-Fermes & Parcellaire', desc: 'Cartographie de vos parcelles, cultures, rotations.' },
    { n: '02', icon: LayoutGrid, title: 'Dashboard & Live Map', desc: 'Suivi temps-réel — météo, capteurs, équipes.' },
    { n: '03', icon: CheckCircle2, title: 'Tâches Agronomiques', desc: 'Planification, suivi GPS, signature de fin.' },
    { n: '04', icon: Leaf, title: 'Récolte & Traçabilité', desc: 'Lots, destinations, traçabilité de la graine au client.' },
    { n: '05', icon: Users, title: 'RH & Paie Agronomique', desc: 'Personnel fixe et journalier, paie, contrats.' },
    { n: '06', icon: Warehouse, title: 'Stocks & Entrepôts', desc: 'Alertes, fournisseurs, mouvements multi-sites.' },
    { n: '07', icon: Receipt, title: 'Compta & Facturation', desc: 'Devis, factures, relances, exports comptables.' },
    { n: '08', icon: Brain, title: 'Assistant IA', desc: 'Posez des questions à vos données en langage naturel.' },
  ];
  return (
    <section
      id="modules"
      style={{ padding: '100px 40px', borderBottom: '1px solid var(--onb-rule)', background: 'var(--onb-bg-paper)' }}
    >
      <SectionHead
        eyebrow="02 · Modules"
        title={
          <>
            Une plateforme. <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>Huit métiers.</em>
          </>
        }
        subtitle="Activez ce dont vous avez besoin. Tout est intégré, rien n'est cloisonné."
      />
      <div
        className="lp-modules"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 1,
          background: 'var(--onb-rule)',
          border: '1px solid var(--onb-rule)',
          maxWidth: 1240,
          margin: '0 auto',
        }}
      >
        {mods.map((m) => {
          const Icon = m.icon;
          return (
            <div
              key={m.n}
              style={{
                background: 'white',
                padding: '28px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 14,
                minHeight: 200,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 10,
                    background: 'var(--onb-brand-50)',
                    color: 'var(--onb-brand-700)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
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

function HowItWorks() {
  const steps = [
    { n: '01', title: 'Configurez en 3 minutes', desc: 'Onboarding guidé : profil, exploitation, modules. Pas de paperasse.' },
    { n: '02', title: 'Tracez vos parcelles', desc: 'Importez un fichier KML ou délimitez à la main sur la carte satellite.' },
    { n: '03', title: 'Connectez vos capteurs', desc: 'Stations météo, sondes, automatismes — compatibles Modbus, LoRa, GSM.' },
    { n: '04', title: 'Pilotez la saison', desc: 'Tâches, équipes, rendements, factures — tout dans une vue unifiée.' },
  ];
  return (
    <section style={{ padding: '100px 40px', borderBottom: '1px solid var(--onb-rule)' }}>
      <SectionHead
        eyebrow="03 · Démarrage"
        title={
          <>
            De l'inscription au pilotage,{' '}
            <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>en une matinée.</em>
          </>
        }
        subtitle="Pas besoin d'équipe IT. Pas de migration sans fin. Vous vous occupez du terrain."
      />
      <div className="lp-steps" style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)' }}>
        {steps.map((s, i) => (
          <div
            key={s.n}
            style={{
              padding: '28px 24px',
              borderLeft: i === 0 ? 0 : '1px solid var(--onb-rule)',
              position: 'relative',
            }}
          >
            <div
              className="onb-mono"
              style={{
                fontSize: 11,
                color: 'var(--onb-brand-700)',
                fontWeight: 600,
                marginBottom: 18,
                letterSpacing: '0.04em',
              }}
            >
              ÉTAPE {s.n}
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

function StatsBand() {
  const stats = [
    { v: '+24%', l: 'Rendement moyen', s: 'Sur cultures monitorées' },
    { v: '−38%', l: "Consommation d'eau", s: 'Irrigation optimisée' },
    { v: '6.2h', l: 'Économisées / sem.', s: 'Tâches automatisées' },
    { v: '4.9/5', l: 'Satisfaction client', s: '847 avis vérifiés' },
  ];
  return (
    <section
      style={{
        padding: '80px 40px',
        background: 'var(--onb-ink-900)',
        color: 'white',
        borderBottom: '1px solid var(--onb-rule)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
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
          04 · Impact mesuré
        </div>
        <h2
          className="onb-h-display"
          style={{ fontSize: 'clamp(40px, 4vw, 56px)', margin: '0 0 56px', maxWidth: 700, lineHeight: 1.05 }}
        >
          Ce que change Agrogina,
          <br />
          <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-100)' }}>en chiffres.</em>
        </h2>
        <div className="lp-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 32 }}>
          {stats.map((s) => (
            <div key={s.l}>
              <div
                className="onb-h-display"
                style={{ fontSize: 'clamp(48px, 5vw, 72px)', lineHeight: 1, color: 'white', marginBottom: 12 }}
              >
                {s.v}
              </div>
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

function Testimonials() {
  return (
    <section id="testimonials" style={{ padding: '100px 40px', borderBottom: '1px solid var(--onb-rule)' }}>
      <SectionHead
        eyebrow="05 · Témoignages"
        title={
          <>
            Le terrain <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>en parle mieux que nous.</em>
          </>
        }
      />
      <div
        className="lp-testimonials"
        style={{ maxWidth: 1240, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr', gap: 16 }}
      >
        <article
          style={{
            padding: 32,
            borderRadius: 'var(--onb-r-lg)',
            background: 'var(--onb-bg-paper)',
            border: '1px solid var(--onb-rule)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: 360,
          }}
        >
          <div>
            <div className="onb-mono-cap" style={{ marginBottom: 18, color: 'var(--onb-brand-700)' }}>
              ★★★★★ · Étude de cas
            </div>
            <p
              style={{
                fontFamily: 'var(--onb-font-display)',
                fontSize: 28,
                lineHeight: 1.25,
                fontWeight: 400,
                color: 'var(--onb-ink-900)',
                margin: 0,
                letterSpacing: '-0.02em',
              }}
            >
              « Avant Agrogina, je remplissais des cahiers le soir. Aujourd'hui, j'ai une vision complète de mes 240
              hectares depuis mon téléphone — et mes équipes savent exactement quoi faire le matin. »
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
              <div style={{ fontWeight: 600, fontSize: 14 }}>Zakaria Boutchamir</div>
              <div className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-500)' }}>
                Ferme Mabella · 240 ha · Marrakech-Safi
              </div>
            </div>
          </div>
        </article>

        {[
          { q: 'Le module RH a remplacé Excel et trois cahiers. Le contrôleur de la CNSS adore.', n: 'Saida El Khouri', r: 'Coopérative Atlas · 12 fermes' },
          {
            q: "Les alertes capteurs ont sauvé une parcelle d'agrumes du gel l'an dernier. Rentabilisé en une saison.",
            n: 'Karim Benjelloun',
            r: 'Domaine Agdal · 85 ha',
          },
        ].map((t) => (
          <article
            key={t.n}
            style={{
              padding: 24,
              borderRadius: 'var(--onb-r-lg)',
              background: 'white',
              border: '1px solid var(--onb-rule)',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              minHeight: 360,
            }}
          >
            <div>
              <div className="onb-mono-cap" style={{ marginBottom: 16, color: 'var(--onb-brand-700)' }}>
                ★★★★★
              </div>
              <p style={{ fontSize: 16, lineHeight: 1.45, color: 'var(--onb-ink-800)', margin: 0 }}>« {t.q} »</p>
            </div>
            <div style={{ marginTop: 22 }}>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{t.n}</div>
              <div className="onb-mono" style={{ fontSize: 10.5, color: 'var(--onb-ink-500)' }}>
                {t.r}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── pricing */

function Pricing({ onContact }: { onContact: () => void }) {
  const plans = [
    {
      name: 'Particulier',
      price: '149',
      desc: 'Petits producteurs, < 5 ha',
      features: ["Jusqu'à 3 parcelles", 'Module Live Map', 'Tâches & rappels', 'Support email'],
      featured: false,
    },
    {
      name: 'Exploitation',
      price: '449',
      desc: 'Fermes professionnelles, 5–200 ha',
      features: [
        'Parcelles illimitées',
        'Tous les modules essentiels',
        '5 utilisateurs inclus',
        'Support prioritaire 24/7',
        'Formation sur site',
      ],
      featured: true,
    },
    {
      name: 'Entreprise',
      price: 'Sur devis',
      desc: 'Coopératives & agro-industrie',
      features: ['Multi-fermes illimité', 'Tous modules + IA', 'SSO & API', 'Account manager dédié', 'SLA 99.9%'],
      featured: false,
    },
  ];

  return (
    <section
      id="pricing"
      style={{
        padding: '100px 40px',
        borderBottom: '1px solid var(--onb-rule)',
        background: 'var(--onb-ink-900)',
        color: 'white',
      }}
    >
      <SectionHead
        eyebrow="06 · Tarifs"
        title={
          <>
            Un prix pour <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-100)' }}>chaque ferme.</em>
          </>
        }
        subtitle="Tarification mensuelle, sans engagement. Essai gratuit de 14 jours sur tous les plans."
        dark
      />
      <div
        className="lp-pricing"
        style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}
      >
        {plans.map((p) => (
          <div
            key={p.name}
            style={{
              padding: 28,
              borderRadius: 'var(--onb-r-lg)',
              background: p.featured ? 'white' : 'rgba(255,255,255,.04)',
              color: p.featured ? 'var(--onb-ink-900)' : 'inherit',
              border: p.featured ? 0 : '1px solid rgba(255,255,255,.12)',
              position: 'relative',
              transform: p.featured ? 'translateY(-12px)' : 'none',
              boxShadow: p.featured
                ? '0 24px 60px rgba(20, 40, 30, .35), 0 4px 12px rgba(20, 40, 30, .15)'
                : 'none',
            }}
          >
            {p.featured && (
              <span
                className="onb-mono"
                style={{
                  position: 'absolute',
                  top: -12,
                  left: 28,
                  padding: '4px 10px',
                  background: 'var(--onb-brand-600)',
                  color: 'white',
                  fontSize: 9.5,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  borderRadius: 4,
                }}
              >
                ★ Populaire
              </span>
            )}
            <div
              className="onb-mono-cap"
              style={{ color: p.featured ? 'var(--onb-brand-700)' : 'rgba(255,255,255,.5)', marginBottom: 12 }}
            >
              {p.name}
            </div>
            <div className="onb-h-display" style={{ fontSize: p.price === 'Sur devis' ? 32 : 56, lineHeight: 1, marginBottom: 6 }}>
              {p.price !== 'Sur devis' && (
                <span style={{ fontSize: 22, verticalAlign: 'top', marginRight: 4 }}>€</span>
              )}
              {p.price}
              {p.price !== 'Sur devis' && (
                <span
                  style={{
                    fontSize: 14,
                    color: p.featured ? 'var(--onb-ink-500)' : 'rgba(255,255,255,.5)',
                    marginLeft: 6,
                    fontFamily: 'var(--onb-font-body)',
                  }}
                >
                  /mois
                </span>
              )}
            </div>
            <p
              style={{
                fontSize: 13,
                color: p.featured ? 'var(--onb-ink-500)' : 'rgba(255,255,255,.6)',
                margin: '0 0 22px',
              }}
            >
              {p.desc}
            </p>
            {p.price === 'Sur devis' ? (
              <button
                type="button"
                onClick={onContact}
                className="onb-btn onb-btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: p.featured ? 'var(--onb-brand-600)' : 'white',
                  color: p.featured ? 'white' : 'var(--onb-ink-900)',
                }}
              >
                Contacter
              </button>
            ) : (
              <Link
                to="/register"
                className="onb-btn onb-btn-primary"
                style={{
                  width: '100%',
                  padding: '14px',
                  background: p.featured ? 'var(--onb-brand-600)' : 'white',
                  color: p.featured ? 'white' : 'var(--onb-ink-900)',
                  textDecoration: 'none',
                  display: 'inline-flex',
                }}
              >
                Démarrer
              </Link>
            )}
            <ul style={{ listStyle: 'none', padding: 0, margin: '22px 0 0' }}>
              {p.features.map((f, i) => (
                <li
                  key={f}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    fontSize: 13.5,
                    padding: '8px 0',
                    borderTop: i === 0 ? 0 : `1px dashed ${p.featured ? 'var(--onb-rule)' : 'rgba(255,255,255,.08)'}`,
                  }}
                >
                  <Check
                    size={14}
                    strokeWidth={2}
                    style={{ color: p.featured ? 'var(--onb-brand-600)' : 'var(--onb-brand-100)', flexShrink: 0 }}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ────────────────────────────────────────────────────────── faq */

function FAQSection() {
  const [open, setOpen] = useState(0);
  const faqs = [
    {
      q: 'Faut-il une connexion internet sur le terrain ?',
      a: "Non. L'application mobile fonctionne hors-ligne et synchronise dès qu'une connexion est retrouvée. Idéal pour les zones rurales mal couvertes.",
    },
    {
      q: 'Mes données restent-elles ma propriété ?',
      a: 'Absolument. Vos données vous appartiennent et sont hébergées en Europe (Frankfurt) avec chiffrement AES-256. Export complet possible à tout moment.',
    },
    {
      q: 'Quels capteurs sont compatibles ?',
      a: 'Plus de 80 marques supportées : Davis, Sentek, Pessl, Adcon, Libelium… via Modbus, LoRa ou GSM. Notre équipe peut auditer votre matériel existant.',
    },
    {
      q: 'Y a-t-il un engagement ?',
      a: 'Aucun. Vous pouvez résilier à tout moment depuis votre espace. Le mois entamé reste dû, le suivant est annulé.',
    },
    {
      q: 'Proposez-vous une formation ?',
      a: "Oui, incluse dans le plan Exploitation : une demi-journée sur site avec un agronome. Pour les coopératives, un programme sur-mesure est disponible.",
    },
  ];
  return (
    <section id="faq" style={{ padding: '100px 40px', borderBottom: '1px solid var(--onb-rule)' }}>
      <SectionHead
        eyebrow="07 · Questions"
        title={
          <>
            On vous répond <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>franchement.</em>
          </>
        }
      />
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        {faqs.map((f, i) => (
          <div key={f.q} style={{ borderBottom: '1px solid var(--onb-rule)' }}>
            <button
              type="button"
              onClick={() => setOpen(open === i ? -1 : i)}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '22px 0',
                border: 0,
                background: 'transparent',
                fontFamily: 'inherit',
                cursor: 'pointer',
                textAlign: 'left',
                gap: 18,
              }}
            >
              <span style={{ display: 'flex', gap: 18, alignItems: 'baseline' }}>
                <span className="onb-mono" style={{ fontSize: 11, color: 'var(--onb-ink-400)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="onb-h-body" style={{ fontSize: 17, color: 'var(--onb-ink-900)' }}>
                  {f.q}
                </span>
              </span>
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  border: '1px solid var(--onb-rule)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--onb-ink-700)',
                  flexShrink: 0,
                  transform: open === i ? 'rotate(45deg)' : 'rotate(0deg)',
                  transition: 'transform .25s',
                }}
              >
                <Plus size={14} strokeWidth={1.8} />
              </span>
            </button>
            {open === i && (
              <div
                style={{
                  paddingLeft: 41,
                  paddingBottom: 22,
                  fontSize: 15,
                  lineHeight: 1.6,
                  color: 'var(--onb-ink-600)',
                  maxWidth: 640,
                }}
              >
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

function CTABanner({ onDemo, onTrial }: { onDemo: () => void; onTrial: () => void }) {
  return (
    <section
      style={{
        padding: '80px 40px',
        background: 'var(--onb-bg-paper)',
        borderBottom: '1px solid var(--onb-rule)',
      }}
    >
      <div
        className="lp-cta"
        style={{
          maxWidth: 1100,
          margin: '0 auto',
          background: 'white',
          border: '1px solid var(--onb-rule)',
          borderRadius: 28,
          padding: '56px',
          display: 'grid',
          gridTemplateColumns: '1.4fr 1fr',
          gap: 40,
          alignItems: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div className="onb-mono-cap" style={{ color: 'var(--onb-brand-700)', marginBottom: 14 }}>
            <span
              style={{
                display: 'inline-block',
                width: 18,
                height: 1,
                background: 'var(--onb-brand-600)',
                verticalAlign: 'middle',
                marginRight: 8,
              }}
            />
            Démarrez maintenant
          </div>
          <h2 className="onb-h-display" style={{ fontSize: 'clamp(34px, 3.5vw, 50px)', margin: '0 0 16px', lineHeight: 1.05 }}>
            La saison 25/26
            <br />
            <em style={{ fontStyle: 'italic', color: 'var(--onb-brand-700)' }}>commence ici.</em>
          </h2>
          <p style={{ fontSize: 16, color: 'var(--onb-ink-600)', maxWidth: 480, margin: '0 0 28px', lineHeight: 1.5 }}>
            14 jours gratuits, sans carte bancaire. Configuration en 3 minutes, accompagnement par un agronome dédié.
          </p>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onTrial}
              className="onb-btn onb-btn-primary"
              style={{ padding: '16px 24px', fontSize: 14 }}
            >
              Démarrer l'essai gratuit
              <ArrowRight size={16} strokeWidth={1.8} />
            </button>
            <button
              type="button"
              onClick={onDemo}
              className="onb-btn onb-btn-ghost"
              style={{ padding: '16px 22px', fontSize: 13 }}
            >
              Réserver une démo
            </button>
          </div>
        </div>
        <div
          style={{
            aspectRatio: '4 / 3',
            borderRadius: 'var(--onb-r-lg)',
            background: 'linear-gradient(160deg, #eef5e0 0%, #d2dfba 100%)',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid var(--onb-rule)',
          }}
        >
          <FieldScene />
          <CornerMarks inset={12} color="rgba(15,32,26,.18)" size={10} />
        </div>
      </div>
    </section>
  );
}

function Footer() {
  const cols = [
    { t: 'Plateforme', l: ['Modules', 'Tarifs', 'Sécurité', 'API & intégrations'] },
    { t: 'Ressources', l: ['Documentation', 'Études de cas', 'Blog agronomique', 'Webinaires'] },
    { t: 'Société', l: ['À propos', 'Carrières', 'Presse', 'Contact'] },
    { t: 'Légal', l: ['CGU', 'Confidentialité', 'Cookies', 'Mentions légales'] },
  ];
  return (
    <footer style={{ padding: '64px 40px 32px', background: 'var(--onb-ink-900)', color: 'white' }}>
      <div style={{ maxWidth: 1240, margin: '0 auto' }}>
        <div
          className="lp-footer"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.6fr 1fr 1fr 1fr 1fr',
            gap: 40,
            paddingBottom: 48,
            borderBottom: '1px solid rgba(255,255,255,.1)',
          }}
        >
          <div>
            <AgroginaWordmark size={26} />
            <p style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', maxWidth: 320, lineHeight: 1.55, marginTop: 18 }}>
              La plateforme agricole intégrée. Pour la saison qui vient, et toutes celles d'après.
            </p>
            <div style={{ marginTop: 22, display: 'flex', alignItems: 'center', gap: 10 }}>
              <span className="onb-mono-cap" style={{ color: 'rgba(255,255,255,.4)', fontSize: 9.5 }}>
                Disponible sur
              </span>
              <span style={{ fontSize: 11, color: 'rgba(255,255,255,.7)' }}>iOS · Android · Web</span>
            </div>
          </div>
          {cols.map((c) => (
            <div key={c.t}>
              <div className="onb-mono-cap" style={{ color: 'rgba(255,255,255,.4)', marginBottom: 16, fontSize: 10 }}>
                {c.t}
              </div>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 10 }}>
                {c.l.map((item) => (
                  <li key={item}>
                    <a href="#" style={{ fontSize: 13, color: 'rgba(255,255,255,.75)', textDecoration: 'none' }}>
                      {item}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div
          style={{
            paddingTop: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 11,
            color: 'rgba(255,255,255,.4)',
            flexWrap: 'wrap',
            gap: 12,
          }}
        >
          <span className="onb-mono">© 2026 Agrogina · 31.6294° N · 7.9811° W</span>
          <span className="onb-mono">FR · MA · v2026.05</span>
        </div>
      </div>
    </footer>
  );
}

/* ────────────────────────────────────────────────────────── responsive css (scoped) */

const RESPONSIVE_CSS = `
.onb-shell .lp-hero { grid-template-columns: minmax(0,1fr) minmax(0,1.05fr); }
@media (max-width: 1024px) {
  .onb-shell .lp-hero { grid-template-columns: 1fr; }
  .onb-shell .lp-hero-visual { min-height: 480px; border-left: 0; border-top: 1px solid var(--onb-rule); }
  .onb-shell .lp-modules { grid-template-columns: repeat(2, 1fr) !important; }
  .onb-shell .lp-steps { grid-template-columns: repeat(2, 1fr) !important; gap: 1px; background: var(--onb-rule); }
  .onb-shell .lp-steps > * { background: var(--onb-bg-canvas); border-left: 0 !important; }
  .onb-shell .lp-stats { grid-template-columns: repeat(2, 1fr) !important; }
  .onb-shell .lp-testimonials { grid-template-columns: 1fr !important; }
  .onb-shell .lp-pricing { grid-template-columns: 1fr !important; }
  .onb-shell .lp-cta { grid-template-columns: 1fr !important; padding: 40px !important; }
  .onb-shell .lp-footer { grid-template-columns: repeat(2, 1fr) !important; }
  .onb-shell .lp-logos { grid-template-columns: repeat(4, 1fr) !important; }
  .onb-shell .lp-mock-map { grid-template-columns: 1fr !important; }
  .onb-shell .lp-nav-links { display: none !important; }
}
@media (max-width: 640px) {
  .onb-shell .lp-modules { grid-template-columns: 1fr !important; }
  .onb-shell .lp-stats { grid-template-columns: 1fr !important; }
  .onb-shell .lp-footer { grid-template-columns: 1fr !important; }
  .onb-shell .lp-logos { grid-template-columns: repeat(2, 1fr) !important; }
}
`;

/* ────────────────────────────────────────────────────────── page */

const LandingPage = () => {
  const { t } = useTranslation();
  const [demoOpen, setDemoOpen] = useState(false);

  const siteOrigin = typeof window !== 'undefined' ? window.location.origin : 'https://app.agritech.local';

  const structuredData = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      applicationCategory: 'BusinessApplication',
      name: appConfig.name,
      url: `${siteOrigin}/`,
      description: t('landing.seo.description', {
        defaultValue: 'Plateforme agricole intégrée pour piloter parcelles, équipes, stocks et capteurs.',
      }),
      image: `${siteOrigin}/assets/logo.png`,
      offers: { '@type': 'Offer', price: '149', priceCurrency: 'EUR' },
    }),
    [siteOrigin, t],
  );

  useEffect(() => {
    const pageTitle = t('landing.seo.title', {
      defaultValue: `${appConfig.name} · Plateforme agricole intégrée`,
    });
    const description = t('landing.seo.description', {
      defaultValue: 'Cultivez avec précision. Décidez avec données.',
    });
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

  return (
    <div className="onb-shell" style={{ minHeight: '100vh' }}>
      <style>{RESPONSIVE_CSS}</style>
      <LandingNav onDemo={openDemo} />
      <Hero onDemo={openDemo} onTrial={goTrial} />
      <LogoStrip />
      <ProductPreview />
      <ModulesSection />
      <HowItWorks />
      <StatsBand />
      <Testimonials />
      <Pricing onContact={openDemo} />
      <FAQSection />
      <CTABanner onDemo={openDemo} onTrial={goTrial} />
      <Footer />

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
              padding: 32,
              border: '1px solid var(--onb-rule)',
              boxShadow: 'var(--onb-sh-md)',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setDemoOpen(false)}
              aria-label="Fermer"
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
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
              <Plus size={14} style={{ transform: 'rotate(45deg)' }} />
            </button>
            <div className="onb-mono-cap" style={{ color: 'var(--onb-brand-700)', marginBottom: 12 }}>
              <Mail size={11} style={{ display: 'inline', marginRight: 6, verticalAlign: 'middle' }} />
              Démo personnalisée
            </div>
            <h3 className="onb-h-display" style={{ fontSize: 28, margin: '0 0 18px' }}>
              Réservez votre démo.
            </h3>
            <DemoRequestForm />
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingPage;
