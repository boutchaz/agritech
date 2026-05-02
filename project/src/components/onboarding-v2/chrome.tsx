import { ArrowLeft, ArrowRight, type LucideIcon } from 'lucide-react';
import { useState, type CSSProperties, type ReactNode } from 'react';

export function AgroginaMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="agrogina-leaf-1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#10b981" />
          <stop offset="100%" stopColor="#047857" />
        </linearGradient>
        <linearGradient id="agrogina-leaf-2" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#65a30d" />
          <stop offset="100%" stopColor="#3f6212" />
        </linearGradient>
      </defs>
      <path d="M20 2 L36 11 L36 29 L20 38 L4 29 L4 11 Z" fill="none" stroke="#1f2a27" strokeWidth="2" strokeLinejoin="round" />
      <path d="M11 22 C 11 14, 17 10, 24 10 C 24 17, 19 23, 11 23 Z" fill="url(#agrogina-leaf-1)" />
      <path d="M14 30 C 14 22, 21 18, 28 19 C 28 26, 22 31, 14 31 Z" fill="url(#agrogina-leaf-2)" />
    </svg>
  );
}

export function AgroginaLogo({ size = 32, showText = true }: { size?: number; showText?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <picture>
        <source srcSet="/assets/logo.webp" type="image/webp" />
        <img
          src="/assets/logo.png"
          alt="AgroGina"
          height={size}
          style={{ height: size, width: 'auto', display: 'block' }}
          decoding="async"
        />
      </picture>
      {showText && (
        <span
          style={{
            fontFamily: 'var(--onb-font-display)',
            fontSize: size * 0.62,
            fontWeight: 500,
            letterSpacing: '-0.02em',
            color: 'var(--onb-ink-900)',
          }}
        >
          agrogina
        </span>
      )}
    </div>
  );
}

type ProgressVariant = 'segments' | 'dots' | 'numeric';

export function ProgressBar({ step, total, variant = 'numeric' }: { step: number; total: number; variant?: ProgressVariant }) {
  const pct = Math.min(100, (step / total) * 100);

  if (variant === 'dots') {
    return (
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            style={{
              width: i < step ? 28 : 8,
              height: 8,
              borderRadius: 999,
              background: i < step ? 'var(--onb-brand-600)' : 'var(--onb-ink-200)',
              transition: 'all .35s cubic-bezier(.4,0,.2,1)',
            }}
          />
        ))}
      </div>
    );
  }

  if (variant === 'segments') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 12, color: 'var(--onb-ink-500)', fontWeight: 500 }}>
          {step}/{total}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 36,
                height: 4,
                borderRadius: 999,
                background: i < step ? 'var(--onb-brand-600)' : 'var(--onb-ink-200)',
                transition: 'background .3s',
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: 'var(--onb-ink-600)' }}>
      <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}>
        Étape {step} sur {total}
      </span>
      <div style={{ width: 80, height: 6, borderRadius: 999, background: 'var(--onb-ink-100)', overflow: 'hidden' }}>
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--onb-brand-600)',
            transition: 'width .4s cubic-bezier(.4,0,.2,1)',
          }}
        />
      </div>
    </div>
  );
}

export function OnbHeader({ step, total, variant = 'numeric' }: { step: number; total: number; variant?: ProgressVariant }) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '20px 32px',
        borderBottom: '1px solid var(--onb-ink-100)',
        background: 'rgba(255,255,255,.85)',
        backdropFilter: 'blur(8px)',
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}
    >
      <AgroginaLogo size={28} />
      <ProgressBar step={step} total={total} variant={variant} />
    </header>
  );
}

type Tone = 'brand' | 'soil' | 'sky' | 'wheat';
const TONE_BG: Record<Tone, { bg: string; fg: string }> = {
  brand: { bg: 'var(--onb-brand-50)', fg: 'var(--onb-brand-700)' },
  soil: { bg: 'var(--onb-soil-50)', fg: 'var(--onb-soil-700)' },
  sky: { bg: 'var(--onb-sky-100)', fg: 'var(--onb-sky-500)' },
  wheat: { bg: '#fdf6e0', fg: 'var(--onb-wheat-500)' },
};

export function ScreenHero({ icon: Icon, tone = 'brand' }: { icon: LucideIcon; tone?: Tone }) {
  const t = TONE_BG[tone];
  return (
    <div
      className="onb-scale-pop"
      style={{
        width: 64,
        height: 64,
        borderRadius: 18,
        background: t.bg,
        color: t.fg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 20px',
      }}
    >
      <Icon size={28} strokeWidth={1.6} />
    </div>
  );
}

export function ScreenTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: 28 }}>
      {eyebrow && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--onb-brand-700)',
            marginBottom: 10,
          }}
        >
          {eyebrow}
        </div>
      )}
      <h1 className="onb-h-display" style={{ fontSize: 32, margin: '0 0 10px', color: 'var(--onb-ink-900)' }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ margin: 0, fontSize: 15, color: 'var(--onb-ink-500)', maxWidth: 420, marginInline: 'auto', lineHeight: 1.5 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}

export function ScreenShell({ children, maxWidth = 540 }: { children: ReactNode; maxWidth?: number }) {
  return (
    <div className="onb-fade-up" style={{ maxWidth, width: '100%', margin: '0 auto' }}>
      {children}
    </div>
  );
}

export function NavRow({
  onBack,
  onNext,
  nextLabel = 'Continuer',
  backLabel = 'Retour',
  disabled,
  loading,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel?: string;
  backLabel?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
      {onBack && (
        <button type="button" onClick={onBack} className="onb-btn onb-btn-ghost">
          <ArrowLeft size={16} strokeWidth={1.6} />
          {backLabel}
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={disabled || loading}
        className="onb-btn onb-btn-primary"
        style={{ flex: 1, opacity: disabled || loading ? 0.5 : 1, cursor: disabled || loading ? 'not-allowed' : 'pointer' }}
      >
        {loading ? '…' : nextLabel}
        {!loading && <ArrowRight size={16} strokeWidth={1.6} />}
      </button>
    </div>
  );
}

export function FloatingField({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  autoFocus,
  prefix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  autoFocus?: boolean;
  prefix?: ReactNode;
}) {
  const [focused, setFocused] = useState(false);
  const lifted = focused || (value && value.length > 0);
  return (
    <label
      style={{
        position: 'relative',
        display: 'block',
        borderRadius: 'var(--onb-r-md)',
        border: `1.5px solid ${focused ? 'var(--onb-brand-500)' : 'var(--onb-ink-200)'}`,
        background: 'white',
        transition: 'border-color .15s, box-shadow .15s',
        boxShadow: focused ? '0 0 0 4px rgba(16,185,129,.12)' : 'none',
        paddingTop: 18,
      }}
    >
      <span
        style={{
          position: 'absolute',
          left: 16,
          top: lifted ? 6 : 18,
          fontSize: lifted ? 11 : 15,
          fontWeight: 500,
          letterSpacing: lifted ? '0.04em' : '0',
          textTransform: lifted ? 'uppercase' : 'none',
          color: focused ? 'var(--onb-brand-700)' : 'var(--onb-ink-500)',
          transition: 'all .18s ease',
          pointerEvents: 'none',
        } as CSSProperties}
      >
        {label}
      </span>
      {prefix && (
        <span style={{ position: 'absolute', left: 16, bottom: 12, color: 'var(--onb-ink-500)', fontSize: 15 }}>
          {prefix}
        </span>
      )}
      <input
        className="onb-input-bare"
        type={type}
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={focused ? placeholder : ''}
        style={{
          width: '100%',
          border: 0,
          background: 'transparent',
          outline: 'none',
          padding: prefix ? '0 16px 14px 56px' : '0 16px 14px',
          fontSize: 15,
          fontFamily: 'inherit',
          color: 'var(--onb-ink-900)',
        }}
      />
    </label>
  );
}

export type SmartChipOption = { value: string; label: string; flag?: string };

export function SmartChip({
  icon: Icon,
  value,
  options,
  onPick,
}: {
  icon?: LucideIcon;
  value: string;
  options: SmartChipOption[];
  onPick: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) || options[0];

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 12px',
          borderRadius: 999,
          background: 'var(--onb-brand-50)',
          color: 'var(--onb-brand-800)',
          border: '1px solid var(--onb-brand-100)',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        {Icon && <Icon size={14} strokeWidth={1.6} />}
        {current.flag && <span>{current.flag}</span>}
        <span>{current.label}</span>
        <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
          <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 19 }} />
          <div
            style={{
              position: 'absolute',
              top: 'calc(100% + 6px)',
              left: 0,
              minWidth: 220,
              background: 'white',
              borderRadius: 'var(--onb-r-md)',
              border: '1px solid var(--onb-ink-200)',
              boxShadow: 'var(--onb-sh-md)',
              padding: 6,
              zIndex: 20,
            }}
          >
            {options.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => {
                  onPick(o.value);
                  setOpen(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  width: '100%',
                  textAlign: 'left',
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: 0,
                  background: o.value === value ? 'var(--onb-brand-50)' : 'transparent',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 13,
                  color: 'var(--onb-ink-900)',
                  fontWeight: o.value === value ? 600 : 400,
                }}
              >
                {o.flag && <span style={{ fontSize: 16 }}>{o.flag}</span>}
                <span>{o.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function OnbShellLayout({ children, header }: { children: ReactNode; header?: ReactNode }) {
  return (
    <div className="onb-shell" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      {header}
      <div style={{ flex: 1 }}>{children}</div>
    </div>
  );
}
