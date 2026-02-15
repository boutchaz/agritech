import type { LucideIcon } from 'lucide-react';
import {
  Home,
  Leaf,
  Map,
  Package,
  Building2,
  Bot,
  Users,
  Wheat,
  ShieldCheck,
  ShoppingCart,
  BookOpen,
  Settings,
  ShoppingBag,
  Bell,
  BarChart3,
  TreeDeciduous,
  Scissors,
} from 'lucide-react';

export interface NavItem {
  id: string;
  path: string;
  label: string;
  icon: LucideIcon;
  permission?: { action: string; subject: string };
  section?: string;
  // API path for matching with module config
  apiPath?: string;
}

export interface NavSection {
  id: string;
  label: string;
  icon: LucideIcon;
  items: NavItem[];
  permission?: { action: string; subject: string };
  paths: string[]; // For auto-expand detection
}

export const NAVIGATION_SECTIONS: NavSection[] = [
  // ========== MAIN NAVIGATION (always shown, items filtered) ==========
  {
    id: 'main',
    label: 'nav.main',
    icon: Home,
    paths: ['/dashboard', '/farm-hierarchy', '/parcels', '/stock', '/infrastructure', '/chat'],
    items: [
      { id: 'dashboard', path: '/dashboard', label: 'nav.dashboard', icon: Home, permission: { action: 'read', subject: 'Dashboard' } },
      { id: 'farms', path: '/farm-hierarchy', label: 'nav.farmHierarchy', icon: Leaf, permission: { action: 'read', subject: 'FarmHierarchy' }, apiPath: '/farms' },
      { id: 'parcels', path: '/parcels', label: 'nav.parcels', icon: Map, permission: { action: 'read', subject: 'Parcel' }, apiPath: '/parcels' },
      { id: 'stock', path: '/stock', label: 'nav.stock', icon: Package, permission: { action: 'read', subject: 'Stock' }, apiPath: '/stock' },
      { id: 'infrastructure', path: '/infrastructure', label: 'nav.infrastructure', icon: Building2, permission: { action: 'read', subject: 'Infrastructure' }, apiPath: '/structures' },
      { id: 'chat', path: '/chat', label: 'nav.chat', icon: Bot, permission: { action: 'read', subject: 'Chat' }, apiPath: '/chat' },
    ],
  },
  // ========== PERSONNEL SECTION ==========
  {
    id: 'personnel',
    label: 'nav.personnel',
    icon: Users,
    paths: ['/workers', '/tasks'],
    items: [
      { id: 'workers', path: '/workers', label: 'nav.workers', icon: Users, section: 'personnel', permission: { action: 'read', subject: 'Worker' }, apiPath: '/workers' },
      { id: 'tasks', path: '/tasks', label: 'nav.tasks', icon: Users, section: 'personnel', permission: { action: 'read', subject: 'Task' }, apiPath: '/tasks' },
    ],
  },
  // ========== PRODUCTION SECTION ==========
  {
    id: 'production',
    label: 'nav.production',
    icon: Wheat,
    paths: ['/campaigns', '/crop-cycles', '/harvests', '/reception-batches', '/quality-control'],
    items: [
      { id: 'campaigns', path: '/campaigns', label: 'nav.campaigns', icon: Wheat, section: 'production', permission: { action: 'read', subject: 'Campaign' }, apiPath: '/campaigns' },
      { id: 'crop-cycles', path: '/crop-cycles', label: 'nav.cropCycles', icon: Wheat, section: 'production', permission: { action: 'read', subject: 'CropCycle' }, apiPath: '/crop-cycles' },
      { id: 'harvests', path: '/harvests', label: 'nav.harvests', icon: Wheat, section: 'production', permission: { action: 'read', subject: 'Harvest' }, apiPath: '/harvests' },
      { id: 'reception-batches', path: '/reception-batches', label: 'nav.receptionBatches', icon: Wheat, section: 'production', permission: { action: 'read', subject: 'ReceptionBatch' }, apiPath: '/reception-batches' },
      { id: 'quality-control', path: '/quality-control', label: 'nav.qualityControl', icon: Wheat, section: 'production', permission: { action: 'read', subject: 'ReceptionBatch' }, apiPath: '/quality-control' },
    ],
  },
  // ========== FRUIT TREES SECTION ==========
  {
    id: 'fruit-trees',
    label: 'nav.fruitTrees',
    icon: TreeDeciduous,
    paths: ['/trees', '/orchards', '/pruning'],
    items: [
      { id: 'trees-overview', path: '/trees', label: 'nav.treesOverview', icon: TreeDeciduous, section: 'fruit-trees', apiPath: '/crops?module=fruit-trees' },
      { id: 'orchards', path: '/orchards', label: 'nav.orchards', icon: TreeDeciduous, section: 'fruit-trees', apiPath: '/crops?module=fruit-trees' },
      { id: 'pruning', path: '/pruning', label: 'nav.pruning', icon: Scissors, section: 'fruit-trees', apiPath: '/tasks?task_type=pruning' },
    ],
  },
  // ========== COMPLIANCE SECTION ==========
  {
    id: 'compliance',
    label: 'nav.compliance',
    icon: ShieldCheck,
    paths: ['/compliance', '/compliance/certifications'],
    items: [
      { id: 'compliance-overview', path: '/compliance', label: 'nav.overview', icon: ShieldCheck, section: 'compliance', permission: { action: 'read', subject: 'Certification' }, apiPath: '/compliance' },
      { id: 'certifications', path: '/compliance/certifications', label: 'nav.certifications', icon: ShieldCheck, section: 'compliance', permission: { action: 'read', subject: 'Certification' }, apiPath: '/certifications' },
    ],
  },
  // ========== SALES & PURCHASING SECTION ==========
  {
    id: 'sales-purchasing',
    label: 'nav.salesPurchasing',
    icon: ShoppingCart,
    paths: ['/accounting/quotes', '/accounting/sales-orders', '/accounting/purchase-orders'],
    permission: { action: 'read', subject: 'Invoice' },
    items: [
      { id: 'quotes', path: '/accounting/quotes', label: 'nav.quotes', icon: ShoppingCart, section: 'sales-purchasing', apiPath: '/quotes' },
      { id: 'sales-orders', path: '/accounting/sales-orders', label: 'nav.salesOrders', icon: ShoppingCart, section: 'sales-purchasing', apiPath: '/sales-orders' },
      { id: 'purchase-orders', path: '/accounting/purchase-orders', label: 'nav.purchaseOrders', icon: ShoppingCart, section: 'sales-purchasing', apiPath: '/purchase-orders' },
    ],
  },
  // ========== ACCOUNTING SECTION ==========
  {
    id: 'accounting',
    label: 'nav.accounting',
    icon: BookOpen,
    paths: ['/accounting', '/accounting/accounts', '/accounting/invoices', '/accounting/payments', '/accounting/journal', '/utilities', '/accounting/reports'],
    permission: { action: 'read', subject: 'Invoice' },
    items: [
      { id: 'accounting-overview', path: '/accounting', label: 'nav.overview', icon: BookOpen, section: 'accounting', apiPath: '/invoices' },
      { id: 'accounts', path: '/accounting/accounts', label: 'nav.chartOfAccounts', icon: BookOpen, section: 'accounting', apiPath: '/accounts' },
      { id: 'invoices', path: '/accounting/invoices', label: 'nav.invoices', icon: BookOpen, section: 'accounting', apiPath: '/invoices' },
      { id: 'payments', path: '/accounting/payments', label: 'nav.payments', icon: BookOpen, section: 'accounting', apiPath: '/payments' },
      { id: 'journal', path: '/accounting/journal', label: 'nav.journal', icon: BookOpen, section: 'accounting', apiPath: '/journal-entries' },
      { id: 'expenses', path: '/utilities', label: 'nav.expenses', icon: BookOpen, section: 'accounting', permission: { action: 'read', subject: 'Utility' }, apiPath: '/utilities' },
      { id: 'reports', path: '/accounting/reports', label: 'nav.reports', icon: BarChart3, section: 'accounting', permission: { action: 'read', subject: 'Report' }, apiPath: '/financial-reports' },
    ],
  },
  // ========== CONFIGURATION SECTION ==========
  {
    id: 'configuration',
    label: 'nav.configuration',
    icon: Settings,
    paths: ['/settings'],
    items: [
      { id: 'settings', path: '/settings/profile', label: 'nav.settings', icon: Settings, section: 'configuration', permission: { action: 'manage', subject: 'User' } },
    ],
  },
  // ========== MARKETPLACE SECTION ==========
  {
    id: 'marketplace',
    label: 'Marketplace',
    icon: ShoppingBag,
    paths: ['/marketplace/quote-requests/received', '/marketplace/quote-requests/sent'],
    permission: { action: 'read', subject: 'Invoice' },
    items: [
      { id: 'marketplace-received', path: '/marketplace/quote-requests/received', label: 'Demandes reçues', icon: ShoppingBag, section: 'marketplace', apiPath: '/marketplace' },
      { id: 'marketplace-sent', path: '/marketplace/quote-requests/sent', label: 'Demandes envoyées', icon: ShoppingBag, section: 'marketplace', apiPath: '/marketplace' },
    ],
  },
  // ========== FOOTER ITEMS ==========
  {
    id: 'footer',
    label: 'nav.footer',
    icon: Bell,
    paths: ['/alerts', '/reports'],
    items: [
      { id: 'alerts', path: '/alerts', label: 'nav.alerts', icon: Bell, permission: { action: 'read', subject: 'Dashboard' }, apiPath: '/alerts' },
      { id: 'reports', path: '/accounting/reports', label: 'nav.reports', icon: BarChart3, permission: { action: 'read', subject: 'Report' }, apiPath: '/financial-reports' },
    ],
  },
];

// Marketplace external link
export const MARKETPLACE_EXTERNAL_URL = 'https://marketplace.thebzlab.online';
