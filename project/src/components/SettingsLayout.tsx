import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Building,
  Boxes,
  Users,
  LayoutGrid,
  CreditCard,
  User,
  FileText,
  Package,
  Menu,
  X,
  ArrowLeft,
  FolderTree,
  Link2,
  AlertTriangle,
  HardDrive,
  Calendar,
  Brain,
  PanelLeftClose,
  PanelLeft,
  ChevronDown,
  Home,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { Separator } from "./ui/separator";
import { Button } from "./ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { ALL_ROLES, ADMIN_ROLES, ADMIN_AND_MANAGER_ROLES } from "../types/auth";
import type { RoleName } from "../types/auth";
import { cn } from "../lib/utils";
import { useSidebarCollapsed } from "../hooks/useSidebarLayout";

interface SettingsMenuItem {
  id: string;
  name: string;
  icon: LucideIcon;
  path: string;
  description: string;
  roles: RoleName[];
}

interface SettingsSection {
  id: string;
  label: string;
  items: SettingsMenuItem[];
}

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const SETTINGS_COLLAPSED_KEY = "settingsSidebarCollapsed";
const SETTINGS_SECTIONS_COLLAPSED_KEY = "settingsSectionsCollapsed";

function loadCollapsedSectionIds(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(SETTINGS_SECTIONS_COLLAPSED_KEY);
    if (raw) return new Set(JSON.parse(raw) as string[]);
  } catch {
    /* ignore */
  }
  return new Set();
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const mainSidebarCollapsed = useSidebarCollapsed();
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_COLLAPSED_KEY);
    return saved === "true";
  });
  const bothRailsCollapsed = mainSidebarCollapsed && isCollapsed;
  const [collapsedSectionIds, setCollapsedSectionIds] = useState<Set<string>>(
    loadCollapsedSectionIds,
  );

  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(SETTINGS_COLLAPSED_KEY, String(newValue));
    window.dispatchEvent(
      new CustomEvent("settingsSidebarCollapse", {
        detail: { collapsed: newValue },
      }),
    );
  };

  const toggleSectionOpen = (sectionId: string) => {
    setCollapsedSectionIds((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      try {
        localStorage.setItem(
          SETTINGS_SECTIONS_COLLAPSED_KEY,
          JSON.stringify([...next]),
        );
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  const isSectionExpanded = (sectionId: string) =>
    !collapsedSectionIds.has(sectionId);

  useEffect(() => {
    const el =
      document.querySelector("[data-settings-content-scroll]") ??
      document.querySelector("[data-main-scroll]");
    el?.scrollTo({ top: 0 });
  }, [location.pathname]);

  // Define menu sections with grouped items
  const allSections: SettingsSection[] = useMemo(
    () => [
      {
        id: "personal",
        label: t("settings.menu.sections.personal"),
        items: [
          {
            id: "account",
            name: t("settings.menu.account", t("settings.menu.profile")),
            icon: User,
            path: "/settings/account",
            description: t("settings.menu.accountDescription", t("settings.menu.profileDescription")),
            roles: ALL_ROLES,
          },
        ],
      },
      {
        id: "organization",
        label: t("settings.menu.sections.organization"),
        items: [
          {
            id: "organization",
            name: t("settings.menu.organization"),
            icon: Building,
            path: "/settings/organization",
            description: t("settings.menu.organizationDescription"),
            roles: ADMIN_ROLES,
          },
          {
            id: "subscription",
            name: t("settings.menu.subscription"),
            icon: CreditCard,
            path: "/settings/subscription",
            description: t("settings.menu.subscriptionDescription"),
            roles: ADMIN_ROLES,
          },
          {
            id: "modules",
            name: t("settings.menu.modules"),
            icon: Boxes,
            path: "/settings/modules",
            description: t("settings.menu.modulesDescription"),
            roles: ADMIN_ROLES,
          },
          {
            id: "users",
            name: t("settings.menu.users"),
            icon: Users,
            path: "/settings/users",
            description: t("settings.menu.usersDescription"),
            roles: ADMIN_ROLES,
          },
          {
            id: "ai",
            name: t("settings.menu.ai", "AI"),
            icon: Brain,
            path: "/settings/ai",
            description: t("settings.menu.aiDescription", "AI usage, quotas, and provider settings"),
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        id: "accounting",
        label: t("settings.menu.sections.accounting"),
        items: [
          {
            id: "fiscal-years",
            name: t("settings.menu.fiscalYears"),
            icon: Calendar,
            path: "/settings/fiscal-years",
            description: t("settings.menu.fiscalYearsDescription"),
            roles: ADMIN_ROLES,
          },
          {
            id: "cost-centers",
            name: t("settings.menu.costCenters"),
            icon: FolderTree,
            path: "/settings/cost-centers",
            description: t("settings.menu.costCentersDescription"),
            roles: ADMIN_ROLES,
          },
          {
            id: "account-mappings",
            name: t("settings.menu.accountMappings"),
            icon: Link2,
            path: "/settings/account-mappings",
            description: t("settings.menu.accountMappingsDescription"),
            roles: ADMIN_ROLES,
          },
          {
            id: "work-units",
            name: t("settings.menu.workUnits"),
            icon: Package,
            path: "/settings/work-units",
            description: t("settings.menu.workUnitsDescription"),
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        id: "content",
        label: t("settings.menu.sections.content"),
        items: [
          {
            id: "dashboard",
            name: t("settings.menu.dashboard"),
            icon: LayoutGrid,
            path: "/settings/dashboard",
            description: t("settings.menu.dashboardDescription"),
            roles: ADMIN_AND_MANAGER_ROLES,
          },
          {
            id: "documents",
            name: t("settings.menu.documents"),
            icon: FileText,
            path: "/settings/documents",
            description: t("settings.menu.documentsDescription"),
            roles: ADMIN_ROLES,
          },
        ],
      },
      {
        id: "legal",
        label: t("settings.menu.sections.legal", "Légal"),
        items: [
          {
            id: "legal",
            name: t("settings.menu.legal", "Mentions Légales"),
            icon: FileText,
            path: "/settings/legal",
            description: t("settings.menu.legalDescription", "CGU et politique de confidentialité"),
            roles: ALL_ROLES,
          },
        ],
      },
      {
        id: "system",
        label: t("settings.menu.sections.system"),
        items: [
          {
            id: "files",
            name: t("settings.menu.files"),
            icon: HardDrive,
            path: "/settings/files",
            description: t("settings.menu.filesDescription"),
            roles: ADMIN_ROLES,
          },
          {
            id: "danger-zone",
            name: t("settings.menu.dangerZone"),
            icon: AlertTriangle,
            path: "/settings/danger-zone",
            description: t("settings.menu.dangerZoneDescription"),
            roles: ADMIN_ROLES,
          },
        ],
      },
    ],
    [t],
  );

  // Filter sections: remove items the user can't see, then remove empty sections
  const visibleSections = useMemo(() => {
    if (!userRole) return [];
    return allSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.roles.includes(userRole.role_name as RoleName),
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [allSections, userRole]);

  // Flat list of all visible items (for mobile bar lookup)
  const allVisibleItems = useMemo(
    () => visibleSections.flatMap((s) => s.items),
    [visibleSections],
  );

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    navigate({ to: path });
    setIsMobileMenuOpen(false);
  };

  const renderItem = (item: SettingsMenuItem) => {
    const Icon = item.icon;
    const active = isActive(item.path);

    if (isCollapsed) {
      return (
        <Tooltip key={item.id}>
          <TooltipTrigger asChild>
            <button
              type="button"
              onClick={() => handleNavigate(item.path)}
              data-tour={`settings-${item.id}`}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-300",
                active
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 dark:shadow-emerald-900/20"
                  : "text-slate-900 hover:bg-slate-50 dark:text-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
              )}
            >
              <Icon className="h-5 w-5 flex-shrink-0" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={12} className="rounded-xl border-slate-200 dark:border-slate-700 shadow-xl bg-white dark:bg-slate-800 p-3">
            <p className="font-black text-[10px] uppercase tracking-widest text-slate-900 dark:text-white">{item.name}</p>
            <p className="text-[10px] font-medium text-slate-400 mt-1 max-w-[180px]">{item.description}</p>
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavigate(item.path)}
        data-tour={`settings-${item.id}`}
        className={cn(
          "w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-300 group",
          active
            ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-800 shadow-sm"
            : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-900 dark:text-slate-100 hover:text-slate-900 dark:hover:text-slate-100 border border-transparent"
        )}
      >
        <div className={cn(
          "p-2 rounded-xl transition-colors duration-300",
          active ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-slate-100 dark:bg-slate-800 group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <div className="font-black text-[11px] uppercase tracking-widest truncate">
            {item.name}
          </div>
          <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 truncate mt-0.5">
            {item.description}
          </div>
        </div>
      </button>
    );
  };

  const renderSections = () =>
    visibleSections.map((section, sectionIndex) => (
      <div key={section.id} data-tour={`settings-section-${section.id}`} className="mb-6">
        {!isCollapsed && (
          <div className="px-3 mb-2 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => toggleSectionOpen(section.id)}
              className="flex min-w-0 flex-1 items-center gap-2 rounded-xl py-1.5 ps-0 pe-2 text-start transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/80"
              aria-expanded={isSectionExpanded(section.id)}
            >
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 shrink-0 text-slate-900 transition-transform duration-200 dark:text-slate-100",
                  !isSectionExpanded(section.id) && "-rotate-90",
                )}
              />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900 dark:text-slate-100 truncate">
                {section.label}
              </span>
            </button>
            {sectionIndex === 0 && (
              <div className="h-px min-w-[2rem] flex-1 bg-slate-100 dark:bg-slate-800 opacity-50" />
            )}
          </div>
        )}
        {(isCollapsed || isSectionExpanded(section.id)) && (
          <div
            className={cn(
              "space-y-1",
              isCollapsed && "flex flex-col items-center gap-2",
            )}
          >
            {section.items.map(renderItem)}
          </div>
        )}
      </div>
    ));

  return (
    <div className="relative flex min-h-0 h-full min-w-0 w-full flex-1 flex-col bg-slate-50/50 dark:bg-slate-900/50 md:h-full md:min-h-0 md:flex-row md:overflow-hidden">
      {/* Desktop Settings Sidebar — full viewport height so collapse control stays visible */}
      <TooltipProvider delayDuration={200}>
        <div
          className={cn(
            "z-20 hidden shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white transition-all duration-500 ease-in-out dark:border-slate-800 dark:bg-slate-900",
            /* Match parent row height (inside main), not 100dvh — dvh was taller than the scroll
               port and clipped the collapse footer on tablet / devtools iPad frames. */
            "md:flex md:min-h-0 md:h-full md:max-h-full md:self-stretch",
            isCollapsed ? (bothRailsCollapsed ? "w-16" : "w-20") : "w-80",
          )}
        >
          {/* Header */}
          <div className={cn("flex-shrink-0 p-4 pt-5 sm:p-6", isCollapsed && "px-3")}>
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate({ to: "/dashboard" })}
                  className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-900 transition-all hover:text-emerald-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:text-emerald-400"
                  aria-label={t("settings.backToDashboard", "Return to Dashboard")}
                >
                  <Home className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapse}
                  className="h-11 w-11 rounded-2xl bg-slate-50 text-slate-900 transition-all hover:text-emerald-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:text-emerald-400"
                  aria-label={t("sidebar.expand", "Expand sidebar")}
                >
                  <PanelLeft className="h-5 w-5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 flex-1 items-center gap-3 sm:gap-4">
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-2.5 dark:border-emerald-800 dark:bg-emerald-900/30 sm:p-3">
                    <Menu className="h-5 w-5 text-emerald-600 dark:text-emerald-400 sm:h-6 sm:w-6" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-lg font-black uppercase leading-none tracking-tight text-slate-900 dark:text-white sm:text-xl">
                      {t("settings.title")}
                    </h1>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Workspace Management
                    </p>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={toggleCollapse}
                  className="h-10 w-10 shrink-0 rounded-xl text-slate-900 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                  aria-label={t("sidebar.collapse", "Collapse sidebar")}
                >
                  <PanelLeftClose className="h-5 w-5" />
                </Button>
              </div>
            )}
          </div>

          <Separator
            className={cn("w-auto opacity-50", isCollapsed ? "mx-3" : "mx-6")}
          />

          {/* Navigation */}
          <nav
            className={cn(
              "min-h-0 flex-1 overflow-y-auto py-4 no-scrollbar sm:py-6",
              isCollapsed ? "px-3" : "px-4",
            )}
            data-tour="settings-menu"
          >
            {renderSections()}
          </nav>

          {/* Collapse Toggle (duplicate control for mouse users) */}
          <div className="flex-shrink-0 border-t border-slate-100 p-3 dark:border-slate-800 sm:p-4">
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-11 w-full rounded-2xl text-slate-900 transition-all hover:bg-slate-50 hover:text-slate-900 dark:text-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-100 sm:h-12",
                isCollapsed ? "justify-center px-0" : "justify-start px-3 sm:px-4",
              )}
              onClick={toggleCollapse}
            >
              {isCollapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <>
                  <PanelLeftClose className="mr-2 h-5 w-5 shrink-0 sm:mr-3" />
                  <span className="truncate text-[10px] font-black uppercase tracking-widest sm:text-[11px]">
                    {t("sidebar.collapse", "Collapse Sidebar")}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </TooltipProvider>

      {/* Main content: only this column scrolls when shell uses flex-1 + overflow-hidden */}
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-slate-50/30 pb-[env(safe-area-inset-bottom,0px)] dark:bg-slate-900/30 md:pb-0"
        data-settings-content-scroll
      >
        {/* Mobile section title bar */}
        <div className="md:hidden sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-4 py-3 shadow-sm">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center justify-between w-full h-11 px-4 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-inner"
          >
            <div className="flex items-center gap-3">
              {(() => {
                const currentItem = allVisibleItems.find((item) => isActive(item.path));
                if (currentItem) {
                  const Icon = currentItem.icon;
                  return (
                    <>
                      <div className="p-1.5 bg-emerald-100 dark:bg-emerald-900/40 rounded-lg">
                        <Icon className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                        {currentItem.name}
                      </span>
                    </>
                  );
                }
                return (
                  <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                    {t("settings.title")}
                  </span>
                );
              })()}
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>
        </div>
        
        <div className="flex-1 px-3 pt-3 pb-24 w-full max-w-[1400px] mx-auto sm:px-4 sm:pt-4 sm:pb-8 md:px-6 md:pt-6 lg:p-10 lg:pb-10 min-w-0">
          {children}
        </div>
      </div>

      {/* Mobile Settings Drawer */}
      <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <DrawerContent side="bottom" hideClose className="max-h-[85vh] rounded-t-[2.5rem] p-0 bg-white dark:bg-slate-900 border-none shadow-2xl">
          <DrawerHeader className="px-6 py-6 border-b border-slate-50 dark:border-slate-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl">
                  <Menu className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <DrawerTitle className="text-lg font-black uppercase tracking-tight">
                  {t("settings.title")}
                </DrawerTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
                className="h-10 w-10 rounded-xl bg-slate-50 dark:bg-slate-800"
              >
                <X className="h-5 w-5 text-slate-400" />
              </Button>
            </div>
          </DrawerHeader>
          <div
            className="overflow-y-auto px-4 py-6 no-scrollbar"
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 24px) + 24px)" }}
          >
            <button
              type="button"
              onClick={() => {
                navigate({ to: "/" });
                setIsMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-4 p-4 rounded-[1.5rem] bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 shadow-inner mb-8 group"
            >
              <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl shadow-sm group-active:scale-95 transition-all">
                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-300" />
              </div>
              <span className="font-black text-xs uppercase tracking-[0.15em] text-slate-900 dark:text-white">
                {t("settings.backToDashboard", "Return to Dashboard")}
              </span>
            </button>
            {renderSections()}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default SettingsLayout;
