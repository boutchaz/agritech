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

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    const saved = localStorage.getItem(SETTINGS_COLLAPSED_KEY);
    return saved === "true";
  });

  const toggleCollapse = () => {
    const newValue = !isCollapsed;
    setIsCollapsed(newValue);
    localStorage.setItem(SETTINGS_COLLAPSED_KEY, String(newValue));
  };

  useEffect(() => {
    const mainEl = document.querySelector('[data-main-scroll]');
    if (mainEl) {
      mainEl.scrollTo({ top: 0 });
    }
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
                  : "text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-600"
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
            : "hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 border border-transparent"
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
          <div className="px-3 mb-2 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
              {section.label}
            </span>
            {sectionIndex === 0 && <div className="h-px flex-1 bg-slate-100 dark:bg-slate-800 ml-4 opacity-50" />}
          </div>
        )}
        <div className={cn("space-y-1", isCollapsed && "flex flex-col items-center gap-2")}>
          {section.items.map(renderItem)}
        </div>
      </div>
    ));

  return (
    <div className="flex h-full relative bg-slate-50/50 dark:bg-slate-900/50">
      {/* Desktop Settings Sidebar */}
      <TooltipProvider delayDuration={200}>
        <div
          className={cn(
            "hidden lg:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 transition-all duration-500 ease-in-out z-20",
            isCollapsed ? "w-20" : "w-80",
          )}
        >
          {/* Header */}
          <div className={cn("flex-shrink-0 p-6", isCollapsed && "px-4")}>
            {isCollapsed ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate({ to: "/dashboard" })}
                className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-emerald-600 transition-all"
              >
                <Home className="h-5 w-5" />
              </Button>
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl border border-emerald-100 dark:border-emerald-800">
                  <Menu className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight uppercase leading-none">
                    {t("settings.title")}
                  </h1>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1.5">
                    Workspace Management
                  </p>
                </div>
              </div>
            )}
          </div>

          <Separator className="mx-6 w-auto opacity-50" />

          {/* Navigation */}
          <nav className={cn("flex-1 overflow-y-auto no-scrollbar py-6", isCollapsed ? "px-4" : "px-4")} data-tour="settings-menu">
            {renderSections()}
          </nav>

          {/* Collapse Toggle */}
          <div className="p-4 mt-auto">
            <Button
              variant="ghost"
              className={cn(
                "w-full h-12 rounded-2xl text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100 transition-all",
                isCollapsed ? "justify-center px-0" : "justify-start px-4",
              )}
              onClick={toggleCollapse}
            >
              {isCollapsed ? (
                <PanelLeft className="h-5 w-5" />
              ) : (
                <>
                  <PanelLeftClose className="h-5 w-5 mr-3 shrink-0" />
                  <span className="text-[11px] font-black uppercase tracking-widest truncate">
                    {t("sidebar.collapse", "Collapse Sidebar")}
                  </span>
                </>
              )}
            </Button>
          </div>
        </div>
      </TooltipProvider>

      {/* Main Content Area — extra bottom padding on small screens (global bottom nav + safe area) */}
      <div
        className="flex-1 overflow-auto w-full flex flex-col min-h-0 min-w-0 bg-slate-50/30 dark:bg-slate-900/30 pb-[env(safe-area-inset-bottom,0px)] lg:pb-0"
        data-main-scroll
      >
        {/* Mobile section title bar */}
        <div className="lg:hidden sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-4 py-3 shadow-sm">
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
