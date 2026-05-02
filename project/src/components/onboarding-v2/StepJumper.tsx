import { useNavigate, useRouterState } from '@tanstack/react-router';

const STEPS = [
  { label: 'Accueil', path: '/onboarding' },
  { label: 'Profil', path: '/onboarding/profile' },
  { label: 'Compte', path: '/onboarding/account-type' },
  { label: 'Exploitation', path: '/onboarding/farm' },
  { label: 'Superficie', path: '/onboarding/surface' },
  { label: 'Modules', path: '/onboarding/select-trial' },
  { label: 'Terminé', path: '/onboarding/complete' },
] as const;

export function StepJumper() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const normalized = pathname.replace(/\/$/, '') || '/onboarding';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 16,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 4,
        padding: 4,
        background: 'rgba(15, 32, 26, .85)',
        backdropFilter: 'blur(8px)',
        borderRadius: 999,
        boxShadow: '0 8px 24px rgba(15,32,26,.2)',
        zIndex: 50,
      }}
    >
      {STEPS.map((s) => {
        const active = normalized === s.path;
        return (
          <button
            key={s.path}
            type="button"
            onClick={() => navigate({ to: s.path })}
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              border: 0,
              background: active ? 'white' : 'transparent',
              color: active ? 'var(--onb-ink-900)' : 'rgba(255,255,255,.7)',
              fontSize: 11,
              fontWeight: 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all .15s',
            }}
          >
            {s.label}
          </button>
        );
      })}
    </div>
  );
}
