import { Clock, LogOut, Mail, Phone, XCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { AgroginaLogo, ScreenShell } from '@/components/onboarding-v2/chrome';
import { useAuth } from '../hooks/useAuth';
import { useSupportInfo } from '../hooks/useSupportInfo';

interface PendingApprovalProps {
  status: 'pending' | 'rejected' | 'approved';
}

const PendingApproval = ({ status }: PendingApprovalProps) => {
  const { t } = useTranslation();
  const { currentOrganization, signOut } = useAuth();
  const support = useSupportInfo();
  const SUPPORT_EMAIL = support.email;
  const SUPPORT_PHONE = support.phone;
  const isRejected = status === 'rejected';

  const eyebrow = isRejected
    ? t('pendingApproval.rejectedEyebrow', 'Compte non validé')
    : t('pendingApproval.pendingEyebrow', 'En attente de validation');

  const title = isRejected
    ? t('pendingApproval.rejectedTitle', 'Compte non approuvé')
    : t('pendingApproval.pendingTitle', 'Compte en cours de validation');

  const message = isRejected
    ? t(
        'pendingApproval.rejectedMessage',
        "Notre équipe a examiné votre candidature et n'est pas en mesure d'activer votre compte pour le moment. Contactez-nous pour discuter des prochaines étapes.",
      )
    : t(
        'pendingApproval.pendingMessage',
        "Merci pour votre inscription. Notre équipe vous contactera sous 24h pour valider votre organisation et activer votre compte.",
      );

  const Icon = isRejected ? XCircle : Clock;

  return (
    <div
      className="onb-shell"
      style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '20px 32px',
          borderBottom: '1px solid var(--onb-ink-100)',
          background: 'rgba(255,255,255,.85)',
          backdropFilter: 'blur(8px)',
        }}
      >
        <AgroginaLogo size={28} />
      </header>

      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 24px 80px',
        }}
      >
        <ScreenShell maxWidth={560}>
          {/* Hero icon */}
          <div
            className="onb-scale-pop"
            style={{
              width: 80,
              height: 80,
              margin: '0 auto 24px',
              borderRadius: 999,
              background: isRejected ? '#fef2f2' : 'var(--onb-brand-50)',
              color: isRejected ? '#dc2626' : 'var(--onb-brand-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div
              style={{
                position: 'absolute',
                inset: -8,
                borderRadius: 999,
                background: isRejected ? '#fee2e2' : 'var(--onb-brand-100)',
                opacity: 0.4,
              }}
            />
            <Icon size={40} strokeWidth={1.6} style={{ position: 'relative', zIndex: 1 }} />
          </div>

          {/* Title block */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: isRejected ? '#dc2626' : 'var(--onb-brand-700)',
                marginBottom: 10,
              }}
            >
              {eyebrow}
            </div>
            <h1 className="onb-h-display" style={{ fontSize: 32, margin: '0 0 10px', color: 'var(--onb-ink-900)' }}>
              {title}
            </h1>
            <p
              style={{
                margin: 0,
                fontSize: 15,
                color: 'var(--onb-ink-500)',
                maxWidth: 460,
                marginInline: 'auto',
                lineHeight: 1.55,
              }}
            >
              {message}
            </p>
          </div>

          {/* Org card */}
          {currentOrganization && (
            <div
              style={{
                background: 'white',
                border: '1px solid var(--onb-ink-100)',
                borderRadius: 'var(--onb-r-lg)',
                padding: 18,
                boxShadow: 'var(--onb-sh-sm)',
                marginBottom: 14,
                display: 'flex',
                alignItems: 'center',
                gap: 14,
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
                  fontFamily: 'var(--onb-font-display)',
                  fontWeight: 600,
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {(currentOrganization.name || 'M')[0].toUpperCase()}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--onb-ink-500)',
                    marginBottom: 2,
                  }}
                >
                  {t('pendingApproval.organizationLabel', 'Organisation')}
                </div>
                <div className="onb-h-body" style={{ fontSize: 15, color: 'var(--onb-ink-900)' }}>
                  {currentOrganization.name}
                </div>
              </div>
            </div>
          )}

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
              {t('pendingApproval.needHelp', 'Une question ?')}
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

          {/* Sign out */}
          <button
            type="button"
            onClick={() => signOut()}
            className="onb-btn onb-btn-ghost"
            style={{ width: '100%' }}
          >
            <LogOut size={16} strokeWidth={1.6} />
            {t('pendingApproval.signOut', 'Se déconnecter')}
          </button>
        </ScreenShell>
      </div>
    </div>
  );
};

export default PendingApproval;
