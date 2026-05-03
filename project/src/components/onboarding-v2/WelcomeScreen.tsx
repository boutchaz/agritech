import { ArrowRight } from 'lucide-react';
import { FieldScene } from './scenes';

export function WelcomeScreen({ onStart, onSignIn }: { onStart: () => void; onSignIn?: () => void }) {
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] items-stretch">
      <div
        className="onb-fade-up flex flex-col justify-center px-6 py-10 sm:px-10 sm:py-12 lg:px-16 lg:py-12"
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: 'var(--onb-brand-700)',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 999,
              background: 'var(--onb-brand-600)',
              boxShadow: '0 0 0 4px rgba(16,185,129,.15)',
            }}
          />
          Bienvenue chez Agrogina
        </div>
        <h1
          className="onb-h-display"
          style={{ fontSize: 'clamp(32px, 6vw, 64px)', margin: '0 0 20px', color: 'var(--onb-ink-900)', maxWidth: 520, lineHeight: 1.05 }}
        >
          La saison commence ici.
        </h1>
        <p
          className="text-base sm:text-lg"
          style={{ lineHeight: 1.55, color: 'var(--onb-ink-600)', maxWidth: 460, margin: '0 0 32px' }}
        >
          Configurons votre exploitation en 3 minutes. Nous nous occupons des paramètres techniques —
          vous gardez les mains sur la terre.
        </p>

        <div className="flex flex-col sm:flex-row flex-wrap gap-3 mb-9">
          <button
            type="button"
            onClick={onStart}
            className="onb-btn onb-btn-primary w-full sm:w-auto justify-center"
            style={{ padding: '16px 24px', fontSize: 16 }}
          >
            Commencer la configuration
            <ArrowRight size={18} strokeWidth={1.6} />
          </button>
          {onSignIn && (
            <button
              type="button"
              onClick={onSignIn}
              className="onb-btn onb-btn-ghost w-full sm:w-auto justify-center"
              style={{ padding: '16px 22px', fontSize: 15 }}
            >
              J'ai déjà un compte
            </button>
          )}
        </div>

        <div
          className="grid grid-cols-3 gap-4 sm:gap-8 pt-7"
          style={{ borderTop: '1px solid var(--onb-ink-100)' }}
        >
          {[
            { n: '3 min', t: 'pour démarrer' },
            { n: '12 400+', t: 'exploitations' },
            { n: '14 pays', t: 'MENA + Europe' },
          ].map((s) => (
            <div key={s.t}>
              <div className="onb-h-display" style={{ fontSize: 'clamp(18px, 4.5vw, 24px)', color: 'var(--onb-ink-900)', whiteSpace: 'nowrap' }}>
                {s.n}
              </div>
              <div style={{ fontSize: 12, color: 'var(--onb-ink-500)', marginTop: 2 }}>{s.t}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        className="hidden lg:block relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #f0f7e8 0%, #e6efd9 60%, #d8e8c4 100%)',
          borderLeft: '1px solid var(--onb-ink-100)',
        }}
      >
        <FieldScene />
      </div>
    </div>
  );
}
