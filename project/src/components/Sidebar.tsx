import React, { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  Home,
  Leaf,
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
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";

interface SidebarProps {
  modules: Module[];
  activeModule: string;
  onModuleChange: (moduleId: string) => void;
  isDarkMode: boolean;
  onThemeToggle: () => void;
}

const SIDEBAR_COLLAPSED_KEY = "sidebarCollapsed";

const Sidebar: React.FC<SidebarProps> = ({
  modules: _modules,
  onModuleChange,
  isDarkMode,
  onThemeToggle,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation("common");
  const { currentOrganization } = useAuth();
  const isRTL = isRTLLocale(i18n.language);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === "true";
  });

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
    getInitialSectionState(["/workers", "/tasks"]),
  );
  const [showProduction, setShowProduction] = useState(() =>
    getInitialSectionState([
      "/campaigns",
      "/crop-cycles",
      "/harvests",
      "/reception-batches",
      "/quality-control",
      "/biological-assets",
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
      "/accounting/invoices",
      "/accounting/payments",
      "/accounting/journal",
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
    // Personnel section
    if (
      ["/workers", "/tasks"].some(
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

  const getButtonClassName = (
    isActive: boolean,
    additionalClasses?: string,
  ) => {
    return cn(
      "w-full text-gray-600 dark:text-gray-400 h-11 min-h-[44px]",
      isCollapsed
        ? "lg:justify-center lg:px-2"
        : isRTL
          ? "flex-row-reverse justify-end text-right"
          : "justify-start",
      isActive &&
        "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30",
      additionalClasses,
    );
  };

  const getSubItemClassName = (isActive: boolean) => {
    return cn(
      "w-full text-gray-600 dark:text-gray-400 h-10 min-h-[40px] text-sm",
      isCollapsed
        ? "lg:justify-center lg:px-2 lg:pl-2"
        : isRTL
          ? "flex-row-reverse justify-end text-right pr-8"
          : "justify-start pl-8",
      isActive &&
        "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-100 dark:hover:bg-green-900/30",
    );
  };

  const getSectionHeaderClassName = () => {
    return cn(
      "w-full justify-between px-3 h-11 min-h-[44px] text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50",
      isCollapsed && "lg:justify-center lg:px-2",
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
          isCollapsed ? "lg:mx-auto" : isRTL ? "ml-3" : "mr-3",
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
          isCollapsed && "lg:hidden",
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
          "h-4 w-4 flex-shrink-0 text-gray-400",
          isCollapsed && "lg:hidden",
        )}
      />
    ) : (
      <ChevronRight
        className={cn(
          "h-4 w-4 flex-shrink-0 text-gray-400",
          isCollapsed && "lg:hidden",
        )}
      />
    );
  };

  const renderSectionTitle = (text: string) => {
    return <span className={cn(isCollapsed && "lg:hidden")}>{text}</span>;
  };

  // Component for collapsed section with hover popover
  const CollapsedSectionPopover: React.FC<{
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    children: React.ReactNode;
  }> = ({ icon: Icon, title, children }) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              "w-full h-9 justify-center px-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50",
            )}
          >
            <Icon className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side={isRTL ? "left" : "right"}
          align="start"
          sideOffset={8}
          className="w-48 p-1 bg-white dark:bg-gray-800"
        >
          <div className="px-2 py-1.5 text-sm font-medium text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 mb-1">
            {title}
          </div>
          <div className="space-y-0.5">{children}</div>
        </PopoverContent>
      </Popover>
    );
  };

  // Submenu item for collapsed popover
  const PopoverNavItem: React.FC<{
    path: string;
    label: string;
    isActive: boolean;
  }> = ({ path, label, isActive }) => (
    <Button
      variant="ghost"
      className={cn(
        "w-full h-8 justify-start text-sm text-gray-600 dark:text-gray-400",
        isActive &&
          "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400",
      )}
      onClick={(e) => handleNavigation(path, e)}
    >
      {label}
    </Button>
  );

  return (
    <>
      {/* Overlay for mobile — only used if sidebar is somehow opened programmatically */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        data-tour="sidebar"
        className={cn(
          "fixed inset-y-0 z-50",
          isRTL ? "right-0 border-l" : "left-0 border-r",
          "h-screen bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 flex flex-col",
          "transform transition-all duration-300 ease-in-out",
          "hidden lg:flex",
          isCollapsed ? "lg:w-16" : "w-64",
        )}
        dir={isRTL ? "rtl" : "ltr"}
      >
        {/* Header */}
        <div
          className={cn(
            "flex-shrink-0 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800",
            isCollapsed ? "lg:p-2 p-4" : "p-4",
            isRTL && "text-right",
          )}
        >
          <div
            className={cn(
              "flex items-center gap-2",
              isRTL ? "flex-row-reverse" : "",
            )}
          >
            <div
              className={cn(
                "flex items-center min-w-0 flex-1 gap-3",
                isRTL && "flex-row-reverse",
                isCollapsed && "lg:justify-center",
              )}
            >
              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                <Leaf className="h-6 w-6 text-white" />
              </div>
              <div className={cn("min-w-0 flex-1", isCollapsed && "lg:hidden")}>
                <h2 className="text-sm font-bold text-gray-900 dark:text-white truncate text-start">
                  {currentOrganization?.name || t("app.name")}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400 text-start">
                  {appConfig.name} Platform
                </p>
              </div>
            </div>
            <div
              className={cn(
                "flex items-center gap-1",
                isRTL && "flex-row-reverse",
                isCollapsed && "lg:hidden",
              )}
            >
              <Button
                variant="ghost"
                size="icon"
                className="lg:hidden h-11 w-11"
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
            className={cn("space-y-1 py-4", isRTL && "text-right")}
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
            <div className="space-y-1">
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
              <div className="space-y-1" data-tour="nav-stock">
                {isCollapsed ? (
                  <div className="hidden lg:block">
                    <CollapsedSectionPopover
                      icon={Package}
                      title={t("nav.stock")}
                    >
                      <ProtectedNavItem action="read" subject="Stock">
                        <PopoverNavItem
                          path="/stock"
                          label={t("nav.overview")}
                          isActive={currentPath === "/stock"}
                        />
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Item">
                        <PopoverNavItem
                          path="/stock/items"
                          label={t("nav.items")}
                          isActive={
                            currentPath === "/stock/items" ||
                            currentPath.startsWith("/stock/items")
                          }
                        />
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Warehouse">
                        <PopoverNavItem
                          path="/stock/warehouses"
                          label={t("nav.warehouses")}
                          isActive={
                            currentPath === "/stock/warehouses" ||
                            currentPath.startsWith("/stock/warehouses")
                          }
                        />
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Supplier">
                        <PopoverNavItem
                          path="/stock/suppliers"
                          label={t("nav.suppliers")}
                          isActive={
                            currentPath === "/stock/suppliers" ||
                            currentPath.startsWith("/stock/suppliers")
                          }
                        />
                      </ProtectedNavItem>
                      <ProtectedNavItem action="read" subject="Customer">
                        <PopoverNavItem
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

              {/* Infrastructure */}
              <ProtectedNavItem action="read" subject="Infrastructure">
                <Button
                  variant="ghost"
                  data-tour="nav-infrastructure"
                  className={getButtonClassName(
                    currentPath === "/infrastructure",
                  )}
                  onClick={(e) => handleNavigation("/infrastructure", e)}
                  title={isCollapsed ? t("nav.infrastructure") : undefined}
                >
                  {renderIcon(Building2)}
                  {renderText(t("nav.infrastructure"))}
                </Button>
              </ProtectedNavItem>

              {/* AI Chat */}
              <ProtectedNavItem action="read" subject="Chat">
                <Button
                  variant="ghost"
                  className={getButtonClassName(currentPath === "/chat")}
                  onClick={(e) => handleNavigation("/chat", e)}
                  title={isCollapsed ? t("nav.chat") : undefined}
                >
                  {renderIcon(Bot)}
                  {renderText(t("nav.chat"))}
                </Button>
              </ProtectedNavItem>
            </div>

            {/* ========== PERSONNEL SECTION ========== */}
            <Separator className="my-3" />
            <div className="space-y-1" data-tour="nav-personnel">
              {isCollapsed ? (
                <div className="hidden lg:block">
                  <CollapsedSectionPopover
                    icon={Users}
                    title={t("nav.personnel")}
                  >
                    <ProtectedNavItem action="read" subject="Worker">
                      <PopoverNavItem
                        path="/workers"
                        label={t("nav.workers")}
                        isActive={currentPath === "/workers"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Task">
                      <PopoverNavItem
                        path="/tasks"
                        label={t("nav.tasks")}
                        isActive={currentPath === "/tasks"}
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
                    </>
                  )}
                </>
              )}
            </div>

            {/* ========== PRODUCTION SECTION ========== */}
            <Separator className="my-3" />
            <div className="space-y-1" data-tour="nav-production">
              {isCollapsed ? (
                <div className="hidden lg:block">
                  <CollapsedSectionPopover
                    icon={Wheat}
                    title={t("nav.production")}
                  >
                    <ProtectedNavItem action="read" subject="Campaign">
                      <PopoverNavItem
                        path="/campaigns"
                        label={t("nav.campaigns", "Campaigns")}
                        isActive={currentPath === "/campaigns"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="CropCycle">
                      <PopoverNavItem
                        path="/crop-cycles"
                        label={t("nav.cropCycles", "Crop Cycles")}
                        isActive={currentPath === "/crop-cycles"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Harvest">
                      <PopoverNavItem
                        path="/harvests"
                        label={t("nav.harvests")}
                        isActive={currentPath === "/harvests"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="ReceptionBatch">
                      <PopoverNavItem
                        path="/reception-batches"
                        label={t("nav.receptionBatches")}
                        isActive={currentPath === "/reception-batches"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="ReceptionBatch">
                      <PopoverNavItem
                        path="/quality-control"
                        label={t("nav.qualityControl")}
                        isActive={currentPath === "/quality-control"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="BiologicalAsset">
                      <PopoverNavItem
                        path="/biological-assets"
                        label={t("nav.biologicalAssets", "Biological Assets")}
                        isActive={currentPath === "/biological-assets"}
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
                        >
                          {renderText(t("nav.biologicalAssets", "Biological Assets"))}
                        </Button>
                      </ProtectedNavItem>
                    </>
                  )}
                </>
              )}
            </div>

            {/* ========== COMPLIANCE SECTION ========== */}
            <Separator className="my-3" />
            <div className="space-y-1" data-tour="nav-compliance">
              {isCollapsed ? (
                <div className="hidden lg:block">
                  <CollapsedSectionPopover
                    icon={ShieldCheck}
                    title={t("nav.compliance")}
                  >
                    <ProtectedNavItem action="read" subject="Certification">
                      <PopoverNavItem
                        path="/compliance"
                        label={t("nav.overview")}
                        isActive={currentPath === "/compliance"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Certification">
                      <PopoverNavItem
                        path="/compliance/certifications"
                        label={t("nav.certifications")}
                        isActive={currentPath === "/compliance/certifications"}
                      />
                    </ProtectedNavItem>
                    <ProtectedNavItem action="read" subject="Certification">
                      <PopoverNavItem
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

            {/* ========== SALES & PURCHASING SECTION ========== */}
            <ProtectedNavItem action="read" subject="Invoice">
              <Separator className="my-3" />
              <div className="space-y-1" data-tour="nav-billing">
                {isCollapsed ? (
                  <div className="hidden lg:block">
                    <CollapsedSectionPopover
                      icon={ShoppingCart}
                      title={t("nav.salesPurchasing")}
                    >
                      <PopoverNavItem
                        path="/accounting/quotes"
                        label={t("nav.quotes")}
                        isActive={currentPath === "/accounting/quotes"}
                      />
                      <PopoverNavItem
                        path="/accounting/sales-orders"
                        label={t("nav.salesOrders")}
                        isActive={currentPath === "/accounting/sales-orders"}
                      />
                      <PopoverNavItem
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
            <Separator className="my-3" />
            <ProtectedNavItem action="read" subject="Invoice">
              <div className="space-y-1" data-tour="nav-accounting">
                {isCollapsed ? (
                  <div className="hidden lg:block">
                    <CollapsedSectionPopover
                      icon={BookOpen}
                      title={t("nav.accounting")}
                    >
                      <PopoverNavItem
                        path="/accounting"
                        label={t("nav.overview")}
                        isActive={currentPath === "/accounting"}
                      />
                      <PopoverNavItem
                        path="/accounting/accounts"
                        label={t("nav.chartOfAccounts")}
                        isActive={currentPath === "/accounting/accounts"}
                      />
                      <PopoverNavItem
                        path="/accounting/invoices"
                        label={t("nav.invoices")}
                        isActive={currentPath === "/accounting/invoices"}
                      />
                      <PopoverNavItem
                        path="/accounting/payments"
                        label={t("nav.payments")}
                        isActive={currentPath === "/accounting/payments"}
                      />
                      <PopoverNavItem
                        path="/accounting/journal"
                        label={t("nav.journal")}
                        isActive={currentPath === "/accounting/journal"}
                      />
                      <ProtectedNavItem action="read" subject="Utility">
                        <PopoverNavItem
                          path="/utilities"
                          label={t("nav.expenses")}
                          isActive={currentPath === "/utilities"}
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
                      </>
                    )}
                  </>
                )}
              </div>
            </ProtectedNavItem>

            {/* ========== MARKETPLACE ========== */}
            <ProtectedNavItem action="read" subject="Invoice">
              <Separator className="my-3" />
              <div className="space-y-1">
                {isCollapsed ? (
                  <div className="hidden lg:block">
                    <CollapsedSectionPopover
                      icon={ShoppingBag}
                      title={t("nav.marketplace")}
                    >
                      <PopoverNavItem
                        path="/marketplace/quote-requests/received"
                        label={t("nav.receivedRequests")}
                        isActive={
                          currentPath === "/marketplace/quote-requests/received"
                        }
                      />
                      <PopoverNavItem
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
                            "w-full h-8 justify-start text-sm text-gray-600 dark:text-gray-400 group",
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
            </ProtectedNavItem>
          </nav>
        </ScrollArea>

        {/* ========== FOOTER ========== */}
        <div
          className={cn(
            "flex-shrink-0 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-1",
            isCollapsed ? "lg:p-2 p-3" : "p-3",
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

          <Separator className="my-2" />

          <Button
            variant="ghost"
            className={getButtonClassName(
              false,
              "hover:text-gray-900 dark:hover:text-gray-100",
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
              "w-full h-9 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hidden lg:flex",
              isCollapsed ? "justify-center" : "justify-start",
            )}
            onClick={toggleCollapse}
            title={
              isCollapsed
                ? t("sidebar.expand", "Expand sidebar")
                : t("sidebar.collapse", "Collapse sidebar")
            }
          >
            {isCollapsed ? (
              <PanelLeft className="h-4 w-4" />
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
