import {  useState  } from "react";
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
  ShoppingCart,
  BarChart3,
  Settings,
  Bot,
  ShieldCheck,
  X,
  Leaf,
  FlaskConical,
  CalendarRange,
  PackageCheck,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from '@/components/ui/button';

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
  // Farm & Land
  {
    id: "farm-hierarchy",
    labelKey: "nav.farmHierarchy",
    fallback: "Farm Management",
    icon: Network,
    path: "/farm-hierarchy",
  },
  {
    id: "infrastructure",
    labelKey: "nav.infrastructure",
    fallback: "Infrastructure",
    icon: Building2,
    path: "/infrastructure",
  },
  // Personnel
  {
    id: "workers",
    labelKey: "nav.workers",
    fallback: "Workers",
    icon: Users,
    path: "/workers",
  },
  // Production
  {
    id: "campaigns",
    labelKey: "nav.campaigns",
    fallback: "Campaigns",
    icon: CalendarRange,
    path: "/campaigns",
  },
  {
    id: "crop-cycles",
    labelKey: "nav.cropCycles",
    fallback: "Crop Cycles",
    icon: Leaf,
    path: "/crop-cycles",
  },
  {
    id: "harvests",
    labelKey: "nav.harvests",
    fallback: "Harvests",
    icon: Wheat,
    path: "/harvests",
  },
  {
    id: "reception-batches",
    labelKey: "nav.receptionBatches",
    fallback: "Reception Batches",
    icon: PackageCheck,
    path: "/reception-batches",
  },
  {
    id: "quality-control",
    labelKey: "nav.qualityControl",
    fallback: "Quality Control",
    icon: FlaskConical,
    path: "/quality-control",
  },
  {
    id: "biological-assets",
    labelKey: "nav.biologicalAssets",
    fallback: "Biological Assets",
    icon: Leaf,
    path: "/biological-assets",
  },
  // Compliance
  {
    id: "compliance",
    labelKey: "nav.compliance",
    fallback: "Compliance",
    icon: ShieldCheck,
    path: "/compliance",
  },
  // Sales & Purchasing
  {
    id: "billing",
    labelKey: "nav.salesPurchasing",
    fallback: "Sales & Purchasing",
    icon: ShoppingCart,
    path: "/accounting/quotes",
  },
  // Accounting
  {
    id: "accounting",
    labelKey: "nav.accounting",
    fallback: "Accounting",
    icon: BookOpen,
    path: "/accounting",
  },
  {
    id: "utilities",
    labelKey: "nav.utilities",
    fallback: "Utilities",
    icon: Wrench,
    path: "/utilities",
  },
  // Marketplace
  {
    id: "marketplace",
    labelKey: "mobileNav.marketplace",
    fallback: "Marketplace",
    icon: ShoppingBag,
    path: "/marketplace/quote-requests/received",
  },
  // AI & Reports
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
  // Settings
  {
    id: "settings",
    labelKey: "nav.settings",
    fallback: "Settings",
    icon: Settings,
    path: "/settings/account",
  },
];

const MobileBottomNav = () => {
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

  const normalizePath = (path: string) => path.replace(/\/$/, "") || "/";

  const isActive = (item: NavItem | MoreMenuItem) => {
    const p = normalizePath(location.pathname);
    if (item.id === "dashboard") {
      return p === "/" || p === "/dashboard" || p === "/live-dashboard";
    }
    if (item.id === "settings") {
      return p === "/settings" || p.startsWith("/settings/");
    }
    // "More" shortcuts: treat whole module prefix as active (paths are entry URLs, not full trees).
    if (item.id === "marketplace") {
      return p.startsWith("/marketplace");
    }
    if (item.id === "billing") {
      return (
        p.startsWith("/accounting/quotes") ||
        p.startsWith("/accounting/sales-orders") ||
        p.startsWith("/accounting/purchase-orders")
      );
    }
    const base = normalizePath(item.path);
    // Exact match or child segment (avoids "/stock" matching "/stocks" — require "/stock/…")
    return p === base || p.startsWith(`${base}/`);
  };

  const isMoreActive = moreMenuItems.some((item) => isActive(item));

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 w-full overflow-hidden md:hidden bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800"
        style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom, 0px))" }}
      >
        {/* basis-0 + min-w-0: equal columns. whitespace-normal: override Button nowrap so tabs don't overflow-cluster on narrow widths. */}
        <div className="mx-auto flex h-16 w-full min-w-0 max-w-lg items-stretch">
          {primaryNavItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item);

            return (
              <Button
                key={item.id}
                type="button"
                variant="ghost"
                onClick={() => handleNavigate(item.path)}
                className={cn(
                  // Button defaults (h-10, gap-2, nowrap, px-4) win in cva merge unless overridden with !important
                  "!h-16 !max-h-16 !min-h-16 !gap-1 !whitespace-normal !rounded-none !px-0.5 !py-0 !shadow-none",
                  "[&_svg]:!h-5 [&_svg]:!w-5 [&_svg]:shrink-0",
                  "relative flex min-h-0 min-w-0 flex-1 basis-0 flex-col items-center justify-center overflow-hidden",
                  "transition-colors duration-200",
                  "pb-1.5",
                  active
                    ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/55 font-semibold shadow-[inset_0_0_0_1px_rgb(167_243_208)] dark:shadow-[inset_0_0_0_1px_rgb(6_78_59)]"
                    : "text-slate-500 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
                )}
                aria-label={getLabel(item.labelKey, item.fallback)}
                aria-current={active ? "page" : undefined}
              >
                <div className="relative flex h-5 w-full shrink-0 items-center justify-center">
                  <Icon className="h-5 w-5" />
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 text-[10px] font-bold bg-red-500 text-white rounded-full flex items-center justify-center">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className="line-clamp-2 w-full max-w-full px-0.5 text-center text-[10px] font-medium leading-tight text-inherit sm:text-[11px]">
                  {getLabel(item.labelKey, item.fallback)}
                </span>
                {active && (
                  <span
                    className="pointer-events-none absolute bottom-0 left-1/2 h-1 w-10 -translate-x-1/2 rounded-t-full bg-emerald-600 dark:bg-emerald-400"
                    aria-hidden
                  />
                )}
              </Button>
            );
          })}

          <Button
            type="button"
            variant="ghost"
            onClick={() => setIsMoreOpen(true)}
            className={cn(
              "!h-16 !max-h-16 !min-h-16 !gap-1 !whitespace-normal !rounded-none !px-0.5 !py-0 !shadow-none",
              "[&_svg]:!h-5 [&_svg]:!w-5 [&_svg]:shrink-0",
              "relative flex min-h-0 min-w-0 flex-1 basis-0 flex-col items-center justify-center overflow-hidden pb-1.5",
              "transition-colors duration-200",
              isMoreActive
                ? "text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/55 font-semibold shadow-[inset_0_0_0_1px_rgb(167_243_208)] dark:shadow-[inset_0_0_0_1px_rgb(6_78_59)]"
                : isMoreOpen
                  ? "text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800/80"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-50/80 dark:hover:bg-slate-800/40",
            )}
            aria-label={t("mobileNav.more", "More")}
          >
            <div className="flex h-5 w-full shrink-0 items-center justify-center">
              <MoreHorizontal className="h-5 w-5" />
            </div>
            <span className="line-clamp-2 w-full max-w-full px-0.5 text-center text-[10px] font-medium leading-tight text-inherit sm:text-[11px]">
              {t("mobileNav.more", "More")}
            </span>
            {isMoreActive && (
              <span
                className="pointer-events-none absolute bottom-0 left-1/2 h-1 w-10 -translate-x-1/2 rounded-t-full bg-emerald-600 dark:bg-emerald-400"
                aria-hidden
              />
            )}
          </Button>
        </div>
      </nav>

      <Drawer open={isMoreOpen} onOpenChange={setIsMoreOpen}>
        <DrawerContent side="bottom" hideClose className="max-h-[70vh] rounded-t-2xl p-0">
          <DrawerHeader className="shrink-0 border-b border-slate-200 dark:border-slate-800 px-4 py-3">
            <div className="flex items-center justify-between">
              <DrawerTitle className="text-base font-semibold">
                {t("mobileNav.allModules", "All Modules")}
              </DrawerTitle>
              <Button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 -mr-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t("common.close", "Close")}
              >
                <X className="h-5 w-5 text-slate-500" />
              </Button>
            </div>
          </DrawerHeader>
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2 touch-pan-y"
            style={{ paddingBottom: "max(14px, env(safe-area-inset-bottom, 0px))" }}
          >
            <div className="grid grid-cols-3 gap-1">
              {moreMenuItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item);

                return (
                  <Button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-3 rounded-xl min-h-[72px] transition-colors",
                      active
                        ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50",
                    )}
                  >
                    <Icon className="w-5 h-5 flex-shrink-0" />
                    <span className="text-xs font-medium text-center leading-tight">
                      {getLabel(item.labelKey, item.fallback)}
                    </span>
                  </Button>
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
