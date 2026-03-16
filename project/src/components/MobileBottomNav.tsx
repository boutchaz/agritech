import React, { useState } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  MapPin,
  CheckSquare,
  Package,
  MoreHorizontal,
  Network,
  Building2,
  Users,
  Wheat,
  BookOpen,
  ShoppingBag,
  BarChart3,
  Settings,
  Bot,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";

interface NavItem {
  id: string;
  labelKey: string;
  fallback: string;
  icon: typeof LayoutDashboard;
  path: string;
  badge?: number;
}

const primaryNavItems: NavItem[] = [
  {
    id: "dashboard",
    labelKey: "nav.dashboard",
    fallback: "Home",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    id: "parcels",
    labelKey: "nav.parcels",
    fallback: "Parcels",
    icon: MapPin,
    path: "/parcels",
  },
  {
    id: "tasks",
    labelKey: "nav.tasks",
    fallback: "Tasks",
    icon: CheckSquare,
    path: "/tasks",
  },
  {
    id: "stock",
    labelKey: "mobileNav.stock",
    fallback: "Stock",
    icon: Package,
    path: "/stock",
  },
];

interface MoreMenuItem {
  id: string;
  labelKey: string;
  fallback: string;
  icon: typeof LayoutDashboard;
  path: string;
}

const moreMenuItems: MoreMenuItem[] = [
  {
    id: "farm-hierarchy",
    labelKey: "nav.farmHierarchy",
    fallback: "Farm Management",
    icon: Network,
    path: "/farm-hierarchy",
  },
  {
    id: "workers",
    labelKey: "nav.workers",
    fallback: "Workers",
    icon: Users,
    path: "/workers",
  },
  {
    id: "harvests",
    labelKey: "nav.harvests",
    fallback: "Harvests",
    icon: Wheat,
    path: "/harvests",
  },
  {
    id: "infrastructure",
    labelKey: "nav.infrastructure",
    fallback: "Infrastructure",
    icon: Building2,
    path: "/infrastructure",
  },
  {
    id: "compliance",
    labelKey: "nav.compliance",
    fallback: "Compliance",
    icon: ShieldCheck,
    path: "/compliance",
  },
  {
    id: "accounting",
    labelKey: "nav.accounting",
    fallback: "Accounting",
    icon: BookOpen,
    path: "/accounting",
  },
  {
    id: "marketplace",
    labelKey: "mobileNav.marketplace",
    fallback: "Marketplace",
    icon: ShoppingBag,
    path: "/marketplace/quote-requests/received",
  },
  {
    id: "chat",
    labelKey: "nav.chat",
    fallback: "AI Assistant",
    icon: Bot,
    path: "/chat",
  },
  {
    id: "reports",
    labelKey: "nav.reports",
    fallback: "Reports",
    icon: BarChart3,
    path: "/accounting/reports",
  },
  {
    id: "settings",
    labelKey: "nav.settings",
    fallback: "Settings",
    icon: Settings,
    path: "/settings/profile",
  },
];

const MobileBottomNav: React.FC = () => {
  const { t } = useTranslation("common");
  const navigate = useNavigate();
  const location = useLocation();
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  const getLabel = (labelKey: string, fallback: string) => {
    return t(labelKey, fallback);
  };

  const handleNavigate = (path: string) => {
    navigate({ to: path as string });
    setIsMoreOpen(false);
  };

  const isActive = (item: NavItem | MoreMenuItem) => {
    if (
      item.id === "dashboard" &&
      (location.pathname === "/" || location.pathname === "/dashboard")
    ) {
      return true;
    }
    return location.pathname.startsWith(item.path);
  };

  const isMoreActive = moreMenuItems.some((item) => isActive(item));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="flex items-stretch h-16 max-w-lg mx-auto">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  "flex flex-col items-center justify-center flex-1 min-w-0 py-2 relative",
                  "transition-colors duration-200",
                  active
                    ? "text-green-600 dark:text-green-400"
                    : "text-gray-500 dark:text-gray-400",
                )}
                aria-label={getLabel(item.labelKey, item.fallback)}
                aria-current={active ? "page" : undefined}
              >
                <div className="relative flex-shrink-0">
                  <Icon className="w-5 h-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[11px] mt-1.5 font-medium overflow-hidden text-ellipsis whitespace-nowrap w-full text-center px-0.5">
                  {getLabel(item.labelKey, item.fallback)}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 dark:bg-green-400 rounded-full" />
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              "flex flex-col items-center justify-center flex-1 min-w-0 py-2 relative",
              "transition-colors duration-200",
              isMoreActive || isMoreOpen
                ? "text-green-600 dark:text-green-400"
                : "text-gray-500 dark:text-gray-400",
            )}
            aria-label={t("mobileNav.more", "More")}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[11px] mt-1.5 font-medium overflow-hidden text-ellipsis whitespace-nowrap w-full text-center px-0.5">
              {t("mobileNav.more", "More")}
            </span>
            {isMoreActive && (
              <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-green-600 dark:bg-green-400 rounded-full" />
            )}
          </button>
        </div>
      </nav>

      <Drawer open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DrawerContent side="bottom" className="max-h-[70vh] rounded-t-2xl p-0">
          <DrawerHeader className="border-b border-gray-200 dark:border-gray-700 px-4 py-3">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-base font-semibold">
                {t("mobileNav.allModules", "All Modules")}
              </DrawerTitle>
              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 -mr-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                aria-label={t("common.close", "Close")}
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </DrawerHeader>
          <div
            className="overflow-y-auto px-2 py-2"
            style={{ paddingBottom: "env(safe-area-inset-bottom, 8px)" }}
          >
            <div className="grid grid-cols-3 gap-1">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl min-h-[72px] transition-colors",
                      active
                        ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50",
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-medium text-center leading-tight">
                      {getLabel(item.labelKey, item.fallback)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
};

export default MobileBottomNav;
