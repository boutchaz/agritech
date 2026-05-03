import { ArrowRight, Clock, Mail, Phone } from 'lucide-react';
import type { CSSProperties } from 'react';
import { ScreenShell, ScreenTitle } from './chrome';

interface CompleteData {
  firstName: string;
  farmName: string;
  accountType: string;
  city: string;
  surface: number;
  unit: 'ha' | 'acre' | 'm2';
  modulesCount: number;
}

const SUPPORT_EMAIL = 'support@agrogina.com';
const SUPPORT_PHONE = '+212 600 000 000';

export function CompleteScreen({
  data,
  onComplete,
  onRestart,
  loading,
}: {
  data: CompleteData;
  onComplete: () => void;
  onRestart?: () => void;
  loading?: boolean;
}) {
  const accountLabel =
    data.accountType === 'individual' ? 'Particulier' : data.accountType === 'business' ? 'Entreprise' : 'Exploitation';
  const unitLabel = data.unit === 'acre' ? 'ac' : data.unit === 'm2' ? 'm²' : 'ha';

  return (
    <div style={{ padding: '40px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ScreenShell maxWidth={680}>
        <div
          style={{
            width: 80,
            height: 80,
            margin: '0 auto 24px',
            borderRadius: 999,
            background: 'var(--onb-brand-50)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          <div
            className="onb-scale-pop"
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: 999,
              background: 'var(--onb-brand-100)',
              opacity: 0.4,
            }}
          />
          <svg width={40} height={40} viewBox="0 0 40 40" fill="none">
            <circle
              cx="20"
              cy="20"
              r="18"
              stroke="var(--onb-brand-600)"
              strokeWidth="2"
              style={{ strokeDasharray: 113, strokeDashoffset: 113, animation: 'onbDrawPath .7s .1s ease-out forwards', '--len': 113 } as CSSProperties}
            />
            <path
              d="M12 20 l 6 6 l 12 -12"
              stroke="var(--onb-brand-600)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ strokeDasharray: 30, strokeDashoffset: 30, animation: 'onbDrawPath .4s .65s ease-out forwards', '--len': 30 } as CSSProperties}
            />
          </svg>
        </div>

        <ScreenTitle
          eyebrow="Configuration terminée"
          title={`Merci ${data.firstName} 👋`}
          subtitle={`Nous avons bien reçu les informations de ${data.farmName}. Notre équipe valide votre compte avant activation.`}
        />

        {/* Pending review card */}
        <div
          style={{
            background: 'linear-gradient(135deg, #f0f7e8, #e6efd9)',
            border: '1px solid var(--onb-brand-100)',
            borderRadius: 'var(--onb-r-lg)',
            padding: 22,
            marginBottom: 14,
            display: 'flex',
            alignItems: 'flex-start',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              background: 'var(--onb-brand-600)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Clock size={22} strokeWidth={1.6} />
          </div>
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
              En attente de validation
            </div>
            <div className="onb-h-body" style={{ fontSize: 16, color: 'var(--onb-ink-900)', marginBottom: 6 }}>
              Notre équipe vous contactera sous 24h
            </div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--onb-ink-600)', lineHeight: 1.5 }}>
              Pendant ce temps, vous pouvez accéder à votre espace en mode lecture seule. Vous recevrez
              un email dès l'activation complète de votre compte.
            </p>
          </div>
        </div>

        {/* Summary card */}
        <div
          style={{
            background: 'white',
            border: '1px solid var(--onb-ink-100)',
            borderRadius: 'var(--onb-r-lg)',
            padding: 22,
            boxShadow: 'var(--onb-sh-sm)',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'var(--onb-ink-500)',
              marginBottom: 14,
            }}
          >
            Récapitulatif
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            <SummaryStat label="Type" value={accountLabel} />
            <SummaryStat label="Localisation" value={data.city || 'Marrakech'} />
            <SummaryStat label="Superficie" value={`${data.surface} ${unitLabel}`} />
            <SummaryStat label="Modules" value={`${data.modulesCount} actifs`} />
          </div>
        </div>

        {/* Support card */}
        <div
          style={{
            background: 'white',
            border: '1px solid var(--onb-ink-100)',
            borderRadius: 'var(--onb-r-lg)',
            padding: 18,
            boxShadow: 'var(--onb-sh-xs)',
            marginBottom: 18,
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
            Une question ?
          </div>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--onb-ink-700)',
                textDecoration: 'none',
              }}
            >
              <Mail size={14} strokeWidth={1.6} style={{ color: 'var(--onb-brand-700)' }} />
              {SUPPORT_EMAIL}
            </a>
            <a
              href={`tel:${SUPPORT_PHONE.replace(/\s+/g, '')}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 13,
                color: 'var(--onb-ink-700)',
                textDecoration: 'none',
              }}
            >
              <Phone size={14} strokeWidth={1.6} style={{ color: 'var(--onb-brand-700)' }} />
              {SUPPORT_PHONE}
            </a>
          </div>
        </div>

        {/* Primary CTA */}
        <button
          type="button"
          onClick={onComplete}
          disabled={loading}
          className="onb-btn onb-btn-primary"
          style={{ width: '100%', padding: '18px 24px', opacity: loading ? 0.6 : 1, cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '…' : 'Aller à mon espace'}
          {!loading && <ArrowRight size={16} strokeWidth={1.6} />}
        </button>

        {onRestart && (
          <button
            type="button"
            onClick={onRestart}
            style={{
              background: 'transparent',
              border: 0,
              color: 'var(--onb-ink-500)',
              padding: '20px',
              margin: '4px auto 0',
              display: 'block',
              fontFamily: 'inherit',
              fontSize: 13,
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 4,
            }}
          >
            Recommencer la configuration
          </button>
        )}
      </ScreenShell>
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--onb-ink-500)', marginBottom: 4 }}>{label}</div>
      <div className="onb-h-body" style={{ fontSize: 16, color: 'var(--onb-ink-900)' }}>
        {value}
      </div>
    </div>
  );
}
