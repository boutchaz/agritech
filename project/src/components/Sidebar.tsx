import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useModuleBasedDashboard } from "@/hooks/useModuleBasedDashboard";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Home,

  Sun,
  Moon,
  Map,
  Package,
  Building2,
  Users,
  Network,
  X,
  ChevronDown,
  ChevronRight,
  BookOpen,
  ShoppingCart,
  ShoppingBag,
  Wheat,
  BarChart3,
  ExternalLink,
  PanelLeftClose,
  PanelLeft,
  Bot,
  ShieldCheck,
} from "lucide-react";
import type { Module } from "../types";
import { useAuth } from "../hooks/useAuth";
import { appConfig } from "../config/app";
import { getMarketplaceUrl } from "@/lib/marketplace-link";

import { ProtectedNavItem } from "./authorization/ProtectedNavItem";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";
import { Separator } from "./ui/separator";
import { cn } from "../lib/utils";
import { isRTLLocale } from "../lib/is-rtl-locale";
import { useSidebarMargin } from "../hooks/useSidebarLayout";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface SidebarProps {
  modules: Module[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";

type PopoverNavItemProps = {
  path: string;
  label: string;
  isActive: boolean;
  onNavigate: (path: string, e?: React.MouseEvent) => void;
};

function PopoverNavItem({
  path,
  label,
  isActive,
  onNavigate,
}: PopoverNavItemProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full h-8 justify-start text-sm text-slate-900 dark:text-slate-100",
        isActive &&
          "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400",
      )}
      onClick={(e) => onNavigate(path, e)}
    >
      {label}
    </Button>
  );
}

type CollapsedSectionPopoverProps = {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  children: React.ReactNode;
  isRTL: boolean;
};

function CollapsedSectionPopover({
  icon: Icon,
  title,
  children,
  isRTL,
}: CollapsedSectionPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl p-0 text-slate-900 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-100",
          )}
        >
          <Icon className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side={isRTL ? "left" : "right"}
        align="start"
        sideOffset={8}
        className="w-48 p-1 bg-white dark:bg-slate-900"
      >
        <div className="px-2 py-1.5 text-sm font-medium text-slate-900 dark:text-white border-b border-slate-100 dark:border-slate-800 mb-1">
          {title}
        </div>
        <div className="space-y-0.5">{children}</div>
      </PopoverContent>
    </Popover>
  );
}

const Sidebar = ({
  modules: _modules,
  onModuleChange,
  isDarkMode,
  onThemeToggle,
}: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation("common");
  const { currentOrganization } = useAuth();
  const { isNavigationEnabled, availableNavigation } = useModuleBasedDashboard();
  const isRouteEnabled = (path: string) => availableNavigation.length === 0 || isNavigationEnabled(path);
  const isRTL = isRTLLocale(i18n.language);
  const { bothRailsCollapsed } = useSidebarMargin(isRTL);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === "true";
  });

  const prevPathnameRef = useRef<string | null>(null);

  /** More horizontal room for settings: collapse main rail when entering /settings from outside. */
  useEffect(() => {
    const path = location.pathname;
    const prev = prevPathnameRef.current;
    prevPathnameRef.current = path;

    const inSettings = path.startsWith("/settings");
    if (!inSettings) return;

    const enteredFromOutside =
      prev == null || !prev.startsWith("/settings");
    if (!enteredFromOutside) return;

    // Collapse sidebar when navigating into settings from outside.
    // Deferred to next microtask to satisfy react-hooks/set-state-in-effect.
    queueMicrotask(() => {
      setIsCollapsed((collapsed) => {
        if (collapsed) return collapsed;
        localStorage.setItem(SIDEBAR_COLLAPSED_KEY, "true");
        window.dispatchEvent(
          new CustomEvent("sidebarCollapse", {
            detail: { collapsed: true },
          }),
        );
        return true;
      });
    });
  }, [location.pathname]);

  // Listen for external collapse events (e.g., from tour system)
  useEffect(() => {
    const handleExternalCollapse = (e: CustomEvent<{ collapsed: boolean }>) => {
      setIsCollapsed(e.detail.collapsed);
    };
    window.addEventListener(
      "sidebarCollapse",
      handleExternalCollapse as EventListener,
    );
    return () =>
      window.removeEventListener(
        "sidebarCollapse",
        handleExternalCollapse as EventListener,
      );
  }, []);

  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(newValue));
    // Dispatch custom event for layout to listen
    window.dispatchEvent(
      new CustomEvent("sidebarCollapse", { detail: { collapsed: newValue } }),
    );
  };

  const currentPath = location.pathname;

  // Helper to determine which section should be open based on current path
  const getInitialSectionState = (sectionPaths: string[]) => {
    return sectionPaths.some(
      (path) => currentPath === path || currentPath.startsWith(path + "/"),
    );
  };

  // Section toggles - initialize based on current path
  const [showPersonnel, setShowPersonnel] = useState(() =>
    getInitialSectionState(["/workers", "/tasks", "/workforce/payments"]),
  );
  const [showProduction, setShowProduction] = useState(() =>
    getInitialSectionState([
      "/campaigns",
      "/crop-cycles",
      "/harvests",
      "/reception-batches",
      "/quality-control",
      "/biological-assets",
      "/product-applications",
    ]),
  );
  const [showCompliance, setShowCompliance] = useState(() =>
    getInitialSectionState(["/compliance"]),
  );
  const [showSalesPurchasing, setShowSalesPurchasing] = useState(() =>
    getInitialSectionState([
      "/accounting/quotes",
      "/accounting/sales-orders",
      "/accounting/purchase-orders",
    ]),
  );
  const [showAccounting, setShowAccounting] = useState(() =>
    getInitialSectionState([
      "/accounting",
      "/accounting/accounts",
      "/accounting/fiscal-years",
      "/accounting/cost-centers",
      "/accounting/account-mappings",
      "/accounting/invoices",
      "/accounting/payments",
      "/accounting/journal",
      "/accounting/bank-accounts",
      "/utilities",
    ]),
  );
  const [showStockManagement, setShowStockManagement] = useState(() =>
    getInitialSectionState([
      "/stock",
      "/stock/items",
      "/stock/warehouses",
      "/stock/suppliers",
      "/accounting/customers",
    ]),
  );
  const [showMarketplace, setShowMarketplace] = useState(() =>
    getInitialSectionState(["/marketplace/quote-requests"]),
  );

  // Auto-expand parent section when navigating to a child route
  useEffect(() => {
    queueMicrotask(() => {
      // Personnel section
      if (
        ["/workers", "/tasks", "/workforce/payments"].some(
          (p) => currentPath === p || currentPath.startsWith(p + "/"),
        )
      ) {
        setShowPersonnel(true);
      }
      // Production section
      if (
        [
          "/campaigns",
          "/crop-cycles",
              "/harvests",
          "/reception-batches",
          "/quality-control",
          "/biological-assets",
          "/product-applications",
        ].some((p) => currentPath === p || currentPath.startsWith(p + "/"))
      ) {
        setShowProduction(true);
      }
      // Compliance section
      if (currentPath.startsWith("/compliance")) {
        setShowCompliance(true);
      }
      // Sales & Purchasing section
      if (
        [
          "/accounting/quotes",
          "/accounting/sales-orders",
          "/accounting/purchase-orders",
        ].some((p) => currentPath === p || currentPath.startsWith(p + "/"))
      ) {
        setShowSalesPurchasing(true);
      }
      // Accounting section
      if (
        [
          "/accounting",
          "/accounting/accounts",
          "/accounting/invoices",
          "/accounting/payments",
          "/accounting/journal",
          "/accounting/bank-accounts",
          "/utilities",
        ].some((p) => currentPath === p || currentPath.startsWith(p + "/"))
      ) {
        setShowAccounting(true);
      }
      // Stock Management section
      if (
        [
          "/stock",
          "/stock/items",
          "/stock/suppliers",
          "/stock/warehouses",
          "/accounting/customers",
        ].some((p) => currentPath === p || currentPath.startsWith(p + "/"))
      ) {
        setShowStockManagement(true);
      }
      // Marketplace section
      if (currentPath.startsWith("/marketplace/")) {
        setShowMarketplace(true);
      }
    });
  }, [currentPath]);

  const scrollViewportRef = React.useRef<HTMLDivElement>(null);
  const scrollPositionRef = React.useRef(0);
  const SCROLL_STORAGE_KEY = "sidebarScrollTop";

  const handleNavigation = (path: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    e?.stopPropagation();

    if (scrollViewportRef.current) {
      scrollPositionRef.current = scrollViewportRef.current.scrollTop;
    }

    onModuleChange(path.replace("/", ""));
    navigate({ to: path });
    setIsMobileMenuOpen(false);

    requestAnimationFrame(() => {
      if (scrollViewportRef.current) {
        scrollViewportRef.current.scrollTop = scrollPositionRef.current;
      }
    });
  };

  useLayoutEffect(() => {
    const saved = Number(sessionStorage.getItem(SCROLL_STORAGE_KEY) || "0");
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
    viewport.addEventListener("scroll", onScroll, { passive: true });
    return () => viewport.removeEventListener("scroll", onScroll);
  }, []);

  // Tour integration: a tour step can request a sidebar section be opened
  // (so its sub-nav items mount in the DOM and Joyride can target them).
  useEffect(() => {
    const handler = (e: Event) => {
      const ce = e as CustomEvent<{ section?: string }>;
      switch (ce.detail?.section) {
        case 'production':
          setShowProduction(true);
          break;
        case 'personnel':
          setShowPersonnel(true);
          break;
        case 'compliance':
          setShowCompliance(true);
          break;
        case 'sales-purchasing':
          setShowSalesPurchasing(true);
          break;
        case 'accounting':
          setShowAccounting(true);
          break;
      }
    };
    window.addEventListener('tour:expand-sidebar-section', handler);
    return () => window.removeEventListener('tour:expand-sidebar-section', handler);
  }, []);

  const getButtonClassName = (
    isActive: boolean,
    additionalClasses?: string,
  ) => {
    return cn(
      "w-full text-slate-900 dark:text-slate-100 h-11 min-h-[44px]",
      isCollapsed
        ? [
            "md:h-10 md:min-h-0 md:w-10 md:max-w-[2.5rem] md:shrink-0 md:rounded-xl md:px-0 md:justify-center",
            "md:text-slate-900 dark:md:text-slate-100 md:hover:bg-slate-50 dark:md:hover:bg-slate-800 md:hover:text-slate-900 dark:md:hover:text-slate-100",
          ]
        : isRTL
          ? "flex-row-reverse justify-end text-right"
          : "justify-start",
      isActive &&
        "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
      isActive &&
        isCollapsed &&
        // Ghost Button uses !text-slate-900 — need !important on md so icon + label stay white on emerald
        "md:bg-emerald-600 md:!text-white [&_svg]:md:!text-white dark:md:!text-white dark:[&_svg]:md:!text-white md:shadow-lg md:shadow-emerald-200/80 dark:md:shadow-emerald-900/25 md:hover:bg-emerald-600 md:hover:!text-white md:hover:[&_svg]:!text-white dark:md:bg-emerald-600 dark:md:hover:bg-emerald-600",
      additionalClasses,
    );
  };

  const getSubItemClassName = (isActive: boolean) => {
    return cn(
      "w-full text-slate-900 dark:text-slate-100 h-10 min-h-[40px] text-sm",
      isCollapsed
        ? "md:justify-center md:px-0"
        : isRTL
          ? "flex-row-reverse justify-end text-right pr-8"
          : "justify-start pl-8",
      isActive &&
        "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-900/30",
    );
  };

  const getSectionHeaderClassName = () => {
    return cn(
      "w-full justify-between px-3 h-11 min-h-[44px] text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800/50",
      isCollapsed && "md:justify-center md:px-2",
      isRTL && "flex-row-reverse text-right",
    );
  };

  const renderIcon = (
    IconComponent: React.ComponentType<{ className?: string }>,
    className?: string,
  ) => {
    return (
      <IconComponent
        className={cn(
          "h-4 w-4 flex-shrink-0",
          isCollapsed ? "md:h-5 md:w-5" : isRTL ? "ml-3" : "mr-3",
          className,
        )}
      />
    );
  };

  const renderText = (text: string) => {
    return (
      <span
        className={cn(
          "flex-1 truncate",
          isRTL ? "text-right" : "text-left",
          isCollapsed && "md:hidden",
        )}
      >
        {text}
      </span>
    );
  };

  const renderChevron = (isOpen: boolean) => {
    return isOpen ? (
      <ChevronDown
        className={cn(
          "h-4 w-4 flex-shrink-0 text-slate-900 dark:text-slate-100",
          isCollapsed && "md:hidden",
        )}
      />
    ) : (
      <ChevronRight
        className={cn(
          "h-4 w-4 flex-shrink-0 text-slate-900 dark:text-slate-100",
          isCollapsed && "md:hidden",
        )}
      />
    );
  };

  const renderSectionTitle = (text: string) => {
    return <span className={cn(isCollapsed && "md:hidden")}>{text}</span>;
  };

  return (
    <>
      {/* Overlay for mobile — only used if sidebar is somehow opened programmatically */}
      {isMobileMenuOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        data-tour="sidebar"
        className={cn(
          "fixed inset-y-0 z-50",
          isRTL ? "right-0 border-l" : "left-0 border-r",
          "h-dvh bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 flex flex-col",
          "transform transition-all duration-300 ease-in-out",
          "hidden md:flex",
          isCollapsed
            ? bothRailsCollapsed
              ? "md:w-16"
              : "md:w-20"
            : "w-64",
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div
          className={cn(
            "flex-shrink-0 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900",
            isCollapsed ? "md:p-2 p-4" : "p-4",
            isRTL && "text-right",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              isRTL ? "flex-row-reverse" : "",
              isCollapsed && "md:justify-center",
            )}
          >
            <button
              type="button"
              onClick={() => navigate({ to: '/dashboard' })}
              className={cn(
                "flex items-center min-w-0 flex-1 gap-3 cursor-pointer bg-transparent border-0 p-0",
                isRTL && "flex-row-reverse",
                isCollapsed && "md:w-full md:flex-none md:justify-center",
              )}
            >
              <span
                className={cn(
                  "flex flex-shrink-0 items-center justify-center",
                  isCollapsed &&
                    "md:mx-auto md:flex md:h-11 md:w-11 md:shrink-0 md:rounded-2xl md:bg-slate-50 dark:md:bg-slate-800",
                )}
              >
                <img
                  src="/assets/logo.png"
                  alt="AGROGINA"
                  className={cn(
                    "block flex-shrink-0 object-contain object-center",
                    isCollapsed ? "h-8 w-8 md:h-7 md:w-7" : "h-10 w-10 rounded-lg",
                  )}
                />
              </span>
              <div className={cn("min-w-0 flex-1", isCollapsed && "md:hidden")}>
                <h2 className="text-sm font-bold text-slate-900 dark:text-white truncate text-start">
                  {currentOrganization?.name || t("app.name")}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 text-start">
                  {appConfig.name} Platform
                </p>
              </div>
            </button>
            <div
              className={cn(
                "flex items-center gap-1",
                isRTL && "flex-row-reverse",
                isCollapsed && "md:hidden",
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden h-11 w-11"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 min-h-0 px-3">
          <nav
            className={cn(
              "space-y-1 py-4",
              isCollapsed && "md:flex md:flex-col md:items-center md:space-y-2",
              isRTL && "text-right",
            )}
            ref={(node) => {
              if (node) {
                const viewport = node.closest(
                  "[data-radix-scroll-area-viewport]",
                );
                if (viewport) {
                  scrollViewportRef.current = viewport as HTMLDivElement;
                  const saved = Number(
                    sessionStorage.getItem(SCROLL_STORAGE_KEY) || "0",
                  );
                  (viewport as HTMLDivElement).scrollTop = saved;
                }
              }
            }}
          >
            {/* ========== MAIN NAVIGATION ========== */}
            <div
              className={cn(
                "space-y-1",
                isCollapsed && "md:flex md:flex-col md:items-center md:space-y-2",
              )}
            >
              {/* Dashboard */}
              <ProtectedNavItem action="read" subject="Dashboard">
                <Button
                  variant="ghost"
                  data-tour="nav-dashboard"
                  className={getButtonClassName(currentPath === "/dashboard")}
                  onClick={(e) => handleNavigation("/dashboard", e)}
                  title={isCollapsed ? t("nav.dashboard") : undefined}
                >
                  {renderIcon(Home)}
                  {renderText(t("nav.dashboard"))}
                </Button>
              </ProtectedNavItem>

              {/* Farm Hierarchy */}
              <ProtectedNavItem action="read" subject="FarmHierarchy">
                <Button
                  variant="ghost"
                  data-tour="nav-farms"
                  className={getButtonClassName(
                    currentPath === "/farm-hierarchy",
                  )}
                  onClick={(e) => handleNavigation("/farm-hierarchy", e)}
                  title={isCollapsed ? t("nav.farmHierarchy") : undefined}
                >
                  {renderIcon(Network)}
                  {renderText(t("nav.farmHierarchy"))}
                </Button>
              </ProtectedNavItem>

              {/* Parcels */}
              <ProtectedNavItem action="read" subject="Parcel">
                <Button
                  variant="ghost"
                  data-tour="nav-parcels"
                  className={getButtonClassName(currentPath === "/parcels")}
                  onClick={(e) => handleNavigation("/parcels", e)}
                  title={isCollapsed ? t("nav.parcels") : undefined}
                >
                  {renderIcon(Map)}
                  {renderText(t("nav.parcels"))}
                </Button>
              </ProtectedNavItem>

              {/* Stock Management */}
              <div
                className={cn(
                  "space-y-1",
                  isCollapsed && "md:flex md:flex-col md:items-center md:space-y-2",
                )}
                data-tour="nav-stock"
              >
                {isCollapsed ? (
                  <div className="hidden md:flex md:justify-center">
                    <CollapsedSectionPopover
                      isRTL={isRTL}
                      icon={Package}
                      title={t("nav.stock")}
                    >
                      <ProtectedNavItem action="read" subject="Stock">
                        <PopoverNavItem onNavigate={handleNavigation}
                          path="/stock"
                          label={t("nav.overview")}
                          isActive={currentPath === "/stock"}
                        />
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Item">
                        <PopoverNavItem onNavigate={handleNavigation}
                          path="/stock/items"
                          label={t("nav.items")}
                          isActive={
                            currentPath === "/stock/items" ||
                            currentPath.startsWith("/stock/items")
                          }
                        />
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Warehouse">
                        <PopoverNavItem onNavigate={handleNavigation}
                          path="/stock/warehouses"
                          label={t("nav.warehouses")}
                          isActive={
                            currentPath === "/stock/warehouses" ||
                            currentPath.startsWith("/stock/warehouses")
                          }
                        />
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Supplier">
                        <PopoverNavItem onNavigate={handleNavigation}
                          path="/stock/suppliers"
                          label={t("nav.suppliers")}
                          isActive={
                            currentPath === "/stock/suppliers" ||
                            currentPath.startsWith("/stock/suppliers")
                          }
                        />
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Customer">
                        <PopoverNavItem onNavigate={handleNavigation}
                          path="/accounting/customers"
                          label={t("nav.customers")}
                          isActive={currentPath === "/accounting/customers"}
                        />
                      </ProtectedNavItem>
                    </CollapsedSectionPopover>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className={getSectionHeaderClassName()}
                      onClick={() =>
                        setShowStockManagement(!showStockManagement)
                      }
                    >
                      <div
                        className={cn(
                          "flex items-center",
                          isRTL && "flex-row-reverse",
                        )}
                      >
                        {renderIcon(Package)}
                        {renderSectionTitle(t("nav.stock"))}
                      </div>
                      {renderChevron(showStockManagement)}
                    </Button>
                    {showStockManagement && (
                      <>
                        <ProtectedNavItem action="read" subject="Stock">
                          <Button
                            variant="ghost"
                            className={getSubItemClassName(
                              currentPath === "/stock",
                            )}
                            onClick={(e) => handleNavigation("/stock", e)}
                          >
                            {renderText(t("nav.overview"))}
                          </Button>
                        </ProtectedNavItem>
                        <ProtectedNavItem action="read" subject="Item">
                          <Button
                            variant="ghost"
                            className={getSubItemClassName(
                              currentPath === "/stock/items" ||
                                currentPath.startsWith("/stock/items"),
                            )}
                            onClick={(e) => handleNavigation("/stock/items", e)}
                          >
                            {renderText(t("nav.items"))}
                          </Button>
                        </ProtectedNavItem>
                        <ProtectedNavItem action="read" subject="Warehouse">
                          <Button
                            variant="ghost"
                            className={getSubItemClassName(
                              currentPath === "/stock/warehouses" ||
                                currentPath.startsWith("/stock/warehouses"),
                            )}
                            onClick={(e) =>
                              handleNavigation("/stock/warehouses", e)
                            }
                          >
                            {renderText(t("nav.warehouses"))}
                          </Button>
                        </ProtectedNavItem>
                        <ProtectedNavItem action="read" subject="Supplier">
                          <Button
                            variant="ghost"
                            className={getSubItemClassName(
                              currentPath === "/stock/suppliers" ||
                                currentPath.startsWith("/stock/suppliers"),
                            )}
                            onClick={(e) =>
                              handleNavigation("/stock/suppliers", e)
                            }
                          >
                            {renderText(t("nav.suppliers"))}
                          </Button>
                        </ProtectedNavItem>
                        <ProtectedNavItem action="read" subject="Customer">
                          <Button
                            variant="ghost"
                            className={getSubItemClassName(
                              currentPath === "/accounting/customers",
                            )}
                            onClick={(e) =>
                              handleNavigation("/accounting/customers", e)
                            }
                          >
                            {renderText(t("nav.customers"))}
                          </Button>
                        </ProtectedNavItem>
                      </>
                    )}
                  </>
                )}
              </div>

              {/* Infrastructure & Equipment */}
              <ProtectedNavItem action="read" subject="Infrastructure">
                <Button
                  variant="ghost"
                  data-tour="nav-infrastructure"
                  className={getButtonClassName(
                    currentPath === "/infrastructure",
                  )}
                  onClick={(e) => handleNavigation("/infrastructure", e)}
                  title={isCollapsed ? t("nav.infrastructureEquipment") : undefined}
                >
                  {renderIcon(Building2)}
                  {renderText(t("nav.infrastructureEquipment", "Infrastructure & Equipment"))}
                </Button>
              </ProtectedNavItem>

              {/* AI Chat — gated on analytics module */}
              {isRouteEnabled('/chat') && <ProtectedNavItem action="read" subject="Chat">
                <Button
                  variant="ghost"
                  data-tour="nav-chat"
                  className={getButtonClassName(currentPath === "/chat")}
                  onClick={(e) => handleNavigation("/chat", e)}
                  title={isCollapsed ? t("nav.chat") : undefined}
                >
                  {renderIcon(Bot)}
                  {renderText(t("nav.chat"))}
                </Button>
              </ProtectedNavItem>}
            </div>

            {/* ========== PERSONNEL SECTION ========== */}
            <Separator
              className={cn(
                "my-3 opacity-50",
                isCollapsed && "md:self-stretch",
              )}
            />
            <div
              className={cn(
                  "space-y-1",
                  isCollapsed && "md:flex md:flex-col md:items-center md:space-y-2",
                )}
              data-tour="nav-personnel"
            >
              {isCollapsed ? (
                <div className="hidden md:flex md:justify-center">
                  <CollapsedSectionPopover
                    isRTL={isRTL}
                    icon={Users}
                    title={t("nav.personnel")}
                  >
                    <ProtectedNavItem action="read" subject="Worker">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/workers"
                        label={t("nav.workers")}
                        isActive={currentPath === "/workers"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Task">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/tasks"
                        label={t("nav.tasks")}
                        isActive={currentPath === "/tasks"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Payment">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/workforce/payments"
                        label={t("nav.paymentRecords", "Payment Records")}
                        isActive={currentPath === "/workforce/payments"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="LeaveApplication">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/workforce/leave-applications"
                        label={t("nav.leaveApplications", "Leave Applications")}
                        isActive={currentPath === "/workforce/leave-applications"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="LeaveAllocation">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/workforce/leave-allocations"
                        label={t("nav.leaveAllocations", "Leave Allocations")}
                        isActive={currentPath === "/workforce/leave-allocations"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="manage" subject="LeaveType">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/workforce/leave-types"
                        label={t("nav.leaveTypes", "Leave Types")}
                        isActive={currentPath === "/workforce/leave-types"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Holiday">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/workforce/holidays"
                        label={t("nav.holidays", "Holidays")}
                        isActive={currentPath === "/workforce/holidays"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="SalaryStructure">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/workforce/salary-structures"
                        label={t("nav.salaryStructures", "Salary Structures")}
                        isActive={currentPath === "/workforce/salary-structures"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="PayrollRun">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/workforce/payroll-runs"
                        label={t("nav.payrollRuns", "Payroll Runs")}
                        isActive={currentPath === "/workforce/payroll-runs"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="SalarySlip">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/workforce/salary-slips"
                        label={t("nav.salarySlips", "Salary Slips")}
                        isActive={currentPath === "/workforce/salary-slips"}
                      />
                    </ProtectedNavItem>
                  </CollapsedSectionPopover>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className={getSectionHeaderClassName()}
                    onClick={() => setShowPersonnel(!showPersonnel)}
                  >
                    <div
                      className={cn(
                        "flex items-center",
                        isRTL && "flex-row-reverse",
                      )}
                    >
                      {renderIcon(Users)}
                      {renderSectionTitle(t("nav.personnel"))}
                    </div>
                    {renderChevron(showPersonnel)}
                  </Button>
                  {showPersonnel && (
                    <>
                      <ProtectedNavItem action="read" subject="Worker">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/workers",
                          )}
                          onClick={(e) => handleNavigation("/workers", e)}
                        >
                          {renderText(t("nav.workers"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Task">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/tasks",
                          )}
                          onClick={(e) => handleNavigation("/tasks", e)}
                        >
                          {renderText(t("nav.tasks"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Payment">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/workforce/payments",
                          )}
                          onClick={(e) => handleNavigation("/workforce/payments", e)}
                        >
                          {renderText(t("nav.paymentRecords", "Payment Records"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="LeaveApplication">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/workforce/leave-applications",
                          )}
                          onClick={(e) => handleNavigation("/workforce/leave-applications", e)}
                        >
                          {renderText(t("nav.leaveApplications", "Leave Applications"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="LeaveAllocation">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/workforce/leave-allocations",
                          )}
                          onClick={(e) => handleNavigation("/workforce/leave-allocations", e)}
                        >
                          {renderText(t("nav.leaveAllocations", "Leave Allocations"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="manage" subject="LeaveType">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/workforce/leave-types",
                          )}
                          onClick={(e) => handleNavigation("/workforce/leave-types", e)}
                        >
                          {renderText(t("nav.leaveTypes", "Leave Types"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Holiday">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/workforce/holidays",
                          )}
                          onClick={(e) => handleNavigation("/workforce/holidays", e)}
                        >
                          {renderText(t("nav.holidays", "Holidays"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="SalaryStructure">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/workforce/salary-structures",
                          )}
                          onClick={(e) => handleNavigation("/workforce/salary-structures", e)}
                        >
                          {renderText(t("nav.salaryStructures", "Salary Structures"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="PayrollRun">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/workforce/payroll-runs",
                          )}
                          onClick={(e) => handleNavigation("/workforce/payroll-runs", e)}
                        >
                          {renderText(t("nav.payrollRuns", "Payroll Runs"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="SalarySlip">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/workforce/salary-slips",
                          )}
                          onClick={(e) => handleNavigation("/workforce/salary-slips", e)}
                        >
                          {renderText(t("nav.salarySlips", "Salary Slips"))}
                        </Button>
                      </ProtectedNavItem>
                    </>
                  )}
                </>
              )}
            </div>

            {/* ========== PRODUCTION SECTION ========== */}
            <Separator
              className={cn(
                "my-3 opacity-50",
                isCollapsed && "md:self-stretch",
              )}
            />
            <div
              className={cn(
                  "space-y-1",
                  isCollapsed && "md:flex md:flex-col md:items-center md:space-y-2",
                )}
              data-tour="nav-production"
            >
              {isCollapsed ? (
                <div className="hidden md:flex md:justify-center">
                  <CollapsedSectionPopover
                    isRTL={isRTL}
                    icon={Wheat}
                    title={t("nav.production")}
                  >
                    <ProtectedNavItem action="read" subject="Campaign">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/campaigns"
                        label={t("nav.campaigns", "Campaigns")}
                        isActive={currentPath === "/campaigns"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="CropCycle">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/crop-cycles"
                        label={t("nav.cropCycles", "Crop Cycles")}
                        isActive={currentPath === "/crop-cycles"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Harvest">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/harvests"
                        label={t("nav.harvests")}
                        isActive={currentPath === "/harvests"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="ReceptionBatch">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/reception-batches"
                        label={t("nav.receptionBatches")}
                        isActive={currentPath === "/reception-batches"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="ReceptionBatch">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/quality-control"
                        label={t("nav.qualityControl")}
                        isActive={currentPath === "/quality-control"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="BiologicalAsset">
                       <PopoverNavItem onNavigate={handleNavigation}
                        path="/biological-assets"
                        label={t("nav.biologicalAssets", "Biological Assets")}
                        isActive={currentPath === "/biological-assets"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Stock">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/product-applications"
                        label={t("nav.productApplications", "Product Applications")}
                        isActive={currentPath === "/product-applications"}
                      />
                    </ProtectedNavItem>
                  </CollapsedSectionPopover>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className={getSectionHeaderClassName()}
                    onClick={() => setShowProduction(!showProduction)}
                  >
                    <div
                      className={cn(
                        "flex items-center",
                        isRTL && "flex-row-reverse",
                      )}
                    >
                      {renderIcon(Wheat)}
                      {renderSectionTitle(t("nav.production"))}
                    </div>
                    {renderChevron(showProduction)}
                  </Button>
                  {showProduction && (
                    <>
                      <ProtectedNavItem action="read" subject="Campaign">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/campaigns",
                          )}
                          onClick={(e) => handleNavigation("/campaigns", e)}
                          data-tour="nav-campaigns"
                        >
                          {renderText(t("nav.campaigns", "Campaigns"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="CropCycle">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/crop-cycles",
                          )}
                          onClick={(e) => handleNavigation("/crop-cycles", e)}
                          data-tour="nav-crop-cycles"
                        >
                          {renderText(t("nav.cropCycles", "Crop Cycles"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Harvest">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/harvests",
                          )}
                          onClick={(e) => handleNavigation("/harvests", e)}
                          data-tour="nav-harvests"
                        >
                          {renderText(t("nav.harvests"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="ReceptionBatch">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/reception-batches",
                          )}
                          onClick={(e) =>
                            handleNavigation("/reception-batches", e)
                          }
                          data-tour="nav-reception-batches"
                        >
                          {renderText(t("nav.receptionBatches"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="ReceptionBatch">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/quality-control",
                          )}
                          onClick={(e) =>
                            handleNavigation("/quality-control", e)
                          }
                          data-tour="nav-quality-control"
                        >
                          {renderText(t("nav.qualityControl"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="BiologicalAsset">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/biological-assets",
                          )}
                          onClick={(e) =>
                            handleNavigation("/biological-assets", e)
                          }
                          data-tour="nav-biological-assets"
                        >
                          {renderText(t("nav.biologicalAssets", "Biological Assets"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Stock">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/product-applications",
                          )}
                          onClick={(e) =>
                            handleNavigation("/product-applications", e)
                          }
                          data-tour="nav-product-applications"
                        >
                          {renderText(t("nav.productApplications", "Product Applications"))}
                        </Button>
                      </ProtectedNavItem>
                    </>
                  )}
                </>
              )}
            </div>

            {/* ========== COMPLIANCE SECTION ========== */}
            {isRouteEnabled('/compliance') && <>
            <Separator
              className={cn(
                "my-3 opacity-50",
                isCollapsed && "md:self-stretch",
              )}
            />
            <div
              className={cn(
                  "space-y-1",
                  isCollapsed && "md:flex md:flex-col md:items-center md:space-y-2",
                )}
              data-tour="nav-compliance"
            >
              {isCollapsed ? (
                <div className="hidden md:flex md:justify-center">
                  <CollapsedSectionPopover
                    isRTL={isRTL}
                    icon={ShieldCheck}
                    title={t("nav.compliance")}
                  >
                    <ProtectedNavItem action="read" subject="Certification">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/compliance"
                        label={t("nav.overview")}
                        isActive={currentPath === "/compliance"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Certification">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/compliance/certifications"
                        label={t("nav.certifications")}
                        isActive={currentPath === "/compliance/certifications"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Certification">
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/compliance/corrective-actions"
                        label={t(
                          "nav.correctiveActions",
                          "Actions correctives",
                        )}
                        isActive={
                          currentPath === "/compliance/corrective-actions"
                        }
                      />
                    </ProtectedNavItem>
                  </CollapsedSectionPopover>
                </div>
              ) : (
                <>
                  <Button
                    variant="ghost"
                    className={getSectionHeaderClassName()}
                    onClick={() => setShowCompliance(!showCompliance)}
                  >
                    <div
                      className={cn(
                        "flex items-center",
                        isRTL && "flex-row-reverse",
                      )}
                    >
                      {renderIcon(ShieldCheck)}
                      {renderSectionTitle(t("nav.compliance"))}
                    </div>
                    {renderChevron(showCompliance)}
                  </Button>
                  {showCompliance && (
                    <>
                      <ProtectedNavItem action="read" subject="Certification">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/compliance",
                          )}
                          onClick={(e) => handleNavigation("/compliance", e)}
                        >
                          {renderText(t("nav.overview"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Certification">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/compliance/certifications",
                          )}
                          onClick={(e) =>
                            handleNavigation("/compliance/certifications", e)
                          }
                        >
                          {renderText(t("nav.certifications"))}
                        </Button>
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Certification">
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/compliance/corrective-actions",
                          )}
                          onClick={(e) =>
                            handleNavigation(
                              "/compliance/corrective-actions",
                              e,
                            )
                          }
                        >
                          {renderText(
                            t("nav.correctiveActions", "Actions correctives"),
                          )}
                        </Button>
                      </ProtectedNavItem>
                    </>
                  )}
                </>
              )}
            </div>
            </>}

            {/* ========== SALES & PURCHASING SECTION ========== */}
            <ProtectedNavItem action="read" subject="Invoice">
              <Separator
                className={cn(
                  "my-3 opacity-50",
                  isCollapsed && "md:self-stretch",
                )}
              />
              <div
                className={cn(
                  "space-y-1",
                  isCollapsed && "md:flex md:flex-col md:items-center md:space-y-2",
                )}
                data-tour="nav-billing"
              >
                {isCollapsed ? (
                  <div className="hidden md:flex md:justify-center">
                    <CollapsedSectionPopover
                      isRTL={isRTL}
                      icon={ShoppingCart}
                      title={t("nav.salesPurchasing")}
                    >
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting/quotes"
                        label={t("nav.quotes")}
                        isActive={currentPath === "/accounting/quotes"}
                      />
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting/sales-orders"
                        label={t("nav.salesOrders")}
                        isActive={currentPath === "/accounting/sales-orders"}
                      />
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting/purchase-orders"
                        label={t("nav.purchaseOrders")}
                        isActive={currentPath === "/accounting/purchase-orders"}
                      />
                    </CollapsedSectionPopover>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className={getSectionHeaderClassName()}
                      onClick={() =>
                        setShowSalesPurchasing(!showSalesPurchasing)
                      }
                    >
                      <div
                        className={cn(
                          "flex items-center",
                          isRTL && "flex-row-reverse",
                        )}
                      >
                        {renderIcon(ShoppingCart)}
                        {renderSectionTitle(t("nav.salesPurchasing"))}
                      </div>
                      {renderChevron(showSalesPurchasing)}
                    </Button>
                    {showSalesPurchasing && (
                      <>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting/quotes",
                          )}
                          onClick={(e) =>
                            handleNavigation("/accounting/quotes", e)
                          }
                        >
                          {renderText(t("nav.quotes"))}
                        </Button>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting/sales-orders",
                          )}
                          onClick={(e) =>
                            handleNavigation("/accounting/sales-orders", e)
                          }
                        >
                          {renderText(t("nav.salesOrders"))}
                        </Button>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting/purchase-orders",
                          )}
                          onClick={(e) =>
                            handleNavigation("/accounting/purchase-orders", e)
                          }
                        >
                          {renderText(t("nav.purchaseOrders"))}
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </ProtectedNavItem>

            {/* ========== ACCOUNTING SECTION ========== */}
            <Separator
              className={cn(
                "my-3 opacity-50",
                isCollapsed && "md:self-stretch",
              )}
            />
            <ProtectedNavItem action="read" subject="Invoice">
              <div
                className={cn(
                  "space-y-1",
                  isCollapsed && "md:flex md:flex-col md:items-center md:space-y-2",
                )}
                data-tour="nav-accounting"
              >
                {isCollapsed ? (
                  <div className="hidden md:flex md:justify-center">
                    <CollapsedSectionPopover
                      isRTL={isRTL}
                      icon={BookOpen}
                      title={t("nav.accounting")}
                    >
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting"
                        label={t("nav.overview")}
                        isActive={currentPath === "/accounting"}
                      />
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting/accounts"
                        label={t("nav.chartOfAccounts")}
                        isActive={currentPath === "/accounting/accounts"}
                      />
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting/fiscal-years"
                        label={t("nav.fiscalYears", "Fiscal Years")}
                        isActive={currentPath === "/accounting/fiscal-years"}
                      />
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting/cost-centers"
                        label={t("nav.costCenters", "Cost Centers")}
                        isActive={currentPath === "/accounting/cost-centers"}
                      />
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting/account-mappings"
                        label={t("nav.accountMappings", "Account Mappings")}
                        isActive={currentPath === "/accounting/account-mappings"}
                      />
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting/invoices"
                        label={t("nav.invoices")}
                        isActive={currentPath === "/accounting/invoices"}
                      />
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting/payments"
                        label={t("nav.payments")}
                        isActive={currentPath === "/accounting/payments"}
                      />
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/accounting/journal"
                        label={t("nav.journal")}
                        isActive={currentPath === "/accounting/journal"}
                      />
                      <ProtectedNavItem action="read" subject="Utility">
                        <PopoverNavItem onNavigate={handleNavigation}
                          path="/utilities"
                          label={t("nav.expenses")}
                          isActive={currentPath === "/utilities"}
                        />
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="BankAccount">
                        <PopoverNavItem onNavigate={handleNavigation}
                          path="/accounting/bank-accounts"
                          label={t("nav.bankAccounts", "Bank Accounts")}
                          isActive={currentPath === "/accounting/bank-accounts"}
                        />
                      </ProtectedNavItem>
                    </CollapsedSectionPopover>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className={getSectionHeaderClassName()}
                      onClick={() => setShowAccounting(!showAccounting)}
                    >
                      <div
                        className={cn(
                          "flex items-center",
                          isRTL && "flex-row-reverse",
                        )}
                      >
                        {renderIcon(BookOpen)}
                        {renderSectionTitle(t("nav.accounting"))}
                      </div>
                      {renderChevron(showAccounting)}
                    </Button>
                    {showAccounting && (
                      <>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting",
                          )}
                          onClick={(e) => handleNavigation("/accounting", e)}
                        >
                          {renderText(t("nav.overview"))}
                        </Button>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting/accounts",
                          )}
                          onClick={(e) =>
                            handleNavigation("/accounting/accounts", e)
                          }
                        >
                          {renderText(t("nav.chartOfAccounts"))}
                        </Button>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting/fiscal-years",
                          )}
                          onClick={(e) =>
                            handleNavigation("/accounting/fiscal-years", e)
                          }
                        >
                          {renderText(t("nav.fiscalYears", "Fiscal Years"))}
                        </Button>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting/cost-centers",
                          )}
                          onClick={(e) =>
                            handleNavigation("/accounting/cost-centers", e)
                          }
                        >
                          {renderText(t("nav.costCenters", "Cost Centers"))}
                        </Button>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting/account-mappings",
                          )}
                          onClick={(e) =>
                            handleNavigation("/accounting/account-mappings", e)
                          }
                        >
                          {renderText(t("nav.accountMappings", "Account Mappings"))}
                        </Button>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting/invoices",
                          )}
                          onClick={(e) =>
                            handleNavigation("/accounting/invoices", e)
                          }
                        >
                          {renderText(t("nav.invoices"))}
                        </Button>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting/payments",
                          )}
                          onClick={(e) =>
                            handleNavigation("/accounting/payments", e)
                          }
                        >
                          {renderText(t("nav.payments"))}
                        </Button>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/accounting/journal",
                          )}
                          onClick={(e) =>
                            handleNavigation("/accounting/journal", e)
                          }
                        >
                          {renderText(t("nav.journal"))}
                        </Button>
                        <ProtectedNavItem action="read" subject="Utility">
                          <Button
                            variant="ghost"
                            className={getSubItemClassName(
                              currentPath === "/utilities",
                            )}
                            onClick={(e) => handleNavigation("/utilities", e)}
                          >
                            {renderText(t("nav.expenses"))}
                          </Button>
                        </ProtectedNavItem>
                        <ProtectedNavItem action="read" subject="BankAccount">
                          <Button
                            variant="ghost"
                            className={getSubItemClassName(
                              currentPath === "/accounting/bank-accounts",
                            )}
                            onClick={(e) =>
                              handleNavigation("/accounting/bank-accounts", e)
                            }
                          >
                            {renderText(t("nav.bankAccounts", "Bank Accounts"))}
                          </Button>
                        </ProtectedNavItem>
                      </>
                    )}
                  </>
                )}
              </div>
            </ProtectedNavItem>

            {/* ========== MARKETPLACE — gated on marketplace module ========== */}
            {isRouteEnabled('/marketplace') && <ProtectedNavItem action="read" subject="Invoice">
              <Separator
                className={cn(
                  "my-3 opacity-50",
                  isCollapsed && "md:self-stretch",
                )}
              />
              <div
                className={cn(
                  "space-y-1",
                  isCollapsed && "md:flex md:flex-col md:items-center md:space-y-2",
                )}
              >
                {isCollapsed ? (
                  <div className="hidden md:flex md:justify-center">
                    <CollapsedSectionPopover
                      isRTL={isRTL}
                      icon={ShoppingBag}
                      title={t("nav.marketplace")}
                    >
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/marketplace/quote-requests/received"
                        label={t("nav.receivedRequests")}
                        isActive={
                          currentPath === "/marketplace/quote-requests/received"
                        }
                      />
                      <PopoverNavItem onNavigate={handleNavigation}
                        path="/marketplace/quote-requests/sent"
                        label={t("nav.sentRequests")}
                        isActive={
                          currentPath === "/marketplace/quote-requests/sent"
                        }
                      />
                      <Button
                        onClick={async () => {
                          const url = await getMarketplaceUrl("/");
                          window.open(url, "_blank", "noopener,noreferrer");
                        }}
                        className="block w-full text-left"
                      >
                        <Button
                          variant="ghost"
                          className={cn(
                            "w-full h-8 justify-start text-sm text-slate-900 dark:text-slate-100 group",
                          )}
                        >
                          <div className="flex items-center w-full">
                            <span className="flex-1">{t("nav.viewMarketplace")}</span>
                            <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </Button>
                      </Button>
                    </CollapsedSectionPopover>
                  </div>
                ) : (
                  <>
                    <Button
                      variant="ghost"
                      className={getSectionHeaderClassName()}
                      onClick={() => setShowMarketplace(!showMarketplace)}
                    >
                      <div
                        className={cn(
                          "flex items-center",
                          isRTL && "flex-row-reverse",
                        )}
                      >
                        {renderIcon(ShoppingBag)}
                        {renderSectionTitle(t("nav.marketplace"))}
                      </div>
                      {renderChevron(showMarketplace)}
                    </Button>
                    {showMarketplace && (
                      <>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath ===
                              "/marketplace/quote-requests/received",
                          )}
                          onClick={(e) =>
                            handleNavigation(
                              "/marketplace/quote-requests/received",
                              e,
                            )
                          }
                        >
                          {renderText(t("nav.receivedRequests"))}
                        </Button>
                        <Button
                          variant="ghost"
                          className={getSubItemClassName(
                            currentPath === "/marketplace/quote-requests/sent",
                          )}
                          onClick={(e) =>
                            handleNavigation(
                              "/marketplace/quote-requests/sent",
                              e,
                            )
                          }
                        >
                          {renderText(t("nav.sentRequests"))}
                        </Button>
                        <Button
                          onClick={async () => {
                            const url = await getMarketplaceUrl("/");
                            window.open(url, "_blank", "noopener,noreferrer");
                          }}
                          className="block w-full text-left"
                        >
                          <Button
                            variant="ghost"
                            className={cn(getSubItemClassName(false), "group")}
                          >
                            <div
                              className={cn(
                                "flex items-center w-full",
                                isRTL && "flex-row-reverse",
                              )}
                            >
                              <span className="flex-1">
                                {renderText(t("nav.viewMarketplace"))}
                              </span>
                              <ExternalLink className="h-3.5 w-3.5 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </Button>
                        </Button>
                      </>
                    )}
                  </>
                )}
              </div>
            </ProtectedNavItem>}
          </nav>
        </ScrollArea>

        {/* ========== FOOTER ========== */}
        <div
          className={cn(
            "flex-shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-1",
            isCollapsed && "md:flex md:flex-col md:items-center md:space-y-2",
            isCollapsed ? "md:p-2 p-3" : "p-3",
          )}
        >
          <ProtectedNavItem action="read" subject="Report">
            <Button
              variant="ghost"
              data-tour="nav-reports"
              className={getButtonClassName(
                currentPath === "/reports" ||
                  currentPath === "/accounting/reports",
              )}
              onClick={(e) => handleNavigation("/accounting/reports", e)}
              title={isCollapsed ? t("nav.reports") : undefined}
            >
              {renderIcon(BarChart3)}
              {renderText(t("nav.reports"))}
            </Button>
          </ProtectedNavItem>

          <Separator
            className={cn(
              "my-2 opacity-50",
              isCollapsed && "md:self-stretch",
            )}
          />

          <Button
            variant="ghost"
            className={getButtonClassName(
              false,
              "hover:text-slate-900 dark:hover:text-slate-100",
            )}
            onClick={onThemeToggle}
            title={
              isCollapsed
                ? isDarkMode
                  ? t("app.lightMode")
                  : t("app.darkMode")
                : undefined
            }
          >
            {isDarkMode ? renderIcon(Sun) : renderIcon(Moon)}
            {renderText(isDarkMode ? t("app.lightMode") : t("app.darkMode"))}
          </Button>

          {/* Collapse Toggle Button - Desktop only */}
          <Button
            variant="ghost"
            className={cn(
              "hidden md:flex text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100",
              isCollapsed
                ? "h-10 w-10 shrink-0 rounded-xl justify-center hover:bg-slate-50 dark:hover:bg-slate-800 md:mx-auto"
                : "h-9 w-full justify-start",
            )}
            onClick={toggleCollapse}
            title={
              isCollapsed
                ? t("sidebar.expand", "Expand sidebar")
                : t("sidebar.collapse", "Collapse sidebar")
            }
          >
            {isCollapsed ? (
              <PanelLeft className="h-5 w-5" />
            ) : (
              <>
                <PanelLeftClose
                  className={cn(
                    "h-4 w-4 flex-shrink-0",
                    isRTL ? "ml-3" : "mr-3",
                  )}
                />
                <span className="flex-1 text-left">
                  {t("sidebar.collapse", "Collapse")}
                </span>
              </>
            )}
          </Button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
