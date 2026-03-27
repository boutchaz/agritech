import React, { useMemo, useState } from "react";
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
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";
import { Separator } from "./ui/separator";
import { ALL_ROLES, ADMIN_ROLES, ADMIN_AND_MANAGER_ROLES } from "../types/auth";
import type { RoleName } from "../types/auth";

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

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

    return (
      <button
        key={item.id}
        type="button"
        onClick={() => handleNavigate(item.path)}
        data-tour={`settings-${item.id}`}
        className={`w-full text-start p-3 sm:p-4 rounded-lg transition-colors group ${
          active
            ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-200 dark:border-green-800"
            : "hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
        }`}
      >
        <div className="flex items-start gap-3">
          <Icon
            className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
              active
                ? "text-green-600 dark:text-green-400"
                : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300"
            }`}
          />
          <div className="flex-1 min-w-0">
            <div
              className={`font-medium text-start text-sm sm:text-base ${active ? "text-green-700 dark:text-green-300" : "text-gray-900 dark:text-white"}`}
            >
              {item.name}
            </div>
            <div
              className={`text-xs sm:text-sm mt-1 text-start ${
                active
                  ? "text-green-600 dark:text-green-400"
                  : "text-gray-500 dark:text-gray-400"
              }`}
            >
              {item.description}
            </div>
          </div>
        </div>
      </button>
    );
  };

  const renderSections = () =>
    visibleSections.map((section, sectionIndex) => (
      <div key={section.id} data-tour={`settings-section-${section.id}`}>
        {sectionIndex > 0 && <Separator className="my-3" />}
        <div className="px-1 pt-2 pb-1">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
            {section.label}
          </span>
        </div>
        <div className="space-y-1">
          {section.items.map(renderItem)}
        </div>
      </div>
    ));

  return (
    <div className="flex h-full relative">
      {/* Desktop Settings Sidebar */}
      <div className="hidden md:block w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t("settings.title")}
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            {t("settings.subtitle")}
          </p>
        </div>
        <nav className="p-4" data-tour="settings-menu">
          {renderSections()}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto w-full pb-20 md:pb-0">
        {/* Mobile section bar — tap to open Drawer */}
        <div className="md:hidden sticky top-0 z-30 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex items-center justify-between w-full min-h-[44px]"
          >
            <div className="flex items-center gap-3">
              {(() => {
                const currentItem = allVisibleItems.find((item) =>
                  isActive(item.path),
                );
                if (currentItem) {
                  const Icon = currentItem.icon;
                  return (
                    <>
                      <Icon className="h-5 w-5 text-green-600" />
                      <span className="font-medium text-gray-900 dark:text-white">
                        {currentItem.name}
                      </span>
                    </>
                  );
                }
                return (
                  <>
                    <Menu className="h-5 w-5 text-gray-600" />
                    <span className="font-medium text-gray-900 dark:text-white">
                      {t("settings.title")}
                    </span>
                  </>
                );
              })()}
            </div>
            <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400">
              <span className="text-sm">
                {t("settings.menu.changeSection", "Menu")}
              </span>
              <Menu className="h-5 w-5" />
            </div>
          </button>
        </div>
        {children}
      </div>

      {/* Mobile Settings Drawer */}
      <Drawer open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
        <DrawerContent side="bottom" hideClose className="max-h-[80vh] rounded-t-2xl p-0">
          <DrawerHeader className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-base font-semibold">
                {t("settings.title")}
              </DrawerTitle>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -me-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={t("common.close", "Close")}
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </DrawerHeader>
          <div
            className="overflow-y-auto px-3 py-2"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
          >
            <button
              type="button"
              onClick={() => {
                navigate({ to: "/" });
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-start p-3 rounded-lg transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 mb-2"
            >
              <div className="flex items-center gap-3">
                <ArrowLeft className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-300" />
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  {t("settings.backToDashboard", "Back to Dashboard")}
                </span>
              </div>
            </button>
            {renderSections()}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default SettingsLayout;
