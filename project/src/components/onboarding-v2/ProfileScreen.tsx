import { Clock, Globe, Sparkles, User } from 'lucide-react';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { PhoneInput } from '@/components/ui/phone-input';
import { loadLanguage } from '@/i18n/config';
import { FloatingField, NavRow, ScreenHero, ScreenShell, ScreenTitle, SmartChip } from './chrome';

interface ProfileData {
  first_name: string;
  last_name: string;
  phone: string;
  language: string;
  timezone: string;
}

export function ProfileScreen({
  data,
  onChange,
  onNext,
  onBack,
  loading,
}: {
  data: ProfileData;
  onChange: (patch: Partial<ProfileData>) => void;
  onNext: () => void;
  onBack?: () => void;
  loading?: boolean;
}) {
  const valid = (data.first_name || '').trim().length > 0 && isValidPhoneNumber(data.phone || '');

  const langLabel: Record<string, string> = {
    fr: 'Français',
    en: 'English',
    ar: 'العربية',
  };
  const tzLabel: Record<string, string> = {
    'Africa/Casablanca': 'Casablanca · GMT+1',
    'Europe/Paris': 'Paris · GMT+2',
    'Europe/London': 'Londres · GMT+1',
    UTC: 'UTC · GMT+0',
  };

  return (
    <div style={{ padding: '60px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ScreenShell maxWidth={560}>
        <ScreenHero icon={User} tone="brand" />
        <ScreenTitle
          eyebrow="Profil personnel"
          title="Faisons connaissance"
          subtitle="Vos informations restent privées et servent uniquement à personnaliser votre espace."
        />

        <div
          style={{
            background: 'white',
            border: '1px solid var(--onb-ink-100)',
            borderRadius: 'var(--onb-r-lg)',
            padding: 24,
            boxShadow: 'var(--onb-sh-sm)',
          }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FloatingField
              label="Prénom"
              value={data.first_name || ''}
              onChange={(v) => onChange({ first_name: v })}
              placeholder="Zakaria"
              autoFocus
            />
            <FloatingField
              label="Nom"
              value={data.last_name || ''}
              onChange={(v) => onChange({ last_name: v })}
              placeholder="Boutchamir"
            />
          </div>

          <div style={{ marginTop: 14 }}>
            <label
              style={{
                display: 'block',
                fontSize: 11,
                fontWeight: 500,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                color: 'var(--onb-ink-500)',
                marginBottom: 6,
              }}
            >
              Numéro de téléphone
            </label>
            <PhoneInput
              international
              defaultCountry="MA"
              value={data.phone || undefined}
              onChange={(v) => onChange({ phone: v ?? '' })}
              className="w-full"
            />
            <p style={{ fontSize: 12, color: 'var(--onb-ink-500)', margin: '8px 4px 0' }}>
              Pour WhatsApp, SMS et alertes critiques (gel, pluie, marché).
            </p>
          </div>

          <div style={{ marginTop: 18, paddingTop: 18, borderTop: '1px dashed var(--onb-ink-200)' }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: 'var(--onb-ink-500)',
                marginBottom: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <Sparkles size={12} strokeWidth={1.6} />
              Détecté automatiquement
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <SmartChip
                icon={Globe}
                value={data.language || 'fr'}
                options={[
                  { value: 'fr', label: langLabel.fr, flag: '🇫🇷' },
                  { value: 'en', label: langLabel.en, flag: '🇬🇧' },
                  { value: 'ar', label: langLabel.ar, flag: '🇲🇦' },
                ]}
                onPick={(v) => {
                  void loadLanguage(v);
                  onChange({ language: v });
                }}
              />
              <SmartChip
                icon={Clock}
                value={data.timezone || 'Africa/Casablanca'}
                options={Object.entries(tzLabel).map(([value, label]) => ({ value, label }))}
                onPick={(v) => onChange({ timezone: v })}
              />
            </div>
          </div>
        </div>

        <NavRow onBack={onBack} onNext={onNext} disabled={!valid} loading={loading} />
      </ScreenShell>
    </div>
  );
}
