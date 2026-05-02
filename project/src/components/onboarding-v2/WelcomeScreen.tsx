import { ArrowRight } from 'lucide-react';
import { FieldScene } from './scenes';

export function WelcomeScreen({ onStart, onSignIn }: { onStart: () => void; onSignIn?: () => void }) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.1fr)',
        alignItems: 'stretch',
      }}
    >
      <div
        className="onb-fade-up"
        style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          padding: '48px 64px',
        }}
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
          style={{ fontSize: 'clamp(40px, 5vw, 64px)', margin: '0 0 20px', color: 'var(--onb-ink-900)', maxWidth: 520 }}
        >
          La saison commence ici.
        </h1>
        <p style={{ fontSize: 18, lineHeight: 1.55, color: 'var(--onb-ink-600)', maxWidth: 460, margin: '0 0 36px' }}>
          Configurons votre exploitation en 3 minutes. Nous nous occupons des paramètres techniques —
          vous gardez les mains sur la terre.
        </p>

        <div style={{ display: 'flex', gap: 12, marginBottom: 36 }}>
          <button type="button" onClick={onStart} className="onb-btn onb-btn-primary" style={{ padding: '18px 28px', fontSize: 16 }}>
            Commencer la configuration
            <ArrowRight size={18} strokeWidth={1.6} />
          </button>
          {onSignIn && (
            <button type="button" onClick={onSignIn} className="onb-btn onb-btn-ghost" style={{ padding: '18px 24px', fontSize: 15 }}>
              J'ai déjà un compte
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 32, paddingTop: 28, borderTop: '1px solid var(--onb-ink-100)' }}>
          {[
            { n: '3 min', t: 'pour démarrer' },
            { n: '12 400+', t: 'exploitations' },
            { n: '14 pays', t: 'MENA + Europe' },
          ].map((s) => (
            <div key={s.t}>
              <div className="onb-h-display" style={{ fontSize: 24, color: 'var(--onb-ink-900)' }}>
                {s.n}
              </div>
              <div style={{ fontSize: 12, color: 'var(--onb-ink-500)', marginTop: 2 }}>{s.t}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          background: 'linear-gradient(160deg, #f0f7e8 0%, #e6efd9 60%, #d8e8c4 100%)',
          position: 'relative',
          overflow: 'hidden',
          borderLeft: '1px solid var(--onb-ink-100)',
        }}
      >
        <FieldScene />
      </div>
    </div>
  );
}
