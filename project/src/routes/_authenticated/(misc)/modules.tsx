import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useCan } from '@/lib/casl/AbilityContext';
import { useModules } from '@/hooks/useModules';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SectionLoader } from '@/components/ui/loader';
import { cn } from '@/lib/utils';
import type { Action, Subject } from '@/lib/casl/ability';
import {
  Home, Map, Package, Building2, Bot, Users, Wheat, ShieldCheck,
  ShoppingCart, BookOpen, TreeDeciduous, BarChart3, Boxes, Lock,
  ChevronRight, Scissors, ShoppingBag, type LucideIcon,
} from 'lucide-react';

// ============================================================================
// Module definitions with role-based access rules
// ============================================================================

interface ModuleDefinition {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  path: string;
  permission: { action: Action; subject: Subject };
  color: string;
  roles: string[]; // roles that can access
}

interface ModuleSectionDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  color: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose' | 'indigo' | 'orange' | 'cyan';
  modules: ModuleDefinition[];
}

const MODULE_SECTIONS: ModuleSectionDefinition[] = [
  {
    id: 'main',
    label: 'modules.sections.main',
    icon: Home,
    color: 'emerald',
    modules: [
      {
        id: 'dashboard',
        label: 'nav.dashboard',
        description: 'modules.desc.dashboard',
        icon: Home,
        path: '/dashboard',
        permission: { action: 'read', subject: 'Dashboard' },
        color: 'emerald',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'viewer'],
      },
      {
        id: 'farm-hierarchy',
        label: 'nav.farmHierarchy',
        description: 'modules.desc.farmHierarchy',
        icon: Building2,
        path: '/farm-hierarchy',
        permission: { action: 'read', subject: 'FarmHierarchy' },
        color: 'emerald',
        roles: ['system_admin', 'organization_admin', 'farm_manager'],
      },
      {
        id: 'parcels',
        label: 'nav.parcels',
        description: 'modules.desc.parcels',
        icon: Map,
        path: '/parcels',
        permission: { action: 'read', subject: 'Parcel' },
        color: 'emerald',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'viewer'],
      },
      {
        id: 'stock',
        label: 'nav.stock',
        description: 'modules.desc.stock',
        icon: Package,
        path: '/stock',
        permission: { action: 'read', subject: 'Stock' },
        color: 'emerald',
        roles: ['system_admin', 'organization_admin', 'farm_manager'],
      },
      {
        id: 'infrastructure',
        label: 'nav.infrastructure',
        description: 'modules.desc.infrastructure',
        icon: Building2,
        path: '/infrastructure',
        permission: { action: 'read', subject: 'Infrastructure' },
        color: 'emerald',
        roles: ['system_admin', 'organization_admin', 'farm_manager'],
      },
      {
        id: 'chat',
        label: 'nav.chat',
        description: 'modules.desc.chat',
        icon: Bot,
        path: '/chat',
        permission: { action: 'read', subject: 'Chat' },
        color: 'emerald',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'viewer'],
      },
    ],
  },
  {
    id: 'personnel',
    label: 'nav.personnel',
    icon: Users,
    color: 'blue',
    modules: [
      {
        id: 'workers',
        label: 'nav.workers',
        description: 'modules.desc.workers',
        icon: Users,
        path: '/workers',
        permission: { action: 'read', subject: 'Worker' },
        color: 'blue',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker'],
      },
      {
        id: 'tasks',
        label: 'nav.tasks',
        description: 'modules.desc.tasks',
        icon: Users,
        path: '/tasks',
        permission: { action: 'read', subject: 'Task' },
        color: 'blue',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'day_laborer'],
      },
    ],
  },
  {
    id: 'production',
    label: 'nav.production',
    icon: Wheat,
    color: 'amber',
    modules: [
      {
        id: 'campaigns',
        label: 'nav.campaigns',
        description: 'modules.desc.campaigns',
        icon: Wheat,
        path: '/campaigns',
        permission: { action: 'read', subject: 'Campaign' },
        color: 'amber',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'viewer'],
      },
      {
        id: 'crop-cycles',
        label: 'nav.cropCycles',
        description: 'modules.desc.cropCycles',
        icon: Wheat,
        path: '/crop-cycles',
        permission: { action: 'read', subject: 'CropCycle' },
        color: 'amber',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'viewer'],
      },
      {
        id: 'harvests',
        label: 'nav.harvests',
        description: 'modules.desc.harvests',
        icon: Wheat,
        path: '/harvests',
        permission: { action: 'read', subject: 'Harvest' },
        color: 'amber',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'viewer'],
      },
      {
        id: 'reception-batches',
        label: 'nav.receptionBatches',
        description: 'modules.desc.receptionBatches',
        icon: Wheat,
        path: '/reception-batches',
        permission: { action: 'read', subject: 'ReceptionBatch' },
        color: 'amber',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'viewer'],
      },
      {
        id: 'quality-control',
        label: 'nav.qualityControl',
        description: 'modules.desc.qualityControl',
        icon: Wheat,
        path: '/quality-control',
        permission: { action: 'read', subject: 'ReceptionBatch' },
        color: 'amber',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'farm_worker', 'viewer'],
      },
    ],
  },
  {
    id: 'fruit-trees',
    label: 'nav.fruitTrees',
    icon: TreeDeciduous,
    color: 'emerald',
    modules: [
      {
        id: 'trees',
        label: 'nav.treesOverview',
        description: 'modules.desc.trees',
        icon: TreeDeciduous,
        path: '/trees',
        permission: { action: 'read', subject: 'Tree' },
        color: 'emerald',
        roles: ['system_admin', 'organization_admin', 'farm_manager'],
      },
      {
        id: 'orchards',
        label: 'nav.orchards',
        description: 'modules.desc.orchards',
        icon: TreeDeciduous,
        path: '/orchards',
        permission: { action: 'read', subject: 'Tree' },
        color: 'emerald',
        roles: ['system_admin', 'organization_admin', 'farm_manager'],
      },
      {
        id: 'pruning',
        label: 'nav.pruning',
        description: 'modules.desc.pruning',
        icon: Scissors,
        path: '/pruning',
        permission: { action: 'read', subject: 'Task' },
        color: 'emerald',
        roles: ['system_admin', 'organization_admin', 'farm_manager'],
      },
    ],
  },
  {
    id: 'compliance',
    label: 'nav.compliance',
    icon: ShieldCheck,
    color: 'purple',
    modules: [
      {
        id: 'compliance-overview',
        label: 'nav.overview',
        description: 'modules.desc.compliance',
        icon: ShieldCheck,
        path: '/compliance',
        permission: { action: 'read', subject: 'Certification' },
        color: 'purple',
        roles: ['system_admin', 'organization_admin', 'farm_manager'],
      },
      {
        id: 'certifications',
        label: 'nav.certifications',
        description: 'modules.desc.certifications',
        icon: ShieldCheck,
        path: '/compliance/certifications',
        permission: { action: 'read', subject: 'Certification' },
        color: 'purple',
        roles: ['system_admin', 'organization_admin', 'farm_manager'],
      },
    ],
  },
  {
    id: 'sales-purchasing',
    label: 'nav.salesPurchasing',
    icon: ShoppingCart,
    color: 'rose',
    modules: [
      {
        id: 'quotes',
        label: 'nav.quotes',
        description: 'modules.desc.quotes',
        icon: ShoppingCart,
        path: '/accounting/quotes',
        permission: { action: 'read', subject: 'Invoice' },
        color: 'rose',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'viewer'],
      },
      {
        id: 'sales-orders',
        label: 'nav.salesOrders',
        description: 'modules.desc.salesOrders',
        icon: ShoppingCart,
        path: '/accounting/sales-orders',
        permission: { action: 'read', subject: 'Invoice' },
        color: 'rose',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'viewer'],
      },
      {
        id: 'purchase-orders',
        label: 'nav.purchaseOrders',
        description: 'modules.desc.purchaseOrders',
        icon: ShoppingCart,
        path: '/accounting/purchase-orders',
        permission: { action: 'read', subject: 'Invoice' },
        color: 'rose',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'viewer'],
      },
    ],
  },
  {
    id: 'accounting',
    label: 'nav.accounting',
    icon: BookOpen,
    color: 'indigo',
    modules: [
      {
        id: 'accounting-overview',
        label: 'nav.overview',
        description: 'modules.desc.accounting',
        icon: BookOpen,
        path: '/accounting',
        permission: { action: 'read', subject: 'Invoice' },
        color: 'indigo',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'viewer'],
      },
      {
        id: 'invoices',
        label: 'nav.invoices',
        description: 'modules.desc.invoices',
        icon: BookOpen,
        path: '/accounting/invoices',
        permission: { action: 'read', subject: 'Invoice' },
        color: 'indigo',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'viewer'],
      },
      {
        id: 'payments',
        label: 'nav.payments',
        description: 'modules.desc.payments',
        icon: BookOpen,
        path: '/accounting/payments',
        permission: { action: 'read', subject: 'Payment' },
        color: 'indigo',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'viewer'],
      },
      {
        id: 'journal',
        label: 'nav.journal',
        description: 'modules.desc.journal',
        icon: BookOpen,
        path: '/accounting/journal',
        permission: { action: 'read', subject: 'JournalEntry' },
        color: 'indigo',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'viewer'],
      },
      {
        id: 'reports',
        label: 'nav.reports',
        description: 'modules.desc.reports',
        icon: BarChart3,
        path: '/accounting/reports',
        permission: { action: 'read', subject: 'Report' },
        color: 'indigo',
        roles: ['system_admin', 'organization_admin', 'farm_manager', 'viewer'],
      },
    ],
  },
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: ShoppingBag,
    color: 'orange',
    modules: [
      {
        id: 'marketplace-received',
        label: 'modules.marketplace.received',
        description: 'modules.desc.marketplaceReceived',
        icon: ShoppingBag,
        path: '/marketplace/quote-requests/received',
        permission: { action: 'read', subject: 'Invoice' },
        color: 'orange',
        roles: ['system_admin', 'organization_admin', 'farm_manager'],
      },
      {
        id: 'marketplace-sent',
        label: 'modules.marketplace.sent',
        description: 'modules.desc.marketplaceSent',
        icon: ShoppingBag,
        path: '/marketplace/quote-requests/sent',
        permission: { action: 'read', subject: 'Invoice' },
        color: 'orange',
        roles: ['system_admin', 'organization_admin', 'farm_manager'],
      },
    ],
  },
];

// ============================================================================
// Color utility
// ============================================================================

const COLOR_MAP: Record<string, { bg: string; text: string; border: string; iconBg: string; hoverBg: string; badgeBg: string; badgeText: string }> = {
  emerald: {
    bg: 'bg-emerald-50/50 dark:bg-emerald-900/10',
    text: 'text-emerald-600 dark:text-emerald-400',
    border: 'border-emerald-100 dark:border-emerald-800/50',
    iconBg: 'bg-emerald-100 dark:bg-emerald-900/40',
    hoverBg: 'hover:border-emerald-300 dark:hover:border-emerald-700 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20',
    badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30',
    badgeText: 'text-emerald-700 dark:text-emerald-400',
  },
  blue: {
    bg: 'bg-blue-50/50 dark:bg-blue-900/10',
    text: 'text-blue-600 dark:text-blue-400',
    border: 'border-blue-100 dark:border-blue-800/50',
    iconBg: 'bg-blue-100 dark:bg-blue-900/40',
    hoverBg: 'hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50/50 dark:hover:bg-blue-900/20',
    badgeBg: 'bg-blue-100 dark:bg-blue-900/30',
    badgeText: 'text-blue-700 dark:text-blue-400',
  },
  amber: {
    bg: 'bg-amber-50/50 dark:bg-amber-900/10',
    text: 'text-amber-600 dark:text-amber-400',
    border: 'border-amber-100 dark:border-amber-800/50',
    iconBg: 'bg-amber-100 dark:bg-amber-900/40',
    hoverBg: 'hover:border-amber-300 dark:hover:border-amber-700 hover:bg-amber-50/50 dark:hover:bg-amber-900/20',
    badgeBg: 'bg-amber-100 dark:bg-amber-900/30',
    badgeText: 'text-amber-700 dark:text-amber-400',
  },
  purple: {
    bg: 'bg-purple-50/50 dark:bg-purple-900/10',
    text: 'text-purple-600 dark:text-purple-400',
    border: 'border-purple-100 dark:border-purple-800/50',
    iconBg: 'bg-purple-100 dark:bg-purple-900/40',
    hoverBg: 'hover:border-purple-300 dark:hover:border-purple-700 hover:bg-purple-50/50 dark:hover:bg-purple-900/20',
    badgeBg: 'bg-purple-100 dark:bg-purple-900/30',
    badgeText: 'text-purple-700 dark:text-purple-400',
  },
  rose: {
    bg: 'bg-rose-50/50 dark:bg-rose-900/10',
    text: 'text-rose-600 dark:text-rose-400',
    border: 'border-rose-100 dark:border-rose-800/50',
    iconBg: 'bg-rose-100 dark:bg-rose-900/40',
    hoverBg: 'hover:border-rose-300 dark:hover:border-rose-700 hover:bg-rose-50/50 dark:hover:bg-rose-900/20',
    badgeBg: 'bg-rose-100 dark:bg-rose-900/30',
    badgeText: 'text-rose-700 dark:text-rose-400',
  },
  indigo: {
    bg: 'bg-indigo-50/50 dark:bg-indigo-900/10',
    text: 'text-indigo-600 dark:text-indigo-400',
    border: 'border-indigo-100 dark:border-indigo-800/50',
    iconBg: 'bg-indigo-100 dark:bg-indigo-900/40',
    hoverBg: 'hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/20',
    badgeBg: 'bg-indigo-100 dark:bg-indigo-900/30',
    badgeText: 'text-indigo-700 dark:text-indigo-400',
  },
  orange: {
    bg: 'bg-orange-50/50 dark:bg-orange-900/10',
    text: 'text-orange-600 dark:text-orange-400',
    border: 'border-orange-100 dark:border-orange-800/50',
    iconBg: 'bg-orange-100 dark:bg-orange-900/40',
    hoverBg: 'hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50/50 dark:hover:bg-orange-900/20',
    badgeBg: 'bg-orange-100 dark:bg-orange-900/30',
    badgeText: 'text-orange-700 dark:text-orange-400',
  },
  cyan: {
    bg: 'bg-cyan-50/50 dark:bg-cyan-900/10',
    text: 'text-cyan-600 dark:text-cyan-400',
    border: 'border-cyan-100 dark:border-cyan-800/50',
    iconBg: 'bg-cyan-100 dark:bg-cyan-900/40',
    hoverBg: 'hover:border-cyan-300 dark:hover:border-cyan-700 hover:bg-cyan-50/50 dark:hover:bg-cyan-900/20',
    badgeBg: 'bg-cyan-100 dark:bg-cyan-900/30',
    badgeText: 'text-cyan-700 dark:text-cyan-400',
  },
};

// Role display labels & colors
const ROLE_CONFIG: Record<string, { label: string; color: string }> = {
  system_admin: { label: 'Admin Sys', color: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  organization_admin: { label: 'Admin Org', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  farm_manager: { label: 'Manager', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  farm_worker: { label: 'Ouvrier', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  day_laborer: { label: 'Journalier', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  viewer: { label: 'Lecteur', color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400' },
};

// ============================================================================
// Components
// ============================================================================

function ModuleCard({ module, hasAccess, userRole, colors }: {
  module: ModuleDefinition;
  hasAccess: boolean;
  userRole: string;
  colors: typeof COLOR_MAP[string];
}) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const Icon = module.icon;

  return (
    <button
      onClick={() => hasAccess && navigate({ to: module.path })}
      disabled={!hasAccess}
      className={cn(
        'relative flex flex-col gap-3 p-4 rounded-2xl border text-left transition-all duration-200 group w-full',
        hasAccess
          ? cn('cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50', colors.hoverBg, 'hover:shadow-md')
          : 'cursor-not-allowed border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 opacity-60'
      )}
    >
      <div className="flex items-start justify-between">
        <div className={cn('p-2 rounded-xl', hasAccess ? colors.iconBg : 'bg-slate-100 dark:bg-slate-800')}>
          <Icon className={cn('h-5 w-5', hasAccess ? colors.text : 'text-slate-400 dark:text-slate-600')} />
        </div>
        {hasAccess ? (
          <ChevronRight className="h-4 w-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-500 dark:group-hover:text-slate-400 transition-colors" />
        ) : (
          <Lock className="h-4 w-4 text-slate-300 dark:text-slate-600" />
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">
          {t(module.label, module.label)}
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
          {t(module.description, '')}
        </p>
      </div>

      {/* Role badges */}
      <div className="flex flex-wrap gap-1 mt-auto pt-2">
        {module.roles.map(role => {
          const config = ROLE_CONFIG[role];
          if (!config) return null;
          const isCurrentRole = role === userRole;
          return (
            <span
              key={role}
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium',
                config.color,
                isCurrentRole && 'ring-1 ring-offset-1 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-900'
              )}
            >
              {config.label}
            </span>
          );
        })}
      </div>
    </button>
  );
}

function SectionCard({ section, userRole, canFn }: {
  section: ModuleSectionDefinition;
  userRole: string;
  canFn: (action: Action, subject: Subject) => boolean;
}) {
  const { t } = useTranslation();
  const Icon = section.icon;
  const colors = COLOR_MAP[section.color] || COLOR_MAP.emerald;

  const accessibleCount = section.modules.filter(m => canFn(m.permission.action, m.permission.subject)).length;

  return (
    <Card className={cn('rounded-2xl border overflow-hidden', colors.border)}>
      <div className={cn('flex items-center justify-between px-5 py-4 border-b', colors.bg, colors.border)}>
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-xl', colors.iconBg)}>
            <Icon className={cn('h-5 w-5', colors.text)} />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white uppercase tracking-wide">
            {t(section.label, section.label)}
          </h3>
        </div>
        <Badge className={cn('border-none text-[10px] font-semibold tracking-wide', colors.badgeBg, colors.badgeText)}>
          {accessibleCount}/{section.modules.length}
        </Badge>
      </div>
      <CardContent className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {section.modules.map(mod => (
            <ModuleCard
              key={mod.id}
              module={mod}
              hasAccess={canFn(mod.permission.action, mod.permission.subject)}
              userRole={userRole}
              colors={colors}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// Page
// ============================================================================

function ModulesHub() {
  const { t } = useTranslation();
  const { currentOrganization, userRole } = useAuth();
  const { can } = useCan();
  const { isLoading } = useModules();

  if (!currentOrganization || isLoading) {
    return <SectionLoader />;
  }

  const roleName = userRole?.role_name || 'viewer';
  const roleDisplay = ROLE_CONFIG[roleName];

  const totalModules = MODULE_SECTIONS.reduce((sum, s) => sum + s.modules.length, 0);
  const accessibleModules = MODULE_SECTIONS.reduce(
    (sum, s) => sum + s.modules.filter(m => can(m.permission.action, m.permission.subject)).length,
    0
  );

  return (
    <div className="min-w-0 max-w-full space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-slate-100 dark:border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl">
              <Boxes className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {t('modules.title', 'Modules')}
            </h1>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('modules.subtitle', 'Access all platform features based on your role and permissions')}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {roleDisplay && (
            <Badge className={cn('text-xs font-semibold', roleDisplay.color)}>
              {roleDisplay.label}
            </Badge>
          )}
          <Badge variant="outline" className="text-xs font-medium text-slate-500 dark:text-slate-400">
            {accessibleModules}/{totalModules} {t('modules.accessible', 'accessible')}
          </Badge>
        </div>
      </div>

      {/* Role legend */}
      <div className="flex flex-wrap items-center gap-2 px-1">
        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium mr-1">
          {t('modules.rolesLegend', 'Roles')}:
        </span>
        {Object.entries(ROLE_CONFIG).map(([role, config]) => (
          <span
            key={role}
            className={cn(
              'inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium',
              config.color,
              role === roleName && 'ring-1 ring-offset-1 ring-slate-400 dark:ring-slate-500 dark:ring-offset-slate-900'
            )}
          >
            {config.label}
          </span>
        ))}
      </div>

      {/* Module sections */}
      <div className="space-y-6">
        {MODULE_SECTIONS.map(section => (
          <SectionCard
            key={section.id}
            section={section}
            userRole={roleName}
            canFn={can}
          />
        ))}
      </div>
    </div>
  );
}

export const Route = createFileRoute('/_authenticated/(misc)/modules')({
  component: ModulesHub,
});
