import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import {
  Home,
  Trees as Tree,
  Fish,
  Leaf,
  Settings,
  Sun,
  Moon,
  Sprout,
  Bird,
  Bug,
  Droplets,
  Flower2,
  Beef,
  Sheet as Sheep,
  Egg,
  Map,
  Package,
  Building2,
  Users,
  Network,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ShoppingCart,
  Wheat,
  Bell,
  BarChart3,
} from 'lucide-react';
import type { Module } from '../types';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from './MultiTenantAuthProvider';
import { ProtectedNavItem } from './authorization/ProtectedNavItem';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { cn } from '../lib/utils';

interface SidebarProps {
  modules: Module[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  modules,
  onModuleChange,
  isDarkMode,
  onThemeToggle,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation('common');
  const { currentOrganization } = useAuth();
  const isRTL = i18n.language === 'ar';
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const currentPath = location.pathname;

  // Helper to determine which section should be open based on current path
  const getInitialSectionState = (sectionPaths: string[]) => {
    return sectionPaths.some(path => currentPath === path || currentPath.startsWith(path + '/'));
  };

  // Section toggles - initialize based on current path
  const [showPersonnel, setShowPersonnel] = useState(() =>
    getInitialSectionState(['/workers', '/tasks'])
  );
  const [showProduction, setShowProduction] = useState(() =>
    getInitialSectionState(['/harvests', '/reception-batches', '/quality-control'])
  );
  const [showSalesPurchasing, setShowSalesPurchasing] = useState(() =>
    getInitialSectionState(['/billing-quotes', '/billing-sales-orders', '/billing-purchase-orders'])
  );
  const [showAccounting, setShowAccounting] = useState(() =>
    getInitialSectionState(['/accounting', '/accounting-accounts', '/accounting-invoices', '/accounting-payments', '/accounting-journal', '/utilities'])
  );
  const [showConfiguration, setShowConfiguration] = useState(() =>
    getInitialSectionState(['/accounting-customers', '/stock/suppliers', '/stock/warehouses', '/settings'])
  );
  const [showAgricultureModules, setShowAgricultureModules] = useState(false);
  const [showElevageModules, setShowElevageModules] = useState(false);

  // Auto-expand parent section when navigating to a child route
  useEffect(() => {
    // Personnel section
    if (['/workers', '/tasks'].some(p => currentPath === p || currentPath.startsWith(p + '/'))) {
      setShowPersonnel(true);
    }
    // Production section
    if (['/harvests', '/reception-batches', '/quality-control'].some(p => currentPath === p || currentPath.startsWith(p + '/'))) {
      setShowProduction(true);
    }
    // Sales & Purchasing section
    if (['/billing-quotes', '/billing-sales-orders', '/billing-purchase-orders'].some(p => currentPath === p || currentPath.startsWith(p + '/'))) {
      setShowSalesPurchasing(true);
    }
    // Accounting section
    if (['/accounting', '/accounting-accounts', '/accounting-invoices', '/accounting-payments', '/accounting-journal', '/utilities'].some(p => currentPath === p || currentPath.startsWith(p + '/'))) {
      setShowAccounting(true);
    }
    // Configuration section
    if (['/accounting-customers', '/stock/suppliers', '/stock/warehouses', '/settings'].some(p => currentPath === p || currentPath.startsWith(p + '/'))) {
      setShowConfiguration(true);
    }
  }, [currentPath]);

  const scrollViewportRef = React.useRef<HTMLDivElement>(null);
  const scrollPositionRef = React.useRef(0);
  const SCROLL_STORAGE_KEY = 'sidebarScrollTop';

  const getModuleIcon = (iconName: string) => {
    switch (iconName) {
      case 'Tree':
        return <Tree className="h-5 w-5" />;
      case 'Fish':
        return <Fish className="h-5 w-5" />;
      case 'Sprout':
        return <Sprout className="h-5 w-5" />;
      case 'Bird':
        return <Bird className="h-5 w-5" />;
      case 'Home':
        return <Home className="h-5 w-5" />;
      case 'Bug':
        return <Bug className="h-5 w-5" />;
      case 'Droplets':
        return <Droplets className="h-5 w-5" />;
      case 'Flower2':
        return <Flower2 className="h-5 w-5" />;
      case 'Beef':
        return <Beef className="h-5 w-5" />;
      case 'Sheep':
        return <Sheep className="h-5 w-5" />;
      case 'Camel':
        return <Leaf className="h-5 w-5 rotate-45" />;
      case 'Egg':
        return <Egg className="h-5 w-5" />;
      default:
        return <Leaf className="h-5 w-5" />;
    }
  };

  const handleNavigation = (path: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (scrollViewportRef.current) {
      scrollPositionRef.current = scrollViewportRef.current.scrollTop;
    }

    onModuleChange(path.replace('/', ''));
    navigate({ to: path });
    setIsMobileMenuOpen(false);

    requestAnimationFrame(() => {
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollPositionRef.current;
      }
    });
  };

  useLayoutEffect(() => {
    const saved = Number(sessionStorage.getItem(SCROLL_STORAGE_KEY) || '0');
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = saved;
    }
  }, [currentPath]);

  useEffect(() => {
    const viewport = scrollViewportRef.current;
    if (!viewport) return;

    const onScroll = () => {
      sessionStorage.setItem(SCROLL_STORAGE_KEY, String(viewport.scrollTop));
      scrollPositionRef.current = viewport.scrollTop;
    };
    viewport.addEventListener('scroll', onScroll, { passive: true });
    return () => viewport.removeEventListener('scroll', onScroll);
  }, [scrollViewportRef.current]);

  const agricultureModules = modules.filter(m => m.category === 'agriculture');
  const elevageModules = modules.filter(m => m.category === 'elevage');

  const getButtonClassName = (isActive: boolean, additionalClasses?: string) => {
    return cn(
      "w-full text-gray-600 dark:text-gray-400 h-9",
      isRTL ? "flex-row-reverse justify-end text-right" : "justify-start",
      isActive && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30",
      additionalClasses
    );
  };

  const getSubItemClassName = (isActive: boolean) => {
    return cn(
      "w-full text-gray-600 dark:text-gray-400 h-8 text-sm",
      isRTL ? "flex-row-reverse justify-end text-right pr-8" : "justify-start pl-8",
      isActive && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
    );
  };

  const getSectionHeaderClassName = () => {
    return cn(
      "w-full justify-between px-3 h-9 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50",
      isRTL && "flex-row-reverse text-right"
    );
  };

  const renderIcon = (IconComponent: React.ComponentType<{ className?: string }>, className?: string) => {
    return <IconComponent className={cn("h-4 w-4 flex-shrink-0", isRTL ? "ml-3" : "mr-3", className)} />;
  };

  const renderText = (text: string) => {
    return (
      <span className={cn("flex-1 truncate", isRTL ? "text-right" : "text-left")}>
        {text}
      </span>
    );
  };

  const renderChevron = (isOpen: boolean) => {
    return isOpen
      ? <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
      : <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />;
  };

  return (
    <>
      {/* Mobile Menu Button */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className={cn(
            "lg:hidden fixed top-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg",
            isRTL ? "right-4" : "left-4"
          )}
          aria-label="Toggle menu"
        >
          <Menu className="h-6 w-6 text-gray-700 dark:text-gray-300" />
        </button>
      )}

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed lg:static inset-y-0 z-50",
        isRTL ? "right-0 border-l" : "left-0 border-r",
        "h-screen w-64 bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex flex-col",
        "transform transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : isRTL ? "translate-x-full lg:translate-x-0" : "-translate-x-full lg:translate-x-0"
      )} dir={isRTL ? 'rtl' : 'ltr'}>

        {/* Header */}
        <div className={cn("flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800", isRTL && "text-right")}>
          <div className={cn("flex items-center gap-2", isRTL ? "flex-row-reverse" : "")}>
            <div className={cn("flex items-center min-w-0 flex-1 gap-3", isRTL && "flex-row-reverse")}>
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate text-start">
                  {currentOrganization?.name || t('app.name')}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-start">AgriTech Platform</p>
              </div>
            </div>
            <div className={cn("flex items-center gap-1", isRTL && "flex-row-reverse")}>
              <LanguageSwitcher />
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-8 w-8"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 min-h-0 px-3">
          <nav
            className={cn("space-y-1 py-4", isRTL && "text-right")}
            ref={(node) => {
              if (node) {
                const viewport = node.closest('[data-radix-scroll-area-viewport]');
                if (viewport) {
                  scrollViewportRef.current = viewport as HTMLDivElement;
                  const saved = Number(sessionStorage.getItem(SCROLL_STORAGE_KEY) || '0');
                  (viewport as HTMLDivElement).scrollTop = saved;
                }
              }
            }}
          >
            {/* ========== MAIN NAVIGATION ========== */}
            <div className="space-y-1">
              {/* Dashboard */}
              <ProtectedNavItem action="read" subject="Dashboard">
                <Button
                  variant="ghost"
                  className={getButtonClassName(currentPath === '/dashboard')}
                  onClick={(e) => handleNavigation('/dashboard', e)}
                >
                  {renderIcon(Home)}
                  {renderText(t('nav.dashboard'))}
                </Button>
              </ProtectedNavItem>

              {/* Farm Hierarchy */}
              <ProtectedNavItem action="read" subject="FarmHierarchy">
                <Button
                  variant="ghost"
                  className={getButtonClassName(currentPath === '/farm-hierarchy')}
                  onClick={(e) => handleNavigation('/farm-hierarchy', e)}
                >
                  {renderIcon(Network)}
                  {renderText(t('nav.farmHierarchy'))}
                </Button>
              </ProtectedNavItem>

              {/* Parcels */}
              <ProtectedNavItem action="read" subject="Parcel">
                <Button
                  variant="ghost"
                  className={getButtonClassName(currentPath === '/parcels')}
                  onClick={(e) => handleNavigation('/parcels', e)}
                >
                  {renderIcon(Map)}
                  {renderText(t('nav.parcels'))}
                </Button>
              </ProtectedNavItem>

              {/* Stock */}
              <ProtectedNavItem action="read" subject="Stock">
                <Button
                  variant="ghost"
                  className={getButtonClassName(currentPath === '/stock' || currentPath.startsWith('/stock/'))}
                  onClick={(e) => handleNavigation('/stock', e)}
                >
                  {renderIcon(Package)}
                  {renderText(t('nav.stock'))}
                </Button>
              </ProtectedNavItem>

              {/* Infrastructure */}
              <ProtectedNavItem action="read" subject="Infrastructure">
                <Button
                  variant="ghost"
                  className={getButtonClassName(currentPath === '/infrastructure')}
                  onClick={(e) => handleNavigation('/infrastructure', e)}
                >
                  {renderIcon(Building2)}
                  {renderText(t('nav.infrastructure'))}
                </Button>
              </ProtectedNavItem>
            </div>

            {/* ========== PERSONNEL SECTION ========== */}
            <Separator className="my-3" />
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={getSectionHeaderClassName()}
                onClick={() => setShowPersonnel(!showPersonnel)}
              >
                <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                  {renderIcon(Users)}
                  <span>{t('nav.personnel')}</span>
                </div>
                {renderChevron(showPersonnel)}
              </Button>
              {showPersonnel && (
                <>
                  <ProtectedNavItem action="read" subject="Worker">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/workers')}
                      onClick={(e) => handleNavigation('/workers', e)}
                    >
                      {renderText(t('nav.workers'))}
                    </Button>
                  </ProtectedNavItem>
                  <ProtectedNavItem action="read" subject="Task">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/tasks')}
                      onClick={(e) => handleNavigation('/tasks', e)}
                    >
                      {renderText(t('nav.tasks'))}
                    </Button>
                  </ProtectedNavItem>
                </>
              )}
            </div>

            {/* ========== PRODUCTION SECTION ========== */}
            <Separator className="my-3" />
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={getSectionHeaderClassName()}
                onClick={() => setShowProduction(!showProduction)}
              >
                <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                  {renderIcon(Wheat)}
                  <span>{t('nav.production')}</span>
                </div>
                {renderChevron(showProduction)}
              </Button>
              {showProduction && (
                <>
                  <ProtectedNavItem action="read" subject="Harvest">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/harvests')}
                      onClick={(e) => handleNavigation('/harvests', e)}
                    >
                      {renderText(t('nav.harvests'))}
                    </Button>
                  </ProtectedNavItem>
                  <ProtectedNavItem action="read" subject="ReceptionBatch">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/reception-batches')}
                      onClick={(e) => handleNavigation('/reception-batches', e)}
                    >
                      {renderText(t('nav.receptionBatches'))}
                    </Button>
                  </ProtectedNavItem>
                  <ProtectedNavItem action="read" subject="ReceptionBatch">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/quality-control')}
                      onClick={(e) => handleNavigation('/quality-control', e)}
                    >
                      {renderText(t('nav.qualityControl'))}
                    </Button>
                  </ProtectedNavItem>
                </>
              )}
            </div>

            {/* ========== SALES & PURCHASING SECTION ========== */}
            <Separator className="my-3" />
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={getSectionHeaderClassName()}
                onClick={() => setShowSalesPurchasing(!showSalesPurchasing)}
              >
                <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                  {renderIcon(ShoppingCart)}
                  <span>{t('nav.salesPurchasing')}</span>
                </div>
                {renderChevron(showSalesPurchasing)}
              </Button>
              {showSalesPurchasing && (
                <>
                  <ProtectedNavItem action="read" subject="Invoice">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/billing-quotes')}
                      onClick={(e) => handleNavigation('/billing-quotes', e)}
                    >
                      {renderText(t('nav.quotes'))}
                    </Button>
                  </ProtectedNavItem>
                  <ProtectedNavItem action="read" subject="Invoice">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/billing-sales-orders')}
                      onClick={(e) => handleNavigation('/billing-sales-orders', e)}
                    >
                      {renderText(t('nav.salesOrders'))}
                    </Button>
                  </ProtectedNavItem>
                  <ProtectedNavItem action="read" subject="Invoice">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/billing-purchase-orders')}
                      onClick={(e) => handleNavigation('/billing-purchase-orders', e)}
                    >
                      {renderText(t('nav.purchaseOrders'))}
                    </Button>
                  </ProtectedNavItem>
                </>
              )}
            </div>

            {/* ========== ACCOUNTING SECTION ========== */}
            <Separator className="my-3" />
            <ProtectedNavItem action="read" subject="Invoice">
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className={getSectionHeaderClassName()}
                  onClick={() => setShowAccounting(!showAccounting)}
                >
                  <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                    {renderIcon(BookOpen)}
                    <span>{t('nav.accounting')}</span>
                  </div>
                  {renderChevron(showAccounting)}
                </Button>
                {showAccounting && (
                  <>
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/accounting')}
                      onClick={(e) => handleNavigation('/accounting', e)}
                    >
                      {renderText(t('nav.overview'))}
                    </Button>
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/accounting-accounts')}
                      onClick={(e) => handleNavigation('/accounting-accounts', e)}
                    >
                      {renderText(t('nav.chartOfAccounts'))}
                    </Button>
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/accounting-invoices')}
                      onClick={(e) => handleNavigation('/accounting-invoices', e)}
                    >
                      {renderText(t('nav.invoices'))}
                    </Button>
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/accounting-payments')}
                      onClick={(e) => handleNavigation('/accounting-payments', e)}
                    >
                      {renderText(t('nav.payments'))}
                    </Button>
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/accounting-journal')}
                      onClick={(e) => handleNavigation('/accounting-journal', e)}
                    >
                      {renderText(t('nav.journal'))}
                    </Button>
                    <ProtectedNavItem action="read" subject="Utility">
                      <Button
                        variant="ghost"
                        className={getSubItemClassName(currentPath === '/utilities')}
                        onClick={(e) => handleNavigation('/utilities', e)}
                      >
                        {renderText(t('nav.expenses'))}
                      </Button>
                    </ProtectedNavItem>
                  </>
                )}
              </div>
            </ProtectedNavItem>

            {/* ========== CONFIGURATION SECTION ========== */}
            <Separator className="my-3" />
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={getSectionHeaderClassName()}
                onClick={() => setShowConfiguration(!showConfiguration)}
              >
                <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                  {renderIcon(Settings)}
                  <span>{t('nav.configuration')}</span>
                </div>
                {renderChevron(showConfiguration)}
              </Button>
              {showConfiguration && (
                <>
                  <ProtectedNavItem action="read" subject="Invoice">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/accounting-customers')}
                      onClick={(e) => handleNavigation('/accounting-customers', e)}
                    >
                      {renderText(t('nav.customers'))}
                    </Button>
                  </ProtectedNavItem>
                  <ProtectedNavItem action="read" subject="Stock">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/stock/suppliers' || currentPath.startsWith('/stock/suppliers'))}
                      onClick={(e) => handleNavigation('/stock/suppliers', e)}
                    >
                      {renderText(t('nav.suppliers'))}
                    </Button>
                  </ProtectedNavItem>
                  <ProtectedNavItem action="read" subject="Stock">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath === '/stock/warehouses' || currentPath.startsWith('/stock/warehouses'))}
                      onClick={(e) => handleNavigation('/stock/warehouses', e)}
                    >
                      {renderText(t('nav.warehouses'))}
                    </Button>
                  </ProtectedNavItem>
                  <ProtectedNavItem action="read" subject="Settings">
                    <Button
                      variant="ghost"
                      className={getSubItemClassName(currentPath.startsWith('/settings'))}
                      onClick={(e) => handleNavigation('/settings/profile', e)}
                    >
                      {renderText(t('nav.settings'))}
                    </Button>
                  </ProtectedNavItem>
                </>
              )}
            </div>

            {/* ========== AGRICULTURE MODULES ========== */}
            {agricultureModules.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className={getSectionHeaderClassName()}
                    onClick={() => setShowAgricultureModules(!showAgricultureModules)}
                  >
                    <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                      {renderIcon(Sprout)}
                      <span>{t('nav.agriculture')} ({agricultureModules.length})</span>
                    </div>
                    {renderChevron(showAgricultureModules)}
                  </Button>
                  {showAgricultureModules && agricultureModules.map((module) => (
                    <Button
                      key={module.id}
                      variant="ghost"
                      className={getSubItemClassName(currentPath === `/${module.id}`)}
                      onClick={(e) => handleNavigation(`/${module.id}`, e)}
                    >
                      <span className={cn("flex-shrink-0", isRTL ? "ml-2" : "mr-2")}>{getModuleIcon(module.icon)}</span>
                      {renderText(module.name)}
                    </Button>
                  ))}
                </div>
              </>
            )}

            {/* ========== ELEVAGE MODULES ========== */}
            {elevageModules.length > 0 && (
              <>
                <Separator className="my-3" />
                <div className="space-y-1">
                  <Button
                    variant="ghost"
                    className={getSectionHeaderClassName()}
                    onClick={() => setShowElevageModules(!showElevageModules)}
                  >
                    <div className={cn("flex items-center", isRTL && "flex-row-reverse")}>
                      {renderIcon(Beef)}
                      <span>{t('nav.elevage')} ({elevageModules.length})</span>
                    </div>
                    {renderChevron(showElevageModules)}
                  </Button>
                  {showElevageModules && elevageModules.map((module) => (
                    <Button
                      key={module.id}
                      variant="ghost"
                      className={getSubItemClassName(currentPath === `/${module.id}`)}
                      onClick={(e) => handleNavigation(`/${module.id}`, e)}
                    >
                      <span className={cn("flex-shrink-0", isRTL ? "ml-2" : "mr-2")}>{getModuleIcon(module.icon)}</span>
                      {renderText(module.name)}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </nav>
        </ScrollArea>

        {/* ========== FOOTER ========== */}
        <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-1">
          <ProtectedNavItem action="read" subject="Dashboard">
            <Button
              variant="ghost"
              className={getButtonClassName(currentPath === '/alerts')}
              onClick={(e) => handleNavigation('/alerts', e)}
            >
              {renderIcon(Bell)}
              {renderText(t('nav.alerts'))}
            </Button>
          </ProtectedNavItem>

          <ProtectedNavItem action="read" subject="Report">
            <Button
              variant="ghost"
              className={getButtonClassName(currentPath === '/reports' || currentPath === '/accounting-reports')}
              onClick={(e) => handleNavigation('/accounting-reports', e)}
            >
              {renderIcon(BarChart3)}
              {renderText(t('nav.reports'))}
            </Button>
          </ProtectedNavItem>

          <Separator className="my-2" />

          <Button
            variant="ghost"
            className={getButtonClassName(false, "hover:text-gray-900 dark:hover:text-gray-100")}
            onClick={onThemeToggle}
          >
            {isDarkMode ? renderIcon(Sun) : renderIcon(Moon)}
            {renderText(isDarkMode ? t('app.lightMode') : t('app.darkMode'))}
          </Button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
