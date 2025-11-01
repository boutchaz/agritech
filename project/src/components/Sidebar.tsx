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
  const { t } = useTranslation('common');
  const { currentOrganization } = useAuth();
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

  return (
    <>
      {/* Mobile Menu Button - Only shows when menu is closed */}
      {!isMobileMenuOpen && (
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-lg"
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
        "fixed lg:static inset-y-0 left-0 z-50",
        "h-screen w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col",
        "transform transition-transform duration-300 ease-in-out",
        isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}>
        {/* Header */}
        <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-3 min-w-0 flex-1">
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate">
                  {currentOrganization?.name || t('app.name')}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">AgriTech Platform</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
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
          className="space-y-1 py-4"
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
            <ProtectedNavItem action="read" subject="Dashboard">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/dashboard' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={(e) => handleNavigation('/dashboard', e)}
              >
                <Home className="mr-3 h-4 w-4" />
                {t('nav.dashboard')}
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="Analysis">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/production-intelligence' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={(e) => handleNavigation('/production-intelligence', e)}
              >
                <BarChart3 className="mr-3 h-4 w-4" />
                Production Intelligence
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="Analysis">
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
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="Parcel">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/parcels' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={(e) => handleNavigation('/parcels', e)}
              >
                <Map className="mr-3 h-4 w-4" />
                {t('nav.parcels')}
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="Stock">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/stock' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={(e) => handleNavigation('/stock', e)}
              >
                <Package className="mr-3 h-4 w-4" />
                {t('nav.stock')}
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="Infrastructure">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/infrastructure' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={(e) => handleNavigation('/infrastructure', e)}
              >
                <Building2 className="mr-3 h-4 w-4" />
                {t('nav.infrastructure')}
              </Button>
            </ProtectedNavItem>

            <ProtectedNavItem action="read" subject="FarmHierarchy">
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/farm-hierarchy' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={(e) => handleNavigation('/farm-hierarchy', e)}
              >
                <Network className="mr-3 h-4 w-4" />
                {t('nav.farmHierarchy')}
              </Button>
            </ProtectedNavItem>
          </div>


          {/* Personnel Section */}
          <Separator className="my-3" />
          <div className="space-y-1">
            <Button
              variant="ghost"
              className="w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent"
              onClick={() => setShowPersonnel(!showPersonnel)}
            >
              Personnel
              {showPersonnel ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
            </Button>
            {showPersonnel && (
              <>
                <ProtectedNavItem action="read" subject="Worker">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === '/workers' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation('/workers', e)}
                  >
                    <Users className="mr-3 h-4 w-4" />
                    {t('nav.personnel')}
                  </Button>
                </ProtectedNavItem>

                <ProtectedNavItem action="read" subject="Task">
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === '/tasks' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation('/tasks', e)}
                  >
                    <CheckSquare className="mr-3 h-4 w-4" />
                    {t('nav.tasks')}
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
                className="w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent"
                onClick={() => setShowAccountingBilling(!showAccountingBilling)}
              >
                Accounting & Billing
                {showAccountingBilling ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {showAccountingBilling && (
                <>

              {/* Dashboard */}
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/accounting' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={(e) => handleNavigation('/accounting', e)}
              >
                <BookOpen className="mr-3 h-4 w-4" />
                Dashboard
              </Button>

              {/* Chart of Accounts */}
              <Button
                variant="ghost"
                className={cn(
                  "w-full justify-start text-gray-600 dark:text-gray-400",
                  currentPath === '/accounting-accounts' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                )}
                onClick={(e) => handleNavigation('/accounting-accounts', e)}
              >
                <List className="mr-3 h-4 w-4" />
                Chart of Accounts
              </Button>

              {/* Sales Process Section */}
              <div className="h-2" />
              <Button
                variant="ghost"
                className="w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent"
                onClick={() => setShowSalesProcess(!showSalesProcess)}
              >
                Sales Process
                {showSalesProcess ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {showSalesProcess && (
                <>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === '/billing-quotes' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation('/billing-quotes', e)}
                  >
                    <FileEdit className="mr-3 h-4 w-4" />
                    Quotes
                  </Button>

                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === '/billing-sales-orders' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation('/billing-sales-orders', e)}
                  >
                    <ShoppingCart className="mr-3 h-4 w-4" />
                    Sales Orders
                  </Button>

                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === '/billing-purchase-orders' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation('/billing-purchase-orders', e)}
                  >
                    <PackageSearch className="mr-3 h-4 w-4" />
                    Purchase Orders
                  </Button>
                </>
              )}

              {/* Financial Records Section */}
              <div className="h-2" />
              <Button
                variant="ghost"
                className="w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent"
                onClick={() => setShowFinancialRecords(!showFinancialRecords)}
              >
                Financial Records
                {showFinancialRecords ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {showFinancialRecords && (
                <>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === '/accounting-invoices' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation('/accounting-invoices', e)}
                  >
                    <Receipt className="mr-3 h-4 w-4" />
                    Invoices
                  </Button>

                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === '/accounting-payments' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation('/accounting-payments', e)}
                  >
                    <CreditCard className="mr-3 h-4 w-4" />
                    Payments
                  </Button>

                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === '/accounting-journal' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation('/accounting-journal', e)}
                  >
                    <BookOpen className="mr-3 h-4 w-4" />
                    Journal
                  </Button>

                  <ProtectedNavItem action="read" subject="Utility">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-gray-600 dark:text-gray-400",
                        currentPath === '/utilities' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                      )}
                      onClick={(e) => handleNavigation('/utilities', e)}
                    >
                      <Wallet className="mr-3 h-4 w-4" />
                      Expenses
                    </Button>
                  </ProtectedNavItem>
                </>
              )}

              {/* Setup & Reports Section */}
              <div className="h-2" />
              <Button
                variant="ghost"
                className="w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent"
                onClick={() => setShowSetupReports(!showSetupReports)}
              >
                Setup & Reports
                {showSetupReports ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
              {showSetupReports && (
                <>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === '/accounting-customers' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation('/accounting-customers', e)}
                  >
                    <UserCheck className="mr-3 h-4 w-4" />
                    Customers
                  </Button>

                  <ProtectedNavItem action="read" subject="AccountingReport">
                    <Button
                      variant="ghost"
                      className={cn(
                        "w-full justify-start text-gray-600 dark:text-gray-400",
                        currentPath === '/accounting-reports' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                      )}
                      onClick={(e) => handleNavigation('/accounting-reports', e)}
                    >
                      <FileSpreadsheet className="mr-3 h-4 w-4" />
                      Reports
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
                  className="w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent"
                  onClick={() => setShowAgricultureModules(!showAgricultureModules)}
                >
                  Agriculture
                  {showAgricultureModules ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
                {showAgricultureModules && agricultureModules.map((module) => (
                  <Button
                    key={module.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === `/${module.id}` && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation(`/${module.id}`, e)}
                  >
                    <span className="mr-3">{getModuleIcon(module.icon)}</span>
                    {module.name}
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
                  className="w-full justify-between px-3 h-8 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider hover:bg-transparent"
                  onClick={() => setShowElevageModules(!showElevageModules)}
                >
                  Élevage
                  {showElevageModules ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                </Button>
                {showElevageModules && elevageModules.map((module) => (
                  <Button
                    key={module.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-gray-600 dark:text-gray-400",
                      currentPath === `/${module.id}` && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
                    )}
                    onClick={(e) => handleNavigation(`/${module.id}`, e)}
                  >
                    <span className="mr-3">{getModuleIcon(module.icon)}</span>
                    {module.name}
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
            className={cn(
              "w-full justify-start text-gray-600 dark:text-gray-400",
              currentPath === '/alerts' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
            )}
            onClick={(e) => handleNavigation('/alerts', e)}
          >
            <AlertCircle className="mr-3 h-4 w-4" />
            Alertes
          </Button>
        </ProtectedNavItem>

        <ProtectedNavItem action="read" subject="Report">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-gray-600 dark:text-gray-400",
              currentPath === '/reports' && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
            )}
            onClick={(e) => handleNavigation('/reports', e)}
          >
            <FileSpreadsheet className="mr-3 h-4 w-4" />
            {t('nav.reports')}
          </Button>
        </ProtectedNavItem>

        <ProtectedNavItem action="read" subject="Settings">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start text-gray-600 dark:text-gray-400",
              currentPath.startsWith('/settings') && "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30"
            )}
            onClick={(e) => handleNavigation('/settings/profile', e)}
          >
            <Settings className="mr-3 h-4 w-4" />
            {t('nav.settings')}
          </Button>
        </ProtectedNavItem>

        <Separator className="my-2" />

        <Button
          variant="ghost"
          className="w-full justify-start text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
          onClick={onThemeToggle}
        >
          {isDarkMode ? <Sun className="mr-3 h-4 w-4" /> : <Moon className="mr-3 h-4 w-4" />}
          {isDarkMode ? t('app.lightMode') : t('app.darkMode')}
        </Button>
      </div>
      </div>
    </>
  );
};

export default Sidebar;