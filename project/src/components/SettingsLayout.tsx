import React, { useMemo, useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import {
  Building,
  Boxes,
  Users,
  Sliders,
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
  TreeDeciduous,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "./ui/drawer";

interface SettingsLayoutProps {
  children: React.ReactNode;
}

const SettingsLayout: React.FC<SettingsLayoutProps> = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userRole } = useAuth();
  const { t } = useTranslation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Define menu items with role requirements
  const allMenuItems = useMemo(
    () => [
      {
        id: "profile",
        name: t("settings.menu.profile"),
        icon: User,
        path: "/settings/profile",
        description: t("settings.menu.profileDescription"),
        roles: [
          "system_admin",
          "organization_admin",
          "farm_manager",
          "farm_worker",
          "day_laborer",
          "viewer",
        ], // All roles
      },
      {
        id: "preferences",
        name: t("settings.menu.preferences"),
        icon: Sliders,
        path: "/settings/preferences",
        description: t("settings.menu.preferencesDescription"),
        roles: [
          "system_admin",
          "organization_admin",
          "farm_manager",
          "farm_worker",
          "day_laborer",
          "viewer",
        ], // All roles
      },
      {
        id: "organization",
        name: t("settings.menu.organization"),
        icon: Building,
        path: "/settings/organization",
        description: t("settings.menu.organizationDescription"),
        roles: ["system_admin", "organization_admin"], // Admin only
      },
      {
        id: "subscription",
        name: t("settings.menu.subscription"),
        icon: CreditCard,
        path: "/settings/subscription",
        description: t("settings.menu.subscriptionDescription"),
        roles: ["system_admin", "organization_admin"], // Admin only
      },
      {
        id: "modules",
        name: t("settings.menu.modules"),
        icon: Boxes,
        path: "/settings/modules",
        description: t("settings.menu.modulesDescription"),
        roles: ["system_admin", "organization_admin"], // Admin only
      },
      {
        id: "users",
        name: t("settings.menu.users"),
        icon: Users,
        path: "/settings/users",
        description: t("settings.menu.usersDescription"),
        roles: ["system_admin", "organization_admin"], // Admin only
      },
      {
        id: "work-units",
        name: t("settings.menu.workUnits"),
        icon: Package,
        path: "/settings/work-units",
        description: t("settings.menu.workUnitsDescription"),
        roles: ["system_admin", "organization_admin"], // Admin only
      },
      {
        id: "cost-centers",
        name: t("settings.menu.costCenters", "Cost Centers"),
        icon: FolderTree,
        path: "/settings/cost-centers",
        description: t(
          "settings.menu.costCentersDescription",
          "Manage cost centers for expense tracking",
        ),
        roles: ["system_admin", "organization_admin"], // Admin only
      },
      {
        id: "account-mappings",
        name: t("settings.menu.accountMappings", "Account Mappings"),
        icon: Link2,
        path: "/settings/account-mappings",
        description: t(
          "settings.menu.accountMappingsDescription",
          "Configure automatic journal entry mappings",
        ),
        roles: ["system_admin", "organization_admin"], // Admin only
      },
      {
        id: "fiscal-years",
        name: t("settings.menu.fiscalYears", "Fiscal Years"),
        icon: Calendar,
        path: "/settings/fiscal-years",
        description: t(
          "settings.menu.fiscalYearsDescription",
          "Manage fiscal years for financial reporting",
        ),
        roles: ["system_admin", "organization_admin"],
      },
      {
        id: "biological-assets",
        name: t("settings.menu.biologicalAssets", "Biological Assets"),
        icon: TreeDeciduous,
        path: "/settings/biological-assets",
        description: t(
          "settings.menu.biologicalAssetsDescription",
          "Manage orchards, livestock and perennial assets",
        ),
        roles: ["system_admin", "organization_admin", "farm_manager"],
      },
      {
        id: "dashboard",
        name: t("settings.menu.dashboard"),
        icon: LayoutGrid,
        path: "/settings/dashboard",
        description: t("settings.menu.dashboardDescription"),
        roles: ["system_admin", "organization_admin", "farm_manager"], // Admin and managers
      },
      {
        id: "documents",
        name: t("settings.menu.documents"),
        icon: FileText,
        path: "/settings/documents",
        description: t("settings.menu.documentsDescription"),
        roles: ["system_admin", "organization_admin"], // Admin only
      },
      {
        id: "files",
        name: t("settings.menu.files", "Gestion des Fichiers"),
        icon: HardDrive,
        path: "/settings/files",
        description: t(
          "settings.menu.filesDescription",
          "Gérer les fichiers et détecter les orphelins",
        ),
        roles: ["system_admin", "organization_admin"], // Admin only
      },
      {
        id: "danger-zone",
        name: t("settings.menu.dangerZone", "Zone de Danger"),
        icon: AlertTriangle,
        path: "/settings/danger-zone",
        description: t(
          "settings.menu.dangerZoneDescription",
          "Gérer les données de démo et actions critiques",
        ),
        roles: ["system_admin", "organization_admin"], // Admin only
      },
    ],
    [t],
  );

  // Filter menu items based on user role
  const menuItems = useMemo(() => {
    if (!userRole) return [];
    return allMenuItems.filter((item) =>
      item.roles.includes(userRole.role_name),
    );
  }, [allMenuItems, userRole]);

  const isActive = (path: string) => location.pathname === path;

  const handleNavigate = (path: string) => {
    navigate({ to: path });
    setIsMobileMenuOpen(false);
  };

  const renderMenuItems = () =>
    menuItems.map((item) => {
      const Icon = item.icon;
      const active = isActive(item.path);

      return (
        <button
          key={item.id}
          type="button"
          onClick={() => handleNavigate(item.path)}
          data-tour={`settings-${item.id}`}
          className={`w-full text-left p-3 sm:p-4 rounded-lg transition-colors group ${
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
    });

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
        <nav className="p-4 space-y-2" data-tour="settings-menu">
          {renderMenuItems()}
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
                const currentItem = menuItems.find((item) =>
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
        <DrawerContent side="bottom" className="max-h-[80vh] rounded-t-2xl p-0">
          <DrawerHeader className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-base font-semibold">
                {t("settings.title")}
              </DrawerTitle>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={t("common.close", "Close")}
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </DrawerHeader>
          <div
            className="overflow-y-auto px-3 py-2 space-y-1"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
          >
            <button
              type="button"
              onClick={() => {
                navigate({ to: "/" });
                setIsMobileMenuOpen(false);
              }}
              className="w-full text-left p-3 rounded-lg transition-colors bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 mb-2"
            >
              <div className="flex items-center gap-3">
                <ArrowLeft className="h-5 w-5 flex-shrink-0 text-gray-600 dark:text-gray-300" />
                <span className="font-medium text-sm text-gray-900 dark:text-white">
                  {t("settings.backToDashboard", "Back to Dashboard")}
                </span>
              </div>
            </button>
            {renderMenuItems()}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default SettingsLayout;
