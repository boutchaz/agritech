import {
  BarChart3,
  Briefcase,
  Building2,
  Check,
  Droplet,
  Mail,
  ShieldCheck,
  Sparkles,
  Sprout,
  User,
  type LucideIcon,
} from 'lucide-react';
import { AgroginaMark } from './chrome';
import { NavRow, ScreenShell, ScreenTitle } from './chrome';

type ModuleCat = 'core' | 'addon';
type ModuleDef = { id: string; cat: ModuleCat; icon: LucideIcon; name: string; desc: string };

export const ONB_ERP_MODULES: ModuleDef[] = [
  { id: 'multi-fermes', cat: 'core', icon: Sprout, name: 'Multi-Fermes & Parcellaire', desc: 'Gestion multi-fermes, parcelles, cultures' },
  { id: 'dashboard', cat: 'core', icon: BarChart3, name: 'Dashboard & Live Map', desc: 'Tableau de bord temps réel + carte interactive' },
  { id: 'taches', cat: 'core', icon: Check, name: 'Tâches Agronomiques', desc: 'Planification, suivi, démarrer/pause' },
  { id: 'recolte', cat: 'addon', icon: Sprout, name: 'Récolte & Traçabilité', desc: 'Gestion récolte, lots, destination' },
  { id: 'rh', cat: 'addon', icon: User, name: 'RH & Paie Agronomique', desc: 'Personnel fixe/journalier, paie, contrats' },
  { id: 'stocks', cat: 'addon', icon: Building2, name: 'Stocks & Entrepôts', desc: 'Alertes, fournisseurs, mouvements' },
  { id: 'compta', cat: 'addon', icon: Mail, name: 'Compta & Facturation', desc: 'Devis, factures, relances automatiques' },
  { id: 'qualite', cat: 'addon', icon: Droplet, name: 'Contrôle Qualité', desc: 'Tests labo, certificats, rejets' },
  { id: 'normes', cat: 'addon', icon: ShieldCheck, name: 'Conformité & Normes', desc: 'GlobalGAP, BIO, traçabilité réglementaire' },
  { id: 'market', cat: 'addon', icon: Briefcase, name: 'Marketplace', desc: 'Plateforme de vente intégrée B2B' },
  { id: 'ai', cat: 'addon', icon: Sparkles, name: 'Assistant IA', desc: 'Chat IA avec accès à vos données' },
];

export function ModulesScreen({
  selected,
  onToggle,
  surface,
  unit,
  farmName,
  onNext,
  onBack,
  loading,
}: {
  selected: string[];
  onToggle: (next: string[]) => void;
  surface: number;
  unit: 'ha' | 'acre' | 'm2';
  farmName: string;
  onNext: () => void;
  onBack?: () => void;
  loading?: boolean;
}) {
  const core = ONB_ERP_MODULES.filter((m) => m.cat === 'core');
  const addons = ONB_ERP_MODULES.filter((m) => m.cat === 'addon');

  const toggle = (mod: ModuleDef) => {
    if (mod.cat === 'core') return;
    const next = selected.includes(mod.id) ? selected.filter((x) => x !== mod.id) : [...selected, mod.id];
    onToggle(next);
  };

  return (
    <div style={{ padding: '40px 24px 80px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <ScreenShell maxWidth={780}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AgroginaMark size={28} />
            <span className="onb-h-display" style={{ fontSize: 18, fontWeight: 500 }}>
              agrogina
            </span>
          </div>
          <div
            style={{
              padding: '6px 14px',
              borderRadius: 999,
              background: 'var(--onb-brand-50)',
              color: 'var(--onb-brand-700)',
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: '0.04em',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              border: '1px solid var(--onb-brand-100)',
            }}
          >
            <Sparkles size={12} strokeWidth={1.6} />
            ESSAI GRATUIT — 14 JOURS
          </div>
        </div>

        <ScreenTitle
          title="Choisissez vos modules"
          subtitle="Essai gratuit de 14 jours, aucune carte bancaire requise. Vous pourrez ajuster plus tard."
        />

        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--onb-ink-500)',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          Modules essentiels
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 999,
              background: 'var(--onb-brand-50)',
              color: 'var(--onb-brand-700)',
              fontSize: 10,
              fontWeight: 600,
            }}
          >
            INCLUS
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, marginBottom: 22 }}>
          {core.map((m) => (
            <ModuleTile key={m.id} mod={m} selected locked />
          ))}
        </div>

        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: 'var(--onb-ink-500)',
            marginBottom: 12,
          }}
        >
          Modules complémentaires
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {addons.map((m) => (
            <ModuleTile key={m.id} mod={m} selected={selected.includes(m.id)} onToggle={() => toggle(m)} />
          ))}
        </div>

        <div
          style={{
            marginTop: 22,
            background: 'white',
            border: '1px solid var(--onb-ink-100)',
            borderRadius: 'var(--onb-r-lg)',
            padding: 18,
            boxShadow: 'var(--onb-sh-sm)',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 18,
              alignItems: 'center',
              borderBottom: '1px solid var(--onb-ink-100)',
              paddingBottom: 14,
              marginBottom: 14,
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--onb-ink-500)',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Superficie
              </div>
              <div className="onb-h-display" style={{ fontSize: 26, color: 'var(--onb-ink-900)' }}>
                {surface}{' '}
                <span style={{ fontSize: 14, color: 'var(--onb-ink-500)' }}>
                  {unit === 'acre' ? 'ac' : unit === 'm2' ? 'm²' : 'ha'}
                </span>
              </div>
            </div>
            <div>
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--onb-ink-500)',
                  fontWeight: 600,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                }}
              >
                Modules
              </div>
              <div className="onb-h-display" style={{ fontSize: 26, color: 'var(--onb-ink-900)' }}>
                {selected.length}{' '}
                <span style={{ fontSize: 14, color: 'var(--onb-ink-500)' }}>
                  sélectionné{selected.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--onb-ink-600)', lineHeight: 1.5 }}>
            Tarif personnalisé selon votre superficie et vos modules. Notre équipe vous contactera sous 24h
            avec un devis détaillé pour <strong>{farmName}</strong>.
          </p>
        </div>

        <NavRow onBack={onBack} onNext={onNext} nextLabel="Démarrer mon essai gratuit" loading={loading} />
      </ScreenShell>
    </div>
  );
}

function ModuleTile({
  mod,
  selected,
  locked,
  onToggle,
}: {
  mod: ModuleDef;
  selected: boolean;
  locked?: boolean;
  onToggle?: () => void;
}) {
  const Icon = mod.icon;
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={locked}
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        textAlign: 'left',
        padding: 14,
        background: selected ? 'var(--onb-brand-50)' : 'white',
        border: `1.5px solid ${selected ? 'var(--onb-brand-500)' : 'var(--onb-ink-100)'}`,
        borderRadius: 'var(--onb-r-md)',
        cursor: locked ? 'default' : 'pointer',
        fontFamily: 'inherit',
        position: 'relative',
        transition: 'all .18s',
        boxShadow: selected ? '0 0 0 3px rgba(16,185,129,.1)' : 'var(--onb-sh-xs)',
        minHeight: 116,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: selected ? 'var(--onb-brand-100)' : 'var(--onb-ink-50)',
            color: selected ? 'var(--onb-brand-700)' : 'var(--onb-ink-500)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon size={18} strokeWidth={1.6} />
        </div>
        <div
          style={{
            width: 22,
            height: 22,
            borderRadius: 6,
            border: `1.5px solid ${selected ? 'var(--onb-brand-600)' : 'var(--onb-ink-300)'}`,
            background: selected ? 'var(--onb-brand-600)' : 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
            flexShrink: 0,
          }}
        >
          {selected && <Check size={14} strokeWidth={3} />}
        </div>
      </div>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--onb-ink-900)', lineHeight: 1.25, marginBottom: 3 }}>
          {mod.name}
        </div>
        <div style={{ fontSize: 11, color: 'var(--onb-ink-500)', lineHeight: 1.35 }}>{mod.desc}</div>
      </div>
      {locked && (
        <div style={{ fontSize: 10, color: 'var(--onb-brand-700)', fontWeight: 600, marginTop: 'auto' }}>
          ✓ Inclus
        </div>
      )}
    </button>
  );
}
