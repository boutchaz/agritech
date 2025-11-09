import React, { useEffect, useLayoutEffect, useState } from 'react';
import { useNavigate, useLocation } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { Home, Trees as Tree, Fish, Leaf, AlertCircle, Settings, Sun, Moon, Sprout, Bird, Bug, Droplets, Flower2, Beef, Sheet as Sheep, Egg, FileText, Map, Package, Building2, Users, Wallet, FileSpreadsheet, Network, Menu, X, CheckSquare, ChevronDown, ChevronRight, Receipt, CreditCard, BookOpen, UserCheck, FileEdit, ShoppingCart, PackageSearch, List, BarChart3 } from 'lucide-react';
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
  const [showAgricultureModules, setShowAgricultureModules] = useState(false);
  const [showElevageModules, setShowElevageModules] = useState(false);
  const [showPersonnel, setShowPersonnel] = useState(true);
  const [showAccountingBilling, setShowAccountingBilling] = useState(true);
  const [showSalesProcess, setShowSalesProcess] = useState(true);
  const [showFinancialRecords, setShowFinancialRecords] = useState(true);
  const [showSetupReports, setShowSetupReports] = useState(true);
  const scrollViewportRef = React.useRef<HTMLDivElement>(null);
  const scrollPositionRef = React.useRef(0);
  const SCROLL_STORAGE_KEY = 'sidebarScrollTop';

  const currentPath = location.pathname;

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
        return <Leaf className="h-5 w-5 rotate-45" />; // Using Leaf as a temporary icon for camel
      case 'Egg':
        return <Egg className="h-5 w-5" />;
      default:
        return <Leaf className="h-5 w-5" />;
    }
  };

  const handleNavigation = (path: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    // Save current scroll position
    if (scrollViewportRef.current) {
      scrollPositionRef.current = scrollViewportRef.current.scrollTop;
    }

    onModuleChange(path.replace('/', ''));
    navigate({ to: path });
    setIsMobileMenuOpen(false); // Close mobile menu on navigation

    // Restore scroll position after navigation
    requestAnimationFrame(() => {
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollPositionRef.current;
      }
    });
  };

  // Restore sidebar scroll position after route changes
  useLayoutEffect(() => {
    const saved = Number(sessionStorage.getItem(SCROLL_STORAGE_KEY) || '0');
    if (scrollViewportRef.current) {
      scrollViewportRef.current.scrollTop = saved;
    }
  }, [currentPath]);

  // Attach scroll listener to persist scroll position
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

  // Helper function to get button className with RTL support
  const getButtonClassName = (isActive: boolean, additionalClasses?: string) => {
    return cn(
      "w-full text-gray-600 dark:text-gray-400",
      isRTL ? "flex-row-reverse justify-end text-right" : "justify-start",
      isActive && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30",
      additionalClasses
    );
  };

  // Helper function to render icon with RTL support
  const renderIcon = (IconComponent: React.ComponentType<{ className?: string }>, className?: string) => {
    return <IconComponent className={cn("h-4 w-4 flex-shrink-0", isRTL ? "ml-3" : "mr-3", className)} />;
  };

  // Helper function to render text with RTL support
  const renderText = (text: string) => {
    return <span className={isRTL ? "text-right w-full" : ""}>{text}</span>;
  };

  return (
    <>
      {/* Mobile Menu Button - Only shows when menu is closed */}
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
              // Find the ScrollArea viewport and attach our ref
              const viewport = node.closest('[data-radix-scroll-area-viewport]');
              if (viewport) {
                scrollViewportRef.current = viewport as HTMLDivElement;
                // Attempt immediate restore from storage when ref attaches
                const saved = Number(sessionStorage.getItem(SCROLL_STORAGE_KEY) || '0');
                (viewport as HTMLDivElement).scrollTop = saved;
              }
            }
          }}
        >
          {/* Main Navigation */}
          <div className="space-y-1">
            {/* Overview */}
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

            {/* Farm Management Section */}
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

            {/* Production Intelligence Section */}
            <ProtectedNavItem action="read" subject="Analysis">
              <Button
                variant="ghost"
                className={getButtonClassName(currentPath === '/production-intelligence')}
                onClick={(e) => handleNavigation('/production-intelligence', e)}
              >
                {renderIcon(BarChart3)}
                {renderText(t('nav.productionIntelligence'))}
              </Button>
            </ProtectedNavItem>

            {/* Analyses navigation removed - now integrated in parcel detail pages */}
            {/* <ProtectedNavItem action="read" subject="Analysis">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/analyses' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={(e) => handleNavigation('/analyses', e)}
              >
                <FileText className="mr-3 h-4 w-4" />
                {t('nav.analyses')}
              </Button>
            </ProtectedNavItem> */}

            {/* Operations Section */}
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


          {/* Personnel Section */}
          <Separator className="my-3" />
          <div className="space-y-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent",
                isRTL && "flex-row-reverse text-right"
              )}
              onClick={() => setShowPersonnel(!showPersonnel)}
            >
              <span className={isRTL ? "text-right" : ""}>{t('nav.personnel')}</span>
              {showPersonnel ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
            </Button>
            {showPersonnel && (
              <>
                <ProtectedNavItem action="read" subject="Worker">
                  <Button
                    variant="ghost"
                    className={getButtonClassName(currentPath === '/workers')}
                    onClick={(e) => handleNavigation('/workers', e)}
                  >
                    {renderIcon(Users)}
                    {renderText(t('nav.personnel'))}
                  </Button>
                </ProtectedNavItem>

                <ProtectedNavItem action="read" subject="Task">
                  <Button
                    variant="ghost"
                    className={getButtonClassName(currentPath === '/tasks')}
                    onClick={(e) => handleNavigation('/tasks', e)}
                  >
                    {renderIcon(CheckSquare)}
                    {renderText(t('nav.tasks'))}
                  </Button>
                </ProtectedNavItem>
              </>
            )}
          </div>


          {/* Accounting & Billing Section */}
          <ProtectedNavItem action="read" subject="Invoice">
            <Separator className="my-3" />
            <div className="space-y-1">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent",
                  isRTL && "flex-row-reverse text-right"
                )}
                onClick={() => setShowAccountingBilling(!showAccountingBilling)}
              >
                <span className={isRTL ? "text-right" : ""}>{t('nav.accountingBilling')}</span>
                {showAccountingBilling ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
              </Button>
              {showAccountingBilling && (
                <>

              {/* Dashboard */}
              <Button
                variant="ghost"
                className={getButtonClassName(currentPath === '/accounting')}
                onClick={(e) => handleNavigation('/accounting', e)}
              >
                {renderIcon(BookOpen)}
                {renderText(t('nav.dashboard'))}
              </Button>

              {/* Chart of Accounts */}
              <Button
                variant="ghost"
                className={getButtonClassName(currentPath === '/accounting-accounts')}
                onClick={(e) => handleNavigation('/accounting-accounts', e)}
              >
                {renderIcon(List)}
                {renderText(t('nav.chartOfAccounts'))}
              </Button>

              {/* Sales Process Section */}
              <div className="h-2" />
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent",
                  isRTL && "flex-row-reverse text-right"
                )}
                onClick={() => setShowSalesProcess(!showSalesProcess)}
              >
                <span className={isRTL ? "text-right" : ""}>{t('nav.salesProcess')}</span>
                {showSalesProcess ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
              </Button>
              {showSalesProcess && (
                <>
                  <Button
                    variant="ghost"
                    className={getButtonClassName(currentPath === '/billing-quotes')}
                    onClick={(e) => handleNavigation('/billing-quotes', e)}
                  >
                    {renderIcon(FileEdit)}
                    {renderText(t('nav.quotes'))}
                  </Button>

                  <Button
                    variant="ghost"
                    className={getButtonClassName(currentPath === '/billing-sales-orders')}
                    onClick={(e) => handleNavigation('/billing-sales-orders', e)}
                  >
                    {renderIcon(ShoppingCart)}
                    {renderText(t('nav.salesOrders'))}
                  </Button>

                  <Button
                    variant="ghost"
                    className={getButtonClassName(currentPath === '/billing-purchase-orders')}
                    onClick={(e) => handleNavigation('/billing-purchase-orders', e)}
                  >
                    {renderIcon(PackageSearch)}
                    {renderText(t('nav.purchaseOrders'))}
                  </Button>
                </>
              )}

              {/* Financial Records Section */}
              <div className="h-2" />
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent",
                  isRTL && "flex-row-reverse text-right"
                )}
                onClick={() => setShowFinancialRecords(!showFinancialRecords)}
              >
                <span className={isRTL ? "text-right" : ""}>{t('nav.financialRecords')}</span>
                {showFinancialRecords ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
              </Button>
              {showFinancialRecords && (
                <>
                  <Button
                    variant="ghost"
                    className={getButtonClassName(currentPath === '/accounting-invoices')}
                    onClick={(e) => handleNavigation('/accounting-invoices', e)}
                  >
                    {renderIcon(Receipt)}
                    {renderText(t('nav.invoices'))}
                  </Button>

                  <Button
                    variant="ghost"
                    className={getButtonClassName(currentPath === '/accounting-payments')}
                    onClick={(e) => handleNavigation('/accounting-payments', e)}
                  >
                    {renderIcon(CreditCard)}
                    {renderText(t('nav.payments'))}
                  </Button>

                  <Button
                    variant="ghost"
                    className={getButtonClassName(currentPath === '/accounting-journal')}
                    onClick={(e) => handleNavigation('/accounting-journal', e)}
                  >
                    {renderIcon(BookOpen)}
                    {renderText(t('nav.journal'))}
                  </Button>

                  <ProtectedNavItem action="read" subject="Utility">
                    <Button
                      variant="ghost"
                      className={getButtonClassName(currentPath === '/utilities')}
                      onClick={(e) => handleNavigation('/utilities', e)}
                    >
                      {renderIcon(Wallet)}
                      {renderText(t('nav.expenses'))}
                    </Button>
                  </ProtectedNavItem>
                </>
              )}

              {/* Setup & Reports Section */}
              <div className="h-2" />
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent",
                  isRTL && "flex-row-reverse text-right"
                )}
                onClick={() => setShowSetupReports(!showSetupReports)}
              >
                <span className={isRTL ? "text-right" : ""}>{t('nav.setupReports')}</span>
                {showSetupReports ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
              </Button>
              {showSetupReports && (
                <>
                  <Button
                    variant="ghost"
                    className={getButtonClassName(currentPath === '/accounting-customers')}
                    onClick={(e) => handleNavigation('/accounting-customers', e)}
                  >
                    {renderIcon(UserCheck)}
                    {renderText(t('nav.customers'))}
                  </Button>

                  <ProtectedNavItem action="read" subject="AccountingReport">
                    <Button
                      variant="ghost"
                      className={getButtonClassName(currentPath === '/accounting-reports')}
                      onClick={(e) => handleNavigation('/accounting-reports', e)}
                    >
                      {renderIcon(FileSpreadsheet)}
                      {renderText(t('nav.reports'))}
                    </Button>
                  </ProtectedNavItem>
                </>
              )}
                </>
              )}
            </div>
          </ProtectedNavItem>

          {/* Agriculture Modules */}
          {agricultureModules.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent",
                    isRTL && "flex-row-reverse text-right"
                  )}
                  onClick={() => setShowAgricultureModules(!showAgricultureModules)}
                >
                  <span className={isRTL ? "text-right" : ""}>{t('nav.agriculture')}</span>
                  {showAgricultureModules ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                </Button>
                {showAgricultureModules && agricultureModules.map((module) => (
                  <Button
                    key={module.id}
                    variant="ghost"
                    className={getButtonClassName(currentPath === `/${module.id}`)}
                    onClick={(e) => handleNavigation(`/${module.id}`, e)}
                  >
                    <span className={cn("flex-shrink-0", isRTL ? "ml-3" : "mr-3")}>{getModuleIcon(module.icon)}</span>
                    {renderText(module.name)}
                  </Button>
                ))}
              </div>
            </>
          )}

          {/* Elevage Modules */}
          {elevageModules.length > 0 && (
            <>
              <Separator className="my-3" />
              <div className="space-y-1">
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent",
                    isRTL && "flex-row-reverse text-right"
                  )}
                  onClick={() => setShowElevageModules(!showElevageModules)}
                >
                  <span className={isRTL ? "text-right" : ""}>{t('nav.elevage')}</span>
                  {showElevageModules ? <ChevronDown className="h-3 w-3 flex-shrink-0" /> : <ChevronRight className="h-3 w-3 flex-shrink-0" />}
                </Button>
                {showElevageModules && elevageModules.map((module) => (
                  <Button
                    key={module.id}
                    variant="ghost"
                    className={getButtonClassName(currentPath === `/${module.id}`)}
                    onClick={(e) => handleNavigation(`/${module.id}`, e)}
                  >
                    <span className={cn("flex-shrink-0", isRTL ? "ml-3" : "mr-3")}>{getModuleIcon(module.icon)}</span>
                    {renderText(module.name)}
                  </Button>
                ))}
              </div>
            </>
          )}
        </nav>
      </ScrollArea>

      {/* Footer */}
      <div className="flex-shrink-0 p-3 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-1">
        <ProtectedNavItem action="read" subject="Dashboard">
          <Button
            variant="ghost"
            className={getButtonClassName(currentPath === '/alerts')}
            onClick={(e) => handleNavigation('/alerts', e)}
          >
            {renderIcon(AlertCircle)}
            {renderText(t('nav.alerts'))}
          </Button>
        </ProtectedNavItem>

        <ProtectedNavItem action="read" subject="Report">
          <Button
            variant="ghost"
            className={getButtonClassName(currentPath === '/reports')}
            onClick={(e) => handleNavigation('/reports', e)}
          >
            {renderIcon(FileSpreadsheet)}
            {renderText(t('nav.reports'))}
          </Button>
        </ProtectedNavItem>

        <ProtectedNavItem action="read" subject="Settings">
          <Button
            variant="ghost"
            className={getButtonClassName(currentPath.startsWith('/settings'))}
            onClick={(e) => handleNavigation('/settings/profile', e)}
          >
            {renderIcon(Settings)}
            {renderText(t('nav.settings'))}
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