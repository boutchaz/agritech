import { Building2, MapPin } from 'lucide-react';
import { FloatingField, NavRow, ScreenHero, ScreenShell, ScreenTitle } from './chrome';
import { SatellitePreview } from './scenes';

interface FarmFormData {
  org_name: string;
  email: string;
  city: string;
  region: string;
}

export function FarmScreen({
  data,
  onChange,
  onNext,
  onBack,
  loading,
}: {
  data: FarmFormData;
  onChange: (patch: Partial<FarmFormData>) => void;
  onNext: () => void;
  onBack?: () => void;
  loading?: boolean;
}) {
  const slug =
    (data.org_name || 'mon-exploitation')
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^a-z0-9-]/g, '')
      .slice(0, 40) || 'mon-exploitation';
  const valid = (data.org_name || '').trim().length > 1;

  return (
    <div style={{ padding: '60px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ScreenShell maxWidth={760}>
        <ScreenHero icon={Building2} tone="wheat" />
        <ScreenTitle
          eyebrow="Étape 3 — Votre exploitation"
          title="Présentez votre exploitation"
          subtitle="Ces informations apparaîtront sur vos rapports, factures et tableaux de bord."
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' }}>
          <div
            style={{
              background: 'white',
              border: '1px solid var(--onb-ink-100)',
              borderRadius: 'var(--onb-r-lg)',
              padding: 22,
              boxShadow: 'var(--onb-sh-sm)',
              display: 'flex',
              flexDirection: 'column',
              gap: 12,
            }}
          >
            <FloatingField
              label="Nom de l'exploitation"
              value={data.org_name || ''}
              onChange={(v) => onChange({ org_name: v })}
              placeholder="Ferme Mabella"
              autoFocus
            />

            <div>
              <FloatingField
                label="Email professionnel"
                value={data.email || ''}
                onChange={(v) => onChange({ email: v })}
                placeholder="contact@mabella.ma"
                type="email"
              />
              <p style={{ fontSize: 11, color: 'var(--onb-ink-500)', margin: '6px 4px 0' }}>
                Pour les factures et le support technique.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 10 }}>
              <FloatingField
                label="Ville"
                value={data.city || ''}
                onChange={(v) => onChange({ city: v })}
                placeholder="Marrakech"
              />
              <FloatingField
                label="Région"
                value={data.region || ''}
                onChange={(v) => onChange({ region: v })}
                placeholder="Marrakech-Safi"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div
              style={{
                borderRadius: 'var(--onb-r-lg)',
                overflow: 'hidden',
                border: '1px solid var(--onb-ink-100)',
                boxShadow: 'var(--onb-sh-sm)',
                aspectRatio: '4 / 3',
                position: 'relative',
              }}
            >
              <SatellitePreview />
              <div
                style={{
                  position: 'absolute',
                  left: 12,
                  top: 12,
                  padding: '6px 10px',
                  borderRadius: 999,
                  background: 'rgba(15, 32, 26, .8)',
                  color: 'white',
                  fontSize: 11,
                  fontWeight: 500,
                  letterSpacing: '0.04em',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  backdropFilter: 'blur(6px)',
                }}
              >
                <MapPin size={11} strokeWidth={1.6} />
                {data.city || 'Marrakech'}, {data.region || 'Maroc'}
              </div>
              <div
                style={{
                  position: 'absolute',
                  right: 12,
                  bottom: 12,
                  padding: '4px 10px',
                  borderRadius: 6,
                  background: 'white',
                  fontSize: 10,
                  color: 'var(--onb-ink-600)',
                  fontFamily: 'var(--onb-font-mono)',
                }}
              >
                31.629°N · 7.981°W
              </div>
            </div>

            <div
              style={{
                background: 'white',
                border: '1px solid var(--onb-ink-100)',
                borderRadius: 'var(--onb-r-lg)',
                padding: 16,
                boxShadow: 'var(--onb-sh-xs)',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--onb-ink-500)',
                  marginBottom: 10,
                }}
              >
                Aperçu de votre espace
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: 'var(--onb-brand-600)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    fontWeight: 600,
                    fontSize: 18,
                    fontFamily: 'var(--onb-font-display)',
                  }}
                >
                  {(data.org_name || 'M')[0].toUpperCase()}
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--onb-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {data.org_name || 'Ferme Mabella'}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--onb-ink-500)', fontFamily: 'var(--onb-font-mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    agrogina.ma/{slug}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <NavRow onBack={onBack} onNext={onNext} disabled={!valid} loading={loading} />
      </ScreenShell>
    </div>
  );
}
