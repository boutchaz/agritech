import { Ruler } from 'lucide-react';
import { NavRow, ScreenHero, ScreenShell, ScreenTitle } from './chrome';

export type SurfaceUnit = 'ha' | 'acre' | 'm2';

interface SurfaceData {
  surface: string;
  unit: SurfaceUnit;
  farmName: string;
}

export function SurfaceScreen({
  data,
  onChange,
  onNext,
  onBack,
  loading,
}: {
  data: SurfaceData;
  onChange: (patch: Partial<SurfaceData>) => void;
  onNext: () => void;
  onBack?: () => void;
  loading?: boolean;
}) {
  const unit = data.unit || 'ha';
  const value = parseFloat(data.surface || '') || 0;

  const hectares = unit === 'ha' ? value : unit === 'acre' ? value * 0.4047 : value / 10000;
  const footballFields = Math.max(1, Math.round(hectares * 1.4));
  const visibleFields = Math.min(20, footballFields);
  const overflow = footballFields - visibleFields;
  const compare = getComparable(hectares);

  return (
    <div style={{ padding: '60px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ScreenShell maxWidth={600}>
        <ScreenHero icon={Ruler} tone="brand" />
        <ScreenTitle
          eyebrow={`Étape 4 — ${data.farmName || 'Mon exploitation'}`}
          title="Quelle est sa superficie ?"
          subtitle="Pour calibrer les recommandations, l'irrigation et les rapports."
        />

        <div
          style={{
            background: 'white',
            border: '1px solid var(--onb-ink-100)',
            borderRadius: 'var(--onb-r-lg)',
            padding: 22,
            boxShadow: 'var(--onb-sh-sm)',
          }}
        >
          <div style={{ display: 'flex', gap: 4, padding: 4, background: 'var(--onb-ink-50)', borderRadius: 12, marginBottom: 16 }}>
            {(
              [
                { id: 'ha', label: 'Hectares' },
                { id: 'acre', label: 'Acres' },
                { id: 'm2', label: 'Mètres²' },
              ] as Array<{ id: SurfaceUnit; label: string }>
            ).map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => onChange({ unit: u.id })}
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 8,
                  border: 0,
                  background: unit === u.id ? 'white' : 'transparent',
                  color: unit === u.id ? 'var(--onb-brand-700)' : 'var(--onb-ink-600)',
                  fontWeight: unit === u.id ? 600 : 500,
                  fontSize: 13,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  boxShadow: unit === u.id ? 'var(--onb-sh-xs)' : 'none',
                  transition: 'all .15s',
                }}
              >
                {u.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative' }}>
            <input
              type="number"
              value={data.surface || ''}
              onChange={(e) => onChange({ surface: e.target.value })}
              placeholder="100"
              style={{
                width: '100%',
                fontFamily: 'var(--onb-font-display)',
                fontSize: 56,
                fontWeight: 400,
                letterSpacing: '-0.02em',
                color: 'var(--onb-ink-900)',
                border: 0,
                outline: 'none',
                background: 'transparent',
                padding: '12px 0',
              }}
            />
            <span style={{ position: 'absolute', right: 4, bottom: 24, fontSize: 18, color: 'var(--onb-ink-400)', fontWeight: 500 }}>
              {unit === 'ha' ? 'hectares' : unit === 'acre' ? 'acres' : 'm²'}
            </span>
          </div>

          <input
            type="range"
            min={1}
            max={500}
            step={1}
            value={Math.min(500, value)}
            onChange={(e) => onChange({ surface: e.target.value })}
            style={{ width: '100%', accentColor: 'var(--onb-brand-600)', marginTop: 8 }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--onb-ink-400)', fontVariantNumeric: 'tabular-nums' }}>
            <span>1</span>
            <span>100</span>
            <span>500+</span>
          </div>
        </div>

        <div
          style={{
            marginTop: 14,
            background: 'linear-gradient(135deg, #f0f7e8, #e6efd9)',
            border: '1px solid var(--onb-brand-100)',
            borderRadius: 'var(--onb-r-lg)',
            padding: 22,
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 18,
            alignItems: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--onb-brand-700)',
                marginBottom: 6,
              }}
            >
              Cela représente environ
            </div>
            <div className="onb-h-display" style={{ fontSize: 40, color: 'var(--onb-ink-900)', lineHeight: 1 }}>
              {compare.value}
            </div>
            <div style={{ fontSize: 14, color: 'var(--onb-ink-700)', marginTop: 4 }}>{compare.label}</div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 4, width: 130 }}>
            {Array.from({ length: visibleFields }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 4,
                  background: 'var(--onb-brand-500)',
                  opacity: 0.4 + (i / visibleFields) * 0.5,
                  animation: `onbScalePop .4s cubic-bezier(.34,1.56,.64,1) ${i * 0.04}s both`,
                }}
              />
            ))}
            {overflow > 0 && (
              <div
                style={{
                  gridColumn: 'span 5',
                  fontSize: 10,
                  color: 'var(--onb-brand-700)',
                  textAlign: 'center',
                  fontWeight: 600,
                  marginTop: 4,
                }}
              >
                +{overflow} de plus
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 14 }}>
          <span style={{ fontSize: 12, color: 'var(--onb-ink-500)', alignSelf: 'center', marginRight: 4 }}>Rapide :</span>
          {[5, 25, 100, 500].map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onChange({ surface: String(v), unit: 'ha' })}
              style={{
                padding: '6px 12px',
                borderRadius: 999,
                border: '1px solid var(--onb-ink-200)',
                background: 'white',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--onb-ink-700)',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {v} ha
            </button>
          ))}
        </div>

        <NavRow onBack={onBack} onNext={onNext} disabled={value <= 0} loading={loading} />
      </ScreenShell>
    </div>
  );
}

function getComparable(hectares: number): { value: number; label: string } {
  if (hectares < 0.5) return { value: Math.round(hectares * 10000), label: 'mètres carrés' };
  if (hectares < 2) return { value: Math.round(hectares * 1.4), label: 'terrain de football' };
  if (hectares < 50) return { value: Math.round(hectares * 1.4), label: 'terrains de football' };
  if (hectares < 200) return { value: Math.round(hectares / 10), label: 'fois la place Jemaa el-Fna' };
  if (hectares < 1000) return { value: Math.round(hectares / 100), label: 'fois Central Park' };
  return { value: Math.round(hectares / 1000), label: 'milliers de terrains' };
}
