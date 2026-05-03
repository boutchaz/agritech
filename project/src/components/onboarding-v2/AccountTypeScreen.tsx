import { Briefcase, Check } from 'lucide-react';
import { NavRow, ScreenHero, ScreenShell, ScreenTitle } from './chrome';
import { TileScene } from './scenes';

export type AccountTypeId = 'individual' | 'business' | 'farm';

const TYPES: Array<{
  id: AccountTypeId;
  title: string;
  desc: string;
  scene: 'sprout' | 'tractor' | 'building';
  stat: string;
  popular?: boolean;
}> = [
  { id: 'individual', title: 'Particulier', desc: 'Petit producteur, jardinier, maraîcher', scene: 'sprout', stat: '< 5 ha' },
  { id: 'farm', title: 'Exploitation agricole', desc: 'Ferme professionnelle, agriculteur', scene: 'tractor', stat: '5 – 200 ha', popular: true },
  { id: 'business', title: 'Entreprise', desc: 'Coopérative, grande exploitation, agro-industrie', scene: 'building', stat: '200+ ha' },
];

export function AccountTypeScreen({
  value,
  onChange,
  onNext,
  onBack,
  loading,
}: {
  value: AccountTypeId | null;
  onChange: (v: AccountTypeId) => void;
  onNext: () => void;
  onBack?: () => void;
  loading?: boolean;
}) {
  return (
    <div style={{ padding: '60px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ScreenShell maxWidth={720}>
        <ScreenHero icon={Briefcase} tone="soil" />
        <ScreenTitle
          eyebrow="Étape 2 — Configuration"
          title="Quel type d'exploitation ?"
          subtitle="Nous adapterons les fonctionnalités, rapports et tarifs à votre profil."
        />

        <div style={{ display: 'grid', gap: 12 }}>
          {TYPES.map((t) => (
            <AccountTile key={t.id} {...t} selected={value === t.id} onSelect={() => onChange(t.id)} />
          ))}
        </div>

        <NavRow onBack={onBack} onNext={onNext} disabled={!value} loading={loading} />
      </ScreenShell>
    </div>
  );
}

function AccountTile({
  title,
  desc,
  scene,
  stat,
  popular,
  selected,
  onSelect,
}: {
  id: AccountTypeId;
  title: string;
  desc: string;
  scene: 'sprout' | 'tractor' | 'building';
  stat: string;
  popular?: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        textAlign: 'left',
        padding: 18,
        background: selected ? 'var(--onb-brand-50)' : 'white',
        border: `1.5px solid ${selected ? 'var(--onb-brand-500)' : 'var(--onb-ink-100)'}`,
        borderRadius: 'var(--onb-r-lg)',
        cursor: 'pointer',
        fontFamily: 'inherit',
        position: 'relative',
        transition: 'all .18s ease',
        boxShadow: selected ? '0 0 0 4px rgba(16,185,129,.12), var(--onb-sh-sm)' : 'var(--onb-sh-xs)',
        transform: selected ? 'translateY(-1px)' : 'translateY(0)',
      }}
    >
      <TileScene kind={scene} selected={selected} />

      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span className="onb-h-body" style={{ fontSize: 17, color: 'var(--onb-ink-900)' }}>
            {title}
          </span>
          {popular && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
                padding: '3px 8px',
                borderRadius: 999,
                background: 'var(--onb-wheat-500)',
                color: 'white',
              }}
            >
              Populaire
            </span>
          )}
        </div>
        <div style={{ fontSize: 14, color: 'var(--onb-ink-500)', lineHeight: 1.4 }}>{desc}</div>
      </div>

      <div
        style={{
          textAlign: 'right',
          fontSize: 12,
          color: selected ? 'var(--onb-brand-700)' : 'var(--onb-ink-500)',
          fontVariantNumeric: 'tabular-nums',
          fontWeight: 500,
          marginRight: 6,
        }}
      >
        {stat}
      </div>

      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: 999,
          border: `1.5px solid ${selected ? 'var(--onb-brand-600)' : 'var(--onb-ink-300)'}`,
          background: selected ? 'var(--onb-brand-600)' : 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          flexShrink: 0,
          transition: 'all .15s',
        }}
      >
        {selected && <Check size={14} strokeWidth={2.5} />}
      </div>
    </button>
  );
}
