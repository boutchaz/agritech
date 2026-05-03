import { useCallback, useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';

import '../styles/onboarding-tokens.css';

const FEATURES = [
  'Gestion des parcelles haute précision',
  'Analyses satellite NDVI & NDWI en temps réel',
  "Optimisation des rendements par l'IA",
  'Traçabilité complète de la graine à la récolte',
  'Intelligence Artificielle au service du climat',
  'Agriculture de précision 4.0',
];

const TELEMETRY = [
  { l: 'NODE', v: 'AGR-7Q42' },
  { l: 'GEO', v: '31.629°N · 7.981°W' },
  { l: 'LOCALE', v: 'fr-MA' },
  { l: 'BUILD', v: '2026.05' },
];

function FieldBackdrop({ progress }: { progress: number }) {
  return (
    <svg
      viewBox="0 0 1600 900"
      preserveAspectRatio="xMidYMid slice"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.55 }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wi-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f4f6f0" />
          <stop offset="55%" stopColor="#eef5e0" />
          <stop offset="100%" stopColor="#d2dfba" />
        </linearGradient>
        <radialGradient id="wi-sun" cx="0.78" cy="0.22" r="0.45">
          <stop offset="0%" stopColor="rgba(255,220,140,.55)" />
          <stop offset="100%" stopColor="rgba(255,220,140,0)" />
        </radialGradient>
      </defs>
      <rect width="1600" height="900" fill="url(#wi-sky)" />
      <rect width="1600" height="900" fill="url(#wi-sun)" />
      {Array.from({ length: 16 }).map((_, i) => {
        const yTop = 520 + (i / 15) ** 2 * 380;
        const yBot = 520 + ((i + 1) / 15) ** 2 * 380;
        const colors = ['#7fa05f', '#9bbf6c', '#88aa57', '#6f9249', '#a8cd76'];
        return (
          <path
            key={`row-${yTop}`}
            d={`M0 ${yTop} L 1600 ${yTop} L 1600 ${yBot} L 0 ${yBot} Z`}
            fill={colors[i % colors.length]}
            opacity={0.85}
          />
        );
      })}
      {/* progress sweep — emerald hairline scanning down */}
      <line
        x1="0"
        x2="1600"
        y1={520 + progress * 380}
        y2={520 + progress * 380}
        stroke="#0a8f5f"
        strokeWidth="1.5"
        opacity="0.7"
      />
    </svg>
  );
}

export const WowIntro = ({ onComplete }: { onComplete: () => void }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const hasDismissedRef = useRef(false);
  const [progress, setProgress] = useState(0);
  const [isDone, setIsDone] = useState(false);

  const dismissIntro = useCallback(
    (fast = true) => {
      if (hasDismissedRef.current) return;
      hasDismissedRef.current = true;
      timelineRef.current?.kill();
      const target = containerRef.current;
      if (!target) {
        setIsDone(true);
        onComplete();
        return;
      }
      gsap.to(target, {
        opacity: 0,
        duration: fast ? 0.35 : 0.9,
        onComplete: () => {
          setIsDone(true);
          onComplete();
        },
      });
    },
    [onComplete],
  );

  useEffect(() => {
    if (!containerRef.current || !featuresRef.current) return;
    const isMobile = window.innerWidth < 640;

    // Build feature lines
    featuresRef.current.innerHTML = '';
    const lineEls: HTMLElement[] = [];
    FEATURES.forEach((f) => {
      const row = document.createElement('div');
      row.className = 'wi-feature';
      row.innerHTML = `
        <span class="wi-feature-bullet"></span>
        <span class="wi-feature-text">${f}</span>
      `;
      featuresRef.current?.appendChild(row);
      lineEls.push(row);
    });

    const tl = gsap.timeline({
      onComplete: () => {
        gsap.delayedCall(isMobile ? 0.6 : 1.4, () => dismissIntro(false));
      },
    });
    timelineRef.current = tl;

    tl.to(containerRef.current, { opacity: 1, duration: 0.9, ease: 'power2.out' });

    const p = { val: 0 };
    tl.to(
      p,
      {
        val: 1,
        duration: isMobile ? 3.2 : 4.2,
        ease: 'expo.inOut',
        onUpdate: () => setProgress(p.val),
      },
      0.3,
    );

    tl.from(
      lineEls,
      {
        opacity: 0,
        x: 12,
        stagger: 0.18,
        duration: 0.6,
        ease: 'power3.out',
      },
      0.7,
    );

    return () => {
      tl.kill();
    };
  }, [dismissIntro]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') dismissIntro(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dismissIntro]);

  if (isDone) return null;

  const pct = Math.round(progress * 100);

  return (
    <div
      ref={containerRef}
      role="dialog"
      aria-modal="true"
      aria-label="Intro"
      className="onb-shell"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'var(--onb-bg-canvas)',
        opacity: 0,
        overflow: 'hidden',
      }}
    >
      <style>{`
        .wi-shell { display: flex; flex-direction: column; height: 100%; padding: 24px; gap: 20px; position: relative; z-index: 2; }
        .wi-head { display: flex; justify-content: space-between; align-items: center; gap: 16px; flex-wrap: wrap; }
        .wi-brand-row { display: flex; align-items: center; gap: 14px; }
        .wi-divider-v { width: 1px; height: 18px; background: var(--onb-rule); }
        .wi-skip {
          font-family: var(--onb-font-mono);
          font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase;
          color: var(--onb-ink-600);
          padding: 8px 14px; border-radius: 999px;
          border: 1px solid var(--onb-rule); background: white;
          cursor: pointer; transition: background .15s;
        }
        .wi-skip:hover { background: var(--onb-ink-50); }
        .wi-body { flex: 1; display: grid; grid-template-columns: 1fr; gap: 24px; align-content: center; padding: 0 4px; }
        .wi-display {
          font-family: var(--onb-font-display); font-weight: 400;
          letter-spacing: -0.025em; line-height: 0.96;
          font-size: clamp(48px, 12vw, 128px);
          color: var(--onb-ink-900);
          margin: 0;
          text-wrap: balance;
        }
        .wi-display em { font-style: italic; color: var(--onb-brand-700); font-weight: 400; }
        .wi-tagline {
          margin: 16px 0 0;
          max-width: 540px;
          font-size: clamp(15px, 2.2vw, 19px);
          line-height: 1.55;
          color: var(--onb-ink-600);
          text-wrap: pretty;
        }
        .wi-features {
          display: flex; flex-direction: column; gap: 6px;
          padding: 18px 0;
          border-top: 1px solid var(--onb-rule);
          border-bottom: 1px solid var(--onb-rule);
          max-width: 560px;
        }
        .wi-feature { display: flex; align-items: center; gap: 12px; padding: 4px 0; }
        .wi-feature-bullet {
          width: 6px; height: 6px; border-radius: 999px;
          background: var(--onb-brand-600);
          box-shadow: 0 0 0 4px rgba(16,185,129,.18);
          flex-shrink: 0;
        }
        .wi-feature-text {
          font-family: var(--onb-font-body);
          font-size: 14px; font-weight: 500; letter-spacing: -0.005em;
          color: var(--onb-ink-800);
        }
        .wi-foot { display: flex; justify-content: space-between; align-items: end; gap: 18px; flex-wrap: wrap; }
        .wi-progress { display: flex; align-items: center; gap: 12px; min-width: 220px; }
        .wi-progress-bar {
          flex: 1; height: 3px; border-radius: 999px;
          background: var(--onb-ink-200); overflow: hidden;
        }
        .wi-progress-fill {
          height: 100%; background: var(--onb-brand-600);
          transition: width .12s linear;
        }
        .wi-telemetry {
          display: flex; align-items: center; gap: 14px;
          padding: 6px 14px; border-radius: 999px;
          background: var(--onb-ink-50); border: 1px solid var(--onb-rule);
          flex-wrap: wrap;
        }
        .wi-tel-dot {
          width: 6px; height: 6px; border-radius: 999px;
          background: var(--onb-brand-500);
          box-shadow: 0 0 0 4px rgba(16,185,129,.18);
        }
        .wi-tel-item {
          font-family: var(--onb-font-mono);
          font-size: 10px;
          display: inline-flex; gap: 6px;
        }
        .wi-tel-l { color: var(--onb-ink-400); }
        .wi-tel-v { color: var(--onb-ink-700); }

        @media (min-width: 768px) {
          .wi-shell { padding: 40px; gap: 32px; }
          .wi-body { padding: 0 8px; gap: 32px; }
        }
        @media (min-width: 1024px) {
          .wi-shell { padding: 56px 64px; }
        }
      `}</style>

      <FieldBackdrop progress={progress} />

      <div className="wi-shell">
        <div className="wi-head">
          <div className="wi-brand-row">
            <picture>
              <source srcSet="/assets/logo.webp" type="image/webp" />
              <img src="/assets/logo.png" alt="Agrogina" style={{ height: 26, width: 'auto' }} />
            </picture>
            <span
              style={{
                fontFamily: 'var(--onb-font-display)',
                fontSize: 22,
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: 'var(--onb-ink-900)',
              }}
            >
              agrogina
            </span>
            <div className="wi-divider-v" />
            <span className="onb-mono-cap" style={{ whiteSpace: 'nowrap' }}>
              Saison 25/26
            </span>
          </div>
          <button type="button" className="wi-skip" onClick={() => dismissIntro(true)} aria-label="Skip">
            Passer ⏎
          </button>
        </div>

        <div className="wi-body">
          <h1 className="wi-display">
            Cultivez
            <br />
            avec <em>précision.</em>
            <br />
            Décidez avec données.
          </h1>
          <p className="wi-tagline">
            Agrogina réunit la gestion de vos parcelles, vos équipes, vos stocks et vos capteurs dans un seul espace —
            de la graine à la facture.
          </p>
          <div className="wi-features" ref={featuresRef} />
        </div>

        <div className="wi-foot">
          <div className="wi-telemetry">
            <span className="wi-tel-dot" />
            {TELEMETRY.map((it) => (
              <span key={it.l} className="wi-tel-item">
                <span className="wi-tel-l">{it.l}</span>
                <span className="wi-tel-v">{it.v}</span>
              </span>
            ))}
          </div>
          <div className="wi-progress">
            <span
              className="onb-mono"
              style={{ fontSize: 11, color: 'var(--onb-ink-500)', minWidth: 36 }}
            >
              {String(pct).padStart(3, '0')}%
            </span>
            <div className="wi-progress-bar">
              <div className="wi-progress-fill" style={{ width: `${pct}%` }} />
            </div>
            <span
              className="onb-mono"
              style={{ fontSize: 11, color: 'var(--onb-ink-400)', whiteSpace: 'nowrap' }}
            >
              boot · sync · ready
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
